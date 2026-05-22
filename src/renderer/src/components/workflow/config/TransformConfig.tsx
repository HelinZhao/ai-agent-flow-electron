import React from 'react'
import ExpressionInput from '../ExpressionInput'

interface TransformConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

const OPERATIONS = [
  { value: 'jsonpath', label: 'JSON Path 提取', desc: '用点号路径从 JSON 中提取值，如 data.items[0].name' },
  { value: 'parse-json', label: '解析为 JSON', desc: '将 JSON 字符串格式化为可读的缩进形式' },
  { value: 'to-json', label: '转为 JSON 字符串', desc: '将输入转换为 JSON 字符串' },
]

const TransformConfig: React.FC<TransformConfigProps> = ({ config, onConfigChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          操作类型
        </label>
        <div className="space-y-1.5">
          {OPERATIONS.map(op => (
            <label
              key={op.value}
              className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                config.operation === op.value || (!config.operation && op.value === 'jsonpath')
                  ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                name="transform-op"
                value={op.value}
                checked={config.operation === op.value || (!config.operation && op.value === 'jsonpath')}
                onChange={() => onConfigChange({ ...config, operation: op.value })}
                className="mt-0.5 accent-emerald-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{op.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{op.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {(config.operation === 'jsonpath' || !config.operation) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            JSON Path 表达式
          </label>
          <ExpressionInput
            value={config.expression || ''}
            onChange={(v) => onConfigChange({ ...config, expression: v })}
            placeholder="例如: data.items[0].name"
            size="sm"
            minHeight="36px"
          />
          <p className="text-xs text-gray-400 mt-1">
            用 <code className="font-mono">.</code> 访问属性，<code className="font-mono">[n]</code> 访问数组元素
          </p>
        </div>
      )}
    </div>
  )
}

export default TransformConfig
