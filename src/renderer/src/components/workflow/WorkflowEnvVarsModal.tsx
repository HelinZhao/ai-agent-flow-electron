import React, { useState } from 'react'
import Modal from '../ui/Modal'
import CustomButton from '../ui/CustomButton'
import CustomInput from '../ui/CustomInput'

interface WorkflowEnvVarsModalProps {
  isOpen: boolean
  onClose: () => void
  envVars: Record<string, string>
  onSave: (vars: Record<string, string>) => void
}

const WorkflowEnvVarsModal: React.FC<WorkflowEnvVarsModalProps> = ({ isOpen, onClose, envVars, onSave }) => {
  const [entries, setEntries] = useState<{ key: string; value: string }[]>(() =>
    Object.entries(envVars || {}).map(([k, v]) => ({ key: k, value: v }))
  )

  // 当外部 envVars 变化时重置
  React.useEffect(() => {
    setEntries(Object.entries(envVars || {}).map(([k, v]) => ({ key: k, value: v })))
  }, [envVars])

  const updateEntry = (index: number, field: 'key' | 'value', val: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: val } : e))
  }

  const addEntry = () => {
    setEntries(prev => [...prev, { key: '', value: '' }])
  }

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    const vars: Record<string, string> = {}
    for (const e of entries) {
      if (e.key.trim()) {
        vars[e.key.trim()] = e.value
      }
    }
    onSave(vars)
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-sm shadow-md">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <span>工作流环境变量</span>
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
              通过 {'{{$env.xxx}}'} 引用（全局变量使用 {'{{$global.xxx}}'}）
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex gap-2">
          <CustomButton onClick={onClose} variant="ghost" size="sm">取消</CustomButton>
          <CustomButton onClick={handleSave} variant="primary" size="sm">保存</CustomButton>
        </div>
      }
    >
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <CustomInput
              value={entry.key}
              onChange={(e) => updateEntry(i, 'key', e.target.value)}
              placeholder="变量名"
              size="sm"
              className="w-40"
            />
            <CustomInput
              value={entry.value}
              onChange={(e) => updateEntry(i, 'value', e.target.value)}
              placeholder="值"
              size="sm"
              className="flex-1"
            />
            <button
              onClick={() => removeEntry(i)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <CustomButton onClick={addEntry} variant="ghost" size="sm" className="mt-2">
          + 添加变量
        </CustomButton>
      </div>
    </Modal>
  )
}

export default WorkflowEnvVarsModal
