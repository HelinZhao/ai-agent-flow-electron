import { useState, useCallback } from 'react';
import CustomInput from '@renderer/components/ui/CustomInput';
import CustomTextarea from '@renderer/components/ui/CustomTextarea';
import CustomSelect from '@renderer/components/ui/CustomSelect';
import CustomButton from '@renderer/components/ui/CustomButton';
import ItemPickerModal from '@renderer/components/ui/ItemPickerModal';
import AiAssistButton from '@renderer/components/AiAssistButton';
import type { FrontendAction } from '@renderer/lib/frontendActionBus';

export interface TeamFormData {
  name: string
  description: string
  captainId?: string
  memberIds: string[]
  mode: string
  autoClaimEnabled?: boolean
  autoClaimInterval?: number
}

interface TeamFormProps {
  name: string; setName: (v: string) => void
  description: string; setDescription: (v: string) => void
  captainId: string; setCaptainId: (v: string) => void
  memberIds: string[]; setMemberIds: (v: string[]) => void
  mode: string; setMode: (v: string) => void
  autoClaimEnabled: boolean; setAutoClaimEnabled: (v: boolean) => void
  autoClaimInterval: number; setAutoClaimInterval: (v: number) => void
  agents: { id: string; name: string }[]
  saving: boolean; isCreate: boolean
  teamId?: string
  onSubmit: () => void; onCancel: () => void
}

const MODE_OPTIONS = [
  { value: 'captain_distribute', label: '队长分发', description: '队长拆解任务分配给成员', icon: '🎯' },
  { value: 'discuss', label: '全员讨论', description: '成员各自输出，汇总结果', icon: '💬' },
  { value: 'pipeline', label: '流水线', description: '成员串联处理', icon: '🔗' },
];

export default function TeamForm({
  name, setName, description, setDescription,
  captainId, setCaptainId, memberIds, setMemberIds,
  mode, setMode, autoClaimEnabled, setAutoClaimEnabled, autoClaimInterval, setAutoClaimInterval,
  agents, saving, isCreate, teamId, onSubmit, onCancel,
}: TeamFormProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const TEAM_SCHEMA: Record<string, string> = {
    name: '团队名称',
    description: '团队描述',
    captainId: '队长 Agent ID',
    memberIds: '成员 Agent ID 数组',
    mode: '协作模式（captain_distribute / discuss / pipeline）',
    autoClaimEnabled: '是否启用自动接取任务',
    autoClaimInterval: '自动接取间隔（秒）',
  }

  const onAiAction = useCallback((action: FrontendAction) => {
    if (action.action !== 'setConfig' || !action.payload) return
    if (action.payload.name !== undefined) setName(action.payload.name)
    if (action.payload.description !== undefined) setDescription(action.payload.description)
    if (action.payload.captainId !== undefined) setCaptainId(action.payload.captainId)
    if (action.payload.memberIds !== undefined) setMemberIds(action.payload.memberIds)
    if (action.payload.mode !== undefined) setMode(action.payload.mode)
    if (action.payload.autoClaimEnabled !== undefined) setAutoClaimEnabled(action.payload.autoClaimEnabled)
    if (action.payload.autoClaimInterval !== undefined) setAutoClaimInterval(action.payload.autoClaimInterval)
  }, [setName, setDescription, setCaptainId, setMemberIds, setMode, setAutoClaimEnabled, setAutoClaimInterval])

  const selectedMembers = memberIds
    .map(id => agents.find(a => a.id === id))
    .filter(Boolean) as { id: string; name: string }[];

  return (
    <div className="space-y-8">
      {/* ── 基本信息 ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 bg-blue-500 rounded-full" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">基本信息</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              团队名称 <span className="text-red-500">*</span>
            </label>
            <CustomInput
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入团队名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              描述 <span className="text-red-500">*</span>
            </label>
            <CustomTextarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="输入团队描述"
              rows={2}
            />
          </div>
        </div>
      </section>

      {/* ── 协作模式 ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 bg-purple-500 rounded-full" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">协作模式</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMode(opt.value)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                mode === opt.value
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
                  mode === opt.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <span className="text-lg">{opt.icon}</span>
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">{opt.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{opt.description}</div>
                </div>
              </div>
              {mode === opt.value && (
                <div className="absolute top-3 right-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── 队长配置 ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 bg-amber-500 rounded-full" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">队长配置</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">队长 Agent（可选）</label>
          <CustomSelect
            value={captainId}
            onChange={setCaptainId}
            placeholder="— 不设队长 —"
            options={agents.map(a => ({ value: a.id, label: a.name }))}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">队长负责拆解任务并分发给成员（仅在「队长分发」模式下生效）</p>
        </div>
      </section>

      {/* ── 成员管理 ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-cyan-500 rounded-full" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">成员管理</h3>
          </div>
          {agents.length > 0 && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer transition-colors border border-blue-200/50 dark:border-blue-800/50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v16m8-8H4" />
              </svg>
              <span>添加成员</span>
            </button>
          )}
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
          {selectedMembers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedMembers.map(m => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                >
                  {m.name}
                  <button
                    type="button"
                    onClick={() => setMemberIds(memberIds.filter(id => id !== m.id))}
                    className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M6 6l12 12M6 18L18 6" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
              {agents.length > 0 ? '暂未添加成员，点击上方「添加成员」按钮开始选择' : '暂无可用的 Agent，请先在 Agent 管理页面创建'}
            </p>
          )}
        </div>
      </section>

      <ItemPickerModal
        open={pickerOpen}
        title="选择成员"
        items={agents.map(a => ({ id: a.id, label: a.name, description: '' }))}
        selected={memberIds}
        onApply={(ids) => { setMemberIds(ids); setPickerOpen(false) }}
        onClose={() => setPickerOpen(false)}
      />

      {/* ── 自动接取 ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 bg-teal-500 rounded-full" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">自动接取任务</h3>
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setAutoClaimEnabled(!autoClaimEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${autoClaimEnabled ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoClaimEnabled ? 'translate-x-5' : ''}`} />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">启用自动接取</span>
              <p className="text-xs text-gray-400 dark:text-gray-500">服务端后台轮询任务池，自动认领并执行待办任务</p>
            </div>
          </label>

          {autoClaimEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">轮询间隔（秒）</label>
              <CustomInput
                type="number"
                value={String(autoClaimInterval)}
                onChange={e => setAutoClaimInterval(Math.max(10, Number(e.target.value) || 60))}
                min={10}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">每次轮询间隔时间，最小 10 秒</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Form Actions ── */}
      <div className="flex items-center justify-between gap-3 pt-6 mt-8 border-t border-gray-200 dark:border-gray-700">
        <AiAssistButton context={{
          contextType: 'team-editor',
          contextId: teamId ?? '__create__',
          label: name || '团队',
          data: { name, description, captainId, memberIds, mode, autoClaimEnabled, autoClaimInterval },
          schema: TEAM_SCHEMA,
        }} onAction={onAiAction} />
        <div className="flex items-center gap-3">
          <CustomButton onClick={onCancel} variant="secondary">取消</CustomButton>
          <CustomButton onClick={onSubmit} variant="primary" loading={saving} disabled={!name.trim() || !description.trim()}>
            {isCreate ? '创建团队' : '保存修改'}
          </CustomButton>
        </div>
      </div>
    </div>
  );
}
