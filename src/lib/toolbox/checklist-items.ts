export interface ChecklistItem {
  key: string
  label: string
  label_zh?: string
}

export const TOOLBOX_CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: 'ppe_check', label: 'All workers wearing proper PPE', label_zh: '所有工人穿戴适当的个人防护装备' },
  { key: 'hazards_identified', label: 'Work area hazards identified and communicated', label_zh: '工作区域危害已识别并传达' },
  { key: 'emergency_procedures', label: 'Emergency procedures reviewed', label_zh: '紧急程序已审查' },
  { key: 'active_permits_briefed', label: 'Active permits / high-risk activities briefed', label_zh: '有效许可证／高风险活动已简报' },
  { key: 'previous_incidents', label: "Previous day's incidents / near-misses discussed", label_zh: '前一天的事故／险兆事件已讨论' },
  { key: 'weather_assessed', label: 'Weather conditions assessed', label_zh: '天气状况已评估' },
  { key: 'tools_inspected', label: 'Tools and equipment inspected', label_zh: '工具和设备已检查' },
]
