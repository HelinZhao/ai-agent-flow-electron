import type { Project } from '@renderer/types'

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  onSelect,
}: {
  project: Project
  onEdit: (p: Project) => void
  onDelete: (id: string) => void
  onSelect?: (p: Project) => void
}) {
  const handleOpenDir = async () => {
    try {
      await window.api.shell.openPath(project.workDir)
    } catch {
      /* ignore */
    }
  }

  const dirExists = project.workDir.length > 0

  return (
    <div
      className="group/project relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onSelect?.(project)}
    >
      {/* Accent bar */}
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-indigo-400 to-purple-500" />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 flex-shrink-0">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{project.description || '暂无描述'}</p>
          </div>
        </div>

        {/* Work directory row */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-100 dark:border-gray-700/30 mb-4">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1" title={project.workDir}>
            {project.workDir || '未设置工作目录'}
          </span>
          {dirExists && (
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenDir() }}
              title="在文件管理器中打开"
              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Hover actions: floating panel at top-right (aligns with TeamCard) */}
      <div className="absolute top-3 right-3 z-10 hidden group-hover/project:flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(project) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          title="编辑"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(project.id) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="删除"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Chevron (aligns with TeamCard) */}
      <div className="absolute bottom-3 right-3 text-gray-300 dark:text-gray-600 group-hover/project:text-indigo-400 dark:group-hover/project:text-indigo-500 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}
