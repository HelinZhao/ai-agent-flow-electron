import React, { useState, useEffect } from 'react'
import { Workflow } from '@renderer/types'
import { workflowApi } from '@renderer/lib/api'
import { useWorkflowStore } from '@renderer/store/appStore'
import CustomSelect from '../../ui/CustomSelect'
import CustomInput from '../../ui/CustomInput'
import ExpressionInput from '../ExpressionInput'

interface LoopConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
  workflowId?: string
}

const LoopConfig: React.FC<LoopConfigProps> = ({ config, onConfigChange, workflowId }) => {
  const workflows = useWorkflowStore((s) => s.workflows)
  const availableWorkflows = workflows.filter(w => w.id !== workflowId)
  const [targetParams, setTargetParams] = useState<{ name: string; displayName: string; type: string; required?: boolean }[]>([])

  useEffect(() => {
    if (!config.workflowId) {
      setTargetParams([])
      return
    }
    let cancelled = false
    workflowApi.getById(config.workflowId).then((wf: Workflow) => {
      if (cancelled) return
      const startNode = wf.nodes?.find(n => n.type === 'start')
      const params = (startNode?.data?.config?.params as any[]) || []
      setTargetParams(params)
    }).catch(() => {
      if (!cancelled) setTargetParams([])
    })
    return () => { cancelled = true }
  }, [config.workflowId])

  const updateParam = (name: string, value: any) => {
    onConfigChange({
      ...config,
      params: { ...(config.params || {}), [name]: value },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          选择工作流 *
        </label>
        <CustomSelect
          value={config.workflowId || ''}
          onChange={(value) => onConfigChange({
            ...config,
            workflowId: value,
            workflowName: workflows.find(w => w.id === value)?.name,
            params: {},
          })}
          options={[
            { value: '', label: '请选择工作流' },
            ...availableWorkflows.map(w => ({ value: w.id, label: w.name }))
          ]}
          placeholder="请选择工作流"
          size="sm"
        />
      </div>

      {config.workflowId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            工作流描述
          </label>
          <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300">
            {workflows.find(w => w.id === config.workflowId)?.description || '—'}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          最大迭代次数
        </label>
        <CustomInput
          type="number"
          value={String(config.maxIterations ?? 100)}
          onChange={(e) => onConfigChange({ ...config, maxIterations: parseInt(e.target.value) || 100 })}
          min={1}
          max={1000}
          size="sm"
        />
        <p className="text-xs text-gray-400 mt-1">安全上限 1000，防止无限循环</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          终止条件（可选）
        </label>
        <ExpressionInput
          value={config.condition || ''}
          onChange={(v) => onConfigChange({ ...config, condition: v })}
          placeholder={'$input.includes("完成")   // 输出包含"完成"则停止'}
          size="xs"
          minHeight="60px"
        />
        <p className="text-xs text-gray-400 mt-1">JS 布尔表达式，注入 <code className="font-mono text-gray-500">{'$input'}</code>（上一轮输出），返回 true 则终止。留空则跑满最大迭代次数</p>
      </div>

      {targetParams.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-violet-500 rounded-full" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">参数映射</h4>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-3 space-y-3">
            {targetParams.map((param) => {
              const val = (config.params || {})[param.name] ?? ''
              return (
                <div key={param.name}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {param.displayName || param.name}
                    {param.required && <span className="text-red-500 ml-0.5">*</span>}
                    <span className="text-gray-400 font-normal ml-1">({param.type})</span>
                  </label>
                  {param.type === 'number' ? (
                    <input
                      type="number"
                      value={String(val)}
                      onChange={(e) => updateParam(param.name, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400"
                    />
                  ) : (
                    <ExpressionInput
                      value={val}
                      onChange={(v) => updateParam(param.name, v)}
                      placeholder={`{{$input}} — 接收上一轮输出`}
                      size="xs"
                      minHeight="32px"
                    />
                  )}
                </div>
              )
            })}
            <p className="text-gray-400 text-xs pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
              每轮迭代将上一轮输出作为 <code className="font-mono">{'{{$input}}'}</code>，轮次索引作为 <code className="font-mono">{'{{$params._index}}'}</code>，参数中使用表达式引用。首轮使用上游实际输入
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoopConfig
