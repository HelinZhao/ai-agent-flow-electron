import { useEffect, useState, useCallback } from 'react'
import { EnvVar } from '@renderer/types'
import { envVarApi } from '@renderer/lib/api'
import Modal from '@renderer/components/ui/Modal'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomTextarea from '@renderer/components/ui/CustomTextarea'

export default function SettingsEnvVars(): React.JSX.Element {
  const [list, setList] = useState<EnvVar[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [showValue, setShowValue] = useState<Record<string, boolean>>({})

  const refresh = useCallback(async () => {
    try {
      const vars = await envVarApi.getAll()
      setList(vars)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const openCreate = () => {
    setEditingId(null)
    setFormName('')
    setFormValue('')
    setFormDesc('')
    setShowModal(true)
  }

  const openEdit = (v: EnvVar) => {
    setEditingId(v.id)
    setFormName(v.name)
    setFormValue(v.value)
    setFormDesc(v.description)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await envVarApi.update(editingId, {
          name: formName.trim(),
          value: formValue,
          description: formDesc,
        })
      } else {
        await envVarApi.create({
          name: formName.trim(),
          value: formValue,
          description: formDesc,
        })
      }
      setShowModal(false)
      await refresh()
    } catch (e: any) {
      const msg = e?.response?.data?.error || '保存失败'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该环境变量？')) return
    try {
      await envVarApi.delete(id)
      await refresh()
    } catch { /* ignore */ }
  }

  const toggleValue = (id: string) => {
    setShowValue(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">环境变量</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            在画布中通过 {'{{$global.xxx}}'} 引用。可用于管理 API Key、URL 等敏感信息。
          </p>
        </div>
        <CustomButton onClick={openCreate} variant="primary" size="sm">
          添加变量
        </CustomButton>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">加载中...</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <svg className="w-12 h-12 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <p className="text-sm font-medium">暂无环境变量</p>
          <p className="text-xs mt-1">点击右上角"添加变量"创建</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((v) => {
            const isVisible = showValue[v.id]
            return (
              <div
                key={v.id}
                className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 transition-colors group"
              >
                {/* 名称 */}
                <div className="flex items-center gap-2 w-48 shrink-0">
                  <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white text-xs shadow-sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  </div>
                  <code className="text-sm font-mono font-semibold text-gray-900 dark:text-white truncate">
                    {v.name}
                  </code>
                </div>

                {/* 值 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-gray-600 dark:text-gray-400 truncate">
                      {isVisible ? v.value : '••••••••'}
                    </code>
                    <button
                      onClick={() => toggleValue(v.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 p-0.5"
                      title={isVisible ? '隐藏' : '显示'}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {isVisible ? (
                          <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></>
                        ) : (
                          <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                        )}
                      </svg>
                    </button>
                  </div>
                  {v.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{v.description}</p>
                  )}
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(v)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 编辑弹窗 */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? '编辑环境变量' : '添加环境变量'}
        footer={
          <div className="flex gap-2">
            <CustomButton onClick={() => setShowModal(false)} variant="ghost" size="sm">取消</CustomButton>
            <CustomButton onClick={handleSave} variant="primary" size="sm" disabled={!formName.trim()} loading={saving}>
              保存
            </CustomButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              变量名称 *
            </label>
            <CustomInput
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="例如: OPENAI_API_KEY"
              size="sm"
              disabled={!!editingId}
            />
            <p className="text-xs text-gray-400 mt-1">名称只能包含字母、数字和下划线，创建后不可修改</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              值 *
            </label>
            <CustomInput
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              placeholder="输入值"
              size="sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              描述（可选）
            </label>
            <CustomTextarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="描述此变量的用途"
              className="min-h-[60px]"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
