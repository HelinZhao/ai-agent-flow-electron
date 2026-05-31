import React, { useState, useCallback } from 'react'
import { useAppStore } from '@renderer/store/appStore'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomButton from '@renderer/components/ui/CustomButton'
import ResponsiveGrid from '@renderer/components/ui/ResponsiveGrid'
import TeamDetail from '@renderer/components/teams/TeamDetail'
import TeamForm from '@renderer/components/teams/TeamForm'
import type { Team } from '@renderer/types'
import type { TeamFormData } from '@renderer/components/teams/TeamForm'
import { TeamIcon } from '@renderer/components/icons/NavIcons'

// ─── Team Card ───
const TeamCard = React.memo(function TeamCard({
  team,
  agentNames,
  taskCounts,
  onEdit,
  onDelete,
  onSelect,
}: {
  team: Team
  agentNames: Record<string, string>
  taskCounts: { pending: number; running: number }
  onEdit: (team: Team) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}) {
  const modeLabel: Record<string, string> = {
    captain_distribute: '队长分发',
    discuss: '全员讨论',
    pipeline: '流水线',
  }

  const memberIds = typeof team.memberIds === 'string' ? JSON.parse(team.memberIds) : team.memberIds
  const memberSummary = memberIds.slice(0, 5).map((id: string) => agentNames[id] || id).join(', ')

  return (
    <div
      className="group/team relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onSelect(team.id)}
    >
      {/* Accent bar */}
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-indigo-400 to-purple-500" />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 flex-shrink-0">
            <span className="text-base text-gray-600 dark:text-white">
              <TeamIcon />
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {team.name}
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {team.description || '暂无描述'}
            </p>
          </div>
        </div>

        {/* Mode badge + status */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            {modeLabel[team.mode] || team.mode}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {memberIds.length} 名成员
          </span>
          {taskCounts.running > 0 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              执行中
            </span>
          ) : taskCounts.pending > 0 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              {taskCounts.pending} 项待办
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-50 dark:bg-gray-700/30 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700">
              空闲
            </span>
          )}
          {team.autoClaimEnabled && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              自动接取
            </span>
          )}
        </div>

        {/* Member preview */}
        {memberIds.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 leading-relaxed">
            {memberSummary}
          </p>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute top-3 right-3 z-10 hidden group-hover/team:flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(team) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          title="编辑"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(team.id) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="删除"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Chevron */}
      <div className="absolute bottom-3 right-3 text-gray-300 dark:text-gray-600 group-hover/team:text-indigo-400 dark:group-hover/team:text-indigo-500 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
})

// ─── Main Page ───
export default function Teams() {
  const { teams, agents, tasks: allTasks, addTeam, updateTeam, deleteTeam } = useAppStore()
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // 每个团队的待办/执行中任务数
  const teamTaskCounts: Record<string, { pending: number; running: number }> = {}
  for (const t of allTasks) {
    if (!t.claimedBy) continue
    if (!teamTaskCounts[t.claimedBy]) teamTaskCounts[t.claimedBy] = { pending: 0, running: 0 }
    if (t.status === 'assigned') teamTaskCounts[t.claimedBy].pending++
    if (t.status === 'claimed') teamTaskCounts[t.claimedBy].running++
  }

  const selectedTeam = selectedTeamId
    ? teams.find(t => t.id === selectedTeamId) ?? null
    : null

  // Agent name lookup map for cards
  const agentNames = Object.fromEntries(agents.map(a => [a.id, a.name]))

  const getAgentName = (id: string) => agentNames[id] || id

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // ── Handlers ──

  const handleSelect = useCallback((id: string) => {
    setSelectedTeamId(id)
    setIsEditing(false)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedTeamId(null)
    setIsEditing(false)
  }, [])

  const handleCreate = useCallback(() => {
    setSelectedTeamId('__create__')
    setIsEditing(true)
  }, [])

  const handleEdit = useCallback((team: Team) => {
    setSelectedTeamId(team.id)
    setIsEditing(true)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm('确定删除此团队？')) return
      deleteTeam(id)
      if (selectedTeamId === id) {
        setSelectedTeamId(null)
        setIsEditing(false)
      }
    },
    [deleteTeam, selectedTeamId],
  )

  const handleSave = useCallback(
    async (formData: TeamFormData) => {
      if (selectedTeamId === '__create__') {
        await addTeam(formData)
      } else if (selectedTeamId) {
        await updateTeam(selectedTeamId, formData)
      }
      handleBack()
    },
    [selectedTeamId, addTeam, updateTeam, handleBack],
  )

  // ─── Detail / Edit View ───
  if (selectedTeamId) {
    return (
      <TeamDetailView
        team={selectedTeam}
        isEditing={isEditing}
        agents={agents}
        getAgentName={getAgentName}
        onBack={handleBack}
        onSave={handleSave}
        onEdit={() => setIsEditing(true)}
        onDelete={handleDelete}
        onCancel={() => {
          if (selectedTeam) {
            setIsEditing(false)
          } else {
            handleBack()
          }
        }}
      />
    )
  }

  // ─── List View ───
  return (
    <div className="px-6 py-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            团队管理
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            创建和管理 Agent 团队，在工作流中使用团队节点进行多 Agent 协作
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2 justify-end">
          {teams.length > 0 && (
            <CustomInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索团队..."
              size="sm"
              className="rounded-xl"
              leftIcon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              }
            />
          )}
          <CustomButton onClick={handleCreate} variant="primary" size="sm">
            <span>✨</span>
            <span>创建</span>
          </CustomButton>
        </div>
      </div>

      {/* Cards / Empty state */}
      {filteredTeams.length > 0 ? (
        <ResponsiveGrid>
          {filteredTeams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              agentNames={agentNames}
              taskCounts={teamTaskCounts[team.id] || { pending: 0, running: 0 }}
              onSelect={handleSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </ResponsiveGrid>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          {searchTerm ? (
            <>
              <svg className="w-14 h-14 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm font-medium">未找到匹配的团队</p>
              <p className="text-xs mt-1">尝试使用其他关键词搜索</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 mb-6">
                <span className="text-4xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                还没有团队
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                创建团队后可在工作流中添加「团队」节点
              </p>
              <button
                onClick={handleCreate}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg font-medium"
              >
                创建第一个团队
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Detail / Edit View ───

function TeamDetailView({
  team, isEditing, agents, getAgentName,
  onBack, onSave, onEdit, onDelete, onCancel,
}: {
  team: Team | null; isEditing: boolean
  agents: { id: string; name: string }[]
  getAgentName: (id: string) => string
  onBack: () => void
  onSave: (data: TeamFormData) => Promise<void>
  onEdit: () => void
  onDelete: (id: string) => Promise<void> | void
  onCancel: () => void
}) {
  const [name, setName] = useState(team?.name || '')
  const [description, setDescription] = useState(team?.description || '')
  const [captainId, setCaptainId] = useState(team?.captainId || '')
  const [memberIds, setMemberIds] = useState<string[]>(
    team ? (typeof team.memberIds === 'string' ? JSON.parse(team.memberIds) : team.memberIds) : [],
  )
  const [mode, setMode] = useState(team?.mode || 'captain_distribute')
  const [autoClaimEnabled, setAutoClaimEnabled] = useState(team?.autoClaimEnabled ?? false)
  const [autoClaimInterval, setAutoClaimInterval] = useState(team?.autoClaimInterval ?? 60)
  const [autoApproveTools, setAutoApproveTools] = useState(team?.autoApproveTools ?? false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), description: description.trim(), captainId: captainId || undefined, memberIds, mode, autoClaimEnabled, autoClaimInterval, autoApproveTools })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-6 py-4">
      {/* Back button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {isEditing
            ? team
              ? '编辑团队'
              : '创建团队'
            : team?.name || ''}
        </h2>
      </div>

      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        {isEditing ? (
          <TeamForm
            name={name} setName={setName}
            description={description} setDescription={setDescription}
            captainId={captainId} setCaptainId={setCaptainId}
            memberIds={memberIds} setMemberIds={setMemberIds}
            mode={mode} setMode={setMode}
            autoClaimEnabled={autoClaimEnabled} setAutoClaimEnabled={setAutoClaimEnabled}
            autoClaimInterval={autoClaimInterval} setAutoClaimInterval={setAutoClaimInterval}
            autoApproveTools={autoApproveTools} setAutoApproveTools={setAutoApproveTools}
            agents={agents}
            saving={saving}
            isCreate={!team}
            teamId={team?.id}
            onSubmit={handleSubmit}
            onCancel={onCancel}
          />
        ) : team ? (
          <TeamDetail
            team={team}
            getAgentName={getAgentName}
            onEdit={onEdit}
            onDelete={() => onDelete(team.id)}
          />
        ) : null}
      </div>
    </div>
  )
}
