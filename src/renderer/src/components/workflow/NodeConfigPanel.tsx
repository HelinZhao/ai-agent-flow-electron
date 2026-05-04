import { useState, useEffect, ReactNode } from 'react';
import { WorkflowNode } from '@renderer/types';
import { Panel, useReactFlow } from '@xyflow/react';
import SkillConfig from './config/SkillConfig';
import BranchConfig from './config/BranchConfig';
import LLMConfig from './config/LLMConfig';
import ApiConfig from './config/ApiConfig';
import AgentConfig from './config/AgentConfig';
import CLIConfig from './config/CliConfig';
import CustomInput from '../ui/CustomInput';
import CustomButton from '../ui/CustomButton';
import { getNodeDefaultLabel } from './nodes';

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  onClose: () => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose }: NodeConfigPanelProps) => {
  const { updateNode } = useReactFlow()
  const [config, setConfig] = useState<Record<string, any>>(node?.data.config || {});
  const [label, setLabel] = useState(node?.data.label || '');

  useEffect(() => {
    if (node) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig(node.data.config || {});
      setLabel(node.data.label || '');
    }
  }, [node]);

  const handleSave = (): void => {
    if (!node) return;
    updateNode(node.id, (node) => ({
      data: {
        ...node.data,
        label, config
      }
    }));
    onClose();
  };

  const renderConfigFields = (): ReactNode => {
    if (!node) return null;

    switch (node.type) {
      case 'skill':
        return <SkillConfig config={config} onConfigChange={setConfig} />;

      case 'branch':
        return <BranchConfig config={config} onConfigChange={setConfig} />;

      case 'llm':
        return <LLMConfig config={config} onConfigChange={setConfig} />;

      case 'api':
        return <ApiConfig config={config} onConfigChange={setConfig} />;

      case 'agent':
        return <AgentConfig config={config} onConfigChange={setConfig} />;

      case 'cli':
        return <CLIConfig config={config} onConfigChange={setConfig} />;

      default:
        return null;
    }
  };

  if (!node) {
    return (
      <Panel>
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-600 p-4 rounded">
          <div className="text-center text-gray-500 dark:text-gray-400">
            选择一个节点进行配置
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded">
        <div className="flex justify-between items-center p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            配置 {getNodeDefaultLabel(node.type)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4 max-h-[calc(100vh-360px)]">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              节点标签
            </label>
            <CustomInput
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="输入节点标签"
            />
          </div>
          {renderConfigFields()}
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-600 p-4">
          <CustomButton
            onClick={onClose}
            variant="secondary"
            size="sm"
          >
            取消
          </CustomButton>
          <CustomButton
            onClick={handleSave}
            variant="primary"
            size="sm"
          >
            保存
          </CustomButton>
        </div>
      </div>
    </Panel>
  );
}

export default NodeConfigPanel