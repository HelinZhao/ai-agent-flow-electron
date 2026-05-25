import React from 'react'
import { v4 as uuidv4 } from 'uuid'
import ExpressionInput from '../ExpressionInput'
import CustomButton from '../../ui/CustomButton'
import CustomInput from '../../ui/CustomInput'

interface IfConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

const PRESETS = [
  { label: '包含', expr: '$input.includes("关键词")' },
  { label: '等于', expr: '$input === "值"' },
  { label: '大于', expr: 'parseFloat($input) > 100' },
  { label: '为空', expr: '!$input' },
]

const IfConfig: React.FC<IfConfigProps> = ({ config, onConfigChange }) => {
  const branches: { id: string; label: string; condition: string }[] = config.branches || []

  const addBranch = () => {
    const newBranch = { id: uuidv4(), label: '', condition: '' }
    onConfigChange({ ...config, branches: [...branches, newBranch] })
  }

  const removeBranch = (branchId: string) => {
    if (branches.length <= 1) return
    onConfigChange({ ...config, branches: branches.filter(b => b.id !== branchId) })
  }

  const updateBranch = (branchId: string, field: string, value: string) => {
    onConfigChange({
      ...config,
      branches: branches.map(b => (b.id === branchId ? { ...b, [field]: value } : b))
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">条件配置</label>
        <CustomButton onClick={addBranch} variant="primary" size="xs">+ 添加条件</CustomButton>
      </div>

      {branches.length === 0 && (
        <div className="text-xs text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
          暂无条件，点击上方按钮添加
        </div>
      )}

      {branches.map((branch, index) => (
        <div key={branch.id} className="border border-gray-200 dark:border-gray-600 rounded-md p-3 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">条件 {index + 1}</span>
            {branches.length > 1 && (
              <button onClick={() => removeBranch(branch.id)} className="text-red-600 hover:text-red-800 text-sm">删除</button>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">分支标签</label>
            <CustomInput type="text" value={branch.label} onChange={e => updateBranch(branch.id, 'label', e.target.value)} placeholder="例如：VIP 用户" size="sm" />
            <p className="text-xs text-gray-400 mt-0.5">将在连线上显示，建议简短描述</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">条件表达式 <span className="text-gray-400 font-normal">(返回 true/false)</span></label>
            <ExpressionInput
              value={branch.condition}
              onChange={v => updateBranch(branch.id, 'condition', v)}
              placeholder={'$input.includes("关键词")'}
              size="sm"
              minHeight="52px"
            />
            <p className="text-xs text-gray-400 mt-1">
              可用 <code className="font-mono">$input</code> <code className="font-mono">$params.xxx</code> <code className="font-mono">$nodes["id"].output</code>
            </p>
          </div>
        </div>
      ))}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">快速插入表达式</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.expr}
              type="button"
              onClick={() => {
                const last = branches[branches.length - 1]
                if (last) updateBranch(last.id, 'condition', p.expr)
              }}
              className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
        从上到下依次判断，第一个返回 true 的条件生效。边上 condition 字段对应条件 id。不调用 LLM。
      </div>
    </div>
  )
}

export default IfConfig