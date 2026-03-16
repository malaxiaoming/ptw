// Central Chinese translation dictionary for bilingual UI
// Usage: import { zh, t } from '@/lib/i18n/zh'

export const zh: Record<string, string> = {
  // Page headings
  'Permits': '许可证',
  'New Permit': '新许可证',
  'Edit Permit': '编辑许可证',
  'Permit Details': '许可证详情',
  'Submit Closure Report': '提交关闭报告',
  'Toolbox Meetings': '工具箱会议',
  'New Toolbox Meeting': '新工具箱会议',
  'New Meeting': '新会议',

  // Section headings
  'Select Project': '选择项目',
  'Select Permit Type': '选择许可证类型',
  'Work Details': '工作详情',
  'Checklist & Personnel': '检查清单和人员',
  'Checklist': '检查清单',
  'Personnel': '人员',
  'Attachments': '附件',
  'Activity Log': '活动日志',
  'Available Actions': '可用操作',
  'Safety Checklist': '安全检查清单',
  'Meeting Details': '会议详情',
  'Attendance': '出勤',
  'Notes': '备注',

  // Form labels
  'Work Location': '工作地点',
  'Work Description': '工作描述',
  'Scheduled Start': '计划开始',
  'Scheduled End': '计划结束',
  'Closure Comments': '关闭备注',
  'Project': '项目',
  'Permit Type': '许可证类型',
  'Status': '状态',
  'Permit Number': '许可证编号',
  'GPS Coordinates': 'GPS 坐标',
  'Applicant': '申请人',
  'Verifier': '审核人',
  'Approver': '批准人',
  'Created': '创建时间',
  'Submitted': '提交时间',
  'Verified': '审核时间',
  'Approved': '批准时间',
  'Closed': '关闭时间',
  'Rejection Reason': '拒绝原因',
  'Revocation Reason': '撤销原因',
  'Date': '日期',
  'Time': '时间',
  'Location / Zone': '地点／区域',
  'Location': '地点',
  'Conducted By': '主持人',
  'Sign-off': '签字确认',

  // Permit statuses
  'Draft': '草稿',
  'Active': '有效',
  'Closure Submitted': '已提交关闭',
  'Rejected': '已拒绝',
  'Revoked': '已撤销',

  // Action labels
  'Submit for Verification': '提交审核',
  'Verify': '审核',
  'Return to Applicant': '退回申请人',
  'Approve': '批准',
  'Reject': '拒绝',
  'Revoke': '撤销',
  'Confirm Closure': '确认关闭',
  'Return Closure for Revision': '退回关闭修改',

  // Buttons
  'Create Permit': '创建许可证',
  'Save Changes': '保存更改',
  'Cancel': '取消',
  'Delete': '删除',
  'Edit': '编辑',
  'Duplicate for Today': '复制为今天',
  'Create your first permit': '创建您的第一个许可证',
  'Confirm': '确认',
  '+ New Permit': '+ 新许可证',

  // Filter labels
  'All Projects': '所有项目',
  'All Types': '所有类型',
  'All Statuses': '所有状态',
  'Clear': '清除',

  // Table headers & badges
  'Signed off': '已签字',
  'Pending': '待处理',
  'Not signed off': '未签字',

  // Empty states
  'No permits found.': '未找到许可证。',
  'No checklist for this permit type.': '此许可证类型无检查清单。',
  'No personnel requirements for this permit type.': '此许可证类型无人员要求。',
  'No activity recorded.': '无活动记录。',
  'No toolbox meetings yet. Create one to get started.': '暂无工具箱会议。创建一个以开始。',
  'No meetings match the selected date range.': '没有符合所选日期范围的会议。',
  'This permit type has no checklist or personnel requirements.': '此许可证类型无检查清单或人员要求。',

  // Print
  'Print': '打印',
  'Print Permit': '打印许可证',
  'Authorization': '授权',
  'Valid from': '有效期',
  'Printed on': '打印于',

  // Misc
  'Expired': '已过期',
  'Permit': '许可证',
  'I confirm this toolbox meeting was conducted': '我确认此工具箱会议已进行',
  'Check All': '全选',
  'Uncheck All': '取消全选',
  'Select from worker registry:': '从工人名册中选择：',
  'Applicant Declaration': '申请人声明',
  'Verifier Declaration': '审核人声明',
}

/**
 * Look up Chinese translation for an English string.
 * Returns undefined if no translation exists.
 */
export function t(en: string): string | undefined {
  return zh[en]
}
