import React, { useState, useEffect } from 'react'
import { knowledgeBaseApi } from '@renderer/lib/api'
import { KnowledgeChunk } from '@renderer/types'
import CustomButton from '@renderer/components/ui/CustomButton'

interface ChunkViewerProps {
  kbId: string
  docName: string
  onClose: () => void
}

export default function ChunkViewer({ kbId, docName, onClose }: ChunkViewerProps): React.JSX.Element {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [viewingContent, setViewingContent] = useState<string | null>(null)
  const [editingChunk, setEditingChunk] = useState<KnowledgeChunk | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const pageSize = 5

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

  useEffect(() => {
    loadChunks()
  }, [kbId, docName])

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
    if (!confirm('确定要删除这个分块吗？')) return
    setIsLoading(true)
    try {
      await knowledgeBaseApi.deleteChunk(kbId, chunkId)
      // 删除后如果当前页已无数据，回退一页
      const remaining = chunks.length - 1
      const maxPage = Math.max(1, Math.ceil(remaining / pageSize))
      if (currentPage > maxPage) setCurrentPage(maxPage)
      await loadChunks()
    } catch (error) {
      console.error('删除分块失败:', error)
    } finally {
      setIsLoading(false)
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
  const modalClass = isFullscreen && isEditingOrAdding
    ? 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full h-[90vh] max-w-4xl overflow-hidden mx-4 flex flex-col'
    : 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[560px] max-h-[80vh] overflow-hidden mx-4 flex flex-col'

  // 全屏切换按钮 SVG
  const fullscreenIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  )
  const shrinkIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  )

  const totalPages = Math.max(1, Math.ceil(chunks.length / pageSize))
  const pagedChunks = chunks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className={modalClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            文档分块 — {docName}
          </h3>
          <div className="flex items-center space-x-2">
            <CustomButton onClick={() => setShowAddForm(true)} variant="secondary" size="sm">
              + 新增分块
            </CustomButton>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">
              &times;
            </button>
          </div>
        </div>

        {/* 查看完整内容 — 覆盖整个内容区 */}
        {viewingContent ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">完整内容</p>
              <button onClick={() => setViewingContent(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg">
                &times;
              </button>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 whitespace-pre-wrap break-words">
              {viewingContent}
            </div>
          </div>
        ) : editingChunk ? (
          /* 编辑分块 — 覆盖整个内容区 */
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">编辑分块 #{editingChunk.chunkIndex}</p>
              <div className="flex items-center space-x-2">
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title={isFullscreen ? '缩小' : '全屏'}>
                  {isFullscreen ? shrinkIcon : fullscreenIcon}
                </button>
                <button onClick={() => { setEditingChunk(null); setEditContent(''); setIsFullscreen(false) }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg">
                  &times;
                </button>
              </div>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="flex justify-end space-x-2 mt-3">
              <CustomButton onClick={() => { setEditingChunk(null); setEditContent('') }} variant="secondary" size="sm">
                取消
              </CustomButton>
              <CustomButton onClick={handleSaveEdit} variant="primary" size="sm" disabled={isLoading || !editContent.trim()}>
                {isLoading ? '保存中...' : '保存'}
              </CustomButton>
            </div>
          </div>
        ) : showAddForm ? (
          /* 新增分块 — 覆盖整个内容区 */
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">新增分块内容</p>
              <div className="flex items-center space-x-2">
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title={isFullscreen ? '缩小' : '全屏'}>
                  {isFullscreen ? shrinkIcon : fullscreenIcon}
                </button>
                <button onClick={() => { setShowAddForm(false); setNewContent(''); setIsFullscreen(false) }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg">
                  &times;
                </button>
              </div>
            </div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="flex-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="输入分块文本内容..."
            />
            <div className="flex justify-end space-x-2 mt-3">
              <CustomButton onClick={() => { setShowAddForm(false); setNewContent('') }} variant="secondary" size="sm">
                取消
              </CustomButton>
              <CustomButton onClick={handleAdd} variant="primary" size="sm" disabled={isLoading || !newContent.trim()}>
                {isLoading ? '添加中...' : '添加'}
              </CustomButton>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {pagedChunks.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                该文档暂无分块数据
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3">
              {pagedChunks.map((chunk) => (
                <div key={chunk.id} className={`border rounded-lg p-3 ${chunk.enabled
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-gray-200 dark:border-gray-700 opacity-50 bg-gray-50 dark:bg-gray-900'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${chunk.enabled
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-500'
                      }`}>
                        #{chunk.chunkIndex}
                      </span>
                      {!chunk.enabled && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">已停用</span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(chunk.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CustomButton onClick={() => handleToggle(chunk.id)} variant={chunk.enabled ? 'ghost' : 'success'} size="sm">
                        {chunk.enabled ? '停用' : '启用'}
                      </CustomButton>
                      <CustomButton onClick={() => setViewingContent(chunk.content)} variant="ghost" size="sm">
                        查看
                      </CustomButton>
                      <CustomButton onClick={() => handleEdit(chunk)} variant="secondary" size="sm">
                        编辑
                      </CustomButton>
                      <CustomButton onClick={() => handleDelete(chunk.id)} variant="danger" size="sm">
                        删除
                      </CustomButton>
                    </div>
                  </div>
                  <p className={`text-sm break-all ${chunk.enabled
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {chunk.content.length > 80 ? chunk.content.slice(0, 80) + '...' : chunk.content}
                  </p>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  共 {chunks.length} 条，第 {currentPage}/{totalPages} 页
                </span>
                <div className="flex items-center space-x-2">
                  <CustomButton
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    variant="secondary"
                    size="sm"
                    disabled={currentPage <= 1}
                  >
                    上一页
                  </CustomButton>
                  <CustomButton
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    variant="secondary"
                    size="sm"
                    disabled={currentPage >= totalPages}
                  >
                    下一页
                  </CustomButton>
                </div>
              </div>
            )}
          </div>
        )}

        </div>
    </div>
  )
}