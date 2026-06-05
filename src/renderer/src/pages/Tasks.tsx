import { useState, useCallback, useMemo, Fragment } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useAppStore } from '@renderer/store/appStore'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomTextarea from '@renderer/components/ui/CustomTextarea'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import ItemPickerModal from '@renderer/components/ui/ItemPickerModal'
import Modal from '@renderer/components/ui/Modal'
import Pagination from '@renderer/components/ui/Pagination'
import { taskApi } from '@renderer/lib/api'
import TaskDetailRow from '@renderer/components/tasks/TaskDetailRow'
import AiAssistButton from '@renderer/components/AiAssistButton'
import type { Task } from '@renderer/types'
import type { FrontendAction } from '@renderer/lib/frontendActionBus'

const PAGE_SIZE = 20

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '待处理',
  assigned: '已指派',
  claimed: '处理中',
  pending_review: '待验收',
  completed: '已完成',
  failed: '失败',
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600',
  pending: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  assigned: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  claimed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  pending_review: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
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

const STATUS_DOT_COLOR: Record<string, string> = {
  draft: 'bg-gray-300', pending: 'bg-sky-400', assigned: 'bg-indigo-400',
  claimed: 'bg-blue-400', pending_review: 'bg-amber-400', completed: 'bg-emerald-400', failed: 'bg-red-400',
}

const FILTERS = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待处理' },
  { value: 'assigned', label: '已指派' },
  { value: 'claimed', label: '处理中' },
  { value: 'pending_review', label: '待验收' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
]
const TASK_SCHEMA: Record<string, string> = {
  title: '任务标题',
  description: '任务描述，将作为团队执行的输入',
  priority: '优先级（0=低, 1=普通, 2=高, 3=紧急）',
  status: '状态（draft=草稿, pending=待处理）',
}
export default function Tasks() {
  const { teams, projects, tasks: allTasks } = useAppStore()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<number | ''>('')
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
    status: 'draft' | 'pending'
    parentId?: string
    projectId?: string
  }

  const createForm = useForm<TaskFormData>({
    defaultValues: { title: '', description: '', priority: 1, status: 'pending' },
  })

  const editForm = useForm<TaskFormData>({
    defaultValues: { title: '', description: '', priority: 1, status: 'pending' },
  })

  const createTitle = useWatch({ control: createForm.control, name: 'title' })
  const createDescription = useWatch({ control: createForm.control, name: 'description' })
  const createPriority = useWatch({ control: createForm.control, name: 'priority' })
  const createStatus = useWatch({ control: createForm.control, name: 'status' })
  const createParentId = useWatch({ control: createForm.control, name: 'parentId' })
  const createProjectId = useWatch({ control: createForm.control, name: 'projectId' })

  const editTitle = useWatch({ control: editForm.control, name: 'title' })
  const editDescription = useWatch({ control: editForm.control, name: 'description' })
  const editPriority = useWatch({ control: editForm.control, name: 'priority' })
  const editStatus = useWatch({ control: editForm.control, name: 'status' })
  const editProjectId = useWatch({ control: editForm.control, name: 'projectId' })

  const goToPage = (p: number) => { setPage(p); setExpandedId(null) }

  const setFilter = (filter: string) => {
    setStatusFilter(filter)
    setPage(1)
  }

  const filtered = allTasks
    .filter(t => !statusFilter || t.status === statusFilter)
    .filter(t => priorityFilter === '' || t.priority === priorityFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const tasks = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleCreate = createForm.handleSubmit(async (data) => {
    // 子任务继承父任务的 projectId
    let projectId = data.projectId
    if (data.parentId && !projectId) {
      const parent = allTasks.find(t => t.id === data.parentId)
      if (parent?.projectId) projectId = parent.projectId
    }
    await taskApi.create({ title: data.title, description: data.description, priority: data.priority, status: data.status, parentId: data.parentId || undefined, projectId: projectId || undefined })
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

  const handleApprove = async (id: string) => {
    if (!confirm('确认验收通过？任务将标记为已完成。')) return
    await taskApi.approve(id)
  }

  const handleReject = async (id: string, comment?: string) => {
    if (!confirm('确认驳回？任务将打回待处理，可重新执行。')) return
    await taskApi.reject(id, comment)
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    editForm.reset({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: (task.status === 'draft' || task.status === 'pending') ? task.status : 'pending',
      projectId: task.projectId || undefined,
    })
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
  const getParentTask = (parentId?: string) => parentId ? allTasks.find(t => t.id === parentId) : undefined
  const getProject = (projectId?: string) => projectId ? projects.find(p => p.id === projectId) : undefined

  const formatTime = (t?: string) => t ? new Date(t).toLocaleString('zh-CN') : '-'

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const onAiAction = useCallback((form: ReturnType<typeof useForm<TaskFormData>>) => {
    return (action: FrontendAction) => {
      if (action.action !== 'setConfig' || !action.payload) return
      for (const [key, value] of Object.entries(action.payload)) {
        form.setValue(key as keyof TaskFormData, value)
      }
    }
  }, [])

  const editSchema = useMemo(() => {
    if (!editingTask) return TASK_SCHEMA
    if (editingTask.status === 'assigned') return { title: TASK_SCHEMA.title } as Record<string, string>
    if (editingTask.status === 'pending_review' || editingTask.status === 'completed' || editingTask.status === 'failed') {
      return { title: TASK_SCHEMA.title, description: TASK_SCHEMA.description } as Record<string, string>
    }
    if (editingTask.status === 'draft' || editingTask.status === 'pending') {
      return { ...TASK_SCHEMA }
    }
    return TASK_SCHEMA
  }, [editingTask])

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
            onClick={() => setFilter(s.value)}
            variant={statusFilter === s.value ? 'primary' : 'ghost'}
            size="sm"
          >
            {s.value ? (
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLOR[s.value] || 'bg-gray-300'}`} />
                {s.label}
              </span>
            ) : (
              s.label
            )}
          </CustomButton>
        ))}
        <CustomSelect
          value={String(priorityFilter)}
          onChange={v => setPriorityFilter(v === '' ? '' : Number(v))}
          options={[
            { value: '', label: '全部优先级' },
            { value: '0', label: '低' },
            { value: '1', label: '普通' },
            { value: '2', label: '高' },
            { value: '3', label: '紧急' },
          ]}
          size="sm"
          className="ml-auto w-[130px]"
        />
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
            <CustomButton onClick={() => setFilter('')} variant="ghost" size="sm" className="mt-4">
              清除筛选
            </CustomButton>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700/50">
              <table className="w-full text-sm bg-white dark:bg-gray-900">
                <thead className="sticky top-0 z-10 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
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
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tasks.map(task => (
                    <Fragment key={task.id}>
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
                          <div className="flex items-center gap-1.5">
                            {task.parentId && (
                              <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold leading-none" title={`${getParentTask(task.parentId)?.title || '未知'} 的子任务`}>
                                子
                              </span>
                            )}
                            <span className="truncate">{task.title}</span>
                            {task.projectId && getProject(task.projectId) && (
                              <span
                                onClick={(e) => { e.stopPropagation(); window.api.shell.openPath(getProject(task.projectId)!.workDir) }}
                                title={`打开目录: ${getProject(task.projectId)?.workDir}`}
                                className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 border border-blue-200 dark:border-blue-800 ml-1 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                              >
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                                </svg>
                                {getProject(task.projectId)?.name}
                              </span>
                            )}
                          </div>
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
                                title="指派"
                                onClick={(e) => { e.stopPropagation(); setAssigningTaskId(task.id) }}
                                className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 transition-colors"
                              >
                                <svg viewBox="0 0 1024 1024" className="w-3.5 h-3.5">
                                  <path d="M43.2 404.8v469.312c0 23.552 19.136 42.688 42.688 42.688h128a42.688 42.688 0 0 0 42.688-42.688V404.8a42.688 42.688 0 0 0-42.688-42.688h-128a42.688 42.688 0 0 0-42.688 42.688z m85.376 42.624h42.624v384H128.64v-384z" fill="#FFDC64" />
                                  <path d="M171.2 874.112V404.8c0-11.968 5.12-23.424 13.888-31.488q228.48-209.152 265.408-240.448 52.736-44.8 102.016-14.72 45.44 27.712 45.44 106.432 0 40.832-27.52 80.128-13.952 19.968-47.232 52.864l-4.48 4.544 356.48 0.064q44.096 0 75.392 31.168 31.232 31.232 31.36 75.392v0.128q0 44.16-31.36 75.52-31.232 31.232-75.456 31.232h-134.272l-37.12 241.28-0.192 1.024q-6.528 36.416-33.92 63.232-36.48 35.648-94.528 35.648H213.888a42.688 42.688 0 0 1-42.688-42.688z m403.904-42.688H256.64V423.552Q471.168 227.2 505.728 197.888q1.792-1.536 3.328-2.624 3.584 10.752 3.584 29.312 0 23.36-49.472 72.32-28.096 27.84-39.424 43.264-23.872 32.256-23.872 64.64c0 23.552 19.136 42.624 42.688 42.624l432.576 0.064q8.96 0 15.168 6.272 6.272 6.208 6.272 15.104 0 21.44-21.44 21.44h-170.88a42.688 42.688 0 0 0-42.176 36.16l-42.56 276.8q-5.376 28.16-44.416 28.16z" fill="#FFDC64" />
                                </svg>
                              </button>
                            )}
                            {(task.status === 'claimed' || task.status === 'assigned' || task.status === 'pending_review') && (
                              <button
                                title="终止"
                                onClick={(e) => { e.stopPropagation(); handleCancel(task.id) }}
                                className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                              </button>
                            )}
                            {task.status === 'pending_review' && (
                              <>
                                <button
                                  title="验收通过"
                                  onClick={(e) => { e.stopPropagation(); handleApprove(task.id) }}
                                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </button>
                                <button
                                  title="驳回"
                                  onClick={(e) => { e.stopPropagation(); handleReject(task.id) }}
                                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-800 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18.36 6.64a9 9 0 11-12.73 0" />
                                    <line x1="12" y1="2" x2="12" y2="12" />
                                  </svg>
                                </button>
                              </>
                            )}
                            {task.status !== 'claimed' && (
                              <button
                                title="编辑"
                                onClick={(e) => { e.stopPropagation(); openEdit(task) }}
                                className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            )}
                            <button
                              title="删除"
                              onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }}
                              className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
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
                        <TaskDetailRow
                          task={task}
                          colSpan={7}
                          getTeamName={getTeamName}
                          getParentTask={getParentTask}
                          getProject={getProject}
                          projects={projects}
                          allTasks={allTasks}
                          onCancel={handleCancel}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onRestart={(id) => taskApi.restart(id)}
                          onClose={() => toggleExpand(task.id)}
                        />
                      )}
                    </Fragment>
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
          <div className="flex items-center justify-between w-full">
            <AiAssistButton context={{
              contextType: 'task-editor',
              contextId: '__create__',
              label: createTitle || '新任务',
              data: createForm.getValues(),
              schema: TASK_SCHEMA,
            }} onAction={onAiAction(createForm)} />
            <div className="flex items-center gap-2">
              <CustomButton onClick={() => { createForm.reset(); setShowCreate(false) }} variant="secondary" size='sm'>取消</CustomButton>
              <CustomButton onClick={handleCreate} variant="primary" loading={createForm.formState.isSubmitting} size='sm'>
                <span>✨</span>
                <span>创建任务</span>
              </CustomButton>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">标题 <span className="text-red-500">*</span></label>
            <CustomInput value={createTitle} onChange={e => createForm.setValue('title', e.target.value)} placeholder="输入任务标题" autoFocus size='sm' />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述 <span className="text-red-500">*</span></label>
            <CustomTextarea value={createDescription} onChange={e => createForm.setValue('description', e.target.value)} placeholder="任务描述，将被作为团队执行的输入" rows={3} size='sm' />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">优先级</label>
              <CustomSelect
                value={String(createPriority)}
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
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">状态</label>
              <CustomSelect
                value={createStatus}
                onChange={v => createForm.setValue('status', v as 'draft' | 'pending')}
                options={[
                  { value: 'pending', label: '待处理' },
                  { value: 'draft', label: '草稿' },
                ]}
                size="sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">父任务（可选）</label>
            <CustomSelect
              value={createParentId || ''}
              onChange={v => createForm.setValue('parentId', v || undefined)}
              options={[
                { value: '', label: '无（顶级任务）' },
                ...allTasks
                  .filter(t => t.id !== '__new__' && t.status !== 'draft')
                  .map(t => ({ value: t.id, label: `[${STATUS_LABEL[t.status] || t.status}] ${t.title}` })),
              ]}
              size="sm"
            />
          </div>
          {/* 仅顶级任务可选项目 */}
          {!createParentId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">项目（可选）</label>
              <CustomSelect
                value={createProjectId || ''}
                onChange={v => createForm.setValue('projectId', v || undefined)}
                options={[
                  { value: '', label: '无' },
                  ...projects.map(p => ({ value: p.id, label: p.name })),
                ]}
                size="sm"
              />
              {createProjectId && getProject(createProjectId) && (
                <p className="text-xs text-gray-400 mt-1">
                  工作目录: {getProject(createProjectId)?.workDir}
                </p>
              )}
            </div>
          )}
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
          <div className="flex items-center justify-between w-full">
            {editingTask && (
              <AiAssistButton context={{
                contextType: 'task-editor',
                contextId: editingTask.id,
                label: editTitle || '编辑任务',
                data: editForm.getValues(),
                schema: editSchema,
              }} onAction={onAiAction(editForm)} />
            )}
            <div className="flex items-center gap-2">
              <CustomButton onClick={() => { setEditingTask(null); setEditError('') }} variant="secondary" size='sm'>取消</CustomButton>
              <CustomButton onClick={handleEditSave} variant="primary" loading={editForm.formState.isSubmitting} size='sm'>
                保存
              </CustomButton>
            </div>
          </div>
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
            <CustomInput value={editTitle} onChange={e => editForm.setValue('title', e.target.value)} placeholder="任务标题" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述 <span className="text-red-500">*</span></label>
            <CustomTextarea value={editDescription} onChange={e => editForm.setValue('description', e.target.value)} placeholder="任务描述" rows={3} disabled={editingTask?.status === 'assigned'} />
          </div>
          {(editingTask?.status === 'pending' || editingTask?.status === 'draft') && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">优先级</label>
                <CustomSelect
                  value={String(editPriority)}
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
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">状态</label>
                <CustomSelect
                  value={editStatus}
                  onChange={v => editForm.setValue('status', v as 'draft' | 'pending')}
                  options={[
                    { value: 'pending', label: '待处理' },
                    { value: 'draft', label: '草稿' },
                  ]}
                  size="sm"
                />
              </div>
            </div>
          )}
          {editingTask && (editingTask.status === 'pending' || editingTask.status === 'draft') && !editingTask.parentId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">项目（可选）</label>
              <CustomSelect
                value={editProjectId || ''}
                onChange={v => editForm.setValue('projectId', v || undefined)}
                options={[
                  { value: '', label: '无' },
                  ...projects.map(p => ({ value: p.id, label: p.name })),
                ]}
                size="sm"
              />
            </div>
          )}
          {editingTask && editingTask.status !== 'pending' && editingTask.status !== 'draft' && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {editingTask.status === 'assigned' ? '任务已指派，仅可修改标题。' : '仅可修改标题和描述。'}
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

