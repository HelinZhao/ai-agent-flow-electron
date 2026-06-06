import { useState, useCallback } from 'react'
import { teamExecutionApi } from '@renderer/lib/api'
import { useTeamExecutionStore } from '@renderer/store/teamExecutionStore'
import ChoiceCard from '@renderer/components/ui/ChoiceCard'
import ApprovalCard from '@renderer/components/ui/ApprovalCard'

export default function ToolApprovalSidebar() {
  const [open, setOpen] = useState(false)
  const markToolApproved = useTeamExecutionStore(s => s.markToolApproved)
  const markChoiceSubmitted = useTeamExecutionStore(s => s.markChoiceSubmitted)

  // 直接从 store 订阅 pending 状态（sync_state + SSE 事件实时维护，无需轮询）
  const pendingApprovalByExecution = useTeamExecutionStore(s => s.pendingApprovalByExecution)
  const pendingChoiceByExecution = useTeamExecutionStore(s => s.pendingChoiceByExecution)
  const pendingItems = Object.entries(pendingApprovalByExecution).map(([executionId, info]) => ({
    executionId,
    taskTitle: info.taskTitle,
    teamName: info.teamName,
    teamId: info.teamId,
    actionRequests: info.actionRequests,
  }))
  const choiceItems = Object.entries(pendingChoiceByExecution).map(([executionId, info]) => ({
    executionId,
    taskTitle: info.taskTitle,
    teamName: info.teamName,
    teamId: info.teamId,
    question: info.question,
    options: info.options,
    allowMultiSelect: info.allowMultiSelect,
  }))
  const totalCount = pendingItems.length + choiceItems.length

  const handleApprove = useCallback(async (executionId: string, decisions: { type: 'approve' | 'reject'; message?: string }[]) => {
    try {
      await teamExecutionApi.approveTool(executionId, decisions)
      markToolApproved(executionId)
    } catch { /* ignore */ }
  }, [markToolApproved])

  const handleAutoApprove = useCallback(async (executionId: string, toolName: string) => {
    try {
      await teamExecutionApi.autoApprove(executionId, toolName)
      try {
        await teamExecutionApi.approveTool(executionId, [{ type: 'approve' }])
      } catch {
        // autoApprove 可能已自动放行，忽略 404
      }
      markToolApproved(executionId)
    } catch { /* ignore */ }
  }, [markToolApproved])

  const handleChoiceSubmit = useCallback(async (executionId: string, response: { selectedValue?: string; selectedLabel?: string; selectedValues?: string[]; selectedLabels?: string[]; cancelled?: boolean }) => {
    try {
      await teamExecutionApi.submitChoice(executionId, response)
    } catch (e) { console.error('[Choice] 提交失败:', e) }
    markChoiceSubmitted(executionId)
  }, [markChoiceSubmitted])

  if (totalCount === 0 && !open) return null

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg transition-colors text-sm font-medium"
      >
        <span>🛡️</span>
        <span>待处理</span>
        {totalCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-600 text-white">
            {totalCount}
          </span>
        )}
      </button>

      {/* Sidebar panel */}
      {open && (
        <div className="fixed inset-y-0 right-0 w-96 z-50 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              待处理
              {totalCount > 0 && <span className="ml-2 text-xs font-normal text-gray-400">({pendingItems.length} 审批 · {choiceItems.length} 选择)</span>}
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {totalCount === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">暂无待处理事项</p>
            ) : (
              <>
                {/* 待审批工具调用 */}
                {pendingItems.map((item, i) => (
                  <div key={`approve-${i}`} className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/50">
                    <div className="text-xs mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{item.teamName || '团队'}</span>
                      <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
                      <span className="text-gray-500 dark:text-gray-400">{item.taskTitle || '任务'}</span>
                      <span className="ml-1.5 text-[10px] text-amber-500 font-medium">审批</span>
                    </div>
                    <ApprovalCard
                      actionRequests={item.actionRequests}
                      showAutoApprove
                      approveLabel="批准"
                      rejectLabel="拒绝"
                      autoApproveLabel="🤖 auto"
                      onApprove={() => handleApprove(item.executionId, item.actionRequests.map(() => ({ type: 'approve' })))}
                      onReject={() => handleApprove(item.executionId, item.actionRequests.map(() => ({ type: 'reject' })))}
                      onAutoApprove={(toolName) => handleAutoApprove(item.executionId, toolName)}
                    />
                  </div>
                ))}

                {/* 待用户选择 */}
                {choiceItems.map((item, i) => (
                  <div key={`choice-${i}`} className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800/50">
                    <div className="text-xs mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{item.teamName || '团队'}</span>
                      <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
                      <span className="text-gray-500 dark:text-gray-400">{item.taskTitle || '任务'}</span>
                      <span className="ml-1.5 text-[10px] text-blue-500 font-medium">选择</span>
                    </div>
                    <ChoiceCard
                      question={item.question}
                      options={item.options}
                      allowMultiSelect={item.allowMultiSelect}
                      onSubmit={(resp) => handleChoiceSubmit(item.executionId, resp)}
                      onCancel={() => handleChoiceSubmit(item.executionId, { cancelled: true })}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
