import { useAppStore } from '@renderer/store/appStore'
import CustomSelect from '../../ui/CustomSelect'
import CustomTextarea from '../../ui/CustomTextarea'

interface TeamConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

export default function TeamConfig({ config, onConfigChange }: TeamConfigProps) {
  const { teams } = useAppStore()

  const selectedTeam = teams.find(t => t.id === config.teamId)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">选择团队</label>
        <CustomSelect
          value={config.teamId || ''}
          onChange={(val) => onConfigChange({ ...config, teamId: val })}
          options={[
            { value: '', label: '— 选择团队 —' },
            ...teams.map(t => ({ value: t.id, label: t.name }))
          ]}
          size="sm"
        />
        {teams.length === 0 && (
          <p className="text-xs text-amber-500 mt-1">请先创建团队</p>
        )}
      </div>

      {selectedTeam && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg text-xs space-y-1">
          <p className="text-gray-500">协作模式: {
            { captain_distribute: '队长分发', discuss: '全员讨论', pipeline: '流水线' }[selectedTeam.mode] || selectedTeam.mode
          }</p>
          <p className="text-gray-500">
            成员: {
              (typeof selectedTeam.memberIds === 'string'
                ? JSON.parse(selectedTeam.memberIds)
                : selectedTeam.memberIds
              ).length
            } 人
          </p>
        </div>
      )}

      {selectedTeam && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            任务描述
          </label>
          <CustomTextarea
            value={config.taskDescription || ''}
            onChange={(e) => onConfigChange({ ...config, taskDescription: e.target.value })}
            placeholder="分配给团队的任务描述，支持 {{$input}} 模板变量"
            rows={3}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            可使用 <code className="text-blue-500">&#123;&#123;$input&#125;&#125;</code> 引用前序节点输出
          </p>
        </div>
      )}
    </div>
  )
}
