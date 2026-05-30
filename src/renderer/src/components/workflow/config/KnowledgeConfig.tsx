import React, { useEffect } from 'react'
import { useWorkflowStore } from '@renderer/store/appStore'
import CustomSelect from '../../ui/CustomSelect'
import CustomInput from '../../ui/CustomInput'
import ExpressionInput from '../ExpressionInput'

interface KnowledgeConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

const KnowledgeConfig: React.FC<KnowledgeConfigProps> = ({ config, onConfigChange }) => {
  const knowledgeBases = useWorkflowStore(s => s.knowledgeBases)
  const getKnowledgeBases = useWorkflowStore(s => s.getKnowledgeBases)

  useEffect(() => { getKnowledgeBases() }, [])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">知识库</label>
        <CustomSelect
          size="sm"
          value={config.knowledgeBaseId || ''}
          onChange={(v) => onConfigChange({ ...config, knowledgeBaseId: v, knowledgeBaseName: knowledgeBases.find(k => k.id === v)?.name })}
          options={[
            { value: '', label: '选择知识库' },
            ...knowledgeBases.map(k => ({ value: k.id, label: k.name }))
          ]}
          placeholder="选择知识库"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">检索查询</label>
        <ExpressionInput
          value={config.query || ''}
          onChange={(v) => onConfigChange({ ...config, query: v })}
          placeholder={'{{$input}} 或 {{$params.xxx}}'}
          size="sm"
          minHeight="52px"
        />
        <p className="text-xs text-gray-400 mt-1">用模板变量引用上游输入作为搜索关键词，留空则使用 {'{{$input}}'}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Top K <span className="text-gray-400 font-normal">(返回结果数)</span>
        </label>
        <CustomInput
          type="number"
          size="sm"
          value={String(config.topK ?? 3)}
          onChange={(e) => onConfigChange({ ...config, topK: Math.max(1, parseInt(e.target.value) || 3) })}
          min={1}
          max={20}
        />
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5 text-xs text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
        从知识库中检索与查询最相关的分块，结果合并后传递给下游节点
      </div>
    </div>
  )
}

export default KnowledgeConfig