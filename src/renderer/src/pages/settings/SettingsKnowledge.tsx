import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import { KnowledgeBase } from '@renderer/types'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import KnowledgeDetail from './KnowledgeDetail'
import { KB_DEFAULTS, CHUNK_SIZE_RANGE, CHUNK_OVERLAP_RANGE, TOP_K_RANGE, EXTERNAL_KB_PROVIDER_META, VECTOR_STORE_OPTIONS, VECTOR_STORE_CONFIG_FIELDS, VECTOR_STORE_DEFAULTS } from '@renderer/config'
import { ollamaApi, PullProgress } from '@renderer/lib/api'

const KBCard = React.memo(function KBCard({
  kb,
  onEdit,
  onDeleteClick,
  onSelect,
}: {
  kb: KnowledgeBase
  onEdit: (kb: KnowledgeBase) => void
  onDeleteClick: (id: string) => void
  onSelect: (id: string) => void
}) {
  const isInternal = kb.type === 'internal'

  return (
    <div
      className="group/kb relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onSelect(kb.id)}
    >
      <div className={`h-1.5 rounded-t-xl ${isInternal
          ? 'bg-gradient-to-r from-purple-400 to-purple-500'
          : 'bg-gradient-to-r from-orange-400 to-orange-500'
        }`} />

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${isInternal
                ? 'bg-purple-50 dark:bg-purple-900/20'
                : 'bg-orange-50 dark:bg-orange-900/20'
              }`}>
              <svg className={`w-5 h-5 ${isInternal ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'
                }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isInternal
                  ? <path d="M4 19.5A2.5 2.5 0 016.5 17H20a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v13.5zM8 7h8m-8 4h5" />
                  : <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                }
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{kb.name}</h4>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md font-medium mt-0.5 ${isInternal
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                }`}>
                {isInternal ? '内部' : '外部'}
              </span>
            </div>
          </div>
        </div>

        {kb.description ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{kb.description}</p>
        ) : (
          <p className="text-xs text-gray-300 dark:text-gray-600 mb-3">暂无描述</p>
        )}

        <div className="flex items-center space-x-3 text-xs text-gray-400 dark:text-gray-500">
          {isInternal ? (
            <>
              <span>{kb.documentCount || 0} 文档</span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>{kb.totalChunks || 0} 分块</span>
            </>
          ) : (
            <span>API: {kb.apiUrl ? kb.apiUrl.replace(/^https?:\/\//, '').split('/')[0] : '未配置'}</span>
          )}
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 hidden group-hover/kb:flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(kb) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="编辑"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteClick(kb.id) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="删除"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="absolute bottom-4 right-4 text-gray-300 dark:text-gray-600 group-hover/kb:text-blue-400 dark:group-hover/kb:text-blue-500 transition-colors">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
      </div>
    </div>
  )
})

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
  const [searchTerm, setSearchTerm] = useState('')
  const [modelExists, setModelExists] = useState<boolean | null>(null)
  const [modelPulling, setModelPulling] = useState(false)
  const [modelPullProgress, setModelPullProgress] = useState<PullProgress | null>(null)

  // 检查 embedding 模型状态
  useEffect(() => {
    let cancel: (() => void) | null = null
    ollamaApi.getStatus().then(status => {
      setModelExists(status.modelExists)
      if (status.pulling) {
        setModelPulling(true)
        cancel = ollamaApi.subscribePullProgress(progress => {
          setModelPullProgress(progress)
          if (progress.status === 'success') {
            setModelExists(true)
            setModelPulling(false)
          } else if (progress.status === 'error') {
            setModelPulling(false)
          }
        })
      }
    }).catch(() => setModelExists(false))
    return () => { cancel?.() }
  }, [])

  const filteredKbList = knowledgeBases.filter(kb =>
    searchTerm === '' ||
    kb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (kb.description && kb.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<KnowledgeBase>({
    defaultValues: {
      name: '',
      description: '',
      type: KB_DEFAULTS.type,
      provider: 'generic',
      vectorStore: 'sqlite-vec',
      vectorConfig: '',
      chunkSize: KB_DEFAULTS.chunkSize,
      chunkOverlap: KB_DEFAULTS.chunkOverlap,
      topK: KB_DEFAULTS.topK,
      apiUrl: '',
      apiKey: '',
    }
  })

  const kbType = watch('type')

  /** 从 vectorConfig JSON 中读取某个配置值 */
  const getVectorConfigValue = (key: string): any => {
    try {
      return JSON.parse(watch('vectorConfig') || '{}')[key]
    } catch {
      return undefined
    }
  }

  /** 设置 vectorConfig JSON 中的某个配置值 */
  const setVectorConfigValue = (key: string, value: any): void => {
    const current = watch('vectorConfig') || '{}'
    let parsed: Record<string, any> = {}
    try { parsed = JSON.parse(current) } catch { /* ignore */ }
    parsed[key] = value
    setValue('vectorConfig', JSON.stringify(parsed))
  }

  /** 从 providerConfig JSON 中读取某个配置值 */
  const getProviderConfigValue = (key: string): any => {
    try {
      return JSON.parse(watch('providerConfig') || '{}')[key]
    } catch {
      return undefined
    }
  }

  /** 设置 providerConfig JSON 中的某个配置值 */
  const setProviderConfigValue = (key: string, value: any): void => {
    const current = watch('providerConfig') || '{}'
    let parsed: Record<string, any> = {}
    try { parsed = JSON.parse(current) } catch { /* ignore */ }
    parsed[key] = value
    setValue('providerConfig', JSON.stringify(parsed))
  }

  const handleModelPull = async (): Promise<void> => {
    setModelPulling(true)
    setModelPullProgress(null)
    try {
      const res = await ollamaApi.pullModel()
      if (res.success) {
        ollamaApi.subscribePullProgress(progress => {
          setModelPullProgress(progress)
          if (progress.status === 'success') {
            setModelExists(true)
            setModelPulling(false)
          } else if (progress.status === 'error') {
            setModelPulling(false)
          }
        })
      } else {
        setModelPullProgress({ status: 'error', message: res.message })
        setModelPulling(false)
      }
    } catch {
      setModelPullProgress({ status: 'error', message: '请求失败' })
      setModelPulling(false)
    }
  }

  const handleProviderChange = (newProvider: string): void => {
    setValue('provider', newProvider)
    const meta = EXTERNAL_KB_PROVIDER_META[newProvider]
    if (meta?.defaultUrl) {
      setValue('apiUrl', meta.defaultUrl)
    }
  }

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
      provider: 'generic',
      vectorStore: 'sqlite-vec',
      vectorConfig: '',
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
      />
    )
  }

  // ========== 主页面：卡片列表 ==========
  return (
    <div>
      {/* 提示消息 */}
      {message && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between ${message.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-3 opacity-60 hover:opacity-100 flex-shrink-0">
            <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Embedding 模型状态卡片 */}
      {modelExists !== null && (
        <div className={`mb-5 p-4 rounded-xl border transition-colors ${
          modelExists
            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
            : modelPullProgress?.status === 'error'
              ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
              : modelPulling
                ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                modelExists
                  ? 'bg-green-100 dark:bg-green-900/20'
                  : modelPulling
                    ? 'bg-blue-100 dark:bg-blue-900/20'
                    : 'bg-amber-100 dark:bg-amber-900/20'
              }`}>
                {modelExists ? (
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : modelPulling ? (
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Embedding 模型
                  <code className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 text-xs font-mono">bge-m3-q8_0</code>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {modelExists
                    ? '模型已就绪，内部知识库可正常使用'
                    : modelPullProgress?.status === 'error'
                      ? modelPullProgress.message || '模型下载失败，请重试'
                      : modelPulling
                        ? modelPullProgress?.status || '正在下载...'
                        : '模型未安装，内部知识库需要此模型进行文档向量化'}
                </p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex-shrink-0">
              {modelExists ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  已就绪
                </span>
              ) : modelPulling ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                  下载中...
                </span>
              ) : !modelPullProgress?.status ? (
                <CustomButton
                  size="sm"
                  variant="primary"
                  onClick={handleModelPull}
                >
                  下载模型
                </CustomButton>
              ) : (
                <CustomButton
                  size="sm"
                  variant="primary"
                  onClick={handleModelPull}
                >
                  重新下载
                </CustomButton>
              )}
            </div>
          </div>

          {/* 拉取进度条 */}
          {modelPulling && modelPullProgress && (
            <div className="mt-3">
              <div className="w-full h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${modelPullProgress.total && modelPullProgress.completed
                      ? Math.round((modelPullProgress.completed / modelPullProgress.total) * 100)
                      : 30}%`
                  }}
                />
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {modelPullProgress.status}
                {modelPullProgress.completed != null && modelPullProgress.total != null
                  ? ` (${Math.round(modelPullProgress.completed / 1024 / 1024)}MB / ${Math.round(modelPullProgress.total / 1024 / 1024)}MB)`
                  : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 标题栏 */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">知识库</h3>
        <div className="flex space-x-2 items-center">
          <CustomInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索知识库..."
            size="sm"
            hidden={knowledgeBases.length === 0}
            className='rounded-xl'
            leftIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>}
          />
          <CustomButton onClick={startNew} variant="primary" size="sm">
            <span>✨</span>
            <span>创建知识库</span>
          </CustomButton>
        </div>
      </div>

      {/* 空状态 */}
      {filteredKbList.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          {searchTerm ? (
            <>
              <svg className="w-14 h-14 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm font-medium">未找到匹配的知识库</p>
              <p className="text-xs mt-1">尝试使用其他关键词搜索</p>
            </>
          ) : (
            <>
              <svg className="w-14 h-14 mb-4 opacity-25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v13.5zM8 7h8m-8 4h5" />
              </svg>
              <p className="text-sm font-medium">暂无知识库</p>
              <p className="text-xs mt-1">点击「创建知识库」开始使用</p>
            </>
          )}
        </div>
      )}

      {/* 卡片网格 */}
      <div className="grid grid-cols-2 gap-4">
        {filteredKbList.map((kb) => (
          <KBCard
            key={kb.id}
            kb={kb}
            onSelect={setSelectedKbId}
            onEdit={handleEdit}
            onDeleteClick={setDeleteKbTarget}
          />
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
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm transition-colors ${kbType === 'internal'
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
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm transition-colors ${kbType === 'external'
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
                {/* 向量引擎选择 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">向量引擎</label>
                  <CustomSelect
                    value={watch('vectorStore') || 'sqlite-vec'}
                    onChange={(v) => { setValue('vectorStore', v); setValue('vectorConfig', '') }}
                    options={VECTOR_STORE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                    placeholder="选择向量引擎"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {VECTOR_STORE_DEFAULTS[watch('vectorStore') || 'sqlite-vec'] || ''}
                  </p>
                </div>

                {/* 外部向量引擎连接配置 */}
                {VECTOR_STORE_CONFIG_FIELDS[watch('vectorStore') || ''] && (
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3 space-y-3">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">连接配置</p>
                    {VECTOR_STORE_CONFIG_FIELDS[watch('vectorStore') || ''].map(field => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {field.label}{field.required ? ' *' : ''}
                        </label>
                        <CustomInput
                          type={field.type}
                          placeholder={field.placeholder}
                          value={getVectorConfigValue(field.key) || ''}
                          onChange={(e) => setVectorConfigValue(field.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}

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
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">提供商</label>
                  <CustomSelect
                    value={watch('provider') || 'generic'}
                    onChange={handleProviderChange}
                    options={Object.entries(EXTERNAL_KB_PROVIDER_META).map(([key, meta]) => ({
                      value: key,
                      label: meta.name
                    }))}
                    placeholder="选择提供商"
                  />
                  {watch('provider') && watch('provider') !== 'generic' && EXTERNAL_KB_PROVIDER_META[watch('provider')!]?.docs && (
                    <a
                      href={EXTERNAL_KB_PROVIDER_META[watch('provider')!].docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 mt-1 inline-block"
                    >
                      查看 {EXTERNAL_KB_PROVIDER_META[watch('provider')!].name} 文档 →
                    </a>
                  )}
                </div>
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

                {watch('provider') === 'dify' && (
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Dify 检索配置</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">搜索模式</label>
                      <CustomSelect
                        value={getProviderConfigValue('search_method') || 'keyword_search'}
                        onChange={(v) => setProviderConfigValue('search_method', v)}
                        options={[
                          { value: 'keyword_search', label: '关键字搜索' },
                          { value: 'semantic_search', label: '语义搜索' },
                          { value: 'hybrid_search', label: '混合搜索' },
                          { value: 'full_text_search', label: '全文搜索' },
                        ]}
                      />
                    </div>
                  </div>
                )}

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