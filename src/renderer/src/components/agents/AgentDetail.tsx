import React from 'react';
import { Agent, Skill } from '@renderer/types';
import { TOOL_LABEL_MAP } from '@renderer/config';
import MarkdownPreview from '@renderer/components/MarkdownPreview';

interface AgentDetailProps {
  agent: Agent
  skills: Skill[]
  workflowName: string
  llmConfigName?: string
  onEdit: () => void
  onDelete: () => void
  isSystem?: boolean
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-white">{children}</dd>
    </div>
  );
}

function Tag({ label, color = 'blue' }: { label: string; color?: 'blue' | 'purple' | 'emerald' | 'amber' }) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    purple:
      'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    emerald:
      'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    amber:
      'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${colorMap[color]}`}
    >
      {label}
    </span>
  );
}

export default function AgentDetail({ agent, skills, workflowName, llmConfigName, onEdit, onDelete, isSystem }: AgentDetailProps) {
  const isStandard = agent.type === 'standard';

  return (
    <>
      {/* ── Hero ── */}
      <div className={`relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6 ${isSystem ? 'bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10 dark:from-amber-500/5 dark:to-orange-500/5' : 'bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex items-center justify-center w-14 h-14 rounded-xl shadow-lg flex-shrink-0 ${isSystem ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
              <span className="text-2xl text-white">{isSystem ? '✨' : '🤖'}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{agent.name}</h2>
                {isSystem && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                    系统
                  </span>
                )}
                <Tag label={isStandard ? '标准' : '工作流'} color={isStandard ? 'blue' : 'purple'} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {agent.description || '暂无描述'}
              </p>
            </div>
          </div>

          {isSystem ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>调整技能/工具</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
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
          )}
        </div>
      </div>

      {/* ── Metadata ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent 类型</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-white pl-8">
            {isStandard ? '标准 Agent' : '工作流 Agent'}
          </p>
        </div>

        {agent.workflowId && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3.75 6h16.5M3.75 12h16.5m-16.5 6h16.5" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">绑定工作流</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white pl-8">{workflowName || '未知工作流'}</p>
          </div>
        )}

        {isStandard && (
          <>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
                  <span className="text-xs text-cyan-500">🧠</span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">LLM 配置</span>
              </div>
              <p className="text-sm text-gray-900 dark:text-white pl-8">
                {llmConfigName || '使用全局默认配置'}
              </p>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <span className="text-xs text-amber-500">⚡</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">绑定技能</span>
                </div>
                <div className="pl-8">
                  {agent.skillIds && agent.skillIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.skillIds.map((sid) => {
                        const skill = skills.find((s) => s.id === sid);
                        return (
                          <Tag key={sid} label={skill?.name || '未知技能'} color="amber" />
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">未绑定技能</p>
                  )}
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <span className="text-xs text-blue-500">🔧</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">绑定工具</span>
                </div>
                <div className="pl-8">
                  {agent.enabledTools && agent.enabledTools.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.enabledTools.map((tid) => (
                        <Tag key={tid} label={TOOL_LABEL_MAP[tid] || tid} color="blue" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">未绑定工具</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Timestamps ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
        <InfoItem label="创建时间">
          {new Date(agent.createdAt).toLocaleString('zh-CN')}
        </InfoItem>
      </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
        <InfoItem label="更新时间">
          {new Date(agent.updatedAt).toLocaleString('zh-CN')}
        </InfoItem>
        </div>
      </div>

      {/* ── Instructions ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-amber-500 rounded-full" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">系统指令</h3>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-5">
          <MarkdownPreview content={agent.instructions} />
        </div>
      </div>
    </>
  );
}
