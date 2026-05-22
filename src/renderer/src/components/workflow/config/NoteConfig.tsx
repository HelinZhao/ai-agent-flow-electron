import React from 'react'
import CustomTextarea from '../../ui/CustomTextarea'

interface NoteConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

const NoteConfig: React.FC<NoteConfigProps> = ({ config, onConfigChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        注释内容
      </label>
      <CustomTextarea
        value={config.content || ''}
        onChange={(e) => onConfigChange({ ...config, content: e.target.value })}
        placeholder="输入注释内容..."
        className="min-h-[120px]"
      />
      <p className="text-xs text-gray-400 mt-1">
        注释节点没有连接端口，仅用于在画布上做标注
      </p>
    </div>
  )
}

export default NoteConfig
