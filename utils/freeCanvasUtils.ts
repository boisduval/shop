import { Point } from './canvasUtils'

/**
 * 视口变换参数结构体
 */
export interface Viewport {
	zoom: number
	panX: number
	panY: number
}

/**
 * 智能吸附与对准辅助线结构体
 */
export interface SnappedGuide {
	x?: number
	y?: number
	refPtX: number
	refPtY: number
	hasX: boolean
	hasY: boolean
}

/**
 * 计算多边形所有顶点在画布中的外包矩形，并计算合理的缩放比 zoom 与平移量 pan，使图形保持在画布中心
 * @param points 顶点数组
 * @param isDrawingNew 是否处于新顶点绘制拉线状态
 * @param tempEndPoint 临时拉线终点
 * @param width 画布宽度
 * @param height 画布高度
 */
export function getFreeViewport(
	points: Point[],
	isDrawingNew: boolean,
	tempEndPoint: Point | null,
	width: number,
	height: number
): Viewport {
	// 如果顶点数量小于 2，返回默认视口，防止放置第一个点时视图跳动
	if (points.length < 2) {
		return { zoom: 1.0, panX: 0.0, panY: 0.0 } as Viewport
	}

	let minX = points[0].x
	let maxX = points[0].x
	let minY = points[0].y
	let maxY = points[0].y

	for (let i = 1; i < points.length; i++) {
		const pt = points[i]
		if (pt.x < minX) minX = pt.x
		if (pt.x > maxX) maxX = pt.x
		if (pt.y < minY) minY = pt.y
		if (pt.y > maxY) maxY = pt.y
	}

	// 如果正在拉线，将临时终点也纳入包围盒计算，防止拉线超出屏幕
	if (isDrawingNew && tempEndPoint != null) {
		const cur = tempEndPoint!
		if (cur.x < minX) minX = cur.x
		if (cur.x > maxX) maxX = cur.x
		if (cur.y < minY) minY = cur.y
		if (cur.y > maxY) maxY = cur.y
	}

	const boxW = maxX - minX
	const boxH = maxY - minY
	const boxCX = (minX + maxX) / 2
	const boxCY = (minY + maxY) / 2

	const padding = 40.0
	let zoomVal = 1.0

	// 计算自适应缩放比例（限制在 0.1~2.0 之间）
	if (boxW > 0 || boxH > 0) {
		const zoomX = (width - padding * 2) / Math.max(boxW, 1.0)
		const zoomY = (height - padding * 2) / Math.max(boxH, 1.0)
		zoomVal = Math.min(zoomX, zoomY)
		zoomVal = Math.max(0.1, Math.min(2.0, zoomVal))
	}

	// 视口居中平移量
	const panX = width / 2 - zoomVal * boxCX
	const panY = height / 2 - zoomVal * boxCY

	return { zoom: zoomVal, panX: panX, panY: panY } as Viewport
}

/**
 * 屏幕坐标磁吸吸附计算（吸附阈值 10px）
 * 计算输入点与所有已存在顶点在屏幕坐标系下的相对距离，若满足条件则强行对齐
 * @param tx 触屏X坐标
 * @param ty 触屏Y坐标
 * @param points 顶点数组
 * @param excludeIndex 计算吸附时需要排除的顶点索引（例如拖拽自身时排除自身）
 * @param vp 视口变换参数
 */
export function snapFreePoint(
	tx: number,
	ty: number,
	points: Point[],
	excludeIndex: number,
	vp: Viewport
): { snappedPt: Point, guide: SnappedGuide | null } {
	let snappedTx = tx
	let snappedTy = ty
	let guide = null as SnappedGuide | null
	
	let snappedX = false
	let snappedY = false
	let refPtX = 0.0
	let refPtY = 0.0

	const SNAP_THRESHOLD_PX = 10.0 // 吸附阈值 10px

	for (let i = 0; i < points.length; i++) {
		if (i === excludeIndex) continue
		const refPtVirtual = points[i]
		
		// 转换到屏幕坐标系进行距离判定
		const refPtScreenX = refPtVirtual.x * vp.zoom + vp.panX
		const refPtScreenY = refPtVirtual.y * vp.zoom + vp.panY

		// 水平磁吸对齐 (Y轴对齐)
		if (!snappedX && Math.abs(tx - refPtScreenX) < SNAP_THRESHOLD_PX) {
			snappedTx = refPtScreenX
			snappedX = true
			refPtX = refPtScreenX
			refPtY = refPtScreenY
		}
		// 垂直磁吸对齐 (X轴对齐)
		if (!snappedY && Math.abs(ty - refPtScreenY) < SNAP_THRESHOLD_PX) {
			snappedTy = refPtScreenY
			snappedY = true
			if (!snappedX) {
				refPtX = refPtScreenX
				refPtY = refPtScreenY
			}
		}
	}

	// 记录吸附辅助线数据
	if (snappedX || snappedY) {
		guide = {
			x: snappedX ? snappedTx : undefined,
			y: snappedY ? snappedTy : undefined,
			refPtX: refPtX,
			refPtY: refPtY,
			hasX: snappedX,
			hasY: snappedY
		} as SnappedGuide
	}

	// 将磁吸后的屏幕坐标重新转换回虚拟坐标空间存储
	const vx = (snappedTx - vp.panX) / vp.zoom
	const vy = (snappedTy - vp.panY) / vp.zoom

	return {
		snappedPt: { x: vx, y: vy } as Point,
		guide: guide
	}
}

/**
 * 绘制带半透明白色背景垫底的长度标注文本，防止与墙线、背景混淆
 * @param ctx 2D绘图上下文
 * @param text 标注文本 (如 3.2m)
 * @param x 绘制中点X坐标
 * @param y 绘制中点Y坐标
 */
export function drawSegmentLabel(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number
) {
	ctx.font = 'bold 10px sans-serif'
	const textWidth = ctx.measureText(text).width
	const paddingX = 4
	const paddingY = 2
	const labelW = textWidth + paddingX * 2
	const labelH = 14

	// 绘制遮挡保护背景矩形
	ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
	ctx.fillRect(x - labelW / 2, y - labelH / 2, labelW, labelH)

	// 绘制文字
	ctx.fillStyle = '#64748b'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillText(text, x, y)
}
