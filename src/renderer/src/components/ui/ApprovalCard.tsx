import { TOOL_LABEL_MAP } from '@renderer/config'
import CustomButton from './CustomButton'

export interface ToolApprovalAction {
  name: string
  args: Record<string, any>
  description?: string
}

interface ApprovalCardProps {
  actionRequests: ToolApprovalAction[]
  /** 是否显示自动放权按钮 */
  showAutoApprove?: boolean
  /** 批准的按钮文字，默认"允许" */
  approveLabel?: string
  /** 拒绝的按钮文字，默认"拒绝" */
  rejectLabel?: string
  /** 自动放权按钮文字，默认"本会话允许" */
  autoApproveLabel?: string
  onApprove: () => void
  onReject: () => void
  onAutoApprove?: (toolName: string) => void
}

export default function ApprovalCard({
  actionRequests, showAutoApprove,
  approveLabel = '允许', rejectLabel = '拒绝', autoApproveLabel = '本会话允许',
  onApprove, onReject, onAutoApprove,
}: ApprovalCardProps) {
  return (
    <>
      <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2.5 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
        工具调用需要审批
      </div>
      <div className="space-y-1.5 mb-3">
        {actionRequests.map((action, i) => (
          <div key={i} className="bg-gray-50/80 dark:bg-gray-600/40 rounded-lg p-2.5 text-xs border border-gray-100 dark:border-gray-600/30">
            <div className="font-medium text-gray-800 dark:text-gray-200">{TOOL_LABEL_MAP[action.name] || action.name}</div>
            {action.description && (
              <div className="text-gray-500 dark:text-gray-400 mt-0.5">{action.description}</div>
            )}
            <div className="text-gray-500 dark:text-gray-400 mt-1 max-h-[80px] overflow-auto font-mono text-[10px]">
              {JSON.stringify(action.args, null, 2)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <CustomButton onClick={onApprove} variant="primary" size="xs">{approveLabel}</CustomButton>
        <CustomButton onClick={onReject} variant="danger" size="xs">{rejectLabel}</CustomButton>
        {showAutoApprove && onAutoApprove && (
          <CustomButton
            onClick={() => {
              const uniqueTools = new Set(actionRequests.map(a => a.name))
              uniqueTools.forEach(name => onAutoApprove(name))
            }}
            variant="secondary"
            size="xs"
          >{autoApproveLabel}</CustomButton>
        )}
      </div>
    </>
  )
}
