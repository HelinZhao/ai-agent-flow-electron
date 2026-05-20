import React, { useState, useEffect } from 'react';
import { VariableConfig } from '@renderer/types';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { TOOL_DEFINITIONS } from '@renderer/config';
import { mcpApi } from '@renderer/lib/mcpApi';
import VariableConfigModal from '../VariableConfigModal';
import TemplateEditor from '../../ui/TemplateEditor';
import CustomButton from '../../ui/CustomButton';
import CustomSelect from '../../ui/CustomSelect';
import ItemPickerModal from '../../ui/ItemPickerModal';

const AVAILABLE_TOOLS = TOOL_DEFINITIONS

// ─── Tags ───
function Tags({
  items,
  onRemove,
  isMcpMap,
}: {
  items: { id: string; label: string }[]
  onRemove: (id: string) => void
  isMcpMap?: Record<string, boolean>
}) {
  if (items.length === 0) {
    return <span className="text-sm text-gray-400 dark:text-gray-500 italic">暂未绑定</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const isMcp = isMcpMap?.[item.id]
        return (
          <span
            key={item.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${isMcp ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'}`}
          >
            {isMcp && <span className="text-[10px] font-bold mr-0.5">MCP</span>}
            {item.label}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </span>
        )
      })}
    </div>
  );
}

// ─── SkillPicker ───
function SkillPicker({
  selected,
  onChange,
  skills,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  skills: { id: string; name: string; description: string }[]
}) {
  const [open, setOpen] = useState(false);
  const selectedSkills = skills.filter((s) => selected.includes(s.id));

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            技能
          </label>
          <CustomButton
            onClick={() => setOpen(true)}
            variant="primary"
            size="xs"
          >
            + 添加技能
          </CustomButton>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          绑定技能后，LLM 可通过 readSkill 工具读取技能内容并执行
        </p>
        <div className="space-y-2">
          {selectedSkills.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
              <Tags
                items={selectedSkills.map((s) => ({ id: s.id, label: s.name }))}
                onRemove={(id) => onChange(selected.filter((i) => i !== id))}
              />
            </div>
          )}
        </div>
      </div>

      <ItemPickerModal
        open={open}
        title="选择技能"
        items={skills.map((s) => ({ id: s.id, label: s.name, description: s.description }))}
        selected={selected}
        onApply={(ids) => { onChange(ids); setOpen(false); }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ─── ToolPicker ───
function ToolPicker({
  selected,
  onChange,
  mcpTools,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  mcpTools: typeof TOOL_DEFINITIONS
}) {
  const [open, setOpen] = useState(false);
  const allTools = [...AVAILABLE_TOOLS, ...mcpTools];
  const selectedTools = allTools.filter((t) => selected.includes(t.id));
  const isMcpMap: Record<string, boolean> = {};
  mcpTools.forEach(t => { isMcpMap[t.id] = true });

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            工具
          </label>
          <CustomButton
            onClick={() => setOpen(true)}
            variant="primary"
            size="xs"
          >
            + 添加工具
          </CustomButton>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          LLM 可以自主决定何时调用这些工具
        </p>
        <div className="space-y-2">
          {selectedTools.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
              <Tags
                items={selectedTools.map((t) => ({ id: t.id, label: t.label }))}
                onRemove={(id) => onChange(selected.filter((i) => i !== id))}
                isMcpMap={isMcpMap}
              />
            </div>
          )}
        </div>
      </div>

      <ItemPickerModal
        open={open}
        title="选择工具"
        items={allTools.map((t) => ({ id: t.id, label: t.label, description: t.description }))}
        selected={selected}
        onApply={(ids) => { onChange(ids); setOpen(false); }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

interface LLMConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const LLMConfig: React.FC<LLMConfigProps> = ({ config, onConfigChange }) => {
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<VariableConfig | null>(null);
  const [variables, setVariables] = useState<VariableConfig[]>(config.variables || []);
  const [mcpTools, setMcpTools] = useState<typeof TOOL_DEFINITIONS>([]);
  const knowledgeBases = useWorkflowStore((s) => s.knowledgeBases);
  const getKnowledgeBases = useWorkflowStore((s) => s.getKnowledgeBases);

  useEffect(() => {
    if (knowledgeBases.length === 0) getKnowledgeBases()
  }, [])

  useEffect(() => {
    mcpApi.getTools().then(tools => {
      setMcpTools(tools.map(t => ({ id: t.id, label: t.label, description: t.description })))
    }).catch(() => {})
  }, [])

  const llmConfigs = useWorkflowStore((s) => s.llmConfigs);
  const skills = useWorkflowStore((s) => s.skills);

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
        <TemplateEditor
          value={config.prompt || ''}
          onChange={(v) => onConfigChange({ ...config, prompt: v })}
          placeholder="输入提示词模板，可以使用 {{variableName}} 格式的变量"
          rows={4}
          minHeight="100px"
        />
      </div>

      {/* ── Skill picker ── */}
      <SkillPicker
        selected={config.skillIds || []}
        onChange={(ids) => onConfigChange({ ...config, skillIds: ids })}
        skills={skills}
      />

      {/* ── Tools picker ── */}
      <ToolPicker
        selected={config.enabledTools || []}
        onChange={(tools) => onConfigChange({ ...config, enabledTools: tools })}
        mcpTools={mcpTools}
      />

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            变量配置
          </label>
          <CustomButton
            onClick={handleAddVariable}
            variant="primary"
            size="xs"
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
                              值: <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-xs ml-1">
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
        defaultLabel="值"
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