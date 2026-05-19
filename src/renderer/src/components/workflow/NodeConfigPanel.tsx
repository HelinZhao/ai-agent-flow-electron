import { useState, useEffect, ReactNode, memo } from 'react';
import { WorkflowNode } from '@renderer/types';
import { Panel, useReactFlow } from '@xyflow/react';
import SkillConfig from './config/SkillConfig';
import BranchConfig from './config/BranchConfig';
import LLMConfig from './config/LLMConfig';
import ApiConfig from './config/ApiConfig';
import AgentConfig from './config/AgentConfig';
import CLIConfig from './config/CliConfig';
import TextConfig from './config/TextConfig';
import WorkflowConfig from './config/WorkflowConfig';
import McpConfig from './config/McpConfig';
import CustomInput from '../ui/CustomInput';
import CustomButton from '../ui/CustomButton';
import { getNodeDefaultLabel, NODE_DEFS_MAP } from './nodes';

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  onClose: () => void;
  onSave?: (nodeId: string, label: string, config: Record<string, any>) => void;
  workflowId?: string;
}

const BG_COLORS: Record<string, string> = {
  start: 'bg-green-500',
  skill: 'bg-blue-500',
  branch: 'bg-amber-500',
  llm: 'bg-indigo-500',
  api: 'bg-purple-500',
  agent: 'bg-red-500',
  workflow: 'bg-cyan-500',
  cli: 'bg-orange-500',
  text: 'bg-teal-500',
  end: 'bg-gray-500',
  mcp: 'bg-purple-500',
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose, onSave, workflowId }: NodeConfigPanelProps) => {
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
    if (onSave) {
      onSave(node.id, label, config);
    } else {
      updateNode(node.id, (node) => ({
        data: { ...node.data, label, config }
      }));
    }
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

      case 'workflow':
        return <WorkflowConfig config={config} onConfigChange={setConfig} workflowId={workflowId} />;

      case 'cli':
        return <CLIConfig config={config} onConfigChange={setConfig} />;

      case 'mcp':
        return <McpConfig config={config} onConfigChange={setConfig} />;

      case 'text':
        return <TextConfig config={config} onConfigChange={setConfig} />;

      default:
        return null;
    }
  };

  if (!node) {
    return (
      <Panel>
        <div className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl shadow-lg">
          <div className="flex flex-col items-center justify-center py-16 px-6 text-gray-400 dark:text-gray-500">
            <svg className="w-10 h-10 mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p className="text-sm font-medium">选择一个节点进行配置</p>
            <p className="text-xs mt-1">点击画布中的节点以编辑其参数</p>
          </div>
        </div>
      </Panel>
    );
  }

  const nodeDef = NODE_DEFS_MAP[node.type]
  const bgColor = BG_COLORS[node.type] || 'bg-gray-500'

  return (
    <Panel>
      <div className="w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm ${bgColor} text-white flex-shrink-0`}>
              <span>{nodeDef?.icon || '⬡'}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{getNodeDefaultLabel(node.type)}</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">节点配置 · ID: <span className="max-w-[180px] inline-block truncate align-bottom" title={node.id}>{node.id}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[calc(100vh-400px)]">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              节点标签
            </label>
            <CustomInput
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="输入节点标签"
              size="sm"
            />
          </div>
          {renderConfigFields()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30">
          <CustomButton
            onClick={onClose}
            variant="ghost"
            size="sm"
          >
            取消
          </CustomButton>
          <CustomButton
            onClick={handleSave}
            variant="primary"
            size="sm"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17,21 17,13 7,13 7,21" />
              <polyline points="7,3 7,8 15,8" />
            </svg>
            <span className='ml-1'>保存</span>
          </CustomButton>
        </div>
      </div>
    </Panel>
  );
}

export default memo(NodeConfigPanel)
