import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { knowledgeBaseApi } from '@renderer/lib/api'
import { KnowledgeChunk } from '@renderer/types'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomSwitch from '@renderer/components/ui/CustomSwitch'
import Pagination from '@renderer/components/ui/Pagination'
import { CHUNK_PAGE_SIZE, CHUNK_VIEWER_HEIGHT, CHUNK_PREVIEW_LINES } from '@renderer/config'

interface ChunkViewerProps {
  kbId: string
  docName: string
  onClose: () => void
}

export default function ChunkViewer({ kbId, docName, onClose }: ChunkViewerProps): React.JSX.Element {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [viewingChunk, setViewingChunk] = useState<KnowledgeChunk | null>(null)
  const [editingChunk, setEditingChunk] = useState<KnowledgeChunk | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const pageSize = CHUNK_PAGE_SIZE

  const loadChunks = async () => {
    setIsLoading(true)
    try {
      const data = await knowledgeBaseApi.getChunks(kbId, docName)
      setChunks(data)
    } catch (error) {
      console.error('加载分块失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadChunks() }, [kbId, docName])

  const handleEdit = (chunk: KnowledgeChunk) => {
    setEditingChunk(chunk)
    setEditContent(chunk.content)
    setIsFullscreen(false)
  }

  const handleSaveEdit = async () => {
    if (!editingChunk) return
    setIsLoading(true)
    try {
      await knowledgeBaseApi.updateChunk(kbId, editingChunk.id, { content: editContent })
      setEditingChunk(null)
      setEditContent('')
      setIsFullscreen(false)
      await loadChunks()
    } catch (error) {
      console.error('更新分块失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (chunkId: string) => {
    setIsLoading(true)
    try {
      await knowledgeBaseApi.deleteChunk(kbId, chunkId)
      const remaining = chunks.length - 1
      const maxPage = Math.max(1, Math.ceil(remaining / pageSize))
      if (currentPage > maxPage) setCurrentPage(maxPage)
      await loadChunks()
    } catch (error) {
      console.error('删除分块失败:', error)
    } finally {
      setIsLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleAdd = async () => {
    if (!newContent.trim()) return
    setIsLoading(true)
    try {
      await knowledgeBaseApi.addChunk(kbId, { content: newContent, source: docName })
      setNewContent('')
      setShowAddForm(false)
      setCurrentPage(1)
      setIsFullscreen(false)
      await loadChunks()
    } catch (error) {
      console.error('新增分块失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (chunkId: string) => {
    try {
      await knowledgeBaseApi.toggleChunk(kbId, chunkId)
      await loadChunks()
    } catch (error) {
      console.error('切换状态失败:', error)
    }
  }

  const isEditingOrAdding = editingChunk || showAddForm
  const modalSizeClass = isFullscreen && isEditingOrAdding
    ? 'w-full h-full'
    : `w-full max-w-2xl ${CHUNK_VIEWER_HEIGHT}`

  const totalPages = Math.max(1, Math.ceil(chunks.length / pageSize))
  const pagedChunks = chunks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const formatWordCount = (text: string) => {
    const len = text.length
    return `${len} 字符`
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onClose}>
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl ${modalSizeClass} overflow-hidden mx-4 flex flex-col border border-gray-200/50 dark:border-gray-700/50`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========== 标题栏 ========== */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-700">
              <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16v16H4zM8 4v16M4 8h16M4 12h16M4 16h16" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {docName}
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {chunks.length} 个分块
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {!viewingChunk && !editingChunk && !showAddForm && (
              <CustomButton onClick={() => setShowAddForm(true)} variant="primary" size="sm">
                添加分块
              </CustomButton>
            )}
            <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* ========== 查看分块详情 ========== */}
        {viewingChunk ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-md">
                  #{viewingChunk.chunkIndex}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatWordCount(viewingChunk.content)}</span>
                {!viewingChunk.enabled && (
                  <span className="text-xs font-medium bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-md">
                    已停用
                  </span>
                )}
              </div>
              <CustomButton onClick={() => setViewingChunk(null)} variant="secondary" size="sm">
                返回
              </CustomButton>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                {viewingChunk.content}
              </div>
            </div>
          </div>
        ) : editingChunk ? (
          /* ========== 编辑分块 ========== */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-md">
                  #{editingChunk.chunkIndex}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">编辑分块</span>
              </div>
              <div className="flex items-center space-x-2">
                <CustomButton onClick={() => setIsFullscreen(!isFullscreen)} variant="ghost" size="sm">
                  {isFullscreen ? '缩小' : '全屏'}
                </CustomButton>
                <CustomButton onClick={() => { setEditingChunk(null); setEditContent(''); setIsFullscreen(false) }} variant="ghost" size="sm">
                  取消
                </CustomButton>
              </div>
            </div>
            <div className="flex-1 p-5 overflow-hidden">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div className="flex justify-end space-x-3 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
              <CustomButton onClick={() => { setEditingChunk(null); setEditContent(''); setIsFullscreen(false) }} variant="secondary" size="sm">
                取消
              </CustomButton>
              <CustomButton onClick={handleSaveEdit} variant="primary" size="sm" disabled={isLoading || !editContent.trim()}>
                {isLoading ? '保存中...' : '保存'}
              </CustomButton>
            </div>
          </div>
        ) : showAddForm ? (
          /* ========== 新增分块 ========== */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white">新增分块</span>
              <div className="flex items-center space-x-2">
                <CustomButton onClick={() => setIsFullscreen(!isFullscreen)} variant="ghost" size="sm">
                  {isFullscreen ? '缩小' : '全屏'}
                </CustomButton>
                <CustomButton onClick={() => { setShowAddForm(false); setNewContent(''); setIsFullscreen(false) }} variant="ghost" size="sm">
                  取消
                </CustomButton>
              </div>
            </div>
            <div className="flex-1 p-5 overflow-hidden">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full h-full border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                placeholder="输入分块文本内容..."
              />
            </div>
            <div className="flex justify-end space-x-3 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
              <CustomButton onClick={() => { setShowAddForm(false); setNewContent(''); setIsFullscreen(false) }} variant="secondary" size="sm">
                取消
              </CustomButton>
              <CustomButton onClick={handleAdd} variant="primary" size="sm" disabled={isLoading || !newContent.trim()}>
                {isLoading ? '添加中...' : '添加'}
              </CustomButton>
            </div>
          </div>
        ) : (
          /* ========== 分块列表 ========== */
          <div className="flex-1 flex flex-col overflow-hidden">
            {pagedChunks.length === 0 && !isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <svg className="w-10 h-10 mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">该文档暂无分块数据</p>
                <p className="text-xs mt-1">上传文档后系统会自动生成分块</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {pagedChunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className={`group/card relative px-5 py-2.5 border-b border-gray-100 dark:border-gray-700/50 transition-colors cursor-pointer ${
                    chunk.enabled
                      ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      : 'bg-gray-50/80 dark:bg-gray-900/50 opacity-60 hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                  }`}
                  onClick={() => setViewingChunk(chunk)}
                >
                  {/* 顶部：索引 + 元数据 + 状态 */}
                  <div className="flex items-center justify-between h-5">
                    <div className="flex items-center space-x-1.5">
                      <div className="flex items-center space-x-1">
                        <div className="flex items-center justify-center w-4 h-4 rounded bg-gray-100 dark:bg-gray-700">
                          <svg className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16v16H4zM8 4v16M4 8h16M4 12h16" />
                          </svg>
                        </div>
                        <span className={`text-xs font-medium ${chunk.enabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {String(chunk.chunkIndex).padStart(2, '0')}
                        </span>
                      </div>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className={`text-xs ${chunk.enabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {formatWordCount(chunk.content)}
                      </span>
                      {!chunk.enabled && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                            已停用
                          </span>
                        </>
                      )}
                    </div>

                    {/* 悬浮操作栏 — hover 时显示 */}
                    <div className="absolute top-0 right-4 z-10 hidden group-hover/card:flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg backdrop-blur-sm">
                      {/* 启停开关 */}
                      <span onClick={(e) => e.stopPropagation()}>
                        <CustomSwitch size="sm" checked={chunk.enabled} onChange={() => handleToggle(chunk.id)} />
                      </span>
                      <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                      {/* 编辑 */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(chunk) }}
                        className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {/* 删除 */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(chunk.id) }}
                        className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* 内容预览 — line-clamp */}
                  <div className={`mt-0.5 text-sm leading-relaxed ${chunk.enabled
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-gray-400 dark:text-gray-500'
                  } line-clamp-${CHUNK_PREVIEW_LINES}`}>
                    {chunk.content}
                  </div>
                </div>
              ))}
            </div>

            {/******************* 分页 *******************/}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onChange={setCurrentPage}
                  variant="simple"
                  totalLabel={`${chunks.length} 条 · `}
                />
              </div>
            )}
          </div>
        )}

        {/* ========== 删除确认弹窗 ========== */}
        {deleteTarget && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-5 mx-4 max-w-sm">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">删除分块</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">确定要删除这个分块吗？此操作不可恢复。</p>
              <div className="flex justify-end space-x-3">
                <CustomButton onClick={() => setDeleteTarget(null)} variant="secondary" size="sm">
                  取消
                </CustomButton>
                <CustomButton onClick={() => handleDelete(deleteTarget)} variant="danger" size="sm" disabled={isLoading}>
                  {isLoading ? '删除中...' : '删除'}
                </CustomButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}