import { Record } from './types'
import { templatesPreset } from './templatesPreset'

export const replacePlaceholders = (templateStr : string, data : Record<string, any>) : string => {
	let result = templateStr
	const keys = Object.keys(data)
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		const val = data[key]
		const valStr = val != null ? `${val}` : ''
		result = result.replace(`{${key}}`, valStr)
	}
	return result
}

export const wrapText = (ctx : CanvasRenderingContext2D, text : string, maxWidth : number) : string[] => {
	const lines = [] as string[]
	let currentLine = ''
	for (let i = 0; i < text.length; i++) {
		const char = text.charAt(i)
		const testLine = currentLine + char
		const metrics = ctx.measureText(testLine)
		if (metrics.width > maxWidth && currentLine.length > 0) {
			lines.push(currentLine)
			currentLine = char
		} else {
			currentLine = testLine
		}
	}
	if (currentLine.length > 0) {
		lines.push(currentLine)
	}
	return lines
}

export const loadImage = (canvas : any, src : string) : Promise<any> => {
	return new Promise<any>((resolve, reject) => {
		// #ifdef H5
		const img = new Image()
		img.onload = () => {
			resolve(img)
		}
		img.onerror = (err : any) => {
			reject(err)
		}
		img.src = src
		// #endif
		// #ifndef H5
		if (canvas != null && typeof canvas.createImage === 'function') {
			const img = canvas.createImage()
			img.onload = () => {
				resolve(img)
			}
			img.onerror = (err : any) => {
				reject(err)
			}
			img.src = src
		} else {
			// 微信小程序等非H5环境下，若无 canvas.createImage，可使用 uni.getImageInfo 获取本地路径直接给 drawImage 绘制
			uni.getImageInfo({
				src: src,
				success: (res) => {
					resolve(res.path)
				},
				fail: (err) => {
					resolve(src)
				}
			})
		}
		// #endif
	})
}

export function generateAndSaveReport(
	canvasId: string,
	instance: any,
	templateKey: string,
	formData: Record<string, any>,
	imageData: string,
	onSuccess ?: () => void
) {
	uni.showLoading({
		title: '生成并导出中...'
	})

	const template = templatesPreset[templateKey]
	if (template == null) {
		uni.hideLoading()
		uni.showModal({
			title: '错误',
			content: `未找到预置模板: ${templateKey}`,
			showCancel: false
		})
		return
	}

	uni.createCanvasContextAsync({
		id: canvasId,
		component: instance,
		success: (context : CanvasContext) => {
			const ctx = context.getContext('2d')!
			
			uni.createSelectorQuery()
				.in(instance)
				.select('#' + canvasId)
				.fields({ node: true } as Record<string, any>)
				.exec((selectorRes : any[]) => {
					if (selectorRes.length === 0 || selectorRes[0] == null || selectorRes[0]['node'] == null) {
						uni.hideLoading()
						uni.showModal({
							title: '错误',
							content: '初始化 Canvas 节点失败',
							showCancel: false
						})
						return
					}

					const canvasNode = selectorRes[0]['node']
					const canvasWidth = 800
					const padding = 50
					const contentWidth = canvasWidth - padding * 2
					const fontSize = 16
					const fontFamily = '"SimSun", "Songti SC", "STSong", serif'
					const lineHeight = 28
					const paragraphSpacing = 20

					ctx.font = `${fontSize}px ${fontFamily}`

					const renderReport = async () => {
						// 2. 预加载图纸图片并计算其缩放大小
						let mapImg : any = null
						let mapDrawWidth = 0
						let mapDrawHeight = 0

						if (imageData !== '') {
							try {
								mapImg = await loadImage(canvasNode, imageData)
								mapDrawWidth = contentWidth
								// 保持原始比例缩放
								const scale = contentWidth / (mapImg.width as number)
								mapDrawHeight = (mapImg.height as number) * scale
							} catch (err) {
								console.error('加载平面图失败:', err)
							}
						}

						// 3. 计算高度和组织排版数据
						const renderItems = [] as Record<string, any>[]
						let totalHeight = padding * 2

						for (let i = 0; i < template.content.length; i++) {
							const line = template.content[i]
							if (line === '{%location_map}') {
								if (mapImg != null) {
									renderItems.push({
										type: 'image',
										img: mapImg,
										width: mapDrawWidth,
										height: mapDrawHeight,
									})
									totalHeight += mapDrawHeight
									if (i < template.content.length - 1) {
										totalHeight += paragraphSpacing
									}
								}
							} else {
								const filledText = replacePlaceholders(line, formData)
								const wrappedLines = wrapText(ctx, filledText, contentWidth)
								renderItems.push({
									type: 'text',
									lines: wrappedLines,
								})
								totalHeight += wrappedLines.length * lineHeight
								if (i < template.content.length - 1) {
									totalHeight += paragraphSpacing
								}
							}
						}

						// 4. 设置 canvas 实际像素大小
						const dpr = 2
						canvasNode.width = canvasWidth * dpr
						canvasNode.height = totalHeight * dpr

						// 缩放绘图上下文
						ctx.scale(dpr, dpr)

						// 重新设置属性
						ctx.fillStyle = '#ffffff'
						ctx.fillRect(0, 0, canvasWidth, totalHeight)

						ctx.fillStyle = '#1e293b' // 深灰蓝色文字
						ctx.font = `${fontSize}px ${fontFamily}`
						ctx.textBaseline = 'top'

						let currentY = padding

						for (let i = 0; i < renderItems.length; i++) {
							const item = renderItems[i]
							const type = item['type'] as string
							if (type === 'text') {
								const lines = item['lines'] as string[]
								for (let j = 0; j < lines.length; j++) {
									ctx.fillText(lines[j], padding, currentY)
									currentY += lineHeight
								}
								currentY += paragraphSpacing
							} else if (type === 'image') {
								const img = item['img']
								const w = item['width'] as number
								const h = item['height'] as number
								ctx.drawImage(img, padding, currentY, w, h)
								currentY += h + paragraphSpacing
							}
						}

						// 5. 导出为临时图片并保存
						setTimeout(() => {
							uni.canvasToTempFilePath({
								canvas: canvasNode,
								destWidth: canvasNode.width,
								destHeight: canvasNode.height,
								fileType: 'png',
								success: (res2) => {
									uni.hideLoading()
									const customName = `${formData['applicant_name'] || '未命名'}_核查报告.png`

									// #ifdef H5
									const link = document.createElement('a')
									link.download = customName
									link.href = res2.tempFilePath
									link.click()
									if (onSuccess != null) {
										onSuccess()
									}
									// #endif

									// #ifndef H5
									let saveFilePath = res2.tempFilePath
									
									// #ifdef MP-WEIXIN
									try {
										const fs = uni.getFileSystemManager()
										// @ts-ignore
										const newPath = `${wx.env.USER_DATA_PATH}/${customName}`
										fs.saveFileSync(res2.tempFilePath, newPath)
										saveFilePath = newPath
									} catch (fsErr : any) {
										console.error('微信文件管理器保存失败:', fsErr)
									}
									// #endif

									// 保存到系统相册
									uni.saveImageToPhotosAlbum({
										filePath: saveFilePath,
										success: () => {
											if (onSuccess != null) {
												onSuccess()
											}
										},
										fail: (saveErr) => {
											console.error('保存相册失败:', saveErr)
											uni.showModal({
												title: '保存相册失败',
												content: '报告已生成临时文件，但保存至相册失败，请检查相册权限。',
												showCancel: false
											})
										}
									})
									// #endif
								},
								fail: (err) => {
									uni.hideLoading()
									console.error('canvasToTempFilePath fail:', err)
									uni.showModal({
										title: '错误',
										content: '生成报告图片失败',
										showCancel: false
									})
								}
							}, instance)
						}, 200)
					}

					renderReport()
				})
		},
		fail: (err) => {
			uni.hideLoading()
			console.error('createCanvasContextAsync fail:', err)
			uni.showModal({
				title: '错误',
				content: '初始化 Canvas 失败',
				showCancel: false
			})
		}
	})
}
