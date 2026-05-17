import React, { useState, useCallback } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { Agent } from '@renderer/types';
import CustomInput from '@renderer/components/ui/CustomInput';
import CustomButton from '@renderer/components/ui/CustomButton';
import ResponsiveGrid from '@renderer/components/ui/ResponsiveGrid';
import AgentForm, { AgentFormData } from '@renderer/components/agents/AgentForm';
import AgentDetail from '@renderer/components/agents/AgentDetail';

// ─── Agent Card ───
const AgentCard = React.memo(function AgentCard({
  agent,
  workflowName,
  onEdit,
  onDelete,
  onSelect,
}: {
  agent: Agent
  workflowName: string
  onEdit: (agent: Agent) => void
  onDelete: (agent: Agent) => void
  onSelect: (id: string) => void
}) {
  const isStandard = agent.type !== 'workflow';
  const summary = agent.instructions
    ? agent.instructions.replace(/[#*\n]/g, ' ').substring(0, 90) +
      (agent.instructions.length > 90 ? '...' : '')
    : '暂无指令';

  const typeLabel = isStandard ? '标准' : '工作流';
  const accentGradient = isStandard
    ? 'from-blue-400 to-purple-500'
    : 'from-purple-400 to-pink-500';

  return (
    <div
      className="group/agent relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onSelect(agent.id)}
    >
      {/* Accent bar */}
      <div className={`h-1.5 rounded-t-xl bg-gradient-to-r ${accentGradient}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 flex-shrink-0">
              <span className="text-base">🤖</span>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {agent.name}
              </h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {agent.description || '暂无描述'}
              </p>
            </div>
          </div>
        </div>

        {/* Type badge + workflow */}
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${
              isStandard
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
            }`}
          >
            {typeLabel}
          </span>
          {workflowName && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
              {workflowName}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Hover actions */}
      <div className="absolute top-3 right-3 z-10 hidden group-hover/agent:flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(agent) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="编辑"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(agent) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="删除"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Chevron */}
      <div className="absolute bottom-3 right-3 text-gray-300 dark:text-gray-600 group-hover/agent:text-blue-400 dark:group-hover/agent:text-blue-500 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
});

// ─── Main Page ───
export default function Agents(): React.JSX.Element {
  const { agents, skills, addAgent, updateAgent, deleteAgent, workflows } = useWorkflowStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const selectedAgent = selectedAgentId
    ? agents.find((a) => a.id === selectedAgentId) ?? null
    : null;

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.description &&
        agent.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleCreate = useCallback((): void => {
    setSelectedAgentId('__create__');
    setIsEditing(true);
  }, []);

  const handleEdit = useCallback((agent: Agent): void => {
    setSelectedAgentId(agent.id);
    setIsEditing(true);
  }, []);

  const handleDelete = useCallback(
    (agent: Agent): void => {
      if (window.confirm(`确定要删除 Agent "${agent.name}" 吗？`)) {
        deleteAgent(agent.id);
        if (selectedAgentId === agent.id) {
          setSelectedAgentId(null);
          setIsEditing(false);
        }
      }
    },
    [deleteAgent, selectedAgentId],
  );

  const handleBack = (): void => {
    setSelectedAgentId(null);
    setIsEditing(false);
  };

  const handleSave = async (formData: AgentFormData): Promise<void> => {
    const payload = {
      name: formData.name,
      description: formData.description,
      instructions: formData.instructions,
      type: formData.type,
      ...(formData.type === 'standard'
        ? { skillIds: formData.skillIds, enabledTools: formData.enabledTools }
        : { workflowId: formData.workflowId || undefined, skillIds: undefined, enabledTools: undefined }
      ),
    };

    if (selectedAgent) {
      await updateAgent(selectedAgent.id, payload);
    } else {
      await addAgent(payload as any);
    }

    setIsEditing(false);
    setSelectedAgentId(null);
  };

  // ─── Detail / Edit View ───
  if (selectedAgentId) {
    return (
      <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEditing
              ? selectedAgent
                ? '编辑 Agent'
                : '创建新 Agent'
              : selectedAgent?.name || ''}
          </h2>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
          {isEditing ? (
            <AgentForm
              agent={selectedAgent}
              skills={skills}
              workflows={workflows}
              onSave={handleSave}
              onCancel={() => {
                if (selectedAgent) {
                  setIsEditing(false);
                } else {
                  handleBack();
                }
              }}
            />
          ) : selectedAgent ? (
            <AgentDetail
              agent={selectedAgent}
              skills={skills}
              workflowName={
                selectedAgent.workflowId
                  ? workflows.find((w) => w.id === selectedAgent.workflowId)?.name || '未知工作流'
                  : ''
              }
              onEdit={() => setIsEditing(true)}
              onDelete={() => handleDelete(selectedAgent)}
            />
          ) : null}
        </div>
      </div>
    );
  }

  // ─── List View ───
  return (
    <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Agent 管理
        </h1>
        <div className="flex items-center gap-2">
          {agents.length > 0 && (
            <CustomInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索 Agent..."
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
            <span>+</span>
            <span>新建 Agent</span>
          </CustomButton>
        </div>
      </div>

      {/* Cards / Empty state */}
      {filteredAgents.length > 0 ? (
        <ResponsiveGrid>
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              workflowName={
                agent.workflowId
                  ? workflows.find((w) => w.id === agent.workflowId)?.name || '未知工作流'
                  : ''
              }
              onSelect={setSelectedAgentId}
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
              <p className="text-sm font-medium">未找到匹配的 Agent</p>
              <p className="text-xs mt-1">尝试使用其他关键词搜索</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-6">
                <span className="text-4xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                还没有 Agent
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                创建您的第一个 AI Agent 来管理工作流
              </p>
              <button
                onClick={handleCreate}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg font-medium"
              >
                创建第一个 Agent
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
