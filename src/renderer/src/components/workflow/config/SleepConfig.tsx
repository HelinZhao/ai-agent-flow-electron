import React from 'react'
import CustomInput from '../../ui/CustomInput'

interface SleepConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

const SleepConfig: React.FC<SleepConfigProps> = ({ config, onConfigChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          睡眠时间
        </label>
        <div className="flex items-center gap-2">
          <CustomInput
            type="number"
            value={String(config.sleepMs ?? 1000)}
            onChange={(e) => onConfigChange({ ...config, sleepMs: Math.max(0, parseInt(e.target.value) || 0) })}
            min={0}
            size="sm"
          />
          <span className="text-sm text-gray-400">ms</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">设为 0 不等待。单位毫秒，1000ms = 1 秒</p>
      </div>
    </div>
  )
}

export default SleepConfig
