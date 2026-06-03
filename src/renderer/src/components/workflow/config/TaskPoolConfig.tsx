import CustomInput from '../../ui/CustomInput'
import CustomTextarea from '../../ui/CustomTextarea'
import CustomSelect from '../../ui/CustomSelect'
import { useAppStore } from '@renderer/store/appStore'

interface TaskPoolConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

export default function TaskPoolConfig({ config, onConfigChange }: TaskPoolConfigProps) {
  const projects = useAppStore(s => s.projects)

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

      <div className="flex gap-3">
        <div className="flex-1">
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
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">状态</label>
          <CustomSelect
            value={config.status || 'pending'}
            onChange={(v) => onConfigChange({ ...config, status: v })}
            options={[
              { value: 'pending', label: '待处理' },
              { value: 'draft', label: '草稿' },
            ]}
            size="sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">项目（可选）</label>
        <CustomSelect
          value={config.projectId || ''}
          onChange={(v) => onConfigChange({ ...config, projectId: v || '' })}
          options={[
            { value: '', label: '无' },
            ...projects.map(p => ({ value: p.id, label: p.name })),
          ]}
          size="sm"
        />
      </div>
    </div>
  )
}
