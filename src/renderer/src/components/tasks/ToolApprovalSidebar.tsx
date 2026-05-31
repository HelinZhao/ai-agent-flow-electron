import { useState, useEffect, useCallback } from 'react'
import { teamExecutionApi } from '@renderer/lib/api'
import { useTeamExecutionStore } from '@renderer/store/teamExecutionStore'

interface ApprovalItem {
  executionId: string
  taskTitle?: string
  teamName?: string
  teamId?: string
  actionRequests: { name: string; args: Record<string, any>; description: string }[]
}

/** 获取待审批列表，返回 { items, count } */
async function fetchPendingApprovals(): Promise<{ items: ApprovalItem[]; count: number }> {
  const data = await teamExecutionApi.getPendingApprovalDetails()
  return { items: data.items, count: data.count }
}

export default function ToolApprovalSidebar() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [count, setCount] = useState(0)

  const markToolApproved = useTeamExecutionStore(s => s.markToolApproved)

  // 统一的刷新函数（供 effect 和回调复用）
  const refresh = useCallback(async () => {
    try {
      const data = await fetchPendingApprovals()
      setItems(data.items)
      setCount(data.count)
    } catch { /* ignore */ }
  }, [])

  // 轮询待审批列表（effect 直接复用 refresh）
  useEffect(() => {
    const id = setTimeout(refresh, 0) // 初始加载（延时避免同步 setState 警告）
    const timer = setInterval(refresh, 3000)
    return () => { clearTimeout(id); clearInterval(timer) }
  }, [refresh])

  const handleApprove = useCallback(async (executionId: string, decisions: { type: 'approve' | 'reject'; message?: string }[]) => {
    try {
      await teamExecutionApi.approveTool(executionId, decisions)
      markToolApproved(executionId)
      refresh()
    } catch { /* ignore */ }
  }, [markToolApproved, refresh])

  const handleAutoApprove = useCallback(async (executionId: string, toolName: string) => {
    try {
      // 先设置自动审批，再统一批准当前待审批项
      await teamExecutionApi.autoApprove(executionId, toolName)
      // 再尝试批准——若 setAutoApprove 已自动 resolve 则返回 404，忽略即可
      try {
        await teamExecutionApi.approveTool(executionId, [{ type: 'approve' }])
      } catch {
        // autoApprove 可能已自动放行，忽略 404
      }
      markToolApproved(executionId)
      refresh()
    } catch { /* ignore */ }
  }, [markToolApproved, refresh])

  if (count === 0 && !open) return null

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg transition-colors text-sm font-medium"
      >
        <span>🛡️</span>
        <span>审批</span>
        {count > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-600 text-white">
            {count}
          </span>
        )}
      </button>

      {/* Sidebar panel */}
      {open && (
        <div className="fixed inset-y-0 right-0 w-96 z-50 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              待审批工具调用
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
            {items.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">暂无待审批的工具调用</p>
            ) : (
              items.map((item, i) => (
                <div key={i} className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/50 space-y-2">
                  <div className="text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{item.teamName || '团队'}</span>
                    <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
                    <span className="text-gray-500 dark:text-gray-400">{item.taskTitle || '任务'}</span>
                  </div>
                  {item.actionRequests.map((a, j) => (
                    <div key={j} className="bg-white/60 dark:bg-gray-800/60 rounded p-2 text-xs">
                      <div className="font-semibold text-amber-600 dark:text-amber-400 truncate">🔧 {a.name}</div>
                      {a.description && <div className="text-gray-500 dark:text-gray-400 mt-0.5 truncate">{a.description}</div>}
                      <pre className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 overflow-x-auto whitespace-pre-wrap break-all max-h-32">
                        {JSON.stringify(a.args, null, 2)}
                      </pre>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(item.executionId, item.actionRequests.map(() => ({ type: 'approve' })))}
                      className="flex-1 px-2 py-1 text-xs font-medium rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >全部批准</button>
                    <button
                      onClick={() => handleApprove(item.executionId, item.actionRequests.map(() => ({ type: 'reject' })))}
                      className="flex-1 px-2 py-1 text-xs font-medium rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors"
                    >全部拒绝</button>
                    <button
                      onClick={() => handleAutoApprove(item.executionId, item.actionRequests[0]?.name || '')}
                      className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
                      title="以后自动批准此工具"
                    >🤖 auto</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
