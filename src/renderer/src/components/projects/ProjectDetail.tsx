import { useEffect, useMemo, useState } from 'react'
import CustomButton from '@renderer/components/ui/CustomButton'
import type { Project, Task } from '@renderer/types'

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿', pending: '待处理', assigned: '已指派',
  claimed: '处理中', pending_review: '待验收', completed: '已完成', failed: '失败',
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
const STATUS_BAR_COLOR: Record<string, string> = {
  pending: 'bg-sky-400', assigned: 'bg-indigo-400', claimed: 'bg-blue-400',
  pending_review: 'bg-amber-400', completed: 'bg-emerald-400', failed: 'bg-red-400', draft: 'bg-gray-300',
}

const STATUS_ORDER = ['pending', 'assigned', 'claimed', 'pending_review', 'completed', 'failed', 'draft']

/** 递归任务树节点 */
function TaskTreeNode({ task, allChildTasks, depth = 0 }: { task: Task; allChildTasks: Task[]; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const children = allChildTasks.filter(t => t.parentId === task.id)
  const hasChildren = children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
        style={{ marginLeft: depth * 20 }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <span className="w-4 flex justify-center flex-shrink-0">
          {hasChildren ? (
            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          ) : depth > 0 ? (
            <svg className="w-3 h-3 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="2" />
            </svg>
          ) : null}
        </span>
        <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full border flex-shrink-0 ${STATUS_COLOR[task.status] || ''}`}>
          {STATUS_LABEL[task.status] || task.status}
        </span>
        <span className="text-sm text-gray-900 dark:text-white truncate flex-1">{task.title}</span>
      </div>
      {hasChildren && expanded && children.map(child => (
        <TaskTreeNode key={child.id} task={child} allChildTasks={allChildTasks} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function ProjectDetail({
  project,
  allTasks,
  onBack,
  onEdit,
}: {
  project: Project
  allTasks: Task[]
  onBack: () => void
  onEdit: (p: Project) => void
}) {
  const [dirExists, setDirExists] = useState<boolean | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const projectTasks = useMemo(() => allTasks.filter(t => t.projectId === project.id), [allTasks, project.id])
  const rootTasks = useMemo(() => projectTasks.filter(t => !t.parentId), [projectTasks])
  const childTasks = useMemo(() => projectTasks.filter(t => t.parentId), [projectTasks])

  // 按筛选过滤
  const filteredRootTasks = useMemo(
    () => statusFilter ? rootTasks.filter(t => t.status === statusFilter) : rootTasks,
    [rootTasks, statusFilter],
  )
  const filteredChildTasks = useMemo(
    () => statusFilter ? childTasks.filter(t => t.status === statusFilter) : childTasks,
    [childTasks, statusFilter],
  )

  // 状态分布
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of projectTasks) counts[t.status] = (counts[t.status] || 0) + 1
    return counts
  }, [projectTasks])
  const totalTasks = projectTasks.length

  // 最近动态
  const recentActivities = useMemo(() => {
    return [...projectTasks]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
  }, [projectTasks])

  // 检查目录
  useEffect(() => {
    window.api.file.exists(project.workDir).then(setDirExists).catch(() => setDirExists(null))
  }, [project.workDir])

  const handleOpenDir = async () => {
    try { await window.api.shell.openPath(project.workDir) } catch { /* ignore */ }
  }

  const FILTERS = [
    { value: '', label: '全部' },
    ...STATUS_ORDER.map(s => ({ value: s, label: `${STATUS_LABEL[s]}${statusCounts[s] ? ` (${statusCounts[s]})` : ''}` })),
  ]

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors flex-shrink-0 mt-1" title="返回">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent truncate">
              {project.name}
            </h1>
            <button onClick={handleOpenDir} title="打开工作目录" className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 transition-colors flex-shrink-0">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              打开目录
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{project.description || '暂无描述'}</p>
            <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate max-w-[200px]" title={project.workDir}>{project.workDir}</span>
            {/* 目录状态 */}
            {dirExists === true && <span className="text-xs text-emerald-500 flex-shrink-0">✓ 目录正常</span>}
            {dirExists === false && <span className="text-xs text-red-500 flex-shrink-0">✗ 目录不存在</span>}
            <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{totalTasks} 个任务</span>
          </div>
        </div>
        <CustomButton onClick={() => onEdit(project)} variant="secondary" size="sm" className="flex-shrink-0">编辑项目</CustomButton>
      </div>

      {/* 状态分布图 */}
      {totalTasks > 0 && (
        <div className="flex items-center gap-3 flex-wrap px-1">
          <div className="flex h-2 rounded-full overflow-hidden flex-1 min-w-[120px] max-w-[300px] bg-gray-100 dark:bg-gray-800">
            {STATUS_ORDER.filter(s => statusCounts[s]).map(s => (
              <div
                key={s}
                className={`${STATUS_BAR_COLOR[s] || 'bg-gray-300'} transition-all`}
                style={{ width: `${(statusCounts[s] / totalTasks) * 100}%` }}
                title={`${STATUS_LABEL[s]}: ${statusCounts[s]}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap text-[10px]">
            {STATUS_ORDER.filter(s => statusCounts[s]).map(s => (
              <span key={s} className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <span className={`w-2 h-2 rounded-full ${STATUS_BAR_COLOR[s] || 'bg-gray-300'}`} />
                {STATUS_LABEL[s]} {statusCounts[s]}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 gap-3">
        {/* 任务树 */}
        <div className="flex-1 flex flex-col min-w-0 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900">
          {/* 状态筛选 */}
          {totalTasks > 0 && (
            <div className="flex items-center gap-1 px-3 min-h-[36px] border-b border-gray-200 dark:border-gray-700/50 overflow-x-auto">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-2 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    statusFilter === f.value
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* 树内容 */}
          <div className="flex-1 overflow-auto p-3">
            {projectTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <svg className="w-12 h-12 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm font-medium">暂无关联任务</p>
                <p className="text-xs mt-1">在任务池创建任务时选择此项目即可关联</p>
              </div>
            ) : filteredRootTasks.length === 0 && filteredChildTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <svg className="w-10 h-10 mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-xs">没有匹配的任务</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {statusFilter ? (
                  // 筛选状态：平级展示，不区分层级
                  [...filteredRootTasks, ...filteredChildTasks].map(task => (
                    <TaskTreeNode key={task.id} task={task} allChildTasks={[]} depth={0} />
                  ))
                ) : (
                  // 全部：树形展示
                  filteredRootTasks.map(task => (
                    <TaskTreeNode key={task.id} task={task} allChildTasks={filteredChildTasks} depth={0} />
                  ))
                )}
                {/* 孤儿子任务（仅全部模式） */}
                {!statusFilter && filteredChildTasks.filter(t => !projectTasks.some(pt => pt.id === t.parentId)).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 px-3">未关联父任务</p>
                    {filteredChildTasks.filter(t => !projectTasks.some(pt => pt.id === t.parentId)).map(task => (
                      <TaskTreeNode key={task.id} task={task} allChildTasks={filteredChildTasks} depth={0} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 最近动态侧栏 */}
        {recentActivities.length > 0 && (
          <div className="w-56 flex-shrink-0 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900 flex flex-col">
            <div className="flex items-center gap-1 px-3 min-h-[36px] border-b border-gray-200 dark:border-gray-700/50">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">最近动态</h3>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {recentActivities.map(t => (
                <div key={t.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_BAR_COLOR[t.status] || 'bg-gray-300'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate leading-tight">{t.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {STATUS_LABEL[t.status] || t.status}
                      <span className="ml-1">· {new Date(t.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
