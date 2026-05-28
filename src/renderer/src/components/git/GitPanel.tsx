import { useState, useEffect, useCallback } from 'react'
import CustomButton from '@renderer/components/ui/CustomButton'
import Modal from '@renderer/components/ui/Modal'

const isElectron = Boolean(window.electron || window.api)

interface GitFileStatus {
  staged: string
  unstaged: string
  file: string
}

export default function GitPanel() {
  const [open, setOpen] = useState(false)
  const [repoPath, setRepoPath] = useState('')
  const [files, setFiles] = useState<GitFileStatus[]>([])
  const [commitMsg, setCommitMsg] = useState('')
  const [committing, setCommitting] = useState(false)
  const [diff, setDiff] = useState('')
  const [diffFile, setDiffFile] = useState('')
  const [lastCommit, setLastCommit] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<{ hash: string; date: string; message: string }[]>([])
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [commitFiles, setCommitFiles] = useState<{ status: string; file: string }[]>([])

  useEffect(() => {
    if (!isElectron || !open) return
    loadData()
  }, [open])

  const loadData = async () => {
    const cfg = await window.api!.git.loadConfig()
    if (cfg.enabled && cfg.repoPath) {
      setRepoPath(cfg.repoPath)
      const [st, fs] = await Promise.all([
        window.api!.git.status(cfg.repoPath),
        window.api!.git.detailedStatus(cfg.repoPath),
      ])
      setFiles(fs)
      setLastCommit(st.lastCommit || '')
      const hist = await window.api!.git.history({ repoPath: cfg.repoPath }).catch(() => [])
      setHistory(hist)
    }
  }

  const handleStage = async (file: string) => {
    await window.api!.git.stage({ repoPath, file })
    const fs = await window.api!.git.detailedStatus(repoPath)
    setFiles(fs)
    setDiff('')
    setDiffFile('')
  }

  const handleUnstage = async (file: string) => {
    await window.api!.git.unstage({ repoPath, file })
    const fs = await window.api!.git.detailedStatus(repoPath)
    setFiles(fs)
  }

  const handleStageAll = async () => {
    await window.api!.git.stageAll(repoPath)
    const fs = await window.api!.git.detailedStatus(repoPath)
    setFiles(fs)
  }

  const handleShowDiff = async (file: string) => {
    setDiffFile(file)
    try {
      const d = await window.api!.git.workingTreeDiff({ repoPath, filePath: file })
      setDiff(d || '(no changes)')
    } catch {
      setDiff('(无法显示差异)')
    }
  }

  const handleCommit = useCallback(async () => {
    if (!commitMsg.trim() || !repoPath) return
    setCommitting(true)
    try {
      await window.api!.git.commit({ repoPath, message: commitMsg.trim() })
      setCommitMsg('')
      setDiff('')
      setDiffFile('')
      await loadData()
    } catch (e: any) {
      console.error('commit failed:', e)
      alert('提交失败: ' + (e.message || e))
    } finally {
      setCommitting(false)
    }
  }, [commitMsg, repoPath])

  const stagedFiles = files.filter(f => f.staged !== ' ' && f.staged !== '?')
  const unstagedFiles = files.filter(f => (f.unstaged !== ' ' && f.unstaged !== '?') || f.staged === '?')

  const statusBadge = (s: string) => {
    if (s === 'M') return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20'
    if (s === 'A') return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
    if (s === 'D') return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
    return 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-700/50'
  }

  const displayPath = (file: string) => file.replace('data/export/', '')

  if (!isElectron) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Git 版本控制"
        className="rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors p-1"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="15" /><path d="M9 18h4" />
        </svg>
      </button>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setDiff(''); setDiffFile(''); setShowHistory(false) }}
        wide
        title={
          <div className="flex items-center gap-3 w-full pr-2">
            <span>Git 版本控制</span>
            {repoPath && <span className="text-xs font-normal text-gray-400 truncate max-w-[280px]">{repoPath}</span>}
            <CustomButton variant="ghost" size="xs" className="ml-auto" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? '返回' : '历史'}
            </CustomButton>
          </div>
        }
        footer={
          showHistory ? null : (
            <div className="w-full space-y-2">
              <textarea
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
                placeholder="输入提交信息..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCommit()
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {stagedFiles.length > 0 ? `${stagedFiles.length} 个文件待提交` : '没有已暂存的文件'}
                  {lastCommit && <span className="ml-2">· HEAD: {lastCommit}</span>}
                </span>
                <div className="flex gap-2">
                  <CustomButton variant="ghost" size="xs" onClick={loadData}>刷新</CustomButton>
                  <CustomButton
                    variant="primary" size="sm"
                    onClick={handleCommit}
                    loading={committing}
                    disabled={!commitMsg.trim() || stagedFiles.length === 0}
                  >
                    提交 (⌘⏎)
                  </CustomButton>
                </div>
              </div>
            </div>
          )
        }
      >
        {showHistory ? (
          <div className="space-y-1">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">暂无提交记录</p>
            ) : history.map(h => (
              <div key={h.hash}>
                <div
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs cursor-pointer"
                  onClick={async () => {
                    if (expandedCommit === h.hash) {
                      setExpandedCommit(null)
                      setCommitFiles([])
                    } else {
                      setExpandedCommit(h.hash)
                      const files = await window.api!.git.commitFiles({ repoPath, hash: h.hash }).catch(() => [])
                      setCommitFiles(files)
                    }
                  }}
                >
                  <span className="font-mono text-blue-600 dark:text-blue-400 w-16">{h.hash}</span>
                  <span className="text-gray-400 w-36 flex-shrink-0">{new Date(h.date).toLocaleString()}</span>
                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{h.message}</span>
                  <svg className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${expandedCommit === h.hash ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </div>
                {expandedCommit === h.hash && commitFiles.length > 0 && (
                  <div className="ml-12 mt-1 mb-1 space-y-0.5">
                    {commitFiles.map(f => (
                      <div key={f.file} className="flex items-center gap-2 px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${f.status === 'M' ? 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20' : f.status === 'A' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20' : f.status === 'D' ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20' : ''}`}>
                          {f.status === 'M' ? '修改' : f.status === 'A' ? '新增' : f.status === 'D' ? '删除' : f.status}
                        </span>
                        <span className="font-mono">{f.file.replace('data/export/', '')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {lastCommit && (
              <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">HEAD: {lastCommit}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
          {/* Staged files */}
          {stagedFiles.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-1.5">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">已暂存</h4>
                <span className="text-xs text-gray-400">({stagedFiles.length})</span>
              </div>
              <div className="space-y-0.5">
                {stagedFiles.map(f => (
                  <div key={f.file} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs group">
                    <button
                      onClick={() => handleUnstage(f.file)}
                      title="取消暂存"
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <span className={`px-1 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${statusBadge(f.staged)}`}>
                      {f.staged === 'M' ? '修改' : f.staged === 'A' ? '新增' : f.staged === 'D' ? '删除' : f.staged}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 truncate flex-1 font-mono cursor-pointer" onClick={() => handleShowDiff(f.file)}>
                      {displayPath(f.file)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Unstaged files */}
          {unstagedFiles.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-1.5">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">未暂存</h4>
                <span className="text-xs text-gray-400">({unstagedFiles.length})</span>
                <button onClick={handleStageAll} className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline">全部暂存</button>
              </div>
              <div className="space-y-0.5">
                {unstagedFiles.map(f => (
                  <div key={f.file} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs group">
                    <button
                      onClick={() => handleStage(f.file)}
                      title="暂存"
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <span className={`px-1 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${statusBadge(f.staged === '?' ? '?' : f.unstaged)}`}>
                      {f.staged === '?' ? '未跟踪' : f.unstaged === 'M' ? '修改' : f.unstaged === 'D' ? '删除' : f.unstaged}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 truncate flex-1 font-mono cursor-pointer" onClick={() => handleShowDiff(f.file)}>
                      {displayPath(f.file)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {files.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">工作目录干净，没有未提交的变更</p>
          )}

          {/* Diff */}
          {diff && diffFile && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="text-xs text-gray-500 mb-1 font-mono">{displayPath(diffFile)}</div>
              <pre className="p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 max-h-[200px] overflow-auto whitespace-pre-wrap">{diff}</pre>
            </div>
          )}
        </div>
      )}
      </Modal>
    </>
  )
}
