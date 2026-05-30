import React from 'react';
import { useWorkflowStore } from '@renderer/store/appStore';
import CustomSelect from '../../ui/CustomSelect';

interface AgentConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const AgentConfig: React.FC<AgentConfigProps> = ({ config, onConfigChange }) => {
    const agents = useWorkflowStore((s) => s.agents);
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          选择Agent
        </label>
        <CustomSelect
          value={config.agentId || ''}
          onChange={(value) => onConfigChange({
            ...config,
            agentId: value,
            agentName: agents.find(a => a.id === value)?.name
          })}
          options={[
            { value: '', label: '请选择Agent' },
            ...agents.map(agent => ({
              value: agent.id,
              label: agent.name
            }))
          ]}
          placeholder="请选择Agent"
          size="sm"
        />
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