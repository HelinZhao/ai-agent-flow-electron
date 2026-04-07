import { useState, useEffect, ReactNode } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { WorkflowNode } from '@renderer/types';
import { Panel, useReactFlow } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  onClose: () => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose }: NodeConfigPanelProps) => {
  const { updateNode } = useReactFlow()
  const { skills, agents } = useWorkflowStore();
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
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                选择技能
              </label>
              <select
                value={config.skillId || ''}
                onChange={(e) => setConfig({ ...config, skillId: e.target.value, skillName: skills.find(s => s.id === e.target.value)?.name })}
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

      case 'branch': {
        const branches = config.branches || [
          { id: uuidv4(), label: '条件1', condition: '' },
          { id: uuidv4(), label: '条件2', condition: '' }
        ];

        const addBranch = (): void => {
          const newBranch = {
            id: uuidv4(),
            label: `条件${branches.length + 1}`,
            condition: ''
          };
          setConfig({ ...config, branches: [...branches, newBranch] });
        };

        const removeBranch = (branchId: string): void => {
          if (branches.length <= 2) {
            alert('分支节点至少需要2个分支');
            return;
          }
          setConfig({ ...config, branches: branches.filter((b: any) => b.id !== branchId) });
        };

        const updateBranch = (branchId: string, field: string, value: string): void => {
          const updatedBranches = branches.map((branch: any) =>
            branch.id === branchId ? { ...branch, [field]: value } : branch
          );
          setConfig({ ...config, branches: updatedBranches });
        };

        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                分支条件配置
              </label>
              <button
                onClick={addBranch}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + 添加分支
              </button>
            </div>

            {branches.map((branch: any, index: number) => (
              <div key={branch.id} className="border border-gray-200 dark:border-gray-600 rounded-md p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    分支 {index + 1}
                  </span>
                  {branches.length > 2 && (
                    <button
                      onClick={() => removeBranch(branch.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    分支标签
                  </label>
                  <input
                    type="text"
                    value={branch.label}
                    onChange={(e) => updateBranch(branch.id, 'label', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="分支名称"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    条件描述
                  </label>
                  <textarea
                    value={branch.condition}
                    onChange={(e) => updateBranch(branch.id, 'condition', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                    placeholder="描述此分支的执行条件"
                  />
                </div>
              </div>
            ))}

            <p className="text-xs text-gray-500">
              每个分支可以连接到不同的后续节点。
            </p>
          </div>
        );
      }
      case 'llm':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                提示词模板 *
              </label>
              <textarea
                value={config.prompt || ''}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={4}
                placeholder="输入提示词模板，可以使用 {{variableName}} 格式的变量"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                变量配置 (JSON格式)
              </label>
              <textarea
                value={config.variables ? JSON.stringify(config.variables, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const variables = e.target.value ? JSON.parse(e.target.value) : {};
                    setConfig({ ...config, variables });
                  } catch (error: any) {
                    // 忽略JSON解析错误，允许用户继续编辑
                    console.log(error)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder='{\n  "variableName": "variableValue"\n}'
              />
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <p className="font-medium mb-1">提示词模板说明：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>使用 {'{'}&#123;variableName&#125;{'}'} 格式插入变量</li>
                <li>用户输入会自动添加到提示词末尾</li>
                <li>变量会在执行时动态替换</li>
              </ul>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API URL *
              </label>
              <input
                type="url"
                value={config.apiConfig?.url || ''}
                onChange={(e) => setConfig({
                  ...config,
                  apiConfig: { ...config.apiConfig, url: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://api.example.com/endpoint"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                HTTP 方法
              </label>
              <select
                value={config.apiConfig?.method || 'GET'}
                onChange={(e) => setConfig({
                  ...config,
                  apiConfig: { ...config.apiConfig, method: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                请求头 (JSON格式)
              </label>
              <textarea
                value={config.apiConfig?.headers}
                onChange={(e) => {
                  const headers = e.target.value;
                  setConfig({
                    ...config,
                    apiConfig: { ...config.apiConfig, headers }
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder='{"Content-Type": "application/json"}'
              />
            </div>

            {(config.apiConfig?.method === 'POST' || config.apiConfig?.method === 'PUT') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  请求体 (JSON格式)
                </label>
                <textarea
                  value={config.apiConfig?.body}
                  onChange={(e) => {
                    const body = e.target.value;
                    setConfig({
                      ...config,
                      apiConfig: { ...config.apiConfig, body }
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
            )}
          </div>
        );

      case 'agent':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                选择Agent
              </label>
              <select
                value={config.agentId || ''}
                onChange={(e) => setConfig({ ...config, agentId: e.target.value, agentName: agents.find(a => a.id === e.target.value)?.name })}
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

      default:
        return null;
    }
  };

  if (!node) {
    return (
      <Panel>
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-600 p-4">
          <div className="text-center text-gray-500 dark:text-gray-400">
            选择一个节点进行配置
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
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