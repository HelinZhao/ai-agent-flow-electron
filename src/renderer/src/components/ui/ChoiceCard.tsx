import { useState, useCallback } from 'react'
import CustomButton from './CustomButton'

export interface ChoiceOption {
  label: string
  value: string
  description?: string
}

export interface ChoiceResponse {
  selectedValue?: string
  selectedLabel?: string
  selectedValues?: string[]
  selectedLabels?: string[]
  cancelled?: boolean
}

interface ChoiceCardProps {
  question: string
  options: ChoiceOption[]
  allowMultiSelect?: boolean
  onSubmit: (response: ChoiceResponse) => void
  onCancel?: () => void
}

export default function ChoiceCard({ question, options, allowMultiSelect, onSubmit, onCancel }: ChoiceCardProps) {
  const [selected, setSelected] = useState<string[]>([])

  const handleToggle = useCallback((value: string) => {
    if (allowMultiSelect) {
      setSelected(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      )
    } else {
      setSelected([value])
    }
  }, [allowMultiSelect])

  const handleConfirm = useCallback(() => {
    if (selected.length === 0) return
    if (allowMultiSelect) {
      const selectedLabels = selected.map(v => options.find(o => o.value === v)?.label || v)
      onSubmit({ selectedValues: [...selected], selectedLabels })
    } else {
      const opt = options.find(o => o.value === selected[0])
      onSubmit({ selectedValue: selected[0], selectedLabel: opt?.label || selected[0] })
    }
  }, [allowMultiSelect, selected, options, onSubmit])

  return (
    <>
      <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2.5 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
        {question}
      </div>
      <div className="space-y-2 mb-3">
        {options.map((option) => {
          const isChecked = selected.includes(option.value)
          return (
            <label
              key={option.value}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                isChecked
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500'
                  : 'border-gray-200 dark:border-gray-600/40 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            >
              <input
                type={allowMultiSelect ? 'checkbox' : 'radio'}
                checked={isChecked}
                onChange={() => handleToggle(option.value)}
                className="mt-0.5 accent-blue-500"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{option.label}</div>
                {option.description && (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{option.description}</div>
                )}
              </div>
            </label>
          )
        })}
      </div>
      <div className="flex gap-2">
        <CustomButton onClick={handleConfirm} variant="primary" size="xs" disabled={selected.length === 0}>确认选择</CustomButton>
        {onCancel && <CustomButton onClick={onCancel} variant="secondary" size="xs">取消</CustomButton>}
      </div>
    </>
  )
}
