import React, { useState, useCallback } from 'react'
import Modal from '../ui/Modal'
import CustomButton from '../ui/CustomButton'
import ExpressionInput from './ExpressionInput'
import { workflowExecutionApi } from '@renderer/lib/api'
import { NODE_DEFS_MAP } from './nodes'
import MarkdownPreview from '../MarkdownPreview'

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

  const handleCopy = useCallback(() => {
    if (!result?.output) return
    navigator.clipboard.writeText(result.output)
  }, [result])

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <span className="text-base">{NODE_DEFS_MAP[nodeType]?.icon || '⬡'}</span>
          <div>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">节点测试</span>
            <span className="text-xs text-gray-400 ml-2 font-normal">{nodeLabel}</span>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 测试输入 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              测试输入 <code className="text-xs font-mono text-gray-400">{'{{$input}}'}</code>
            </label>
            <span className="text-xs text-gray-400">右键节点也可触发此弹窗</span>
          </div>
          <ExpressionInput
            value={testInput}
            onChange={setTestInput}
            placeholder="输入测试数据，将作为 {{$input}} 传入节点..."
            size="sm"
            minHeight="80px"
          />
        </div>


        {/* 结果区域 */}
        {running && (
          <div className="flex items-center gap-2 py-4 text-sm text-blue-600 dark:text-blue-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            正在执行，请稍候...
          </div>
        )}

        {result && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {/* 结果头部 */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <StatusBadge status={result.status} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  耗时 <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{result.duration}ms</span>
                </span>
              </div>
              {result.output && (
                <button onClick={handleCopy} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  复制
                </button>
              )}
            </div>

            {/* 错误信息 */}
            {result.error && (
              <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">错误信息</div>
                <pre className="text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap break-words font-mono leading-relaxed">{result.error}</pre>
              </div>
            )}

            {/* 输出 */}
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">输出</div>
              {result.output ? (
                <MarkdownPreview
                  content={result.output}
                  className="p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/50 rounded-lg max-h-[260px] overflow-auto"
                />
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700/50 rounded-lg text-xs text-gray-400 italic">(空)</div>
              )}
            </div>
          </div>
        )}
        
        {/* 操作栏 */}
        <div className="flex items-center justify-end gap-3">
          <CustomButton onClick={handleRun} variant="primary" size="sm" disabled={running} loading={running}>
            {running ? '执行中...' : '执行'}
          </CustomButton>
          <CustomButton
            onClick={() => { setTestInput(''); setResult(null) }}
            variant="ghost" size="sm" 
          >
            重置
          </CustomButton>
        </div>
      </div>
    </Modal>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string; dot: string }> = {
    completed: { cls: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300', label: '成功', dot: 'bg-green-500' },
    failed: { cls: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300', label: '失败', dot: 'bg-red-500' },
    running: { cls: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300', label: '运行中', dot: 'bg-blue-500' },
  }
  const s = cfg[status] || cfg.failed
  return (
    <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ' + s.cls}>
      <span className={'w-1.5 h-1.5 rounded-full ' + s.dot} />
      {s.label}
    </span>
  )
}

export default NodeTestDialog
