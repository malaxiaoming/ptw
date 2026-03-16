export interface ChecklistItem {
  key: string
  label: string
}

export const TOOLBOX_CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: 'ppe_check', label: 'All workers wearing proper PPE' },
  { key: 'hazards_identified', label: 'Work area hazards identified and communicated' },
  { key: 'emergency_procedures', label: 'Emergency procedures reviewed' },
  { key: 'active_permits_briefed', label: 'Active permits / high-risk activities briefed' },
  { key: 'previous_incidents', label: "Previous day's incidents / near-misses discussed" },
  { key: 'weather_assessed', label: 'Weather conditions assessed' },
  { key: 'tools_inspected', label: 'Tools and equipment inspected' },
]
