import CustomInput from '../../ui/CustomInput'
import CustomTextarea from '../../ui/CustomTextarea'
import CustomSelect from '../../ui/CustomSelect'

interface TaskPoolConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

export default function TaskPoolConfig({ config, onConfigChange }: TaskPoolConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          标题模板 <span className="text-gray-400 font-normal">（可选）</span>
        </label>
        <CustomInput
          value={config.title || ''}
          onChange={(e) => onConfigChange({ ...config, title: e.target.value })}
          placeholder='留空则使用上游输入。支持 {{$input}}'
          size="sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          可使用 <code className="text-blue-500">{'{{$input}}'}</code> 引用上游输入
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          描述模板 <span className="text-gray-400 font-normal">（可选）</span>
        </label>
        <CustomTextarea
          value={config.description || ''}
          onChange={(e) => onConfigChange({ ...config, description: e.target.value })}
          placeholder="留空则使用上游输入。支持 {{$input}} 和工作流变量"
          rows={3}
        />
        <p className="text-xs text-gray-400 mt-1">
          可使用 <code className="text-blue-500">{'{{$input}}'}</code>、<code className="text-blue-500">{'{{$nodes.xxx.output}}'}</code> 等模板变量
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">优先级</label>
        <CustomSelect
          value={String(config.priority ?? 1)}
          onChange={(v) => onConfigChange({ ...config, priority: Number(v) })}
          options={[
            { value: '0', label: '低' },
            { value: '1', label: '普通' },
            { value: '2', label: '高' },
            { value: '3', label: '紧急' },
          ]}
          size="sm"
        />
      </div>
    </div>
  )
}
