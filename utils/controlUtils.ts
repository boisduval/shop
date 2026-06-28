import { Point, Record } from './types'

export interface CanvasControl {
	name: string
	x: number
	y: number
}

// Fabric.js setControlsVisibility 兼容配置映射
export const DOOR_CONTROLS_VISIBILITY = {
	tl: false,
	tr: false,
	br: false,
	bl: false,
	ml: true,
	mr: true,
	mt: false,
	mb: false,
	mtr: true
} as Record<string, boolean>

export const CABINET_CONTROLS_VISIBILITY = {
	tl: true,
	tr: true,
	br: true,
	bl: true,
	ml: false,
	mr: false,
	mt: false,
	mb: false,
	mtr: true
} as Record<string, boolean>

/**
 * 绘制 Fabric.js 风格的操作控制手柄图标
 */
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
 * 根据 Fabric.js setControlsVisibility 规范计算各控制点在画布上的全局坐标
 */
export function getObjectControls(
	objX: number,
	objY: number,
	angle: number,
	w: number,
	h: number,
	visibility: Record<string, boolean>,
	mtrOffset: number
): CanvasControl[] {
	const controls: CanvasControl[] = []
	const halfW = w / 2.0
	const halfH = h / 2.0

	const localPositions = {} as Record<string, Point>
	localPositions['tl'] = { x: -halfW, y: -halfH } as Point
	localPositions['tr'] = { x: halfW, y: -halfH } as Point
	localPositions['br'] = { x: halfW, y: halfH } as Point
	localPositions['bl'] = { x: -halfW, y: halfH } as Point
	localPositions['ml'] = { x: -halfW, y: 0.0 } as Point
	localPositions['mr'] = { x: halfW, y: 0.0 } as Point
	localPositions['mt'] = { x: 0.0, y: -halfH } as Point
	localPositions['mb'] = { x: 0.0, y: halfH } as Point
	localPositions['mtr'] = { x: 0.0, y: -halfH - mtrOffset } as Point

	const keys = ['tl', 'tr', 'br', 'bl', 'ml', 'mr', 'mt', 'mb', 'mtr']
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		if (visibility[key] as boolean) {
			const pt = localPositions[key] as Point
			const gx = objX + pt.x * Math.cos(angle) - pt.y * Math.sin(angle)
			const gy = objY + pt.x * Math.sin(angle) + pt.y * Math.cos(angle)
			controls.push({
				name: key,
				x: gx,
				y: gy
			} as CanvasControl)
		}
	}

	return controls
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
 * 根据拉伸端点计算大门拉伸后的宽度与中心点坐标
 */
export function calculateDoorScaleAndPos(
	tx: number,
	ty: number,
	anchorX: number,
	anchorY: number,
	doorAngle: number,
	draggedDoorEnd: number
): Record<string, number> {
	const dist = Math.sqrt((tx - anchorX) * (tx - anchorX) + (ty - anchorY) * (ty - anchorY))
	const width = Math.max(20.0, dist)
	const offsetFactor = (draggedDoorEnd == 0) ? -0.5 : 0.5
	const x = anchorX + offsetFactor * width * Math.cos(doorAngle)
	const y = anchorY + offsetFactor * width * Math.sin(doorAngle)
	
	const res = {} as Record<string, number>
	res['x'] = x
	res['y'] = y
	res['width'] = width
	return res
}

/**
 * 根据拖拽角计算烟柜等比缩放后的比例与中心点坐标
 */
export function calculateCabinetScaleAndPos(
	tx: number,
	ty: number,
	anchorX: number,
	anchorY: number,
	cabinetAngle: number,
	draggedCornerIndex: number
): Record<string, number> {
	const dist = Math.sqrt((tx - anchorX) * (tx - anchorX) + (ty - anchorY) * (ty - anchorY))
	const initialDiag = 54.08325
	const cs = Math.max(0.4, dist / initialDiag)

	const oppIdx = (draggedCornerIndex + 2) % 4
	const clx_unscaled = [-22.5, 22.5, 22.5, -22.5]
	const cly_unscaled = [-15.0, -15.0, 15.0, 15.0]
	const alx_unscaled = clx_unscaled[oppIdx]
	const aly_unscaled = cly_unscaled[oppIdx]

	const x = anchorX - cs * (alx_unscaled * Math.cos(cabinetAngle) - aly_unscaled * Math.sin(cabinetAngle))
	const y = anchorY - cs * (alx_unscaled * Math.sin(cabinetAngle) + aly_unscaled * Math.cos(cabinetAngle))
	
	const res = {} as Record<string, number>
	res['x'] = x
	res['y'] = y
	res['scale'] = cs
	return res
}
