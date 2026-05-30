import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAppStore } from '@renderer/store/appStore'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomTextarea from '@renderer/components/ui/CustomTextarea'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import ItemPickerModal from '@renderer/components/ui/ItemPickerModal'
import Modal from '@renderer/components/ui/Modal'
import Pagination from '@renderer/components/ui/Pagination'
import { taskApi } from '@renderer/lib/api'
import MarkdownPreview from '@renderer/components/MarkdownPreview'
import type { Task } from '@renderer/types'

const PAGE_SIZE = 20

const STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  assigned: '已指派',
  claimed: '处理中',
  completed: '已完成',
  failed: '失败',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600',
  assigned: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  claimed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  completed: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  failed: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
}

const PRIORITY_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: '低', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400' },
  1: { label: '普通', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  2: { label: '高', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  3: { label: '紧急', color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
}

const COL_WIDTHS = {
  priority: 'w-[80px]',
  status: 'w-[90px]',
  team: 'w-[130px]',
  time: 'w-[145px]',
  actions: 'w-[160px]',
  chevron: 'w-5',
} as const

const FILTERS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'claimed', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
]

export default function Tasks() {
  const { teams, tasks: allTasks } = useAppStore()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editError, setEditError] = useState('')

  interface TaskFormData {
    title: string
    description: string
    priority: number
  }

  const createForm = useForm<TaskFormData>({
    defaultValues: { title: '', description: '', priority: 1 },
  })

  const editForm = useForm<TaskFormData>({
    defaultValues: { title: '', description: '', priority: 1 },
  })

  const goToPage = (p: number) => { setPage(p); setExpandedId(null) }

  const filtered = (statusFilter ? allTasks.filter(t => t.status === statusFilter) : allTasks)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const tasks = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // 切换筛选时回到第一页
  useEffect(() => { setPage(1) }, [statusFilter])

  const handleCreate = createForm.handleSubmit(async (data) => {
    await taskApi.create(data)
    createForm.reset()
    setShowCreate(false)
  })

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此任务？')) return
    await taskApi.delete(id)
    if (expandedId === id) setExpandedId(null)
  }

  const handleCancel = async (id: string) => {
    if (!confirm('确定终止此任务？将回退为待处理状态。')) return
    await taskApi.cancel(id)
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    editForm.reset({ title: task.title, description: task.description, priority: task.priority })
    setEditError('')
  }

  const handleEditSave = editForm.handleSubmit(async (data) => {
    if (!editingTask) return
    setEditError('')
    try {
      await taskApi.update(editingTask.id, data)
      setEditingTask(null)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || '编辑失败'
      setEditError(msg)
    }
  })

  const handleAssign = async (taskId: string, teamIds: string[]) => {
    if (teamIds.length === 0) return
    await taskApi.assign(taskId, teamIds[0])
    setAssigningTaskId(null)
  }

  const getTeamName = (id?: string) => id ? teams.find(t => t.id === id)?.name || id : '-'

  const formatTime = (t?: string) => t ? new Date(t).toLocaleString('zh-CN') : '-'

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className="px-6 py-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            任务池
          </h1>
          <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
            管理待办任务，团队和工作流可以从任务池中认领并处理任务
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CustomButton onClick={() => setShowCreate(true)} variant="primary" size="sm">
            <span>✨</span>
            <span>创建任务</span>
          </CustomButton>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        {FILTERS.map(s => (
          <CustomButton
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            variant={statusFilter === s.value ? 'primary' : 'ghost'}
            size="sm"
          >
            {s.label}
          </CustomButton>
        ))}
      </div>

      {/* Table area */}
      <div className="flex-1 flex flex-col min-h-0">
        {allTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-6">
              <span className="text-4xl">🎫</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              还没有任务
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-400 mb-6">
              创建任务后，团队和工作流可以从任务池中认领处理
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg font-medium"
            >
              创建第一个任务
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <svg className="w-14 h-14 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm font-medium text-gray-900 dark:text-white">未找到匹配的任务</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">尝试使用其他筛选条件</p>
            <CustomButton onClick={() => setStatusFilter('')} variant="ghost" size="sm" className="mt-4">
              清除筛选
            </CustomButton>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700/50">
              <table className="w-full text-sm bg-white dark:bg-gray-900">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100/95 dark:bg-gray-800/95 backdrop-blur-sm text-left">
                    <th className={`px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider ${COL_WIDTHS.priority} text-center`}>优先级</th>
                    <th className={`px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider ${COL_WIDTHS.status} text-center`}>状态</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider">标题</th>
                    <th className={`px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider hidden sm:table-cell ${COL_WIDTHS.team}`}>认领团队</th>
                    <th className={`px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider hidden md:table-cell ${COL_WIDTHS.time}`}>创建时间</th>
                    <th className={`px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider ${COL_WIDTHS.actions}`}>操作</th>
                    <th className={`px-2 py-3 ${COL_WIDTHS.chevron}`} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {tasks.map(task => (
                    <>
                      {/* Main row */}
                      <tr
                        className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/30 cursor-pointer transition-colors even:bg-gray-50/40 dark:even:bg-gray-800/20 ${expandedId === task.id ? '!bg-blue-100 dark:!bg-blue-900/20' : ''
                          }`}
                        onClick={() => toggleExpand(task.id)}
                      >
                        <td className={`px-4 py-3 ${expandedId === task.id ? 'border-l-2 border-l-blue-400 dark:border-l-blue-500' : ''}`}>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${PRIORITY_LABEL[task.priority]?.color || ''}`}>
                            {PRIORITY_LABEL[task.priority]?.label || task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_COLOR[task.status] || ''}`}>
                            {STATUS_LABEL[task.status] || task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[280px]">
                          {task.title}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-400 hidden sm:table-cell text-xs truncate max-w-[120px]">
                          {getTeamName(task.claimedBy)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500 hidden md:table-cell text-xs whitespace-nowrap">
                          {formatTime(task.createdAt)}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            {task.status === 'pending' && (
                              <CustomButton
                                onClick={(e) => { e.stopPropagation(); setAssigningTaskId(task.id) }}
                                size="xs"
                                variant="primary"
                              >
                                指派
                              </CustomButton>
                            )}
                            {(task.status === 'claimed' || task.status === 'assigned') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCancel(task.id) }}
                                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors"
                              >
                                终止
                              </button>
                            )}
                            {task.status !== 'claimed' && (
                              <CustomButton
                                onClick={(e) => { e.stopPropagation(); openEdit(task) }}
                                size="xs"
                                variant="secondary"
                              >
                                编辑
                              </CustomButton>
                            )}
                            <CustomButton
                              onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }}
                              variant="danger"
                              size="xs"
                            >
                              删除
                            </CustomButton>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <svg
                            className={`w-4 h-4 text-gray-300 dark:text-gray-600 transition-transform duration-200 ${expandedId === task.id ? 'rotate-90' : ''
                              }`}
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          >
                            <path d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedId === task.id && (
                        <tr className="bg-blue-50/40 dark:bg-blue-900/10 border-b border-gray-100 dark:border-gray-700">
                          <td colSpan={7} className="px-6 py-4">
                            {/* Restart badge */}
                            {task.restartedFrom && (() => {
                              const prev = JSON.parse(task.restartedFrom)
                              return (
                                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800/50 text-xs flex items-center gap-2">
                                  <span className="font-semibold text-orange-600 dark:text-orange-400">↻ 已重启</span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    前一次: {prev.status === 'completed' ? '已完成' : '失败'}
                                    {prev.completedAt && ` · ${new Date(prev.completedAt).toLocaleString('zh-CN')}`}
                                  </span>
                                </div>
                              )
                            })()}

                            <div className="flex flex-col md:flex-row gap-6">
                              {/* Left: Description + Result/Error */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-white/60 dark:bg-gray-900/30 rounded-lg p-3 border border-gray-100 dark:border-gray-700/50">
                                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                      <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    描述
                                  </h4>
                                  {task.description || '暂无描述'}
                                </p>

                                {/* Result */}
                                {task.status === 'completed' && task.result && (
                                  <div className="mt-4">
                                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                      </svg>
                                      执行结果
                                    </h4>
                                    <div className="p-3 bg-white dark:bg-gray-900/40 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 max-h-48 overflow-auto">
                                      <MarkdownPreview content={task.result} className="text-sm" />
                                    </div>
                                  </div>
                                )}

                                {/* Error */}
                                {task.status === 'failed' && task.error && (
                                  <div className="mt-4">
                                    <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                      </svg>
                                      错误信息
                                    </h4>
                                    <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200/50 dark:border-red-800/50 max-h-48 overflow-auto">
                                      <MarkdownPreview content={task.error} className="text-sm text-red-600 dark:text-red-400" />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right sidebar: Metadata */}
                              <div className="w-full md:w-80 flex-shrink-0">
                                <div className="bg-white/60 dark:bg-gray-900/30 rounded-lg border border-gray-100 dark:border-gray-700/50 p-4 space-y-4">
                                  {/* Timeline */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                      </svg>
                                      时间线
                                    </h4>
                                    <div className="space-y-2.5 text-xs">
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-400">创建</span>
                                        <span className="text-gray-700 dark:text-gray-300">{formatTime(task.createdAt)}</span>
                                      </div>
                                      {task.claimedAt && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-400">认领</span>
                                          <span className="text-gray-700 dark:text-gray-300">{formatTime(task.claimedAt)}</span>
                                        </div>
                                      )}
                                      {task.completedAt && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-400">完成</span>
                                          <span className="text-gray-700 dark:text-gray-300">{formatTime(task.completedAt)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="border-t border-gray-100 dark:border-gray-700" />

                                  {/* Team */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 00-3-3.87" />
                                        <path d="M16 3.13a4 4 0 010 7.75" />
                                      </svg>
                                      认领团队
                                    </h4>
                                    <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                      {getTeamName(task.claimedBy)}
                                    </div>
                                  </div>

                                  {/* Execution ID */}
                                  {task.executionId && (
                                    <>
                                      <div className="border-t border-gray-100 dark:border-gray-700" />
                                      <div>
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">执行 ID</h4>
                                        <div className="text-[10px] text-gray-600 dark:text-gray-400 font-mono truncate" title={task.executionId}>
                                          {task.executionId}
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* Cancel button */}
                                  {(task.status === 'claimed' || task.status === 'assigned') && (
                                    <>
                                      <div className="border-t border-gray-100 dark:border-gray-700" />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleCancel(task.id) }}
                                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors"
                                      >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <circle cx="12" cy="12" r="10" />
                                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                        </svg>
                                        <span>终止任务</span>
                                      </button>
                                    </>
                                  )}

                                  {/* Restart button */}
                                  {(task.status === 'completed' || task.status === 'failed') && (
                                    <>
                                      <div className="border-t border-gray-100 dark:border-gray-700" />
                                      <button
                                        onClick={async (e) => { e.stopPropagation(); await taskApi.restart(task.id) }}
                                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-800 transition-colors"
                                      >
                                        <span>↻</span>
                                        <span>重启任务</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={safePage} totalPages={totalPages} onChange={goToPage} />
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14m-7-7h14" />
              </svg>
            </div>
            <div>
              <span className="text-base font-semibold">创建任务</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">任务将被添加到任务池中等待团队认领</p>
            </div>
          </div>
        }
        footer={
          <>
            <CustomButton onClick={() => { createForm.reset(); setShowCreate(false) }} variant="secondary" size='sm'>取消</CustomButton>
            <CustomButton onClick={handleCreate} variant="primary" loading={createForm.formState.isSubmitting} size='sm'>
              <span>✨</span>
              <span>创建任务</span>
            </CustomButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">标题 <span className="text-red-500">*</span></label>
            <CustomInput value={createForm.watch('title')} onChange={e => createForm.setValue('title', e.target.value)} placeholder="输入任务标题" autoFocus size='sm' />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述 <span className="text-red-500">*</span></label>
            <CustomTextarea value={createForm.watch('description')} onChange={e => createForm.setValue('description', e.target.value)} placeholder="任务描述，将被作为团队执行的输入" rows={3} size='sm' />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">优先级</label>
            <CustomSelect
              value={String(createForm.watch('priority'))}
              onChange={v => createForm.setValue('priority', Number(v))}
              options={[
                { value: '0', label: '低' },
                { value: '1', label: '普通' },
                { value: '2', label: '高' },
                { value: '3', label: '紧急' },
              ]}
              size="sm"
            />
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="text-base font-semibold">编辑任务</span>
          </div>
        }
        footer={
          <>
            <CustomButton onClick={() => { setEditingTask(null); setEditError('') }} variant="secondary">取消</CustomButton>
            <CustomButton onClick={handleEditSave} variant="primary" loading={editForm.formState.isSubmitting}>
              保存
            </CustomButton>
          </>
        }
      >
        <div className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              {editError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">标题 <span className="text-red-500">*</span></label>
            <CustomInput value={editForm.watch('title')} onChange={e => editForm.setValue('title', e.target.value)} placeholder="任务标题" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述 <span className="text-red-500">*</span></label>
            <CustomTextarea value={editForm.watch('description')} onChange={e => editForm.setValue('description', e.target.value)} placeholder="任务描述" rows={3} />
          </div>
          {editingTask?.status === 'pending' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">优先级</label>
              <CustomSelect
                value={String(editForm.watch('priority'))}
                onChange={v => editForm.setValue('priority', Number(v))}
                options={[
                  { value: '0', label: '低' },
                  { value: '1', label: '普通' },
                  { value: '2', label: '高' },
                  { value: '3', label: '紧急' },
                ]}
                size="sm"
              />
            </div>
          )}
          {editingTask && editingTask.status !== 'pending' && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {editingTask.status === 'assigned' ? '任务已指派，仅可修改标题。' : '任务已结束，仅可修改标题和描述。'}
            </p>
          )}
        </div>
      </Modal>

      {/* Assign team modal */}
      <ItemPickerModal
        open={!!assigningTaskId}
        title="选择团队 - 指派任务"
        items={teams.map(t => ({ id: t.id, label: t.name, description: t.description }))}
        selected={[]}
        onClose={() => setAssigningTaskId(null)}
        onApply={(ids) => assigningTaskId && handleAssign(assigningTaskId, ids)}
      />
    </div>
  )
}

