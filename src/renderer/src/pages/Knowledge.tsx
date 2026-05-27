import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import { KnowledgeBase } from '@renderer/types'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomButton from '@renderer/components/ui/CustomButton'
import KnowledgeDetail from './KnowledgeDetail'
import { KB_DEFAULTS, EXTERNAL_KB_PROVIDER_META } from '@renderer/config'
import { ollamaApi, PullProgress } from '@renderer/lib/api'
import OllamaInstallDialog from '@renderer/components/OllamaInstallDialog'
import MessageBanner from '@renderer/components/ui/MessageBanner'
import ResponsiveGrid from '@renderer/components/ui/ResponsiveGrid'
import KnowledgeEmbeddingStatus from '@renderer/components/knowledge/KnowledgeEmbeddingStatus'
import KnowledgeFormPanel from '@renderer/components/knowledge/KnowledgeFormPanel'

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
      className="group/kb relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onSelect(kb.id)}
    >
      <div className={`h-1.5 rounded-t-xl ${isInternal
        ? 'bg-gradient-to-r from-purple-400 to-purple-500'
        : 'bg-gradient-to-r from-orange-400 to-orange-500'
        }`} />

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${isInternal
              ? 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30'
              : 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30'
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

      <div className="absolute bottom-3 right-3 text-gray-300 dark:text-gray-600 group-hover/kb:text-blue-400 dark:group-hover/kb:text-blue-500 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
      </div>
    </div>
  )
})

export default function Knowledge(): React.JSX.Element {
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
  const [showOllamaDialog, setShowOllamaDialog] = useState(false)
  const [modelPulling, setModelPulling] = useState(false)
  const [modelPullProgress, setModelPullProgress] = useState<PullProgress | null>(null)

  useEffect(() => {
    let cancel: (() => void) | null = null
    ollamaApi.getStatus().then(status => {
      if (!status.ollamaRunning) {
        const dismissed = localStorage.getItem('ollama-dismissed')
        if (dismissed !== 'true') setShowOllamaDialog(true)
        return
      }
      setModelExists(status.modelExists)
      setModelPulling(status.pulling)
      // 仅当模型未就绪时订阅进度，避免闲置 SSE 连接
      if (status.modelExists) return
      cancel = ollamaApi.subscribePullProgress(progress => {
        setModelPullProgress(progress)
        if (progress.status === 'success') {
          setModelExists(true)
          setModelPulling(false)
        } else if (progress.status === 'error') {
          setModelPulling(false)
        } else if (progress.status === 'downloading' || progress.status === 'importing') {
          setModelPulling(true)
        }
      })
    }).catch(() => {
      const dismissed = localStorage.getItem('ollama-dismissed')
      if (dismissed !== 'true') setShowOllamaDialog(true)
    })
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

  const handleOllamaDismissOnce = () => setShowOllamaDialog(false)
  const handleOllamaDismissPermanently = () => {
    setShowOllamaDialog(false)
    localStorage.setItem('ollama-dismissed', 'true')
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
    if (meta?.defaultUrl) setValue('apiUrl', meta.defaultUrl)
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
    } catch {
      setMessage({ type: 'error', text: '删除失败' })
    } finally {
      setIsLoading(false)
      setDeleteKbTarget(null)
    }
  }

  const startNew = () => {
    reset({
      name: '', description: '', type: KB_DEFAULTS.type, provider: 'generic',
      vectorStore: 'sqlite-vec', vectorConfig: '', chunkSize: KB_DEFAULTS.chunkSize,
      chunkOverlap: KB_DEFAULTS.chunkOverlap, topK: KB_DEFAULTS.topK, apiUrl: '', apiKey: '',
    })
    setEditingId(null)
    setShowForm(true)
  }

  if (selectedKbId) {
    const kb = knowledgeBases.find(k => k.id === selectedKbId)
    if (!kb) { setSelectedKbId(null); return <></> }
    return (
      <KnowledgeDetail
        kb={kb}
        onBack={() => { setSelectedKbId(null); getKnowledgeBases() }}
      />
    )
  }

  return (
    <div className='py-6 px-4 sm:px-6 lg:px-8'>
      {message && (
        <MessageBanner type={message.type} text={message.text} onClose={() => setMessage(null)} />
      )}

      <KnowledgeEmbeddingStatus
        modelExists={modelExists}
        modelPulling={modelPulling}
        modelPullProgress={modelPullProgress}
        onPull={handleModelPull}
      />

      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            知识库
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理知识库，为 AI Agent 提供领域知识和文档检索能力，支持 RAG 增强生成</p>
        </div>
        <div className="flex items-center flex-wrap gap-2 justify-end">
          <CustomInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="搜索知识库..."
            size="sm" hidden={knowledgeBases.length === 0} className='rounded-xl'
            leftIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>} />
          <CustomButton onClick={startNew} variant="primary" size="sm">
            <span>✨</span>
            <span>创建</span>
          </CustomButton>
        </div>
      </div>

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

      <ResponsiveGrid>
        {filteredKbList.map((kb) => (
          <KBCard key={kb.id} kb={kb} onSelect={setSelectedKbId} onEdit={handleEdit} onDeleteClick={setDeleteKbTarget} />
        ))}
      </ResponsiveGrid>

      <KnowledgeFormPanel
        show={showForm}
        editingId={editingId}
        isLoading={isLoading}
        onSubmit={handleSubmit(onSubmit)}
        onClose={() => { setShowForm(false); setEditingId(null); reset() }}
        register={register}
        watch={watch}
        setValue={setValue}
        errors={errors}
        kbType={kbType}
        handleProviderChange={handleProviderChange}
      />

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

      {showOllamaDialog && (
        <OllamaInstallDialog
          onDismissOnce={handleOllamaDismissOnce}
          onDismissPermanently={handleOllamaDismissPermanently}
        />
      )}
    </div>
  )
}
