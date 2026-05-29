import type { Team } from '@renderer/types';

interface TeamDetailProps {
  team: Team
  getAgentName: (id: string) => string
  onEdit: () => void
  onDelete: () => void
}

const MODE_LABEL: Record<string, string> = {
  captain_distribute: '队长分发',
  discuss: '全员讨论',
  pipeline: '流水线',
};

const MODE_META: Record<string, { icon: string; desc: string }> = {
  captain_distribute: { icon: '🎯', desc: '队长拆解任务分配给成员' },
  discuss: { icon: '💬', desc: '成员各自输出，汇总结果' },
  pipeline: { icon: '🔗', desc: '成员串联处理' },
};

export default function TeamDetail({ team, getAgentName, onEdit, onDelete }: TeamDetailProps) {
  const modeInfo = MODE_META[team.mode] || { icon: '🤖', desc: team.mode };
  const memberList = typeof team.memberIds === 'string' ? JSON.parse(team.memberIds) : team.memberIds;

  return (
    <>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 dark:from-indigo-500/5 dark:to-purple-500/5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl shadow-lg flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="text-2xl text-white">👥</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{team.name}</h2>
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {MODE_LABEL[team.mode] || team.mode}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {team.description || '暂无描述'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>编辑</span>
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>删除</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Metadata ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <span className="text-xs text-indigo-500">{modeInfo.icon}</span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">协作模式</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-white pl-8">
            {MODE_LABEL[team.mode] || team.mode}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 pl-8 mt-0.5">{modeInfo.desc}</p>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <span className="text-xs text-amber-500">👑</span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">队长</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-white pl-8">
            {team.captainId ? getAgentName(team.captainId) : (
              <span className="text-gray-400 dark:text-gray-500">未设置</span>
            )}
          </p>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <span className="text-xs text-emerald-500">👤</span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">成员数</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-white pl-8">{memberList.length} 人</p>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
              <span className="text-xs text-cyan-500">🔄</span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">更新时间</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-white pl-8">
            {new Date(team.updatedAt).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>

      {/* ── Members ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-indigo-500 rounded-full" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">团队成员</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">（{memberList.length} 人）</span>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-5">
          {memberList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {memberList.map((mid: string) => (
                <span
                  key={mid}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                >
                  <span>🤖</span>
                  {getAgentName(mid)}
                  {team.captainId === mid && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 ml-0.5">（队长）</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">暂无成员</p>
          )}
        </div>
      </div>
    </>
  );
}
