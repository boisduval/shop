export interface FormField {
	key : string
	label : string
	placeholder ?: string
	type ?: 'text' | 'number' | 'textarea'
	suffix ?: string
}

export interface TemplatePreset {
	id : number
	name : string
	value : string
	content : string[]
	fields : FormField[]
}

export interface TemplatesPresetMap {
	[key : string] : TemplatePreset
}

export const templatesPreset = {
	change: {
		id: 1,
		name: '延续变更',
		value: 'change',
		content: [
			'1、申请人 {applicant_name} 申办烟草零售许可证的经营场所为固定的商业门面，核定经营场所为一楼，经营面积 {business_area} 平方;',
			'2、该经营场所周围50米范围内无中、小学校、幼儿园进出通道口;',
			'3、该经营场所位置不属于规模较大、容易形成卷烟批发的集贸市场、货物集散中心、物流园区等区域;',
			'4、该店实际地址未发生变化。',
			'{%location_map}',
		],
		fields: [
			{ key: 'applicant_name', label: '申请人', placeholder: '请输入姓名', type: 'text' },
			{ key: 'business_area', label: '经营面积', placeholder: '请输入面积', type: 'number', suffix: '㎡' },
		],
	},
	normal: {
		id: 2,
		name: '实地核查普通版',
		value: 'normal',
		content: [
			'{%location_map}',
			'1、申请人 {applicant_name} 申办烟草零售许可证的经营场所为固定的商业门面，核定经营场所为一楼，经营面积 {business_area} 平方米；',
			'2、该经营场所周围50米范围内无中、小学校，幼儿园进出通道口；',
			'3、该经营场所距离40米内无其他持证户；',
			'4、该经营场所位置不属于规模较大，容易形成卷烟批发的集贸市场，货物集散中心，物流园区等区域；',
			'5、该经营场所位于湖南省邵阳市武冈市 {street_address} 单元格范围内，布局容量 {layout_capacity} 个，已设置零售店 {existing_shops} 个，不受合理容量限制办证数 {license_count} 个，轮候人数 {waiting_count} 个，该申请人为排队到号申请人。',
			'6、依据《邵阳市烟草制品零售点布局规划(2025年修订)》',
			'该店符合办证条件。',
		],
		fields: [
			{ key: 'applicant_name', label: '申请人', placeholder: '请输入姓名', type: 'text' },
			{ key: 'business_area', label: '经营面积', placeholder: '请输入面积', type: 'number', suffix: '㎡' },
			{ key: 'street_address', label: '所属网格', placeholder: '请输入所属网格', type: 'text' },
			{ key: 'layout_capacity', label: '布局容量', placeholder: '请输入容量', type: 'number' },
			{ key: 'existing_shops', label: '已设置零售店', placeholder: '请输入数量', type: 'number' },
			{ key: 'license_count', label: '不受限制办证数', placeholder: '请输入不受限制办证数', type: 'number' },
			{ key: 'waiting_count', label: '轮候人数', placeholder: '请输入轮候人数', type: 'number' },
		],
	},
	large: {
		id: 3,
		name: '新实地勘验普通版 1000平方米',
		value: 'large',
		content: [
			'{%location_map}',
			'1、申请人 {applicant_name} 申办烟草零售许可证的经营场所为固定的商业门面，核定经营场所为一楼，经营面积 {business_area} 平方米，二层为住房，两者相独立;',
			'2、该经营场所周围50米范围内无中、小学校、幼儿园进出通道口;',
			'3、该经营场所位置不属于规模较大、容易形成卷烟批发的集贸市场、货物集散中心、物流园区等区域;',
			'4、该经营场所位于湖南省邵阳市武冈市 {street_address} 管辖范围内，布局容量 {layout_capacity} 个，已设置零售店 {existing_shops} 个，该店为面积超过1000平方米的超市，属于《邵阳市烟草制品零售点布局规划(2025年修订)》第十一条第二款的布局规划放宽情形，符合办证条件。',
		],
		fields: [
			{ key: 'applicant_name', label: '申请人', placeholder: '请输入姓名', type: 'text' },
			{ key: 'business_area', label: '经营面积', placeholder: '请输入面积', type: 'number', suffix: '㎡' },
			{ key: 'street_address', label: '所属网格', placeholder: '请输入所属网格', type: 'text' },
			{ key: 'layout_capacity', label: '布局容量', placeholder: '请输入容量', type: 'number' },
			{ key: 'existing_shops', label: '已设置零售店', placeholder: '请输入数量', type: 'number' },
		],
	},
	queue: {
		id: 4,
		name: '实地核查普通版 (排队)',
		value: 'queue',
		content: [
			'{%location_map}',
			'1、申请人 {applicant_name} 申办烟草零售许可证的经营场所为固定的商业门面，核定经营场所为一楼，经营面积 {business_area} 平方米；',
			'2、该经营场所周围50米范围内无中、小学校，幼儿园进出通道口；',
			'3、该经营场所距离40米内无其他持证户；',
			'4、该经营场所位置不属于规模较大，容易形成卷烟批发的集贸市场，货物集散中心，物流园区等区域；',
			'5、该经营场所位于湖南省邵阳市武冈市 {street_address} 单元格范围内，布局容量 {layout_capacity} 个，已设置零售店 {existing_shops} 个，不受合理容量限制办证数 {license_count} 个，轮候人数 {waiting_count} 个。',
			'6、依据《邵阳市烟草制品零售点布局规划(2025年修订)》',
			'该店不符合办证条件。',
		],
		fields: [
			{ key: 'applicant_name', label: '申请人', placeholder: '请输入姓名', type: 'text' },
			{ key: 'business_area', label: '经营面积', placeholder: '请输入面积', type: 'number', suffix: '㎡' },
			{ key: 'street_address', label: '所属网格', placeholder: '请输入所属网格', type: 'text' },
			{ key: 'layout_capacity', label: '布局容量', placeholder: '请输入容量', type: 'number' },
			{ key: 'existing_shops', label: '已设置零售店', placeholder: '请输入数量', type: 'number' },
			{ key: 'license_count', label: '不受限制办证数', placeholder: '请输入不受限制办证数', type: 'number' },
			{ key: 'waiting_count', label: '轮候人数', placeholder: '请输入轮候人数', type: 'number' },
		],
	},
	disabled: {
		id: 5,
		name: '残疾人',
		value: 'disabled',
		content: [
			'{%location_map}',
			'1、申请人 {applicant_name} 申办烟草零售许可证的经营场所为固定的商业门面，核定经营场所为一楼，经营面积 {business_area} 平方，二层为住房，两者相独立；',
			'2、该经营场所周围50米范围内无中、小学校、幼儿园进出通道口；',
			'3、该经营场所位置不属于规模较大、容易形成卷烟批发的集贸市场、货物集散中心、物流园区等区域；',
			'4、该经营者为 {applicant_name} 残疾 {disabled_level} 级，根据《邵阳市烟草制品零售点布局规划(2025年修订)》第十三条规定，不受零售点的间距限制；',
			'5、该经营场所位于湖南省邵阳市武冈市 {street_address} 单元格范围内，布局容量 {layout_capacity} 个，已设置零售店 {existing_shops} 个，不受合理容量限制办证数 {license_count} 个，轮候人数 {waiting_count} 个；',
			'6、依据《邵阳市烟草制品零售点布局规划(2025年修订)》该店符合办证条件。',
		],
		fields: [
			{ key: 'applicant_name', label: '申请人', placeholder: '请输入姓名', type: 'text' },
			{ key: 'business_area', label: '经营面积', placeholder: '请输入面积', type: 'number', suffix: '㎡' },
			{ key: 'disabled_level', label: '残疾等级', placeholder: '例如：肢体三级', type: 'text' },
			{ key: 'street_address', label: '所属网格', placeholder: '请输入所属网格', type: 'text' },
			{ key: 'layout_capacity', label: '布局容量', placeholder: '请输入容量', type: 'number' },
			{ key: 'existing_shops', label: '已设置零售店', placeholder: '请输入数量', type: 'number' },
			{ key: 'license_count', label: '不受限制办证数', placeholder: '请输入不受限制办证数', type: 'number' },
			{ key: 'waiting_count', label: '轮候人数', placeholder: '请输入轮候人数', type: 'number' },
		],
	},
	relocation: {
		id: 6,
		name: '实地核查普通版(同网格搬迁)',
		value: 'relocation',
		content: [
			'{%location_map}',
			'1、申请人 {applicant_name} 申办烟草零售许可证的经营场所为固定的商业门面，核定经营场所为一楼，经营面积 {business_area} 平方米；',
			'2、该经营场所周围50米范围内无中、小学校，幼儿园进出通道口；',
			'3、该经营场所距离40米内无其他持证户；',
			'4、该经营场所位置不属于规模较大，容易形成卷烟批发的集贸市场，货物集散中心，物流园区等区域；',
			'5、该经营场所位于湖南省邵阳市武冈市 {street_address} 单元格范围内，布局容量 {layout_capacity} 个，已设置零售店 {existing_shops} 个，不受合理容量限制办证数 {license_count} 个，轮候人数 {waiting_count} 个，该申请人属于原单元格变更地址情况。',
			'6、依据《邵阳市烟草制品零售点布局规划(2025年修订)》第十四条，该店符合办证条件。',
		],
		fields: [
			{ key: 'applicant_name', label: '申请人', placeholder: '请输入姓名', type: 'text' },
			{ key: 'business_area', label: '经营面积', placeholder: '请输入面积', type: 'number', suffix: '㎡' },
			{ key: 'street_address', label: '所属网格', placeholder: '请输入所属网格', type: 'text' },
			{ key: 'layout_capacity', label: '布局容量', placeholder: '请输入容量', type: 'number' },
			{ key: 'existing_shops', label: '已设置零售店', placeholder: '请输入数量', type: 'number' },
			{ key: 'license_count', label: '不受限制办证数', placeholder: '请输入不受限制办证数', type: 'number' },
			{ key: 'waiting_count', label: '轮候人数', placeholder: '请输入轮候人数', type: 'number' },
		],
	},
	deceased: {
		id: 7,
		name: '原法人死亡',
		value: 'deceased',
		content: [
			'{%location_map}',
			'1、申请人 {applicant_name} 申办烟草零售许可证的经营场所为固定的商业门面，核定经营场所为一楼，经营面积 {business_area} 平方米；',
			'2、该经营场所周围50米范围内无中、小学校，幼儿园进出通道口；',
			'3、该经营场所距离40米内无其他持证户；',
			'4、该经营场所位置不属于规模较大，容易形成卷烟批发的集贸市场，货物集散中心，物流园区等区域；',
			'5、该经营场所位于湖南省邵阳市武冈市 {street_address} 单元格范围内，布局容量 {layout_capacity} 个，已设置零售店 {existing_shops} 个，不受合理容量限制办证数 {license_count} 个，轮候人数 {waiting_count} 个，该申请人为排队到号申请人。',
			'6、依据《邵阳市烟草制品零售点布局规划(2025年修订)》第十二条第三款：持证人死亡之日或丧失民事行为能力之日起 90个自然日内，或自审批机关书面通知登记联络员或其他家庭成员之日起30个自然日内，持证人的家庭成员（以中华人民共和国民法典规定为准）于许可证有效期内在原经营场所重新申领许可证的，申请人向受理机关重新提出新办申请，零售点设置不受单元格布局数量和间距限制。该店符合办证条件。',
		],
		fields: [
			{ key: 'applicant_name', label: '申请人', placeholder: '请输入姓名', type: 'text' },
			{ key: 'business_area', label: '经营面积', placeholder: '请输入面积', type: 'number', suffix: '㎡' },
			{ key: 'street_address', label: '所属网格', placeholder: '请输入所属网格', type: 'text' },
			{ key: 'layout_capacity', label: '布局容量', placeholder: '请输入容量', type: 'number' },
			{ key: 'existing_shops', label: '已设置零售店', placeholder: '请输入数量', type: 'number' },
			{ key: 'license_count', label: '不受限制办证数', placeholder: '请输入不受限制办证数', type: 'number' },
			{ key: 'waiting_count', label: '轮候人数', placeholder: '请输入轮候人数', type: 'number' },
		],
	},
	reject_distance: {
		id: 8,
		name: '不予受理(距离)',
		value: 'reject_distance',
		content: [
			'{%location_map}',
			'1、申请人 {applicant_name} 申办烟草零售许可证的经营场所为固定的商业门面，核定经营场所为一楼，经营面积 {business_area} 平方米；',
			'2、该经营场所周围50米范围内无中、小学校，幼儿园进出通道口；',
			'3、该经营场所周边最近许可证号为 {nearest_license_no} 的零售店为 {nearest_shop_name}，间距为 {nearest_distance} 米，少于40米；',
			'4、该经营场所位置不属于规模较大，容易形成卷烟批发的集贸市场，货物集散中心，物流园区等区域；',
			'5、该经营场所位于湖南省邵阳市武冈市 {street_address} 单元格范围内，布局容量 {layout_capacity} 个，已设置零售店 {existing_shops} 个，不受合理容量限制办证数 {license_count} 个，轮候人数 {waiting_count} 个。',
			'6、依据《邵阳市烟草制品零售点布局规划(2025年修订)》第七条：新设零售点与周边最近零售点间距不少于40米。该店不符合办证条件。',
		],
		fields: [
			{ key: 'applicant_name', label: '申请人', placeholder: '请输入姓名', type: 'text' },
			{ key: 'business_area', label: '经营面积', placeholder: '请输入面积', type: 'number', suffix: '㎡' },
			{ key: 'nearest_license_no', label: '最近零售点许可证号', placeholder: '请输入许可证号', type: 'text' },
			{ key: 'nearest_shop_name', label: '最近零售店名称', placeholder: '请输入名称', type: 'text' },
			{ key: 'nearest_distance', label: '间距', placeholder: '请输入间距', type: 'number', suffix: '米' },
			{ key: 'street_address', label: '所属网格', placeholder: '请输入所属网格', type: 'text' },
			{ key: 'layout_capacity', label: '布局容量', placeholder: '请输入容量', type: 'number' },
			{ key: 'existing_shops', label: '已设置零售店', placeholder: '请输入数量', type: 'number' },
			{ key: 'license_count', label: '不受限制办证数', placeholder: '请输入不受限制办证数', type: 'number' },
			{ key: 'waiting_count', label: '轮候人数', placeholder: '请输入轮候人数', type: 'number' },
		],
	},
}

export const templatesList = Object.values(templatesPreset).map(t => ({
  id: t.id,
  name: t.name,
  type: 'DOCX',
  value: t.value,
}))