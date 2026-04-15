import { useState, useEffect, ReactNode } from 'react';
import { WorkflowNode } from '@renderer/types';
import { Panel, useReactFlow } from '@xyflow/react';
import SkillConfig from './config/SkillConfig';
import BranchConfig from './config/BranchConfig';
import LLMConfig from './config/LLMConfig';
import ApiConfig from './config/ApiConfig';
import AgentConfig from './config/AgentConfig';

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
            配置 {node.type === 'start' ? '开始' : node.type === 'end' ? '结束' : node.type === 'skill' ? '技能' : node.type === 'branch' ? '分支' : node.type === 'api' ? 'API' : node.type === 'llm' ? 'LLM' : 'Agent'} 节点
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              节点标签
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="输入节点标签"
            />
          </div>
          {renderConfigFields()}
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-600 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </Panel>
  );
}

export default NodeConfigPanel