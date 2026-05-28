import React, { useState, useEffect } from 'react'
import { VariableConfig, Workflow } from '@renderer/types'
import { workflowApi } from '@renderer/lib/api'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import CustomSelect from '../../ui/CustomSelect'
import CustomInput from '../../ui/CustomInput'
import ExpressionInput from '../ExpressionInput'

interface SplitConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
  workflowId?: string
}

const SplitConfig: React.FC<SplitConfigProps> = ({ config, onConfigChange, workflowId }) => {
  const workflows = useWorkflowStore((s) => s.workflows)
  const availableWorkflows = workflows.filter(w => w.id !== workflowId)
  const [targetParams, setTargetParams] = useState<VariableConfig[]>([])

  // 选择工作流后，加载其 Start 节点参数定义
  useEffect(() => {
    if (!config.workflowId) {
      setTargetParams([])
      return
    }
    let cancelled = false
    workflowApi.getById(config.workflowId).then((wf: Workflow) => {
      if (cancelled) return
      const startNode = wf.nodes?.find(n => n.type === 'start')
      const params = (startNode?.data?.config?.params as VariableConfig[]) || []
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

      {targetParams.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-cyan-500 rounded-full" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">子工作流参数</h4>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-3 space-y-3">
            {targetParams.map((param) => {
              const val = (config.params || {})[param.name] ?? param.defaultValue ?? ''
              return (
                <div key={param.name}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {param.displayName || param.name}
                    {param.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {param.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!val}
                        onChange={(e) => updateParam(param.name, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-xs text-gray-500">{param.description || param.displayName}</span>
                    </label>
                  ) : param.type === 'number' ? (
                    <input
                      type="number"
                      value={String(val)}
                      onChange={(e) => updateParam(param.name, parseFloat(e.target.value) || 0)}
                      placeholder={param.description || `输入${param.displayName}`}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                    />
                  ) : param.type === 'array' ? (
                    <ExpressionInput
                      value={val}
                      onChange={(v) => updateParam(param.name, v)}
                      placeholder={param.description || `输入${param.displayName}，每行一个`}
                      size="sm"
                      minHeight="45px"
                    />
                  ) : (
                    <ExpressionInput
                      value={val}
                      onChange={(v) => updateParam(param.name, v)}
                      placeholder={param.description || `输入${param.displayName}`}
                      size="sm"
                      minHeight="36px"
                    />
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1">这些参数将传递给子工作流的 Start 节点，每项拆分时也会注入 <code className="font-mono">{'{{$params._index}}'}</code>（当前索引）</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          最大处理数
        </label>
        <CustomInput
          type="number"
          value={String(config.maxItems ?? 100)}
          onChange={(e) => onConfigChange({ ...config, maxItems: parseInt(e.target.value) || 100 })}
          min={1}
          max={1000}
          size="sm"
        />
        <p className="text-xs text-gray-400 mt-1">上限 1000，超过的项将被忽略</p>
      </div>

      <p className="text-xs text-gray-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-2.5">
        输入将按 JSON 数组或换行拆分为多个元素。每个元素将作为 <code className="font-mono">{'{{$input}}'}</code> 传入子工作流执行。
        <br /><br />
        与循环节点的区别：每项独立处理，输出不会反馈到下一轮。
      </p>
    </div>
  )
}

export default SplitConfig
