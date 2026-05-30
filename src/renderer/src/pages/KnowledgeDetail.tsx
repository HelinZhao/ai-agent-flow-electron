import React, { useState, useRef } from 'react'
import { useWorkflowStore } from '@renderer/store/appStore'
import { KnowledgeBase } from '@renderer/types'
import { knowledgeBaseApi } from '@renderer/lib/api'
import CustomButton from '@renderer/components/ui/CustomButton'
import MessageBanner from '@renderer/components/ui/MessageBanner'
import Modal from '@renderer/components/ui/Modal'
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
  const [showRecallTest, setShowRecallTest] = useState(false)
  const [recallQuery, setRecallQuery] = useState('')
  const [recallTopK, setRecallTopK] = useState(3)
  const [recallResults, setRecallResults] = useState<{ id: string; content: string; source: string; chunkIndex: number; distance: number }[] | null>(null)
  const [recallLoading, setRecallLoading] = useState(false)

  const handleRecallTest = async () => {
    if (!recallQuery.trim()) return
    setRecallLoading(true)
    setRecallResults(null)
    try {
      const res = await knowledgeBaseApi.retrieveDebug(kb.id, recallQuery, recallTopK)
      setRecallResults(res.results)
    } catch (error) {
      setMessage({ type: 'error', text: `召回测试失败: ${error instanceof Error ? error.message : '未知错误'}` })
    } finally {
      setRecallLoading(false)
    }
  }
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isInternal = kb.type === 'internal'

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
      console.error('删除文档失败:', error)
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

  const accent = isInternal
    ? { border: 'border-purple-200/50 dark:border-purple-800/50', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500', hero: 'from-purple-500/10 via-transparent to-purple-500/10 dark:from-purple-500/5 dark:to-purple-500/5', icon: 'from-purple-500 to-purple-600', tag: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800' }
    : { border: 'border-orange-200/50 dark:border-orange-800/50', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', bar: 'bg-orange-500', hero: 'from-orange-500/10 via-transparent to-orange-500/10 dark:from-orange-500/5 dark:to-orange-500/5', icon: 'from-orange-500 to-orange-600', tag: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800' }

  return (
    <div className="px-6 py-4">
      {message && (
        <MessageBanner
          type={message.type}
          text={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* Back button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{kb.name}</h2>
      </div>

      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        {/* ── Hero ── */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${accent.hero} rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${accent.icon} shadow-lg flex-shrink-0`}>
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isInternal
                    ? <path d="M4 19.5A2.5 2.5 0 016.5 17H20a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v13.5zM8 7h8m-8 4h5" />
                    : <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  }
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{kb.name}</h2>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${accent.tag}`}>
                    {isInternal ? '内部知识库' : '外部知识库'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {kb.description || '暂无描述'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-md ${accent.bg} flex items-center justify-center`}>
                <svg className={`w-3.5 h-3.5 ${accent.text}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">文档数</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white pl-8">{kb.documentCount || 0}</p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-md ${accent.bg} flex items-center justify-center`}>
                <svg className={`w-3.5 h-3.5 ${accent.text}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16v16H4zM8 4v16M4 8h16M4 12h16" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">分块数</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white pl-8">{kb.totalChunks || 0}</p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-md ${accent.bg} flex items-center justify-center`}>
                <svg className={`w-3.5 h-3.5 ${accent.text}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">分块大小</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white pl-8">{kb.chunkSize}</p>
          </div>
        </div>

        {/* ── Recall Test ── */}
        <div className="mb-6">
          <button
            onClick={() => { setRecallQuery(''); setRecallResults(null); setShowRecallTest(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md transition-all w-full text-left"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M8 11h6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">召回测试</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">输入查询，测试向量检索效果</p>
            </div>
            <svg className="w-4 h-4 ml-auto text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* ── Recall Test Modal ── */}
        <Modal open={showRecallTest} onClose={() => setShowRecallTest(false)} title="召回测试">
          <div className="flex gap-2 mb-3">
            <input
              value={recallQuery}
              onChange={(e) => setRecallQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRecallTest()}
              placeholder="输入测试查询内容..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <CustomButton onClick={handleRecallTest} variant="primary" size="sm" disabled={recallLoading || !recallQuery.trim()}>
              {recallLoading ? '检索中...' : '检索'}
            </CustomButton>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-gray-500">Top K</label>
            <input
              type="number"
              value={recallTopK}
              onChange={(e) => setRecallTopK(Math.max(1, parseInt(e.target.value) || 5))}
              min={1}
              max={50}
              className="w-16 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {recallLoading && (
            <div className="flex justify-center py-8">
              <svg className="w-6 h-6 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          )}
          {recallResults !== null && !recallLoading && (
            recallResults.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <p className="text-sm">未检索到相关内容</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recallResults.map((r, i) => (
                  <div key={r.id || i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300">#{i + 1}</span>
                      <span className="text-gray-500 truncate mx-2">{r.source}</span>
                      <span className="text-gray-400">距离: {r.distance.toFixed(4)}</span>
                    </div>
                    <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px]">
                      {r.content}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </Modal>

        {/* ── Documents (internal) ── */}
        {isInternal && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1 h-5 ${accent.bar} rounded-full`} />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">文档列表</h3>
              <div className="ml-auto">
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
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700/30">
                <svg className="w-10 h-10 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">暂无文档</p>
                <p className="text-xs mt-1">点击「上传文档」添加 txt / md / pdf 文件</p>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                {docs.map((doc) => (
                  <div
                    key={doc}
                    className="group/doc relative flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 flex-shrink-0">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{doc}</span>
                    </div>

                    <div className="z-10 flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg opacity-0 group-hover/doc:opacity-100 transition-opacity pointer-events-none group-hover/doc:pointer-events-auto">
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

        {/* ── External config ── */}
        {!isInternal && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1 h-5 ${accent.bar} rounded-full`} />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">外部配置</h3>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">提供商</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {kb.provider && EXTERNAL_KB_PROVIDER_META[kb.provider]
                      ? EXTERNAL_KB_PROVIDER_META[kb.provider].name
                      : kb.provider || '通用 API'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">检索数量 (TopK)</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{kb.topK}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">API 地址</dt>
                  <dd className="text-sm text-gray-900 dark:text-white break-all">{kb.apiUrl || '未配置'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">API Key</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{kb.apiKey ? '已配置' : '未配置'}</dd>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Delete confirmation dialog ── */}
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
      </div>

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
