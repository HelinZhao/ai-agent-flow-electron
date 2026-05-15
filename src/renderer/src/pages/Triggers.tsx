import { useEffect, useState } from 'react'
import { Trigger } from '@renderer/types'
import { triggerApi } from '@renderer/lib/api'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import { CRON_PRESETS, WEBHOOK_BASE_URL } from '@renderer/config'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import CustomSwitch from '@renderer/components/ui/CustomSwitch'
import CustomTextarea from '@renderer/components/ui/CustomTextarea'

function formatTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function describeCronSimple(expr: string): string {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) return expr
  const [min, hour, dom, month, dow] = fields
  if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') return '每分钟'
  if (min.startsWith('*/')) return `每 ${min.slice(2)} 分钟`
  if (hour.startsWith('*/')) return `每 ${hour.slice(2)} 小时`
  if (min === '0' && hour !== '*' && dom === '*' && month === '*' && dow === '*') return `每天 ${hour}:00`
  if (min === '0' && hour !== '*' && dow !== '*' && dom === '*') {
    const dowNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const days = dow.split(',').map((d: string) => dowNames[parseInt(d, 10)] || d)
    return `${hour}:00 ${days.join('、')}`
  }
  return expr
}

const TARGET_TYPE_LABEL: Record<string, string> = {
  workflow: '工作流',
  agent: 'Agent'
}

export default function Triggers(): React.JSX.Element {
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<'cron' | 'webhook'>('cron')
  const [formCron, setFormCron] = useState('0 9 * * *')
  const [formTargetType, setFormTargetType] = useState<'workflow' | 'agent'>('workflow')
  const [formTargetId, setFormTargetId] = useState('')
  const [formInput, setFormInput] = useState('')
  const [saving, setSaving] = useState(false)

  const workflows = useWorkflowStore(s => s.workflows)
  const agents = useWorkflowStore(s => s.agents)

  const refresh = async () => {
    try {
      const list = await triggerApi.getAll()
      setTriggers(list)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const targetOptions = (formTargetType === 'workflow' ? workflows : agents).map((w: { id: string; name: string }) => ({
    value: w.id,
    label: w.name
  }))

  const openCreate = () => {
    setEditingId(null)
    setFormName('')
    setFormType('cron')
    setFormCron('0 9 * * *')
    setFormTargetType('workflow')
    setFormTargetId(targetOptions[0]?.value || '')
    setFormInput('')
    setShowModal(true)
  }

  const openEdit = (t: Trigger) => {
    setEditingId(t.id)
    setFormName(t.name)
    setFormType(t.type)
    setFormCron(t.cronExpression || '0 9 * * *')
    setFormTargetType(t.targetType)
    setFormTargetId(t.targetId)
    setFormInput(t.input)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formTargetId) return
    setSaving(true)
    try {
      if (editingId) {
        await triggerApi.update(editingId, {
          name: formName,
          cronExpression: formType === 'cron' ? formCron : undefined,
          targetType: formTargetType,
          targetId: formTargetId,
          input: formInput
        })
      } else {
        await triggerApi.create({
          name: formName,
          type: formType,
          cronExpression: formType === 'cron' ? formCron : undefined,
          targetType: formTargetType,
          targetId: formTargetId,
          input: formInput,
          enabled: true
        })
      }
      setShowModal(false)
      await refresh()
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

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

  const handleTargetTypeChange = (v: string) => {
    setFormTargetType(v as 'workflow' | 'agent')
    const targets = v === 'workflow' ? workflows : agents
    setFormTargetId(targets[0]?.id || '')
  }

  return (
    <div className="h-full flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">触发器</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            定时或 Webhook 自动执行工作流
          </p>
        </div>
        <CustomButton onClick={openCreate} size="sm">
          + 新建触发器
        </CustomButton>
      </div>

      {/* list */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">加载中...</div>
        ) : triggers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
            <span className="text-4xl">⏰</span>
            <span>暂无触发器，点击上方按钮创建</span>
          </div>
        ) : (
          <div className="space-y-3">
            {triggers.map((t) => (
              <div
                key={t.id}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4 flex items-center gap-4"
              >
                {/* left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{t.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      t.type === 'cron'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {t.type === 'cron' ? '定时' : 'Webhook'}
                    </span>
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
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <CustomSwitch checked={t.enabled} onChange={() => handleToggle(t)} />

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
            ))}
          </div>
        )}
      </div>

      {/* modal overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
             onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto"
               onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {editingId ? '编辑触发器' : '新建触发器'}
              </h2>
              <button onClick={() => setShowModal(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">名称</label>
                <CustomInput size="sm" value={formName} onChange={e => setFormName(e.target.value)} placeholder="例如：每日报表" />
              </div>

              {/* type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">触发方式</label>
                <CustomSelect
                  size="sm"
                  value={formType}
                  onChange={v => setFormType(v as 'cron' | 'webhook')}
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
                        onClick={() => setFormCron(p.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          formCron === p.value
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <CustomInput
                    size="sm"
                    value={formCron}
                    onChange={e => setFormCron(e.target.value)}
                    placeholder="0 9 * * *"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {describeCronSimple(formCron)} — 格式: 分 时 日 月 周
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
                        { value: 'agent', label: 'Agent' }
                      ]}
                    />
                  </div>
                  <div className="flex-1">
                    <CustomSelect
                      size="sm"
                      value={formTargetId}
                      onChange={setFormTargetId}
                      options={targetOptions}
                      placeholder={targetOptions.length === 0 ? `暂无${formTargetType === 'workflow' ? '工作流' : 'Agent'}` : '请选择...'}
                    />
                  </div>
                </div>
              </div>

              {/* input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  输入文本
                </label>
                <CustomTextarea
                  size="sm"
                  value={formInput}
                  onChange={e => setFormInput(e.target.value)}
                  placeholder="传给工作流 Start 节点的输入内容"
                  rows={3}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <CustomButton variant="secondary" onClick={() => setShowModal(false)}>
                取消
              </CustomButton>
              <CustomButton onClick={handleSave} loading={saving}
                            disabled={!formName.trim() || !formTargetId}>
                {editingId ? '保存' : '创建'}
              </CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
