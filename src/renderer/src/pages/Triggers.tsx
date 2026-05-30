import { useEffect, useState, useRef, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Trigger, VariableConfig } from '@renderer/types'
import { triggerApi, workflowApi } from '@renderer/lib/api'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import { CRON_PRESETS, WEBHOOK_BASE_URL } from '@renderer/config'
import Modal from '@renderer/components/ui/Modal'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import CustomSwitch from '@renderer/components/ui/CustomSwitch'
import CustomTextarea from '@renderer/components/ui/CustomTextarea'
import CronBuilder from '@renderer/components/CronBuilder'
import cronstrue from 'cronstrue'
import 'cronstrue/locales/zh_CN'
import AiAssistButton from '@renderer/components/AiAssistButton'
import type { FrontendAction } from '@renderer/lib/frontendActionBus'

function formatTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function describeCronSimple(expr: string): string {
  try {
    // 使用cronstrue来生成更准确的描述，设置为中文
    return cronstrue.toString(expr, {
      locale: 'zh_CN',
      use24HourTimeFormat: true,
      verbose: false
    })
  } catch (error) {
    // 如果出现错误，返回原始表达式
    console.warn('Cron expression parse error:', error)
    return expr
  }
}

const TARGET_TYPE_LABEL: Record<string, string> = {
  workflow: '工作流',
  agent: 'Agent',
  team: '团队',
}

export default function Triggers(): React.JSX.Element {
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // form state
  const [targetParams, setTargetParams] = useState<VariableConfig[]>([])
  const [saving, setSaving] = useState(false)
  const savedParamValues = useRef<Record<string, any>>({})

  const { handleSubmit, reset, control, getValues, setValue, watch } = useForm<Record<string, any>>({
    defaultValues: { name: '', input: '', type: 'cron', cronExpression: '0 0 9 * * *', targetType: 'workflow', targetId: '' }
  })

  const formType = watch('type')
  const formCron = watch('cronExpression')
  const formTargetType = watch('targetType')
  const formTargetId = watch('targetId')

  const TRIGGER_SCHEMA: Record<string, string> = {
    name: '触发器名称',
    type: '触发方式，cron 为定时触发，webhook 为 Webhook 触发',
    cronExpression: 'Cron 表达式，仅在 type 为 cron 时有效',
    targetType: '执行目标类型，workflow 或 agent',
    targetId: '执行目标 ID',
    input: '传递给目标工作流/Agent 的输入内容',
  }

  const onAiAction = useCallback((action: FrontendAction) => {
    if (action.contextId !== (editingId ?? 'new')) return
    if (action.action === 'setConfig' && action.payload) {
      for (const [key, value] of Object.entries(action.payload)) {
        setValue(key, value)
      }
    }
  }, [editingId, setValue])

  const triggers = useWorkflowStore(s => s.triggers)
  const setTriggers = useWorkflowStore(s => s.setTriggers)
  const workflows = useWorkflowStore(s => s.workflows)
  const agents = useWorkflowStore(s => s.agents)
  const teams = useWorkflowStore(s => s.teams)

  const refresh = async () => {
    try {
      const list = await triggerApi.getAll()
      setTriggers(list)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const getTargetList = (type: string) => {
    if (type === 'workflow') return workflows
    if (type === 'agent') return agents
    if (type === 'team') return teams
    return []
  }
  const targetOptions = getTargetList(formTargetType).map((w: { id: string; name: string }) => ({
    value: w.id,
    label: w.name,
  }))

  const openCreate = () => {
    setEditingId(null)
    reset({ name: '', input: '', type: 'cron', cronExpression: '0 0 9 * * *', targetType: 'workflow', targetId: targetOptions[0]?.value || '' })
    setShowModal(true)
  }

  const openEdit = (t: Trigger) => {
    setEditingId(t.id)
    const parsed: Record<string, any> = {}
    try { Object.assign(parsed, JSON.parse(t.params || '{}')) } catch { /* ignore */ }
    savedParamValues.current = { ...parsed }
    reset({
      name: t.name,
      input: t.input || parsed.input || '',
      type: t.type,
      cronExpression: t.cronExpression || '0 0 9 * * *',
      targetType: t.targetType,
      targetId: t.targetId
    })
    // 立即回显 params (不依赖 useEffect 的异步加载)
    Object.entries(parsed).forEach(([key, val]) => {
      if (key !== 'input') setValue(`params.${key}`, val)
    })
    setShowModal(true)
  }

  const onSave = async () => {
    const all = getValues()
    if (!all.name?.trim()) return
    const targetId = all.targetId
    const targetType = all.targetType
    if (!targetId) return
    const input = all.input || ''
    let params: Record<string, any> | undefined
    if (targetType === 'workflow' && targetParams.length > 0) {
      params = getValues('params') || {}
    }
    setSaving(true)
    try {
      const isCron = all.type === 'cron'
      const info = {
        name: all.name.trim(),
        type: all.type,
        cronExpression: isCron ? all.cronExpression : undefined,
        targetType,
        targetId,
        input,
        params: params ? JSON.stringify(params) : undefined
      }
      if (editingId) {
        await triggerApi.update(editingId, info)
      } else {
        await triggerApi.create({ ...info, enabled: true })
      }
      setShowModal(false)
      await refresh()
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const handleSave = handleSubmit(onSave)

  const handleToggle = async (t: Trigger) => {
    await triggerApi.update(t.id, { enabled: !t.enabled })
    await refresh()
  }

  const handleDelete = async (t: Trigger) => {
    if (!confirm(`确定删除触发器「${t.name}」吗？`)) return
    await triggerApi.delete(t.id)
    await refresh()
  }

  const handleRun = async (t: Trigger) => {
    await triggerApi.runManual(t.id)
    await refresh()
  }

  const handleCopyWebhook = (token: string) => {
    navigator.clipboard.writeText(`${WEBHOOK_BASE_URL}/${token}`)
  }

  useEffect(() => {
    if (formTargetType !== 'workflow' || !formTargetId) {
      setTargetParams([])
      return
    }
    let cancelled = false
    workflowApi.getById(formTargetId).then((wf: any) => {
      if (cancelled) return
      const startNode = wf.nodes?.find((n: any) => n.type === 'start')
      const params = (startNode?.data?.config?.params as any[]) || []
      setTargetParams(params)
    }).catch(() => { if (!cancelled) setTargetParams([]) })
    return () => { cancelled = true }
  }, [formTargetId, formTargetType])

  const handleTargetTypeChange = (v: string) => {
    setValue('targetType', v)
    const targets = getTargetList(v)
    setValue('targetId', targets[0]?.id || '')
  }

  return (
    <div className="h-full flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            触发器
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            定时或 Webhook 自动执行工作流
          </p>
        </div>
        <CustomButton onClick={openCreate} size="sm">
          <span>✨</span>
          <span>创建</span>
        </CustomButton>
      </div>

      {/* list */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-4">
              <svg className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin opacity-60" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">加载中...</p>
          </div>
        ) : triggers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-4">
              <svg className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">暂无触发器</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">点击上方按钮创建</p>
          </div>
        ) : (
          <div className="space-y-3">
            {triggers.map((t) => (
              <div
                key={t.id}
                className="group/trigger bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4 flex items-center gap-4 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* type icon */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${t.type === 'cron'
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'bg-green-50 dark:bg-green-900/20'
                  }`}>
                  {t.type === 'cron' ? (
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                </div>
                {/* left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${t.type === 'cron'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                      }`}>
                      {t.type === 'cron' ? '定时' : 'Webhook'}
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{t.name}</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {t.type === 'cron'
                      ? `${describeCronSimple(t.cronExpression || '')} (${t.cronExpression})`
                      : `${WEBHOOK_BASE_URL}/${t.webhookToken}`
                    }
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    目标: {TARGET_TYPE_LABEL[t.targetType]} &middot; 上次执行: {t.lastRunAt ? formatTime(t.lastRunAt) : '从未'}
                    {t.lastRunStatus === 'success' && <span className="text-green-500 ml-1">✓</span>}
                    {t.lastRunStatus === 'failed' && <span className="text-red-500 ml-1">✗</span>}
                  </div>
                </div>

                {/* right: actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <CustomSwitch checked={t.enabled} onChange={() => handleToggle(t)} />

                  <div className="flex items-center gap-0.5 ml-1 p-0.5 rounded-lg border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-800">
                    {t.type === 'webhook' && (
                      <button
                        onClick={() => handleCopyWebhook(t.webhookToken || '')}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="复制 Webhook URL"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={() => handleRun(t)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="手动执行"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="编辑"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDelete(t)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="删除"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? '编辑触发器' : '新建触发器'}
        footer={
          <div className="flex items-center justify-between w-full">
            <AiAssistButton context={{
              contextType: 'trigger-editor',
              contextId: editingId ?? 'new',
              label: getValues('name') || '触发器',
              data: getValues(),
              schema: TRIGGER_SCHEMA,
            }}
              onAction={onAiAction}
            />
            <div className="flex items-center gap-2">
              <CustomButton variant="secondary" onClick={() => setShowModal(false)} size='sm'>
                取消
              </CustomButton>
              <CustomButton
                type="submit"
                form="trigger-form"
                loading={saving}
                size='sm'
              >
                {editingId ? '保存' : '创建'}
              </CustomButton>
            </div>
          </div>
        }
      >
        <form id="trigger-form" onSubmit={handleSave} key={editingId ?? 'create'} className="space-y-3">
          {/* name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">名称</label>
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <CustomInput size="sm" {...field} placeholder="例如：每日报表" />
              )}
            />
          </div>

          {/* type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">触发方式</label>
            <CustomSelect
              size="sm"
              value={formType}
              onChange={v => setValue('type', v)}
              options={[
                { value: 'cron', label: '⏰ 定时触发 (Cron)' },
                { value: 'webhook', label: '🔗 Webhook' }
              ]}
            />
          </div>

          {/* cron */}
          {formType === 'cron' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Cron 表达式
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CRON_PRESETS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setValue('cronExpression', p.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${formCron === p.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <CronBuilder
                  value={formCron}
                  onChange={(v) => setValue('cronExpression', v)}
                  includeSeconds={true}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {describeCronSimple(formCron)}
              </p>
            </div>
          )}

          {/* webhook */}
          {formType === 'webhook' && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-sm text-gray-500 dark:text-gray-400">
              创建后自动生成 Webhook URL，通过 POST 请求即可触发
            </div>
          )}

          {/* target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">执行目标</label>
            <div className="flex gap-2">
              <div className="w-28">
                <CustomSelect
                  size="sm"
                  value={formTargetType}
                  onChange={handleTargetTypeChange}
                  options={[
                    { value: 'workflow', label: '工作流' },
                    { value: 'agent', label: 'Agent' },
                    { value: 'team', label: '团队' },
                  ]}
                />
              </div>
              <div className="flex-1">
                <CustomSelect
                  size="sm"
                  value={formTargetId}
                  onChange={v => setValue('targetId', v)}
                  options={targetOptions}
                  placeholder={targetOptions.length === 0 ? `暂无${({ workflow: '工作流', agent: 'Agent', team: '团队' })[formTargetType as string] || '目标'}` : '请选择...'}
                />
              </div>
            </div>
          </div>

          {/* input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {(formTargetType === "workflow" && targetParams.length > 0) ? "工作流参数" : "输入文本"}
            </label>
            {(formTargetType === "workflow" && targetParams.length > 0) ? (
              <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    文本输入 <span className="text-gray-400 font-normal">({"{{$input}}"}，可选)</span>
                  </label>
                  <Controller
                    name="input"
                    control={control}
                    render={({ field }) => (
                      <CustomInput size="sm" {...field} placeholder="文本内容" />
                    )}
                  />
                </div>
                {targetParams.map(p => (
                  <div key={p.name}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {p.displayName || p.name}
                      {p.required && <span className="text-red-500 ml-0.5">*</span>}
                      <span className="text-gray-400 font-normal ml-1">({p.type})</span>
                    </label>
                    {p.type === "boolean" ? (
                      <Controller
                        name={`params.${p.name}`}
                        control={control}
                        defaultValue={!!p.defaultValue}
                        render={({ field }) => (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={!!field.value} onChange={e => field.onChange(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                          </label>
                        )}
                      />
                    ) : p.type === "number" ? (
                      <Controller
                        name={`params.${p.name}`}
                        control={control}
                        defaultValue={p.defaultValue ?? ''}
                        render={({ field }) => (
                          <input type="number" {...field} value={String(field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200" />
                        )}
                      />
                    ) : (
                      <Controller
                        name={`params.${p.name}`}
                        control={control}
                        defaultValue={p.defaultValue ?? ''}
                        render={({ field }) => (
                          <input type="text" {...field} placeholder={p.description || "输入" + (p.displayName || p.name)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200" />
                        )}
                      />
                    )}
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">触发时这些参数将传递给工作流的 Start 节点</p>
              </div>
            ) : (
              <Controller
                name="input"
                control={control}
                render={({ field }) => (
                  <CustomTextarea size="sm" {...field} placeholder="传给工作流 Start 节点的输入内容" rows={3} />
                )}
              />
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}
