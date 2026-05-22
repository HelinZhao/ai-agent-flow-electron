import { WorkflowNode } from '@renderer/types'
import { memo, useRef, useState } from 'react'
import { NODE_DEFS, NODE_CATEGORIES } from './nodes'
import { createPortal } from 'react-dom'
import { useClickAway } from 'ahooks'

interface ContextMenuProps {
  x: number
  y: number
  onAddNode: (type: WorkflowNode['type'], position: { x: number; y: number }) => void
  onClose: () => void
  flowPosition: { x: number; y: number }
  onPaste?: () => void
  hasClipboard?: boolean
}

const groupedNodes = NODE_CATEGORIES.map(cat => ({
  ...cat,
  nodes: NODE_DEFS.filter(n => n.category === cat.key)
}))

/** 从 NODE_DEFS 的颜色定义自动生成渐变类名，新增节点无需再维护 */
function nodeGradient(color: string): string {
  return `from-${color}-400 to-${color}-600`
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onAddNode, onClose, flowPosition, onPaste, hasClipboard }) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const hoveredData = hoveredCategory
    ? groupedNodes.find(c => c.key === hoveredCategory) ?? null
    : null

  const clearClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = undefined
    }
  }


  const scheduleClose = () => {
    clearClose()
    closeTimerRef.current = setTimeout(() => setHoveredCategory(null), 250)
  }

  const menuWidth = menuRef.current?.offsetWidth || 180

  useClickAway(() => {
    onClose()
  }, menuRef)

  return createPortal((
    <>
      <div
        ref={menuRef}
        className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-1 z-50 min-w-[160px]"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={scheduleClose}
      >
        {onPaste && hasClipboard && (
          <>
            <button
              onClick={() => { onPaste(); onClose() }}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              粘贴
            </button>
            <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
          </>
        )}
        <div className="py-1">
          {groupedNodes.map((category) => (
            <button
              key={category.key}
              onMouseEnter={() => { clearClose(); setHoveredCategory(category.key) }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${hoveredCategory === category.key ? 'bg-gray-50 dark:bg-gray-700' : ''
                }`}
            >
              <span>{category.label}</span>
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {hoveredData && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-1 z-50 min-w-[160px]"
          style={{ left: x + menuWidth + 4, top: y }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={clearClose}
          onMouseLeave={scheduleClose}
        >
          <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
            {hoveredData.label}
          </div>
          <div className="py-1">
            {hoveredData.nodes.map((nodeType) => {
              const gradient = nodeGradient(nodeType.color)
              return (
                <button
                  key={nodeType.type}
                  onClick={() => {
                    onAddNode(nodeType.type as WorkflowNode['type'], flowPosition)
                    onClose()
                  }}
                  className="group/item w-full px-3 py-2.5 text-left text-sm flex items-start gap-3 transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className={`w-7 h-7 mt-0.5 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center shadow-sm shrink-0`}>
                    <span className="text-white text-xs">{nodeType.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-700 dark:text-slate-200 leading-tight">{nodeType.shortLabel}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{nodeType.defaultLabel}</div>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                    {nodeType.type === 'start' && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full leading-none">起点</span>
                    )}
                    {nodeType.type === 'end' && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full leading-none">终点</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  ), document.body)
}
export default memo(ContextMenu)