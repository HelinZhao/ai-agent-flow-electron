import React, { useState } from 'react';
import { VariableConfig } from '@renderer/types';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import VariableConfigModal from '../VariableConfigModal';
import CustomTextarea from '../../ui/CustomTextarea';
import CustomButton from '../../ui/CustomButton';
import CustomSelect from '../../ui/CustomSelect';

const AVAILABLE_TOOLS = [
  { id: 'readFile', label: '读取文件', description: '读取指定文件内容' },
  { id: 'writeFile', label: '写入文件', description: '将内容写入指定文件' },
  { id: 'listDirectory', label: '列出目录', description: '列出目录下的文件和子目录' },
  { id: 'executeCommand', label: '执行命令', description: '执行 shell 命令' },
  { id: 'httpRequest', label: 'HTTP请求', description: '发送 HTTP 请求' },
  { id: 'webSearch', label: '网页搜索', description: '搜索网页获取信息' },
  { id: 'workflowsApi', label: '工作流API', description: '管理工作流和执行（CRUD+执行）' },
  { id: 'agentsSkillsApi', label: 'Agent/技能API', description: '管理 Agent 和技能（CRUD）' },
  { id: 'knowledgeApi', label: '知识库API', description: '管理知识库和 RAG 检索' },
  { id: 'configApi', label: '系统配置API', description: 'LLM 配置、触发器、系统设置' },
]

interface LLMConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const LLMConfig: React.FC<LLMConfigProps> = ({ config, onConfigChange }) => {
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<VariableConfig | null>(null);
  const [variables, setVariables] = useState<VariableConfig[]>(config.variables || []);
  const { knowledgeBases, getKnowledgeBases } = useWorkflowStore();

  React.useEffect(() => {
    if (knowledgeBases.length === 0) getKnowledgeBases()
  }, [])

  const llmConfigs = useWorkflowStore((s) => s.llmConfigs);

  // 当外部config变化时同步更新本地状态
  React.useEffect(() => {
    setVariables(config.variables || []);
  }, [config.variables]);

  const handleAddVariable = () => {
    setEditingVariable(null);
    setShowVariableModal(true);
  };

  const handleEditVariable = (variable: VariableConfig) => {
    setEditingVariable(variable);
    setShowVariableModal(true);
  };

  const handleDeleteVariable = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index);
    setVariables(newVariables);
    onConfigChange({ ...config, variables: newVariables });
  };

  const handleSaveVariable = (variable: VariableConfig) => {
    let newVariables: VariableConfig[];

    if (editingVariable) {
      // 编辑现有变量 - 通过索引更新
      const editIndex = variables.findIndex(v => v.name === editingVariable.name);
      newVariables = [...variables];
      if (editIndex !== -1) {
        newVariables[editIndex] = variable;
      }
    } else {
      // 添加新变量
      newVariables = [...variables, variable];
    }

    setVariables(newVariables);
    onConfigChange({ ...config, variables: newVariables });
  };

  return (
    <div className="space-y-4">
      {/* LLM 配置选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          LLM 配置
        </label>
        <CustomSelect
          value={config.llmConfigId || ''}
          onChange={(val) => onConfigChange({ ...config, llmConfigId: val })}
          options={[
            { value: '', label: '使用全局活跃配置' },
            ...llmConfigs.map((cfg) => ({
              value: cfg.id!,
              label: `${cfg.name} (${cfg.provider}/${cfg.model})`
            }))
          ]}
          placeholder="选择 LLM 配置"
          size="sm"
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          选择后该节点将使用指定的 LLM 配置，不选则使用页面顶部活跃的 LLM 配置
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          提示词模板 *
        </label>
        <CustomTextarea
          value={config.prompt || ''}
          onChange={(e) => onConfigChange({ ...config, prompt: e.target.value })}
          rows={4}
          placeholder="输入提示词模板，可以使用 {{variableName}} 格式的变量"
          size="sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          工具
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          勾选后 LLM 可以自主决定何时调用这些工具
        </p>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_TOOLS.map(t => {
            const enabled = (config.enabledTools || []).includes(t.id)
            return (
              <label
                key={t.id}
                className={`flex items-start space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${enabled
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => {
                    const current = config.enabledTools || []
                    const updated = enabled
                      ? current.filter(id => id !== t.id)
                      : [...current, t.id]
                    onConfigChange({ ...config, enabledTools: updated })
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{t.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={t.description}>{t.description}</div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            变量配置
          </label>
          <CustomButton
            onClick={handleAddVariable}
            variant="primary"
            size="sm"
          >
            + 添加变量
          </CustomButton>
        </div>

        {variables.length === 0 ? (
          <div className="text-gray-500 text-xs bg-gray-50 dark:bg-gray-700 p-3 rounded">
            暂无变量，点击&rdquo;添加变量&rdquo;按钮来配置变量
          </div>
        ) : (
          <div className="space-y-3">
            {variables.map((variable, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      {/* 第一行：显示名称和变量信息 */}
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {variable.displayName}
                        </h4>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                            {variable.name}
                          </span>
                          <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {variable.type}
                          </span>
                        </div>
                      </div>

                      {/* 第二行：必填和默认值（并排显示） */}
                      {(variable.required || variable.defaultValue) && (
                        <div className="flex items-center gap-x-3 mt-1">
                          {variable.required && (
                            <span className="text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 flex-shrink-0">
                              必填
                            </span>
                          )}
                          {variable.defaultValue && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                              默认值: <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-xs ml-1">
                                {String(variable.defaultValue)}
                              </code>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {variable.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
                        {variable.description}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => handleEditVariable(variable)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      style={{ transform: "translate(0.5rem,-0.5rem)" }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteVariable(index)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      style={{ transform: "translate(0.5rem,-0.5rem)" }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 p-3 rounded">
        <p className="font-medium mb-1">提示词模板说明：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>使用 {'{'}&#123;variableName&#125;{'}'} 格式插入变量</li>
          <li>用户输入会自动添加到提示词末尾</li>
          <li>变量会在执行时动态替换</li>
        </ul>
      </div>

      <VariableConfigModal
        isOpen={showVariableModal}
        onClose={() => {
          setShowVariableModal(false);
          setEditingVariable(null);
        }}
        onSave={handleSaveVariable}
        initialVariable={editingVariable || undefined}
        existingVariables={variables}
      />

      {/* 知识库增强 */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <input
            type="checkbox"
            checked={config.enableKnowledgeBase ?? false}
            onChange={(e) => onConfigChange({
              ...config,
              enableKnowledgeBase: e.target.checked,
              knowledgeBaseId: e.target.checked ? config.knowledgeBaseId : ''
            })}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            启用知识库增强
          </label>
        </div>
        {config.enableKnowledgeBase && (
          <div className="mt-2">
            <CustomSelect
              value={config.knowledgeBaseId || ''}
              onChange={(val) => onConfigChange({ ...config, knowledgeBaseId: val })}
              options={knowledgeBases.map(kb => ({
                value: kb.id,
                label: `${kb.name} (${kb.type === 'internal' ? '内部' : '外部'})`
              }))}
              placeholder="选择知识库"
              size="sm"
            />
            <div className="text-xs text-gray-500 mt-1">
              执行时自动从知识库检索相关内容注入提示词
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center space-x-3 mb-2">
          <input
            type="checkbox"
            checked={config.enableCache ?? false}
            onChange={(e) => onConfigChange({ ...config, enableCache: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            启用缓存
          </label>
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 p-3 rounded">
          相同 prompt 重复调用时直接返回缓存结果，节省 API 调用。注意：缓存会持续占用内存，且结果不会随外部数据更新，可能返回过时内容。
        </div>
      </div>

    </div >
  );
};

export default LLMConfig;