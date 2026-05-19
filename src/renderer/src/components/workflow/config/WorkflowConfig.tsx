import React from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import CustomSelect from '../../ui/CustomSelect';

interface WorkflowConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  workflowId?: string;
}

const WorkflowConfig: React.FC<WorkflowConfigProps> = ({ config, onConfigChange, workflowId }) => {
    const { workflows } = useWorkflowStore();
    const availableWorkflows = workflows.filter(w => w.id !== workflowId);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          选择工作流
        </label>
        <CustomSelect
          value={config.workflowId || ''}
          onChange={(value) => onConfigChange({
            ...config,
            workflowId: value,
            workflowName: workflows.find(w => w.id === value)?.name
          })}
          options={[
            { value: '', label: '请选择工作流' },
            ...availableWorkflows.map(w => ({
              value: w.id,
              label: w.name
            }))
          ]}
          placeholder="请选择工作流"
          size="sm"
        />
      </div>
      {config.workflowId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            工作流描述
          </label>
          <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300">
            {workflows.find(w => w.id === config.workflowId)?.description || '工作流描述不可用'}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowConfig;
