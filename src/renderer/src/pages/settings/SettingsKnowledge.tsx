import React, { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import { KnowledgeBase } from '@renderer/types'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomButton from '@renderer/components/ui/CustomButton'

export default function SettingsKnowledge(): React.JSX.Element {
  const {
    knowledgeBases,
    getKnowledgeBases,
    addKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    uploadDocumentToKB,
    deleteDocumentFromKB,
  } = useWorkflowStore()

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<KnowledgeBase>({
    defaultValues: {
      name: '',
      description: '',
      type: 'internal',
      chunkSize: 500,
      chunkOverlap: 50,
      topK: 3,
      apiUrl: '',
      apiKey: '',
    }
  })

  const kbType = watch('type')

  React.useEffect(() => {
    getKnowledgeBases()
  }, [])

  const onSubmit = async (data: KnowledgeBase): Promise<void> => {
    setIsLoading(true)
    setMessage(null)
    try {
      if (editingId) {
        await updateKnowledgeBase(editingId, data)
        setMessage({ type: 'success', text: '知识库更新成功！' })
      } else {
        await addKnowledgeBase(data)
        setMessage({ type: 'success', text: '知识库创建成功！' })
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

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个知识库吗？所有文档和向量数据将一并删除。')) return
    setIsLoading(true)
    try {
      await deleteKnowledgeBase(id)
      setMessage({ type: 'success', text: '知识库删除成功！' })
    } catch (error) {
      setMessage({ type: 'error', text: '删除失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (kbId: string) => {
    if (!fileInputRef.current?.files?.length) return
    const file = fileInputRef.current.files[0]
    setIsLoading(true)
    setMessage(null)
    try {
      await uploadDocumentToKB(kbId, file)
      setMessage({ type: 'success', text: `文档 "${file.name}" 上传成功！` })
      fileInputRef.current.value = ''
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '上传失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDoc = async (kbId: string, docName: string) => {
    if (!confirm(`确定要删除文档 "${docName}" 吗？`)) return
    setIsLoading(true)
    try {
      await deleteDocumentFromKB(kbId, docName)
      setMessage({ type: 'success', text: '文档删除成功！' })
    } catch (error) {
      setMessage({ type: 'error', text: '删除文档失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const startNew = () => {
    reset({
      name: '',
      description: '',
      type: 'internal',
      chunkSize: 500,
      chunkOverlap: 50,
      topK: 3,
      apiUrl: '',
      apiKey: '',
    })
    setEditingId(null)
    setShowForm(true)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">知识库管理</h3>
        <CustomButton onClick={startNew} variant="primary" size="sm">
          + 新建知识库
        </CustomButton>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${message.type === 'success'
          ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
          : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3 mb-6">
        {knowledgeBases.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            暂无知识库，点击上方按钮创建
          </div>
        )}
        {knowledgeBases.map((kb) => (
          <div key={kb.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className={`text-xs px-2 py-1 rounded ${kb.type === 'internal'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                  }`}>
                    {kb.type === 'internal' ? '内部' : '外部'}
                  </span>
                  <h4 className="font-medium text-gray-900 dark:text-white">{kb.name}</h4>
                  {kb.type === 'internal' && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {kb.documentCount || 0} 文档 / {kb.totalChunks || 0} 分块
                    </span>
                  )}
                </div>
                {kb.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{kb.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {kb.type === 'internal' && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md"
                      className="hidden"
                      onChange={() => handleUpload(kb.id)}
                    />
                    <CustomButton
                      onClick={() => fileInputRef.current?.click()}
                      variant="secondary"
                      size="sm"
                      disabled={isLoading}
                    >
                      上传文档
                    </CustomButton>
                  </>
                )}
                <CustomButton onClick={() => handleEdit(kb)} variant="primary" size="sm">
                  编辑
                </CustomButton>
                <CustomButton onClick={() => handleDelete(kb.id)} variant="danger" size="sm">
                  删除
                </CustomButton>
              </div>
            </div>

            {/* 内部知识库的文档列表 */}
            {kb.type === 'internal' && (kb as any).documents?.length > 0 && (
              <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">已上传文档：</p>
                <div className="space-y-1">
                  {(kb as any).documents.map((doc: string) => (
                    <div key={doc} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 py-1">
                      <span>{doc}</span>
                      <button
                        onClick={() => handleDeleteDoc(kb.id, doc)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 border-t py-6">
          <h3 className="text-md font-medium text-gray-900 dark:text-white">
            {editingId ? '编辑知识库' : '新建知识库'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              名称 *
            </label>
            <CustomInput
              {...register('name', { required: '请输入知识库名称' })}
              placeholder="例如：产品文档库"
              error={errors.name?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              描述
            </label>
            <CustomInput
              {...register('description')}
              placeholder="知识库用途说明"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              类型
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setValue('type', 'internal')}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  kbType === 'internal'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                }`}
              >
                内部知识库（上传文档）
              </button>
              <button
                type="button"
                onClick={() => setValue('type', 'external')}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  kbType === 'external'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                }`}
              >
                外部知识库（API接入）
              </button>
            </div>
          </div>

          {/* 内部知识库配置 */}
          {kbType === 'internal' && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Embedding 模型将根据当前活跃的 LLM 提供商自动选择（百炼→text-embedding-v3，OpenAI→text-embedding-3-small）
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    分块大小
                  </label>
                  <CustomInput
                    type="number"
                    min={100}
                    max={2000}
                    {...register('chunkSize', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    分块重叠
                  </label>
                  <CustomInput
                    type="number"
                    min={0}
                    max={500}
                    {...register('chunkOverlap', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    检索数量 (topK)
                  </label>
                  <CustomInput
                    type="number"
                    min={1}
                    max={20}
                    {...register('topK', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 外部知识库配置 */}
          {kbType === 'external' && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API 地址 *
                </label>
                <CustomInput
                  {...register('apiUrl', { required: kbType === 'external' ? '请输入API地址' : false })}
                  placeholder="https://your-api.com/retrieve"
                  error={errors.apiUrl?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key（可选）
                </label>
                <CustomInput
                  type="password"
                  {...register('apiKey')}
                  placeholder="Bearer token"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  检索数量 (topK)
                </label>
                <CustomInput
                  type="number"
                  min={1}
                  max={20}
                  {...register('topK', { valueAsNumber: true })}
                />
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <CustomButton
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="flex-1"
            >
              {isLoading ? '保存中...' : editingId ? '更新知识库' : '创建知识库'}
            </CustomButton>
            <CustomButton
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); reset() }}
              variant="secondary"
            >
              取消
            </CustomButton>
          </div>
        </form>
      )}
    </div>
  )
}