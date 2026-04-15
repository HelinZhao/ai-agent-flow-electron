import React from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';

interface AgentConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const AgentConfig: React.FC<AgentConfigProps> = ({ config, onConfigChange }) => {
    const { agents } = useWorkflowStore();
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          选择Agent
        </label>
        <select
          value={config.agentId || ''}
          onChange={(e) => onConfigChange({
            ...config,
            agentId: e.target.value,
            agentName: agents.find(a => a.id === e.target.value)?.name
          })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">请选择Agent</option>
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>
      {config.agentId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Agent描述
          </label>
          <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300">
            {agents.find(a => a.id === config.agentId)?.description || 'Agent描述不可用'}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentConfig;