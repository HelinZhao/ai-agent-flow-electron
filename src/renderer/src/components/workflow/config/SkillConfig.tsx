import React from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';

interface SkillConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const SkillConfig: React.FC<SkillConfigProps> = ({ config, onConfigChange }) => {
  const { skills } = useWorkflowStore();
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          选择技能
        </label>
        <select
          value={config.skillId || ''}
          onChange={(e) => onConfigChange({
            ...config,
            skillId: e.target.value,
            skillName: skills.find(s => s.id === e.target.value)?.name
          })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">请选择技能</option>
          {skills.map(skill => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
      </div>
      {config.skillId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            技能预览
          </label>
          <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-40 overflow-y-auto text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300">
            {skills.find(s => s.id === config.skillId)?.content || '技能内容不可用'}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillConfig;