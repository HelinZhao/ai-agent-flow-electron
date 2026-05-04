import { WorkflowNode } from '@renderer/types'
import { memo, useState } from 'react'
import { NODE_DEFS, NODE_CATEGORIES } from './nodes'

interface ContextMenuProps {
  x: number
  y: number
  onAddNode: (type: WorkflowNode['type'], position: { x: number; y: number }) => void
  onClose: () => void
  flowPosition: { x: number; y: number }
}

const groupedNodes = NODE_CATEGORIES.map(cat => ({
  ...cat,
  nodes: NODE_DEFS.filter(n => n.category === cat.key)
}))

const ContextMenu: React.FC<ContextMenuProps> = (props: ContextMenuProps) => {
  const { x, y, onAddNode, onClose, flowPosition } = props
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  if (selectedCategory) {
    const category = groupedNodes.find(c => c.key === selectedCategory)
    if (!category) return null
    return (
      <div
        className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2 z-50"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 flex items-center">
          <button
            onClick={() => setSelectedCategory(null)}
            className="mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ←
          </button>
          {category.label}
        </div>
        {category.nodes.map((nodeType) => (
          <button
            key={nodeType.type}
            onClick={() => {
              onAddNode(nodeType.type as WorkflowNode['type'], flowPosition)
              onClose()
            }}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 bg-${nodeType.color}-100 text-${nodeType.color}-800`}
          >
            {nodeType.shortLabel}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2 z-50"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
        添加节点
      </div>
      {groupedNodes.map((category) => (
        <button
          key={category.key}
          onClick={() => setSelectedCategory(category.key)}
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          {category.label}
        </button>
      ))}
    </div>
  )
}
export default memo(ContextMenu)