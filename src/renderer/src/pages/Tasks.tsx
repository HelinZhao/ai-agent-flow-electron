import { useState, useEffect } from 'react'
import { useAppStore } from '@renderer/store/appStore'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomTextarea from '@renderer/components/ui/CustomTextarea'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import ItemPickerModal from '@renderer/components/ui/ItemPickerModal'
import Pagination from '@renderer/components/ui/Pagination'
import { taskApi } from '@renderer/lib/api'
import type { Task } from '@renderer/types'

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

const FILTERS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'claimed', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
]

export default function Tasks() {
  const { teams } = useAppStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPriority, setFormPriority] = useState(1)
  const [saving, setSaving] = useState(false)
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null)

  const fetchTasks = async (p: number) => {
    setLoading(true)
    try {
      const res = await taskApi.getAll({ status: statusFilter || undefined, page: p, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' })
      setTasks(res.tasks)
      setTotalPages(res.totalPages)
      setPage(res.page)
      setExpandedId(null)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTasks(1) }, [statusFilter]) // eslint-disable-line

  const handleCreate = async () => {
    if (!formTitle.trim() || !formDesc.trim()) return
    setSaving(true)
    try {
      await taskApi.create({ title: formTitle.trim(), description: formDesc.trim(), priority: formPriority })
      setShowCreate(false)
      setFormTitle('')
      setFormDesc('')
      setFormPriority(1)
      fetchTasks(page)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此任务？')) return
    await taskApi.delete(id)
    if (expandedId === id) setExpandedId(null)
    fetchTasks(page)
  }

  const handleAssign = async (taskId: string, teamIds: string[]) => {
    if (teamIds.length === 0) return
    await taskApi.assign(taskId, teamIds[0])
    setAssigningTaskId(null)
    fetchTasks(page)
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
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
              statusFilter === s.value
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table area */}
      <div className="flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">加载中...</div>
        ) : !tasks || tasks.length === 0 ? (
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
        ) : (
          <>
            <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700/50">
              <table className="w-full text-sm bg-white dark:bg-gray-900">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100/95 dark:bg-gray-800/95 backdrop-blur-sm text-left">
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider w-[70px]">优先级</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider w-[80px]">状态</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider">标题</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider hidden sm:table-cell w-[130px]">认领团队</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider hidden md:table-cell w-[150px]">创建时间</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-400 text-xs uppercase tracking-wider w-[140px]">操作</th>
                    <th className="px-2 py-3 w-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {tasks.map(task => (
                    <>
                      {/* Main row */}
                      <tr
                        className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/30 cursor-pointer transition-colors even:bg-gray-50/40 dark:even:bg-gray-800/20 ${
                          expandedId === task.id ? '!bg-blue-100 dark:!bg-blue-900/20' : ''
                        }`}
                        onClick={() => toggleExpand(task.id)}
                      >
                        <td className={`px-4 py-3 ${expandedId === task.id ? 'border-l-2 border-l-blue-400 dark:border-l-blue-500' : ''}`}>
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${PRIORITY_LABEL[task.priority]?.color || ''}`}>
                            {PRIORITY_LABEL[task.priority]?.label || task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border ${STATUS_COLOR[task.status] || ''}`}>
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
                              <button
                                onClick={(e) => { e.stopPropagation(); setAssigningTaskId(task.id) }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                              >
                                指派
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }}
                              className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <svg
                            className={`w-4 h-4 text-gray-300 dark:text-gray-600 transition-transform duration-200 ${
                              expandedId === task.id ? 'rotate-90' : ''
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Left: Description */}
                              <div className="md:col-span-2">
                                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">描述</h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                  {task.description || '暂无描述'}
                                </p>

                                {/* Result / Error */}
                                {task.status === 'completed' && task.result && (
                                  <div className="mt-4">
                                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">执行结果</h4>
                                    <div className="p-3 bg-white dark:bg-gray-900/40 rounded-lg border border-gray-200/50 dark:border-gray-700/50 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-auto font-mono">
                                      {task.result}
                                    </div>
                                  </div>
                                )}
                                {task.status === 'failed' && task.error && (
                                  <div className="mt-4">
                                    <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">错误信息</h4>
                                    <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200/50 dark:border-red-800/50 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono">
                                      {task.error}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right: Metadata */}
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">时间线</h4>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">创建时间</span>
                                      <span className="text-gray-700 dark:text-gray-300">{formatTime(task.createdAt)}</span>
                                    </div>
                                    {task.claimedAt && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">认领时间</span>
                                        <span className="text-gray-700 dark:text-gray-300">{formatTime(task.claimedAt)}</span>
                                      </div>
                                    )}
                                    {task.completedAt && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">完成时间</span>
                                        <span className="text-gray-700 dark:text-gray-300">{formatTime(task.completedAt)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">其他</h4>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">认领团队</span>
                                      <span className="text-gray-700 dark:text-gray-300 font-medium">{getTeamName(task.claimedBy)}</span>
                                    </div>
                                    {task.executionId && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">执行 ID</span>
                                        <span className="text-gray-700 dark:text-gray-300 font-mono text-[10px] truncate max-w-[140px]" title={task.executionId}>
                                          {task.executionId}
                                        </span>
                                      </div>
                                    )}
                                  </div>
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
            <Pagination page={page} totalPages={totalPages} onChange={fetchTasks} />
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6 mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">创建任务</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">标题 <span className="text-red-500">*</span></label>
                <CustomInput value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="任务标题" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述 <span className="text-red-500">*</span></label>
                <CustomTextarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="任务描述，将被作为团队执行的输入" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">优先级</label>
                <CustomSelect
                  value={String(formPriority)}
                  onChange={v => setFormPriority(Number(v))}
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
            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <CustomButton onClick={() => setShowCreate(false)} variant="secondary">取消</CustomButton>
              <CustomButton onClick={handleCreate} variant="primary" loading={saving} disabled={!formTitle.trim() || !formDesc.trim()}>
                创建
              </CustomButton>
            </div>
          </div>
        </div>
      )}

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

