import { WorkflowNode } from '@renderer/types'
import { memo, useState } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onAddNode: (type: WorkflowNode['type'], position: { x: number; y: number }) => void
  onClose: () => void
  flowPosition: { x: number; y: number }
}

const ContextMenu: React.FC<ContextMenuProps> = (props: ContextMenuProps) => {
  const { x, y, onAddNode, onClose, flowPosition } = props
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const nodeCategories = {
    basic: {
      label: '基础节点',
      nodes: [
        { type: 'start' as const, label: '开始', color: 'bg-green-100 text-green-800' },
        { type: 'end' as const, label: '结束', color: 'bg-gray-100 text-gray-800' }
      ]
    },
    logic: {
      label: '逻辑节点',
      nodes: [
        { type: 'branch' as const, label: '分支', color: 'bg-yellow-100 text-yellow-800' },
        { type: 'skill' as const, label: '技能', color: 'bg-blue-100 text-blue-800' },
        { type: 'llm' as const, label: 'LLM', color: 'bg-indigo-100 text-indigo-800' }
      ]
    },
    integration: {
      label: '集成节点',
      nodes: [
        { type: 'api' as const, label: 'API', color: 'bg-purple-100 text-purple-800' },
        { type: 'agent' as const, label: 'Agent', color: 'bg-red-100 text-red-800' }
      ]
    }
  }

  if (selectedCategory) {
    const category = nodeCategories[selectedCategory as keyof typeof nodeCategories]
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
              onAddNode(nodeType.type, flowPosition)
              onClose()
            }}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${nodeType.color}`}
          >
            {nodeType.label}
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
      {Object.entries(nodeCategories).map(([key, category]) => (
        <button
          key={key}
          onClick={() => setSelectedCategory(key)}
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          {category.label}
        </button>
      ))}
    </div>
  )
}
export default memo(ContextMenu)
