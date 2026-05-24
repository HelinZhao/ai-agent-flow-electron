import React from 'react'
import { v4 as uuidv4 } from 'uuid'
import CustomButton from '../../ui/CustomButton'
import CustomInput from '../../ui/CustomInput'
import ExpressionInput from '../ExpressionInput'

interface VariableConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

const VariableConfig: React.FC<VariableConfigProps> = ({ config, onConfigChange }) => {
  const mode = config.mode || 'set'
  const items: { id: string; name: string; value: string }[] = config.items || []

  const addItem = () => {
    onConfigChange({ ...config, items: [...items, { id: uuidv4(), name: '', value: '' }] })
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) return
    onConfigChange({ ...config, items: items.filter(i => i.id !== id) })
  }

  const updateItem = (id: string, field: string, val: string) => {
    onConfigChange({ ...config, items: items.map(i => (i.id === id ? { ...i, [field]: val } : i)) })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">操作模式</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onConfigChange({ ...config, mode: 'set' })}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${mode === 'set' ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
          >
            设置变量
          </button>
          <button
            type="button"
            onClick={() => onConfigChange({ ...config, mode: 'get' })}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${mode === 'get' ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
          >
            获取变量
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {mode === 'set' ? '变量定义' : '变量名称'}
        </label>
        <CustomButton onClick={addItem} variant="primary" size="sm">+ 添加</CustomButton>
      </div>

      {items.length === 0 && (
        <div className="text-xs text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed">
          暂无变量
        </div>
      )}

      {items.map((item, i) => (
        <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-md p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">#{i + 1}</span>
            {items.length > 1 && (
              <button onClick={() => removeItem(item.id)} className="text-red-600 hover:text-red-800 text-xs">删除</button>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">变量名</label>
            <CustomInput type="text" size="sm" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="如 myVar" />
          </div>
          {mode === 'set' ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">值</label>
              <ExpressionInput value={item.value} onChange={v => updateItem(item.id, 'value', v)} size="sm" minHeight="36px" placeholder="{{$input}} 或 {{$nodes['id'].output}}" />
            </div>
          ) : (
            <div className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded p-2">
              执行时输出变量 <code className="font-mono text-blue-500">{item.name}</code> 的值
            </div>
          )}
        </div>
      ))}

      {mode === 'set' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
          设置成功后，下游节点可通过 <code className="font-mono">{'{{$vars.变量名}}'}</code> 引用变量值
        </div>
      )}
    </div>
  )
}

export default VariableConfig