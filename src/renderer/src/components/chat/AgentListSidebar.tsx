import React from 'react'
import { Agent } from '@renderer/types'
import CustomInput from '@renderer/components/ui/CustomInput'

interface AgentListSidebarProps {
  agents: Agent[]
  selectedAgent: Agent | null
  searchTerm: string
  onSearchChange: (value: string) => void
  onSelectAgent: (agent: Agent) => void
  draftAgentIds?: Set<string>
  unreadAgentIds?: Set<string>
  pendingAgentIds?: Set<string>
}

const AGENT_COLORS: { bg: string; muted: string }[] = [
  { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', muted: '#3b82f6' },
  { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', muted: '#8b5cf6' },
  { bg: 'linear-gradient(135deg, #10b981, #059669)', muted: '#10b981' },
  { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', muted: '#f59e0b' },
  { bg: 'linear-gradient(135deg, #f43f5e, #e11d48)', muted: '#f43f5e' },
  { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', muted: '#06b6d4' },
  { bg: 'linear-gradient(135deg, #f97316, #ea580c)', muted: '#f97316' },
  { bg: 'linear-gradient(135deg, #ec4899, #db2777)', muted: '#ec4899' },
]

function getAgentColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length]
}

export default function AgentListSidebar({
  agents,
  selectedAgent,
  searchTerm,
  onSearchChange,
  onSelectAgent,
  draftAgentIds,
  unreadAgentIds,
  pendingAgentIds,
}: AgentListSidebarProps): React.JSX.Element {
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agent.description && agent.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="w-60 flex-shrink-0 border-r border-gray-200/60 dark:border-gray-700/50 bg-white dark:bg-gray-900 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-lg leading-none">🤖</span>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-gray-900 rounded-full" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm tracking-tight">Agent 列表</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{agents.length} 个可用</p>
          </div>
        </div>

        {/* 搜索框 */}
        <CustomInput
          placeholder="搜索 Agent..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          size="xs"
          leftIcon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          }
        />
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200/60 dark:via-gray-700/50 to-transparent flex-shrink-0" />

      {/* Agent 列表 */}
      <nav className="flex-1 px-2 pt-3 pb-3 space-y-0.5 overflow-y-auto">
        {filteredAgents.map(agent => {
          const isActive = selectedAgent?.id === agent.id
          const color = getAgentColor(agent.name)
          const initial = agent.name.charAt(0).toUpperCase()
          return (
            <button
              key={agent.id}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 text-sm rounded-lg transition-all duration-150 group relative ${isActive
                  ? 'bg-blue-50/80 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800/70'
                }`}
              onClick={() => onSelectAgent(agent)}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
              {/* 头像 */}
              <span
                className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 text-md font-bold transition-all"
                style={{ background: isActive ? color.bg : `${color.muted}33` }}
              >
                <span className={isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300 transition-colors'}>
                  {initial}
                </span>
              </span>
              <div className="text-left min-w-0 flex-1 relative">
                <div className="text-sm font-medium truncate leading-tight flex items-center gap-1.5">
                  {agent.name}
                  {draftAgentIds?.has(agent.id) && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="有未发送的内容" />
                  )}
                </div>
                {unreadAgentIds?.has(agent.id) && (
                  <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" title="新消息" />
                )}
                {agent.description && !pendingAgentIds?.has(agent.id) && (
                  <div className="text-xs mt-0.5 truncate text-gray-400 dark:text-gray-500 leading-tight">{agent.description}</div>
                )}
                {pendingAgentIds?.has(agent.id) && (
                  <div className="flex items-center gap-0.5 mt-1" title="思考中...">
                    <span className="text-[10px] text-blue-400 font-medium">思考中</span>
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </button>
          )
        })}
        {filteredAgents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            {searchTerm ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                    <path d="M8 11h6" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">未找到匹配的 Agent</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">尝试使用其他关键词搜索</p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">暂无可用 Agent</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">请先在 Agent 管理页面创建</p>
              </>
            )}
          </div>
        )}
      </nav>
    </div>
  )
}
