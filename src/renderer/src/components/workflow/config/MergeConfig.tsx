import React from 'react'
import ExpressionInput from '../ExpressionInput'

interface MergeConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

const MergeConfig: React.FC<MergeConfigProps> = ({ config, onConfigChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          合并分隔符
        </label>
        <ExpressionInput
          value={config.separator ?? '\\n---\\n'}
          onChange={(v) => onConfigChange({ ...config, separator: v })}
          placeholder={'\n---\n'}
          size="xs"
          minHeight="32px"
        />
        <p className="text-xs text-gray-400 mt-1">
          各分支输出之间的分隔符，支持 <code className="font-mono">{'\\n'}</code> 等转义。默认 <code className="font-mono">{'\\n---\\n'}</code>
        </p>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 space-y-1">
        <p className="font-medium text-blue-700 dark:text-blue-400">使用方式</p>
        <p>将多个上游节点连接到聚合节点，LangGraph 会自动等待所有前驱完成再执行聚合。</p>
        <p>使用 <code className="font-mono">{'{{$input}}'}</code> 获取合并后的文本，再传给下游处理。</p>
      </div>
    </div>
  )
}

export default MergeConfig
