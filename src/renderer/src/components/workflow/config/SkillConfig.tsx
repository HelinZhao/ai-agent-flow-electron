import React from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import MarkdownPreview from '@renderer/components/MarkdownPreview';
import CustomSelect from '../../ui/CustomSelect';

interface SkillConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const SkillConfig: React.FC<SkillConfigProps> = ({ config, onConfigChange }) => {
  const skills = useWorkflowStore((s) => s.skills);
  const selectedSkill = skills.find(s => s.id === config.skillId);
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          选择技能
        </label>
        <CustomSelect
          value={config.skillId || ''}
          onChange={(value) => onConfigChange({
            ...config,
            skillId: value,
            skillName: skills.find(s => s.id === value)?.name
          })}
          options={[
            { value: '', label: '请选择技能' },
            ...skills.map(skill => ({
              value: skill.id,
              label: skill.name
            }))
          ]}
          placeholder="请选择技能"
          size="sm"
        />
      </div>
      {config.skillId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            技能预览
          </label>
          <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-700 ">
            <MarkdownPreview content={selectedSkill?.content || '技能内容不可用'} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillConfig;