import React, { useState, useCallback } from 'react'
import Modal from '../ui/Modal'
import CustomButton from '../ui/CustomButton'
import ExpressionInput from './ExpressionInput'
import { workflowExecutionApi } from '@renderer/lib/api'

interface NodeTestDialogProps {
  isOpen: boolean
  onClose: () => void
  nodeId: string
  nodeLabel: string
  nodeType: string
  workflowJson: any
}

interface TestResult {
  output: string
  duration: number
  status: string
  error?: string
  metadata?: any
}

const NodeTestDialog: React.FC<NodeTestDialogProps> = ({ isOpen, onClose, nodeId, nodeLabel, nodeType, workflowJson }) => {
  const [testInput, setTestInput] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const handleRun = useCallback(async () => {
    setRunning(true)
    setResult(null)
    try {
      const res = await workflowExecutionApi.testNode(workflowJson, nodeId, testInput)
      setResult(res)
    } catch (e: any) {
      setResult({ output: '', duration: 0, status: 'failed', error: e?.response?.data?.error || e.message })
    } finally {
      setRunning(false)
    }
  }, [workflowJson, nodeId, testInput])

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">节点测试</span>
          <span className="text-xs text-gray-400 font-normal">{nodeLabel} ({nodeType})</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            测试输入 <code className="text-xs font-mono">{'{{$input}}'}</code>
          </label>
          <ExpressionInput
            value={testInput}
            onChange={setTestInput}
            placeholder="输入测试数据..."
            size="sm"
            minHeight="80px"
          />
        </div>

        <div className="flex items-center gap-2">
          <CustomButton onClick={handleRun} variant="primary" size="sm" disabled={running} loading={running}>
            {running ? '执行中...' : '执行'}
          </CustomButton>
          {(result || running) && (
            <button
              onClick={() => { setTestInput(''); setResult(null) }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              重置
            </button>
          )}
        </div>

        {result && (
          <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <StatusBadge status={result.status} />
              <span>耗时: {result.duration}ms</span>
            </div>

            {result.error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">错误</div>
                <pre className="text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap break-words font-mono">{result.error}</pre>
              </div>
            )}

            <div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">输出</div>
              <pre className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-mono max-h-[300px] overflow-auto">
                {result.output || '(空)'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    failed: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    running: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  }
  const labels: Record<string, string> = { completed: '成功', failed: '失败', running: '运行中' }
  return (
    <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (colors[status] || '')}>
      {labels[status] || status}
    </span>
  )
}

export default NodeTestDialog
