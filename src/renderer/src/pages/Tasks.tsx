import { useState } from 'react'
import { useAppStore } from '@renderer/store/appStore'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomTextarea from '@renderer/components/ui/CustomTextarea'
import { taskApi } from '@renderer/lib/api'
import type { Task } from '@renderer/types'

const STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  claimed: '处理中',
  completed: '已完成',
  failed: '失败',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600',
  claimed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  completed: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  failed: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
}

const PRIORITY_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: '低', color: 'bg-gray-100 dark:bg-gray-700 text-gray-500' },
  1: { label: '普通', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  2: { label: '高', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  3: { label: '紧急', color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
}

export default function Tasks() {
  const { teams, tasks: storeTasks } = useAppStore()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPriority, setFormPriority] = useState(1)
  const [saving, setSaving] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignTeamId, setAssignTeamId] = useState('')

  const tasks = statusFilter
    ? storeTasks.filter(t => t.status === statusFilter)
    : storeTasks
  const loading = false

  const handleCreate = async () => {
    if (!formTitle.trim() || !formDesc.trim()) return
    setSaving(true)
    try {
      await taskApi.create({ title: formTitle.trim(), description: formDesc.trim(), priority: formPriority })
      setShowCreate(false)
      setFormTitle('')
      setFormDesc('')
      setFormPriority(1)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此任务？')) return
    await taskApi.delete(id)
    if (selectedTask?.id === id) setSelectedTask(null)
  }

  const handleAssign = async (taskId: string, teamId: string) => {
    await taskApi.assign(taskId, teamId)
    setAssigningId(null)
    setAssignTeamId('')
  }

  const getTeamName = (id?: string) => id ? teams.find(t => t.id === id)?.name || id : '-'

  const formatTime = (t?: string) => t ? new Date(t).toLocaleString('zh-CN') : '-'

  return (
    <div className="px-6 py-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            任务池
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Task List */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Filter */}
          <div className="flex items-center gap-2 mb-4">
            {['', 'pending', 'claimed', 'completed', 'failed'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  statusFilter === s
                    ? 'bg-teal-500 text-white border-teal-500'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-teal-300'
                }`}
              >
                {s ? STATUS_LABEL[s] : '全部'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">加载中...</div>
          ) : tasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 mb-6">
                <span className="text-4xl">🎫</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                还没有任务
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                创建任务后，团队和工作流可以从任务池中认领处理
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-200 shadow-lg font-medium"
              >
                创建第一个任务
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-auto rounded-xl border border-gray-200/50 dark:border-gray-700/50">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">优先级</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">状态</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">标题</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">认领团队</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">创建时间</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {tasks.map(task => (
                    <tr
                      key={task.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors ${
                        selectedTask?.id === task.id ? 'bg-teal-50 dark:bg-teal-900/10' : ''
                      }`}
                      onClick={() => { setSelectedTask(task); setAssigningId(null) }}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${PRIORITY_LABEL[task.priority]?.color || ''}`}>
                          {PRIORITY_LABEL[task.priority]?.label || task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${STATUS_COLOR[task.status] || ''}`}>
                          {STATUS_LABEL[task.status] || task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                        {task.title}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {getTeamName(task.claimedBy)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 hidden md:table-cell text-xs">
                        {formatTime(task.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {task.status === 'pending' && (
                            assigningId === task.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <select
                                  value={assignTeamId}
                                  onChange={e => setAssignTeamId(e.target.value)}
                                  className="text-[10px] px-1 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 max-w-[80px]"
                                >
                                  <option value="">选择团队</option>
                                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <button
                                  onClick={() => handleAssign(task.id, assignTeamId)}
                                  disabled={!assignTeamId}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500 text-white disabled:opacity-40"
                                >
                                  确认
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setAssigningId(task.id); setAssignTeamId('') }}
                                className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-800"
                              >
                                指派
                              </button>
                            )
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedTask && (
          <div className="w-80 flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-auto mt-10">
            <div className="flex items-center justify-between mb-4 px-5 pt-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">任务详情</h3>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>
            <div className="px-5 pb-5">
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">{selectedTask.title}</h4>

            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${STATUS_COLOR[selectedTask.status] || ''}`}>
                {STATUS_LABEL[selectedTask.status] || selectedTask.status}
              </span>
              <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${PRIORITY_LABEL[selectedTask.priority]?.color || ''}`}>
                {PRIORITY_LABEL[selectedTask.priority]?.label || selectedTask.priority}
              </span>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap">
              {selectedTask.description || '暂无描述'}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">认领团队</span>
                <span className="text-gray-700 dark:text-gray-300">{getTeamName(selectedTask.claimedBy)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">创建时间</span>
                <span className="text-gray-700 dark:text-gray-300">{formatTime(selectedTask.createdAt)}</span>
              </div>
              {selectedTask.claimedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">认领时间</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatTime(selectedTask.claimedAt)}</span>
                </div>
              )}
              {selectedTask.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">完成时间</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatTime(selectedTask.completedAt)}</span>
                </div>
              )}
              {selectedTask.executionId && (
                <div className="flex justify-between">
                  <span className="text-gray-400">执行 ID</span>
                  <span className="text-gray-700 dark:text-gray-300 truncate max-w-[160px]" title={selectedTask.executionId}>
                    {selectedTask.executionId}
                  </span>
                </div>
              )}
            </div>

            {selectedTask.status === 'completed' && selectedTask.result && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-1">执行结果</p>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-auto">
                  {selectedTask.result}
                </div>
              </div>
            )}

            {selectedTask.status === 'failed' && selectedTask.error && (
              <div className="mt-4">
                <p className="text-xs font-medium text-red-500 mb-1">错误信息</p>
                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                  {selectedTask.error}
                </div>
              </div>
            )}
            </div>{/* end px-5 pb-5 */}
          </div>
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
                <select
                  value={formPriority}
                  onChange={e => setFormPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  <option value={0}>低</option>
                  <option value={1}>普通</option>
                  <option value={2}>高</option>
                  <option value={3}>紧急</option>
                </select>
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
    </div>
  )
}
