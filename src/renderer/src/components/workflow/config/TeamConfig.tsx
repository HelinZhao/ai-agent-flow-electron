import { useWorkflowStore } from '@renderer/store/workflowStore'

interface TeamConfigProps {
  config: Record<string, any>
  onConfigChange: (config: Record<string, any>) => void
}

export default function TeamConfig({ config, onConfigChange }: TeamConfigProps) {
  const { teams } = useWorkflowStore()

  const selectedTeam = teams.find(t => t.id === config.teamId)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">选择团队</label>
        <select
          value={config.teamId || ''}
          onChange={e => onConfigChange({ ...config, teamId: e.target.value })}
          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
        >
          <option value="">— 选择团队 —</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
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
    </div>
  )
}
