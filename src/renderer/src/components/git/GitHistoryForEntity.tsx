import { useState, useEffect } from 'react'
import CustomButton from '@renderer/components/ui/CustomButton'
import Modal from '@renderer/components/ui/Modal'

const isElectron = Boolean(window.electron || window.api)

interface Props {
  type: string       // 'workflows' | 'agents' | 'skills'
  entityId: string
  entityName: string
}

export default function GitHistoryForEntity({ type, entityId, entityName }: Props) {
  const [open, setOpen] = useState(false)
  const [repoPath, setRepoPath] = useState('')
  const [history, setHistory] = useState<{ hash: string; date: string; message: string }[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [diff, setDiff] = useState('')

  const filePath = `${type}/${entityId}.json`

  useEffect(() => {
    if (!isElectron || !open) return
    window.api!.git.loadConfig().then(cfg => {
      if (!cfg.enabled || !cfg.repoPath) return
      setRepoPath(cfg.repoPath)
      window.api!.git.history({ repoPath: cfg.repoPath, filePath }).then(setHistory).catch(() => {})
    })
  }, [open, filePath])

  const handleShowDiff = async (hash: string) => {
    if (expanded === hash) {
      setExpanded(null)
      setDiff('')
      return
    }
    setExpanded(hash)
    try {
      const d = await window.api!.git.commitFileDiff({ repoPath, hash, filePath })
      setDiff(d || '(empty)')
    } catch {
      setDiff('(无法读取)')
    }
  }

  const handleRestore = async (hash: string) => {
    try {
      await window.api!.git.restore({ repoPath, hash, filePath })
      alert('已恢复到 ' + hash + ' 版本，请刷新页面查看')
    } catch (e: any) {
      alert('恢复失败: ' + (e.message || e))
    }
  }

  if (!isElectron) return null

  return (
    <>
      <CustomButton variant="ghost" size="xs" onClick={() => setOpen(true)}>
        <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="15" /><path d="M9 18h4" />
        </svg>
        版本历史
      </CustomButton>

      <Modal open={open} onClose={() => setOpen(false)} title={`版本历史: ${entityName}`}>
        <div className="space-y-1 max-h-[400px] overflow-auto">
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">暂无提交记录</p>
          ) : history.map(h => (
            <div key={h.hash}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs cursor-pointer"
                onClick={() => handleShowDiff(h.hash)}>
                <span className="font-mono text-blue-600 dark:text-blue-400 w-16">{h.hash}</span>
                <span className="text-gray-400 w-28 flex-shrink-0">{new Date(h.date).toLocaleString()}</span>
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{h.message}</span>
                <svg className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${expanded === h.hash ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
              {expanded === h.hash && (
                <div className="ml-4 mt-1 mb-2 space-y-2">
                  {diff && (
                    <pre className="p-2 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-mono text-gray-600 dark:text-gray-400 max-h-[150px] overflow-auto whitespace-pre-wrap">{diff}</pre>
                  )}
                  <CustomButton variant="secondary" size="xs" onClick={() => handleRestore(h.hash)}>
                    恢复到此版本
                  </CustomButton>
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
