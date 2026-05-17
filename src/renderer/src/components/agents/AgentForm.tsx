import { useState, useMemo, useEffect } from 'react';
import { Agent, Skill, Workflow } from '@renderer/types';
import { TOOL_DEFINITIONS } from '@renderer/config';
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import CustomInput from '@renderer/components/ui/CustomInput';
import CustomButton from '@renderer/components/ui/CustomButton';
import Modal from '@renderer/components/ui/Modal';

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
}

interface AgentFormProps {
  agent: Agent | null
  skills: Skill[]
  workflows: Workflow[]
  onSave: (data: AgentFormData) => Promise<void>
  onCancel: () => void
}

// ─── Check icon ───
function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 ${
        checked
          ? 'bg-blue-500 border-blue-500'
          : 'border-gray-300 dark:border-gray-500 group-hover/item:border-gray-400 dark:group-hover/item:border-gray-400'
      }`}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

// ─── Skills/Tools Picker Modal ───
function PickerModal({
  open,
  target,
  skills,
  selected,
  onApply,
  onClose,
}: {
  open: boolean
  target: 'skills' | 'tools' | null
  skills: Skill[]
  selected: string[]
  onApply: (ids: string[]) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>([]);

  // Re-initialize local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalSelected(selected);
      setSearch('');
    }
  }, [open]);

  const items = useMemo(
    () => (target === 'skills' ? skills : AVAILABLE_TOOLS),
    [target, skills],
  );

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const q = search.toLowerCase();
        const label =
          target === 'skills' ? (item as Skill).name : (item as any).label;
        const desc = (item as any).description || '';
        return !q || label.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      }),
    [items, search, target],
  );

  const toggleItem = (id: string) => {
    setLocalSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    const allIds = filtered.map((item) =>
      target === 'skills' ? (item as Skill).id : (item as any).id,
    );
    setLocalSelected((prev) => {
      const combined = new Set([...prev, ...allIds]);
      return [...combined];
    });
  };

  const deselectAll = () => {
    const allIds = new Set(
      filtered.map((item) =>
        target === 'skills' ? (item as Skill).id : (item as any).id,
      ),
    );
    setLocalSelected((prev) => prev.filter((id) => !allIds.has(id)));
  };

  const allVisibleSelected =
    filtered.length > 0 &&
    filtered.every((item) => {
      const id = target === 'skills' ? (item as Skill).id : (item as any).id;
      return localSelected.includes(id);
    });

  const handleConfirm = () => {
    onApply(localSelected);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span>
          {target === 'skills' ? '选择技能' : '选择工具'}
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            ({localSelected.length} 项已选)
          </span>
        </span>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {target === 'skills' ? skills.length : AVAILABLE_TOOLS.length} 项
          </span>
          <CustomButton onClick={handleConfirm} variant="primary" size="sm">
            完成{localSelected.length > 0 && ` (${localSelected.length})`}
          </CustomButton>
        </div>
      }
    >
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={target === 'skills' ? '搜索技能名称...' : '搜索工具名称...'}
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 dark:focus:border-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Select all / clear */}
      {filtered.length > 1 && (
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={allVisibleSelected ? deselectAll : selectAll}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {allVisibleSelected ? '取消全选' : '全选'}
          </button>
          {localSelected.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              已选 {localSelected.length} 项
            </span>
          )}
        </div>
      )}

      {/* Item list */}
      <div className="space-y-1 max-h-80 overflow-y-auto mt-2 -mx-2 px-2">
        {filtered.map((item) => {
          const id = target === 'skills' ? (item as Skill).id : (item as any).id;
          const label =
            target === 'skills' ? (item as Skill).name : (item as any).label;
          const desc = (item as any).description || '';
          const firstChar = label.charAt(0);
          const enabled = localSelected.includes(id);
          return (
            <div
              key={id}
              role="option"
              aria-selected={enabled}
              onClick={() => toggleItem(id)}
              className="group/item relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 select-none"
              style={{ backgroundColor: enabled ? 'rgba(59, 130, 246, 0.06)' : undefined }}
            >
              {/* Left accent bar */}
              {enabled && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-full" />
              )}
              {/* Icon */}
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-colors ${
                  enabled
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 group-hover/item:bg-gray-200 dark:group-hover/item:bg-gray-600'
                }`}
              >
                <span className="text-sm font-semibold">{firstChar}</span>
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-medium transition-colors ${
                    enabled
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {label}
                </div>
                {desc && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {desc}
                  </div>
                )}
              </div>
              {/* Check */}
              <CheckCircle checked={enabled} />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
            <svg className="w-10 h-10 mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p className="text-sm">无匹配结果</p>
            <p className="text-xs mt-0.5">尝试更换搜索关键词</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Tag component for selected items ───
function Tags({
  items,
  onRemove,
  emptyText,
}: {
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
        <span
          key={item.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
        >
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
      ))}
    </div>
  );
}

// ─── AgentForm ───
export default function AgentForm({ agent, skills, workflows, onSave, onCancel }: AgentFormProps) {
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
        }
      : {
          name: '',
          description: '',
          instructions: '',
          type: 'standard',
          skillIds: [],
          enabledTools: [],
          workflowId: '',
        },
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'skills' | 'tools' | null>(null);

  const updateField = (field: Partial<AgentFormData>) =>
    setFormData((prev) => ({ ...prev, ...field }));

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.instructions.trim()) return;
    setIsLoading(true);
    try {
      await onSave(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyItems = (ids: string[]) => {
    const key = pickerTarget === 'skills' ? 'skillIds' : 'enabledTools';
    updateField({ [key]: ids });
  };

  const selectedSkills = skills.filter((s) => formData.skillIds.includes(s.id));
  const selectedTools = AVAILABLE_TOOLS.filter((t) => formData.enabledTools.includes(t.id));
  const hasWorkflows = workflows.length > 0;
  const hasSkills = skills.length > 0;

  return (
    <>
      <div className="space-y-8">
        {/* ── Basic Info Section ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-blue-500 rounded-full" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">基本信息</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                名称 <span className="text-red-500">*</span>
              </label>
              <CustomInput
                type="text"
                value={formData.name}
                onChange={(e) => updateField({ name: e.target.value })}
                placeholder="给 Agent 起个名字"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                描述
              </label>
              <CustomInput
                type="text"
                value={formData.description}
                onChange={(e) => updateField({ description: e.target.value })}
                placeholder="简要描述这个 Agent 的用途"
              />
            </div>
          </div>
        </section>

        {/* ── Type Section ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-purple-500 rounded-full" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Agent 类型</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                updateField({ type: 'standard', workflowId: '', skillIds: [], enabledTools: [] })
              }
              className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                formData.type === 'standard'
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
                    formData.type === 'standard'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">标准 Agent</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    可绑定技能和工具，在对话中按需调用
                  </div>
                </div>
              </div>
              {formData.type === 'standard' && (
                <div className="absolute top-3 right-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => updateField({ type: 'workflow', skillIds: [], enabledTools: [] })}
              className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                formData.type === 'workflow'
                  ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
                    formData.type === 'workflow'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3.75 6h16.5M3.75 12h16.5m-16.5 6h16.5" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">工作流 Agent</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    绑定一个现有工作流，对话将按工作流逻辑执行
                  </div>
                </div>
              </div>
              {formData.type === 'workflow' && (
                <div className="absolute top-3 right-3">
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          </div>
        </section>

        {/* ── Bindings Section (type-specific) ── */}
        {formData.type === 'standard' ? (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-emerald-500 rounded-full" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">技能 & 工具</h3>
            </div>

            {/* Skills */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                绑定技能
              </label>
              {hasSkills ? (
                <div className="space-y-2">
                  <div
                    onClick={() => setPickerTarget('skills')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer transition-colors border border-blue-200/50 dark:border-blue-800/50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                    <span>添加技能</span>
                  </div>
                  {selectedSkills.length > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                      <Tags
                        items={selectedSkills.map((s) => ({ id: s.id, label: s.name }))}
                        onRemove={(id) =>
                          updateField({ skillIds: formData.skillIds.filter((i) => i !== id) })
                        }
                        emptyText="暂未绑定技能"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                  暂无可用的技能，请先在技能管理页面创建
                </p>
              )}
            </div>

            {/* Tools */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                绑定工具
              </label>
              <div className="space-y-2">
                <div
                  onClick={() => setPickerTarget('tools')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer transition-colors border border-blue-200/50 dark:border-blue-800/50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  <span>添加工具</span>
                </div>
                {selectedTools.length > 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                    <Tags
                      items={selectedTools.map((t) => ({ id: t.id, label: t.label }))}
                      onRemove={(id) =>
                        updateField({ enabledTools: formData.enabledTools.filter((i) => i !== id) })
                      }
                      emptyText="暂未绑定工具"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-emerald-500 rounded-full" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">工作流绑定</h3>
            </div>
            <div>
              {hasWorkflows ? (
                <div>
                  <select
                    value={formData.workflowId}
                    onChange={(e) => updateField({ workflowId: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-colors text-gray-900 dark:text-white"
                  >
                    <option value="">选择工作流</option>
                    {workflows.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    绑定工作流后，与该 Agent 的对话将执行该工作流
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                  暂无可用的工作流，请先在工作流管理页面创建
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Instructions Section ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-amber-500 rounded-full" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">系统指令</h3>
          </div>
          <div>
            <div className="border border-gray-200/50 dark:border-gray-600/50 rounded-xl overflow-hidden">
              <MdEditor
                style={{ height: '400px' }}
                renderHTML={(text) => mdParser.render(text)}
                value={formData.instructions}
                onChange={(value) => updateField({ instructions: value.text })}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              详细描述这个 Agent 的职责、行为模式和回复风格 <span className="text-red-500">*</span>
            </p>
          </div>
        </section>
      </div>

      {/* ── Form Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-gray-200 dark:border-gray-700">
        <CustomButton onClick={onCancel} variant="secondary">
          取消
        </CustomButton>
        <CustomButton
          onClick={handleSave}
          disabled={isLoading || !formData.name.trim() || !formData.instructions.trim()}
        >
          {isLoading ? '保存中...' : isCreate ? '创建 Agent' : '保存修改'}
        </CustomButton>
      </div>

      {/* ── Picker Modal ── */}
      <PickerModal
        open={pickerTarget !== null}
        target={pickerTarget}
        skills={skills}
        selected={pickerTarget === 'skills' ? formData.skillIds : formData.enabledTools}
        onApply={handleApplyItems}
        onClose={() => setPickerTarget(null)}
      />
    </>
  );
}
