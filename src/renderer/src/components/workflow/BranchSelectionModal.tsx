import { memo } from 'react'
import { Connection } from '@xyflow/react'
import { WorkflowBranch } from '@renderer/types'

interface BranchSelectionModalProps {
  isOpen: boolean
  branches: WorkflowBranch[]
  connection: Connection | null
  selectedBranch: string
  onSelectBranch: (id: string) => void
  onConfirm: () => void
  onCancel: () => void
}

const BranchSelectionModal: React.FC<BranchSelectionModalProps> = ({
  isOpen,
  branches,
  selectedBranch,
  onSelectBranch,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 w-full">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">选择分支</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">请选择要连接的分支条件：</p>

        <div className="space-y-3 mb-6">
          {branches.map((branch) => (
            <label
              key={branch.id}
              className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="radio"
                name="branch-selection"
                value={branch.id}
                checked={selectedBranch === branch.id}
                onChange={(e) => onSelectBranch(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">{branch.label}</div>
                {branch.condition && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{branch.condition}</div>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!selectedBranch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            确认连接
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(BranchSelectionModal)
