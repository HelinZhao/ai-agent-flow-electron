import React, { useState, useEffect } from 'react'
import { Workflow } from '@renderer/types'
import { workflowApi } from '@renderer/lib/api'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import CustomSelect from '../../ui/CustomSelect'
import CustomInput from '../../ui/CustomInput'

interface SplitConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
  workflowId?: string
}

const SplitConfig: React.FC<SplitConfigProps> = ({ config, onConfigChange, workflowId }) => {
  const workflows = useWorkflowStore((s) => s.workflows)
  const availableWorkflows = workflows.filter(w => w.id !== workflowId)
  const [targetParams, setTargetParams] = useState<{ name: string; displayName: string; type: string }[]>([])

  useEffect(() => {
    if (!config.workflowId) {
      setTargetParams([])
      return
    }
    let cancelled = false
    workflowApi.getById(config.workflowId).then((wf: Workflow) => {
      if (cancelled) return
      const startNode = wf.nodes?.find(n => n.type === 'start')
      setTargetParams((startNode?.data?.config?.params as any[]) || [])
    }).catch(() => {
      if (!cancelled) setTargetParams([])
    })
    return () => { cancelled = true }
  }, [config.workflowId])

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
