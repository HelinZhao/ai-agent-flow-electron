import React, { useState, useRef } from 'react'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import { KnowledgeBase } from '@renderer/types'
import { knowledgeBaseApi } from '@renderer/lib/api'
import CustomButton from '@renderer/components/ui/CustomButton'
import MessageBanner from '@renderer/components/ui/MessageBanner'
import ChunkViewer from '@renderer/components/workflow/config/ChunkViewer'
import { KB_UPLOAD_ACCEPT, EXTERNAL_KB_PROVIDER_META } from '@renderer/config'

interface KnowledgeDetailProps {
  kb: KnowledgeBase
  onBack: () => void
}

export default function KnowledgeDetail({ kb, onBack }: KnowledgeDetailProps): React.JSX.Element {
  const { uploadDocumentToKB, deleteDocumentFromKB, getKnowledgeBases } = useWorkflowStore()

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [chunkViewerState, setChunkViewerState] = useState<{ kbId: string; docName: string } | null>(null)
  const [deleteDocTarget, setDeleteDocTarget] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.length) return
    const file = fileInputRef.current.files[0]
    setIsUploading(true)
    setMessage(null)
    try {
      await uploadDocumentToKB(kb.id, file)
      setMessage({ type: 'success', text: `文档 "${file.name}" 上传成功` })
      fileInputRef.current.value = ''
      getKnowledgeBases()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '上传失败' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDoc = async (docName: string) => {
    setIsLoading(true)
    try {
      await deleteDocumentFromKB(kb.id, docName)
      setMessage({ type: 'success', text: '文档删除成功' })
      getKnowledgeBases()
    } catch (error) {
      setMessage({ type: 'error', text: '删除文档失败' })
    } finally {
      setIsLoading(false)
      setDeleteDocTarget(null)
    }
  }

  const handleDownload = async (docName: string) => {
    try {
      const blob = await knowledgeBaseApi.downloadDocument(kb.id, docName)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = docName
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setMessage({ type: 'error', text: `下载失败: ${error instanceof Error ? error.message : '未知错误'}` })
    }
  }

  const docs = kb.documents || []

  return (
    <div>
      {/* 提示消息 */}
      {message && (
        <MessageBanner
          type={message.type}
          text={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* ========== 顶部导航 ========== */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
              kb.type === 'internal'
                ? 'bg-purple-50 dark:bg-purple-900/20'
                : 'bg-orange-50 dark:bg-orange-900/20'
            }`}>
              <svg className={`w-4.5 h-4.5 ${
                kb.type === 'internal' ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'
              }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {kb.type === 'internal'
                  ? <path d="M4 19.5A2.5 2.5 0 016.5 17H20a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v13.5zM8 7h8m-8 4h5" />
                  : <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                }
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{kb.name}</h3>
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                  kb.type === 'internal'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                }`}>
                  {kb.type === 'internal' ? '内部' : '外部'}
                </span>
              </div>
              {kb.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kb.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== 统计概览 ========== */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kb.documentCount || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">文档</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kb.totalChunks || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">分块</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kb.chunkSize}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">分块大小</p>
        </div>
      </div>

      {/* ========== 文档管理 ========== */}
      {kb.type === 'internal' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">文档列表</h4>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={KB_UPLOAD_ACCEPT}
                className="hidden"
                onChange={handleUpload}
              />
              <CustomButton
                onClick={() => fileInputRef.current?.click()}
                variant="primary"
                size="sm"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-current" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    上传中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" /></svg>
                    上传文档
                  </>
                )}
              </CustomButton>
            </div>
          </div>

          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/30">
              <svg className="w-10 h-10 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">暂无文档</p>
              <p className="text-xs mt-1">点击「上传文档」添加 txt/md 文件</p>
            </div>
          ) : (
            <div className="space-y-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 overflow-hidden">
              {docs.map((doc) => (
                <div
                  key={doc}
                  className="group/doc relative flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700">
                      <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{doc}</span>
                  </div>

                  {/* 悬浮操作栏 — absolute + opacity 避免高度跳跃 */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg backdrop-blur-sm opacity-0 group-hover/doc:opacity-100 transition-opacity pointer-events-none group-hover/doc:pointer-events-auto">
                    <button
                      onClick={() => setChunkViewerState({ kbId: kb.id, docName: doc })}
                      className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="查看分块"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4zM8 4v16M4 8h16M4 12h16" /></svg>
                    </button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      title="下载"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m14-7l-5 5-5-5m5 5V3" /></svg>
                    </button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                    <button
                      onClick={() => setDeleteDocTarget(doc)}
                      className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="删除"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========== 外部知识库配置信息 ========== */}
      {kb.type === 'external' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">外部配置</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">提供商</span>
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {kb.provider && EXTERNAL_KB_PROVIDER_META[kb.provider]
                  ? EXTERNAL_KB_PROVIDER_META[kb.provider].name
                  : kb.provider || '通用 API'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">API 地址</span>
              <span className="text-xs text-gray-700 dark:text-gray-300">{kb.apiUrl || '未配置'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">检索数量</span>
              <span className="text-xs text-gray-700 dark:text-gray-300">{kb.topK}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">API Key</span>
              <span className="text-xs text-gray-700 dark:text-gray-300">{kb.apiKey ? '已配置' : '未配置'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========== 删除文档确认 ========== */}
      {deleteDocTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-5 mx-4 max-w-sm">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">删除文档</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">确定要删除文档 "{deleteDocTarget}" 吗？相关向量也将被清除。</p>
            <div className="flex justify-end space-x-3">
              <CustomButton onClick={() => setDeleteDocTarget(null)} variant="secondary" size="sm">取消</CustomButton>
              <CustomButton onClick={() => handleDeleteDoc(deleteDocTarget)} variant="danger" size="sm" disabled={isLoading}>
                {isLoading ? '删除中...' : '删除'}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* 分块查看弹窗 */}
      {chunkViewerState && (
        <ChunkViewer
          kbId={chunkViewerState.kbId}
          docName={chunkViewerState.docName}
          onClose={() => { setChunkViewerState(null); getKnowledgeBases() }}
        />
      )}
    </div>
  )
}