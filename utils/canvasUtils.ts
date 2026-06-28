import { Record } from './types'

// 颜色常量定义
export const COLOR_CABINET = '#B57474'
export const COLOR_DOOR = '#527EBF'
export const COLOR_TEXT = '#64748B'
export const COLOR_WALL_FILL = '#EAEAEA'
export const COLOR_WALL_STROKE = '#8A8A8A'
export const COLOR_HANDLE_LINE = '#94A3B8'

export const COLOR_DRAG_NORMAL = '#3B66F5'
export const COLOR_DRAG_ACTIVE = '#2563EB'
export const COLOR_ROTATE_NORMAL = '#10B981'
export const COLOR_ROTATE_ACTIVE = '#059669'

// 尺寸常量定义
export const WALL_STROKE_WIDTH = 6.0
export const DEFAULT_PADDING = 40.0

/**
 * 坐标点接口
 */
export interface Point {
	x: number
	y: number
}

/**
 * 墙面线段接口
 */
export interface WallSegment {
	p1: Point
	p2: Point
	angle: number // 弧度值
}

/**
 * 1. 智能吸附计算器
 * 计算点到所有墙面线段的垂直距离，如果小于阈值，则吸附到最近的投影点并调整偏转角
 */
export function snapDoorToWall(
	doorPos: Point,
	segments: WallSegment[],
	threshold: number = 20.0
): Record<string, any> {
	let minDistance = 999999.0
	let bestX = doorPos.x
	let bestY = doorPos.y
	let bestAngle = 0.0
	let isSnapped = false

	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i]
		const p1 = seg.p1
		const p2 = seg.p2

		// 计算线段向量与投影
		const abX = p2.x - p1.x
		const abY = p2.y - p1.y
		const apX = doorPos.x - p1.x
		const apY = doorPos.y - p1.y

		const abLenSq = abX * abX + abY * abY
		if (abLenSq == 0) continue

		// 投影比例 t 限制在 [0, 1] 之间
		let t = (apX * abX + apY * abY) / abLenSq
		t = Math.max(0.0, Math.min(1.0, t))

		// 墙面上最近的投影点
		const projX = p1.x + t * abX
		const projY = p1.y + t * abY

		// 计算门中心到投影点的距离
		const dx = doorPos.x - projX
		const dy = doorPos.y - projY
		const dist = Math.sqrt(dx * dx + dy * dy)

		if (dist < minDistance && dist < threshold) {
			minDistance = dist
			bestX = projX
			bestY = projY
			bestAngle = seg.angle
			isSnapped = true
		}
	}

	const res = {} as Record<string, any>
	res['x'] = bestX
	res['y'] = bestY
	res['angle'] = bestAngle
	res['isSnapped'] = isSnapped
	return res
}

/**
 * 2. 多边形物理面积计算 (Shoelace 算法)
 * @param vertices 顶点数组
 * @param scale 像素与米比例尺 (例如 40.0 像素代表 1米)
 */
export function calculatePolygonArea(vertices: Point[], scale: number): number {
	const n = vertices.length
	if (n < 3) return 0.0

	let area = 0.0
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n
		area += vertices[i].x * vertices[j].y
		area -= vertices[j].x * vertices[i].y
	}
	
	const pixelArea = Math.abs(area) / 2.0
	return pixelArea / (scale * scale)
}

/**
 * 3. 墙体线段生成器
 */
export function generateWallSegments(vertices: Point[]): WallSegment[] {
	const segments: WallSegment[] = []
	const n = vertices.length
	for (let i = 0; i < n; i++) {
		const p1 = vertices[i]
		const p2 = vertices[(i + 1) % n]
		const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
		segments.push({
			p1: p1,
			p2: p2,
			angle: angle
		} as WallSegment)
	}
	return segments
}

export function renderControlIcon(
	ctx: CanvasRenderingContext2D,
	left: number,
	top: number,
	type: string,
	color: string
) {
	ctx.save()
	ctx.translate(left, top)

	// Draw circle background
	ctx.beginPath()
	ctx.arc(0, 0, 8, 0, Math.PI * 2)
	ctx.fillStyle = color
	ctx.fill()

	ctx.strokeStyle = '#ffffff'
	ctx.lineWidth = 1.2
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'

	if (type === 'drag') {
		// Horizontal line & arrows
		ctx.beginPath()
		ctx.moveTo(-5, 0)
		ctx.lineTo(5, 0)
		ctx.moveTo(-3, -2)
		ctx.lineTo(-5, 0)
		ctx.lineTo(-3, 2)
		ctx.moveTo(3, -2)
		ctx.lineTo(5, 0)
		ctx.lineTo(3, 2)

		// Vertical line & arrows
		ctx.moveTo(0, -5)
		ctx.lineTo(0, 5)
		ctx.moveTo(-2, -3)
		ctx.lineTo(0, -5)
		ctx.lineTo(2, -3)
		ctx.moveTo(-2, 3)
		ctx.lineTo(0, 5)
		ctx.lineTo(2, 3)
		ctx.stroke()
	} else if (type === 'rotate') {
		// Draw circular arrow icon
		ctx.beginPath()
		ctx.arc(0, 0.5, 4, -Math.PI / 4, Math.PI * 5 / 4)
		ctx.stroke()

		// Arrow head at the end
		ctx.beginPath()
		ctx.moveTo(0.5, -3.5)
		ctx.lineTo(4.5, -3.5)
		ctx.lineTo(4.5, 0.5)
		ctx.stroke()
	}

	ctx.restore()
}

/**
 * 绘制烟柜及其控制按钮
 */
export function drawCabinet(
	ctx: CanvasRenderingContext2D,
	cabX: number,
	cabY: number,
	angle: number,
	type: string,
	color: string,
	isDragging: boolean,
	isRotating: boolean
) {
	ctx.save()
	ctx.translate(cabX, cabY)
	ctx.rotate(angle)

	ctx.fillStyle = color
	ctx.beginPath()

	if (type === 'l_shape') {
		ctx.moveTo(-22.5, -15)
		ctx.lineTo(22.5, -15)
		ctx.lineTo(22.5, 0)
		ctx.lineTo(-7.5, 0)
		ctx.lineTo(-7.5, 15)
		ctx.lineTo(-22.5, 15)
		ctx.closePath()
	} else if (type === 'convex') {
		ctx.moveTo(7.5, 15)
		ctx.lineTo(-7.5, 15)
		ctx.lineTo(-7.5, 0)
		ctx.lineTo(-22.5, 0)
		ctx.lineTo(-22.5, -15)
		ctx.lineTo(22.5, -15)
		ctx.lineTo(22.5, 0)
		ctx.lineTo(7.5, 0)
		ctx.closePath()
	} else {
		ctx.rect(-22.5, -15, 45, 30)
	}
	ctx.fill()

	// 绘制文字
	ctx.fillStyle = '#ffffff'
	ctx.font = '10px sans-serif'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'

	// 1. 连线到控制按钮 (实线，与物体同色)
	ctx.strokeStyle = color
	ctx.lineWidth = 1
	ctx.beginPath()
	ctx.moveTo(0, -15)
	ctx.lineTo(0, -30)
	ctx.moveTo(0, 15)
	ctx.lineTo(0, 30)
	ctx.stroke()

	// 2. 绘制旋转和移动按钮
	renderControlIcon(ctx, 0, 30, 'drag', color)
	renderControlIcon(ctx, 0, -30, 'rotate', color)

	ctx.restore()
}

/**
 * 计算大门旋转手柄在画布上的物理坐标
 */
export function getDoorRotationHandlePos(
	doorX: number,
	doorY: number,
	angle: number,
	doorWidth: number
): Point {
	const rx_local = 0.0
	const ry_local = -20.0
	const rx = doorX + rx_local * Math.cos(angle) - ry_local * Math.sin(angle)
	const ry = doorY + rx_local * Math.sin(angle) + ry_local * Math.cos(angle)
	return { x: rx, y: ry } as Point
}

/**
 * 绘制大门及其手柄
 */
export function drawDoor(
	ctx: CanvasRenderingContext2D,
	doorX: number,
	doorY: number,
	angle: number,
	width: number,
	thickness: number,
	isDragging: boolean,
	isRotating: boolean
) {
	ctx.save()
	ctx.translate(doorX, doorY)
	ctx.rotate(angle)

	// 绘制大门矩形 (浅蓝色 COLOR_DOOR)
	ctx.fillStyle = COLOR_DOOR
	ctx.fillRect(-width / 2, -thickness / 2, width, thickness)

	// 1. 连线到旋转和移动按钮 (实线，与大门同色)
	ctx.strokeStyle = COLOR_DOOR
	ctx.lineWidth = 1
	ctx.beginPath()
	ctx.moveTo(0, -thickness / 2)
	ctx.lineTo(0, -20)
	ctx.moveTo(0, thickness / 2)
	ctx.lineTo(0, 20)
	ctx.stroke()

	// 2. 绘制旋转和移动按钮
	renderControlIcon(ctx, 0, 20, 'drag', COLOR_DOOR)
	renderControlIcon(ctx, 0, -20, 'rotate', COLOR_DOOR)

	ctx.restore()
}
/**
 * 4. 计算当前动态缩放比
 */
export function getCanvasScale(
	shapeType: string,
	params: Record<string, any>,
	canvasWidth: number,
	canvasHeight: number,
	padding: number
): number {
	if (shapeType === 'rect') {
		const rw = params['rectW'] as number
		const rh = params['rectH'] as number
		if (rw <= 0 || rh <= 0) return 40.0
		const scaleX = (canvasWidth - padding * 2) / rw
		const scaleY = (canvasHeight - padding * 2) / rh
		return Math.min(scaleX, scaleY)
	} else if (shapeType === 'trap') {
		const tt = params['trapTop'] as number
		const tb = params['trapBottom'] as number
		const th = params['trapH'] as number
		const to = params['trapOffset'] as number
		if (tt <= 0 || tb <= 0 || th <= 0) return 40.0
		const minX = Math.min(0.0, to)
		const maxX = Math.max(tb, to + tt)
		const actualW = maxX - minX
		const scaleX = (canvasWidth - padding * 2) / actualW
		const scaleY = (canvasHeight - padding * 2) / th
		return Math.min(scaleX, scaleY)
	}
	return 40.0
}

/**
 * 5. 计算当前房间顶点坐标
 */
export function getRoomVertices(
	shapeType: string,
	params: Record<string, any>,
	canvasWidth: number,
	canvasHeight: number,
	scale: number
): Point[] {
	const vertices: Point[] = []

	if (shapeType === 'rect') {
		const rw = params['rectW'] as number
		const rh = params['rectH'] as number
		const sw = rw * scale
		const sh = rh * scale
		const x0 = (canvasWidth - sw) / 2
		const y0 = (canvasHeight - sh) / 2

		vertices.push({ x: x0, y: y0 } as Point)
		vertices.push({ x: x0 + sw, y: y0 } as Point)
		vertices.push({ x: x0 + sw, y: y0 + sh } as Point)
		vertices.push({ x: x0, y: y0 + sh } as Point)
	} else if (shapeType === 'trap') {
		const tt = params['trapTop'] as number
		const tb = params['trapBottom'] as number
		const th = params['trapH'] as number
		const to = params['trapOffset'] as number

		const minX = Math.min(0.0, to)
		const maxX = Math.max(tb, to + tt)
		const actualW = maxX - minX

		const sw_top = tt * scale
		const sw_bottom = tb * scale
		const sh = th * scale
		const soff = to * scale
		const sw_max = actualW * scale
		const sminX = minX * scale

		const L = (canvasWidth - sw_max) / 2
		const T = (canvasHeight - sh) / 2

		vertices.push({ x: L + soff - sminX, y: T } as Point)
		vertices.push({ x: L + soff + sw_top - sminX, y: T } as Point)
		vertices.push({ x: L + sw_bottom - sminX, y: T + sh } as Point)
		vertices.push({ x: L - sminX, y: T + sh } as Point)
	}
	return vertices
}

/**
 * 6. 统一绘制面积数据标注方法 (右下角留边距)
 */
export function drawAreaText(
	ctx: CanvasRenderingContext2D,
	area: number,
	width: number,
	height: number
) {
	ctx.fillStyle = COLOR_TEXT
	ctx.font = 'bold 12px sans-serif'
	ctx.fillText(`S = ${area.toFixed(2)}㎡`, width - 95, height - 20)
}

/**
 * 7. 统一绘制房间轮廓（包括填充背景和描边）
 */
export function drawRoomOutline(
	ctx: CanvasRenderingContext2D,
	vertices: Point[]
) {
	if (vertices.length < 3) return

	// 绘制填充背景
	ctx.fillStyle = COLOR_WALL_FILL
	ctx.beginPath()
	ctx.moveTo(vertices[0].x, vertices[0].y)
	for (let i = 1; i < vertices.length; i++) {
		ctx.lineTo(vertices[i].x, vertices[i].y)
	}
	ctx.closePath()
	ctx.fill()

	// 绘制墙线描边
	ctx.strokeStyle = COLOR_WALL_STROKE
	ctx.lineWidth = WALL_STROKE_WIDTH
	ctx.lineJoin = 'round'
	ctx.beginPath()
	ctx.moveTo(vertices[0].x, vertices[0].y)
	for (let i = 1; i < vertices.length; i++) {
		ctx.lineTo(vertices[i].x, vertices[i].y)
	}
	ctx.closePath()
	ctx.stroke()
}

/**
 * 8. 统一绘制烟柜与大门 (模拟摆放)
 */
export function drawFurniture(
	ctx: CanvasRenderingContext2D,
	vertices: Point[],
	width: number,
	height: number
) {
	const centerX = width / 2
	const centerY = height / 2

	// 绘制烟柜 (铁锈红 COLOR_CABINET)
	ctx.fillStyle = COLOR_CABINET
	ctx.fillRect(centerX - 30, centerY - 15, 60, 30)
	ctx.fillStyle = '#ffffff'
	ctx.font = '10px sans-serif'
	ctx.fillText('烟柜', centerX - 10, centerY + 4)
}

/**
 * 计算大门初始基准坐标 (最左下侧)
 */
export function getDoorInitialPosition(vertices: Point[]): Point {
	if (vertices.length == 0) {
		return { x: 0.0, y: 0.0 } as Point
	}
	let minX = vertices[0].x
	let maxY = vertices[0].y
	for (let i = 1; i < vertices.length; i++) {
		if (vertices[i].x < minX) minX = vertices[i].x
		if (vertices[i].y > maxY) maxY = vertices[i].y
	}
	return { x: minX, y: maxY } as Point
}

/**
 * 绘制左下角图例
 */
export function drawLegends(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number
) {
	ctx.save()

	// 烟柜图例 (铁锈红 COLOR_CABINET)
	ctx.fillStyle = COLOR_CABINET
	ctx.beginPath()
	ctx.arc(20, height - 20, 4, 0, Math.PI * 2)
	ctx.fill()

	ctx.fillStyle = COLOR_TEXT
	ctx.font = '10px sans-serif'
	ctx.textAlign = 'left'
	ctx.textBaseline = 'middle'
	ctx.fillText('烟柜', 30, height - 20)

	// 大门图例 (浅蓝色 COLOR_DOOR)
	ctx.fillStyle = COLOR_DOOR
	ctx.beginPath()
	ctx.arc(80, height - 20, 4, 0, Math.PI * 2)
	ctx.fill()

	ctx.fillStyle = COLOR_TEXT
	ctx.fillText('大门', 90, height - 20)

	ctx.restore()
}




