import { useState } from 'react';
import { Agent, Skill, Workflow } from '@renderer/types';
import { TOOL_DEFINITIONS } from '@renderer/config';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import CustomInput from '@renderer/components/ui/CustomInput';
import CustomSelect from '@renderer/components/ui/CustomSelect';
import CustomButton from '@renderer/components/ui/CustomButton';
import ItemPickerModal from '@renderer/components/ui/ItemPickerModal';

const mdParser = new MarkdownIt();
const AVAILABLE_TOOLS = TOOL_DEFINITIONS;

export interface AgentFormData {
  name: string
  description: string
  instructions: string
  type: string
  skillIds: string[]
  enabledTools: string[]
  workflowId: string
  llmConfigId: string
}

interface AgentFormProps {
  agent: Agent | null
  skills: Skill[]
  workflows: Workflow[]
  onSave: (data: AgentFormData) => Promise<void>
  onCancel: () => void
  isSystem?: boolean
}

function Tags({ items, onRemove, emptyText }: {
  items: { id: string; label: string }[]
  onRemove: (id: string) => void
  emptyText: string
}) {
  if (items.length === 0) {
    return <span className="text-sm text-gray-400 dark:text-gray-500 italic">{emptyText}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          {item.label}
          <button type="button" onClick={() => onRemove(item.id)} className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors">
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 6l12 12M6 18L18 6" /></svg>
          </button>
        </span>
      ))}
    </div>
  );
}

export default function AgentForm({ agent, skills, workflows, onSave, onCancel, isSystem }: AgentFormProps) {
  const isCreate = !agent;

  const [formData, setFormData] = useState<AgentFormData>(
    agent
      ? {
          name: agent.name,
          description: agent.description,
          instructions: agent.instructions,
          type: agent.type || 'standard',
          skillIds: agent.skillIds || [],
          enabledTools: agent.enabledTools || [],
          workflowId: agent.workflowId || '',
          llmConfigId: agent.llmConfigId || '',
        }
      : {
          name: '',
          description: '',
          instructions: '',
          type: 'standard',
          skillIds: [],
          enabledTools: [],
          workflowId: '',
          llmConfigId: '',
        },
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'skills' | 'tools' | null>(null);

  const updateField = (field: Partial<AgentFormData>) =>
    setFormData((prev) => ({ ...prev, ...field }));

  const handleSave = async () => {
    if (!isSystem && (!formData.name.trim() || !formData.instructions.trim())) return;
    setIsLoading(true);
    try {
      await onSave(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSkills = skills.filter((s) => formData.skillIds.includes(s.id));
  const selectedTools = AVAILABLE_TOOLS.filter((t) => formData.enabledTools.includes(t.id));
  const hasWorkflows = workflows.length > 0;
  const hasSkills = skills.length > 0;
  const llmConfigs = useWorkflowStore((s) => s.llmConfigs);
  const activeLLMConfig = useWorkflowStore((s) => s.activeLLMConfig);

  return (
    <>
      <div className="space-y-8">
        {isSystem && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700">
            <p className="text-sm text-amber-700 dark:text-amber-300">布丁仅允许调整技能、工具和 LLM 配置，其他信息不可修改</p>
          </div>
        )}

        {/* ── 布丁只展示技能&工具，其他隐藏 ── */}
        {!isSystem && (
          <>
            <section>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">基本信息</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">名称 <span className="text-red-500">*</span></label>
                  <CustomInput type="text" value={formData.name} onChange={(e) => updateField({ name: e.target.value })} placeholder="给 Agent 起个名字" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述</label>
                  <CustomInput type="text" value={formData.description} onChange={(e) => updateField({ description: e.target.value })} placeholder="简要描述这个 Agent 的用途" />
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-purple-500 rounded-full" />
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Agent 类型</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => updateField({ type: 'standard', workflowId: '', skillIds: [], enabledTools: [] })}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${formData.type === 'standard' ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${formData.type === 'standard' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">标准 Agent</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">可绑定技能和工具，在对话中按需调用</div>
                    </div>
                  </div>
                  {formData.type === 'standard' && (
                    <div className="absolute top-3 right-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg></div>
                    </div>
                  )}
                </button>
                <button type="button" onClick={() => updateField({ type: 'workflow', skillIds: [], enabledTools: [] })}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${formData.type === 'workflow' ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-900/20 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${formData.type === 'workflow' ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3.75 6h16.5M3.75 12h16.5m-16.5 6h16.5" /></svg>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">工作流 Agent</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">绑定一个现有工作流，对话将按工作流逻辑执行</div>
                    </div>
                  </div>
                  {formData.type === 'workflow' && (
                    <div className="absolute top-3 right-3">
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center"><svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg></div>
                    </div>
                  )}
                </button>
              </div>
            </section>
          </>
        )}

        {/* ── Skills & Tools Section (仅标准 Agent) ── */}
        {formData.type === 'standard' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-amber-500 rounded-full" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">技能</h3>
            </div>
            {hasSkills && (
              <div onClick={() => setPickerTarget('skills')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer transition-colors border border-blue-200/50 dark:border-blue-800/50">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
                <span>添加技能</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            {hasSkills ? (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                {selectedSkills.length > 0 ? (
                  <Tags items={selectedSkills.map((s) => ({ id: s.id, label: s.name }))} onRemove={(id) => updateField({ skillIds: formData.skillIds.filter((i) => i !== id) })} emptyText="" />
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">暂未绑定技能，点击上方「添加技能」按钮开始绑定</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50">暂无可用的技能，请先在技能管理页面创建</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">工具</h3>
              </div>
              <div onClick={() => setPickerTarget('tools')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer transition-colors border border-blue-200/50 dark:border-blue-800/50">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
                <span>添加工具</span>
              </div>
            </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                {selectedTools.length > 0 ? (
                  <Tags items={selectedTools.map((t) => ({ id: t.id, label: t.label }))} onRemove={(id) => updateField({ enabledTools: formData.enabledTools.filter((i) => i !== id) })} emptyText="" />
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">暂未绑定工具，点击上方「添加工具」按钮开始绑定</p>
                )}
              </div>
          </div>
        </section>
        )}

        {formData.type === 'workflow' && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-indigo-500 rounded-full" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">工作流绑定</h3>
            </div>
            <div>
              {hasWorkflows ? (
                <div>
                  <CustomSelect
                    value={formData.workflowId}
                    onChange={(value) => updateField({ workflowId: value })}
                    options={[
                      { value: '', label: '选择工作流' },
                      ...workflows.map((w) => ({ value: w.id, label: w.name }))
                    ]}
                    size="md"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">绑定工作流后，与该 Agent 的对话将执行该工作流</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50">暂无可用的工作流，请先在工作流管理页面创建</p>
              )}
            </div>
          </section>
        )}

        {/* ── LLM 配置 Section（标准 Agent） ── */}
        {formData.type === 'standard' && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-cyan-500 rounded-full" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">LLM 配置</h3>
            </div>
            <div>
              <CustomSelect
                value={formData.llmConfigId}
                onChange={(value) => updateField({ llmConfigId: value })}
                options={[
                  { value: '', label: activeLLMConfig ? `默认（${activeLLMConfig.name}）` : '使用全局默认配置' },
                  ...llmConfigs.map((c) => ({ value: c.id, label: c.name + (c.isActive ? '（当前默认）' : '') }))
                ]}
                size="md"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">选择此 Agent 专用的 LLM 配置，留空则使用全局活跃配置</p>
            </div>
          </section>
        )}

        {/* ── Instructions Section ── */}
        {!isSystem && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-emerald-500 rounded-full" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">系统指令</h3>
            </div>
            <div>
              <div className="border border-gray-200/50 dark:border-gray-600/50 rounded-xl overflow-hidden">
                <MdEditor style={{ height: '400px' }} renderHTML={(text) => mdParser.render(text)} value={formData.instructions} onChange={(value) => updateField({ instructions: value.text })} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">详细描述这个 Agent 的职责、行为模式和回复风格 <span className="text-red-500">*</span></p>
            </div>
          </section>
        )}
      </div>

      {/* ── Form Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-gray-200 dark:border-gray-700">
        <CustomButton onClick={onCancel} variant="secondary">取消</CustomButton>
        <CustomButton onClick={handleSave} disabled={isLoading || (!isSystem && (!formData.name.trim() || !formData.instructions.trim()))}>
          {isLoading ? '保存中...' : isCreate ? '创建 Agent' : '保存修改'}
        </CustomButton>
      </div>

      {pickerTarget === 'skills' && (
        <ItemPickerModal open title="选择技能" items={skills.map((s) => ({ id: s.id, label: s.name, description: s.description }))} selected={formData.skillIds} onApply={(ids) => updateField({ skillIds: ids })} onClose={() => setPickerTarget(null)} />
      )}
      {pickerTarget === 'tools' && (
        <ItemPickerModal open title="选择工具" items={AVAILABLE_TOOLS.map((t) => ({ id: t.id, label: t.label, description: t.description }))} selected={formData.enabledTools} onApply={(ids) => updateField({ enabledTools: ids })} onClose={() => setPickerTarget(null)} />
      )}
    </>
  );
}
