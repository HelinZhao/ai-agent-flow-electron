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
      className="group/project relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onSelect?.(project)}
    >
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-blue-400 to-cyan-500" />
      <div className="p-4">
        <div className="flex items-start gap-2.5 mb-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{project.description || '暂无描述'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-100 dark:border-gray-700/30">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1" title={project.workDir}>
            {project.workDir}
          </span>
          {dirExists && (
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenDir() }}
              title="在文件管理器中打开"
              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-3 opacity-0 group-hover/project:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(project) }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            编辑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(project.id) }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
