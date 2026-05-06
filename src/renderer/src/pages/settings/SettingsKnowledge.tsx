import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import { KnowledgeBase } from '@renderer/types'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomButton from '@renderer/components/ui/CustomButton'
import KnowledgeDetail from './KnowledgeDetail'
import { KB_DEFAULTS, CHUNK_SIZE_RANGE, CHUNK_OVERLAP_RANGE, TOP_K_RANGE } from '@renderer/config'

export default function SettingsKnowledge(): React.JSX.Element {
  const {
    knowledgeBases,
    getKnowledgeBases,
    addKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
  } = useWorkflowStore()

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null)
  const [deleteKbTarget, setDeleteKbTarget] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<KnowledgeBase>({
    defaultValues: {
      name: '',
      description: '',
      type: KB_DEFAULTS.type,
      chunkSize: KB_DEFAULTS.chunkSize,
      chunkOverlap: KB_DEFAULTS.chunkOverlap,
      topK: KB_DEFAULTS.topK,
      apiUrl: '',
      apiKey: '',
    }
  })

  const kbType = watch('type')

  React.useEffect(() => { getKnowledgeBases() }, [])

  const onSubmit = async (data: KnowledgeBase): Promise<void> => {
    setIsLoading(true)
    setMessage(null)
    try {
      if (editingId) {
        await updateKnowledgeBase(editingId, data)
        setMessage({ type: 'success', text: '知识库更新成功' })
      } else {
        await addKnowledgeBase(data)
        setMessage({ type: 'success', text: '知识库创建成功' })
      }
      reset()
      setShowForm(false)
      setEditingId(null)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '操作失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (kb: KnowledgeBase) => {
    setEditingId(kb.id)
    reset(kb)
    setShowForm(true)
  }

  const handleDeleteKb = async (id: string) => {
    setIsLoading(true)
    try {
      await deleteKnowledgeBase(id)
      setMessage({ type: 'success', text: '知识库删除成功' })
    } catch (error) {
      setMessage({ type: 'error', text: '删除失败' })
    } finally {
      setIsLoading(false)
      setDeleteKbTarget(null)
    }
  }

  const startNew = () => {
    reset({
      name: '',
      description: '',
      type: KB_DEFAULTS.type,
      chunkSize: KB_DEFAULTS.chunkSize,
      chunkOverlap: KB_DEFAULTS.chunkOverlap,
      topK: KB_DEFAULTS.topK,
      apiUrl: '',
      apiKey: '',
    })
    setEditingId(null)
    setShowForm(true)
  }

  // ========== 二级页面：知识库详情 ==========
  if (selectedKbId) {
    const kb = knowledgeBases.find(k => k.id === selectedKbId)
    if (!kb) {
      setSelectedKbId(null)
      return <></>
    }
    return (
      <KnowledgeDetail
        kb={kb}
        onBack={() => { setSelectedKbId(null); getKnowledgeBases() }}
        onEdit={() => handleEdit(kb)}
        onDelete={() => setDeleteKbTarget(kb.id)}
      />
    )
  }

  // ========== 主页面：卡片列表 ==========
  return (
    <div>
      {/* 提示消息 */}
      {message && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 opacity-60 hover:opacity-100">
            <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* 标题栏 */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">知识库</h3>
        <CustomButton onClick={startNew} variant="primary" size="sm">
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" /></svg>
          创建知识库
        </CustomButton>
      </div>

      {/* 空状态 */}
      {knowledgeBases.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <svg className="w-14 h-14 mb-4 opacity-25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v13.5zM8 7h8m-8 4h5" />
          </svg>
          <p className="text-sm font-medium">暂无知识库</p>
          <p className="text-xs mt-1">点击「创建知识库」开始使用</p>
        </div>
      )}

      {/* 卡片网格 */}
      <div className="grid grid-cols-2 gap-4">
        {knowledgeBases.map((kb) => (
          <div
            key={kb.id}
            className="group/kb relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
            onClick={() => setSelectedKbId(kb.id)}
          >
            {/* 卡片顶部色带 */}
            <div className={`h-1.5 rounded-t-xl ${
              kb.type === 'internal'
                ? 'bg-gradient-to-r from-purple-400 to-purple-500'
                : 'bg-gradient-to-r from-orange-400 to-orange-500'
            }`} />

            {/* 卡片内容 */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
                    kb.type === 'internal'
                      ? 'bg-purple-50 dark:bg-purple-900/20'
                      : 'bg-orange-50 dark:bg-orange-900/20'
                  }`}>
                    <svg className={`w-5 h-5 ${
                      kb.type === 'internal' ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'
                    }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {kb.type === 'internal'
                        ? <path d="M4 19.5A2.5 2.5 0 016.5 17H20a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v13.5zM8 7h8m-8 4h5" />
                        : <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      }
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{kb.name}</h4>
                    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md font-medium mt-0.5 ${
                      kb.type === 'internal'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                    }`}>
                      {kb.type === 'internal' ? '内部' : '外部'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 描述 */}
              {kb.description ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{kb.description}</p>
              ) : (
                <p className="text-xs text-gray-300 dark:text-gray-600 mb-3">暂无描述</p>
              )}

              {/* 统计 */}
              <div className="flex items-center space-x-3 text-xs text-gray-400 dark:text-gray-500">
                {kb.type === 'internal' && (
                  <>
                    <span>{kb.documentCount || 0} 文档</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>{kb.totalChunks || 0} 分块</span>
                  </>
                )}
                {kb.type === 'external' && (
                  <span>API: {kb.apiUrl ? kb.apiUrl.replace(/^https?:\/\//, '').split('/')[0] : '未配置'}</span>
                )}
              </div>
            </div>

            {/* 悬浮操作栏 */}
            <div className="absolute top-3 right-3 z-10 hidden group-hover/kb:flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
              <button
                onClick={(e) => { e.stopPropagation(); handleEdit(kb) }}
                className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="编辑"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteKbTarget(kb.id) }}
                className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="删除"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>

            {/* 进入箭头 */}
            <div className="absolute bottom-4 right-4 text-gray-300 dark:text-gray-600 group-hover/kb:text-blue-400 dark:group-hover/kb:text-blue-500 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        ))}
      </div>

      {/* ========== 编辑/创建表单 ========== */}
      {showForm && (
        <div className="mt-5 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {editingId ? '编辑知识库' : '创建知识库'}
            </span>
            <button onClick={() => { setShowForm(false); setEditingId(null); reset() }} className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">名称</label>
              <CustomInput
                {...register('name', { required: '请输入知识库名称' })}
                placeholder="例如：产品文档库"
                error={errors.name?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述</label>
              <CustomInput {...register('description')} placeholder="知识库用途说明" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">类型</label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setValue('type', 'internal')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                    kbType === 'internal'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v13.5zM8 7h8m-8 4h5" /></svg>
                  <span>内部知识库</span>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('type', 'external')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                    kbType === 'external'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span>外部知识库</span>
                </button>
              </div>
            </div>

            {kbType === 'internal' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">Embedding 模型根据活跃 LLM 提供商自动选择</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">分块大小</label>
                    <CustomInput type="number" min={CHUNK_SIZE_RANGE.min} max={CHUNK_SIZE_RANGE.max} {...register('chunkSize', { valueAsNumber: true })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">分块重叠</label>
                    <CustomInput type="number" min={CHUNK_OVERLAP_RANGE.min} max={CHUNK_OVERLAP_RANGE.max} {...register('chunkOverlap', { valueAsNumber: true })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">检索数量</label>
                    <CustomInput type="number" min={TOP_K_RANGE.min} max={TOP_K_RANGE.max} {...register('topK', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>
            )}

            {kbType === 'external' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">API 地址</label>
                  <CustomInput
                    {...register('apiUrl', { required: kbType === 'external' ? '请输入API地址' : false })}
                    placeholder="https://your-api.com/retrieve"
                    error={errors.apiUrl?.message}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">API Key（可选）</label>
                  <CustomInput type="password" {...register('apiKey')} placeholder="Bearer token" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">检索数量</label>
                  <CustomInput type="number" min={TOP_K_RANGE.min} max={TOP_K_RANGE.max} {...register('topK', { valueAsNumber: true })} />
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <CustomButton type="submit" disabled={isLoading} variant="primary" className="flex-1">
                {isLoading ? '保存中...' : editingId ? '更新' : '创建'}
              </CustomButton>
              <CustomButton type="button" onClick={() => { setShowForm(false); setEditingId(null); reset() }} variant="secondary">
                取消
              </CustomButton>
            </div>
          </form>
        </div>
      )}

      {/* ========== 删除知识库确认 ========== */}
      {deleteKbTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-5 mx-4 max-w-sm">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">删除知识库</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">所有文档和向量数据将一并删除，此操作不可恢复。</p>
            <div className="flex justify-end space-x-3">
              <CustomButton onClick={() => setDeleteKbTarget(null)} variant="secondary" size="sm">取消</CustomButton>
              <CustomButton onClick={() => handleDeleteKb(deleteKbTarget)} variant="danger" size="sm" disabled={isLoading}>
                {isLoading ? '删除中...' : '删除'}
              </CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}