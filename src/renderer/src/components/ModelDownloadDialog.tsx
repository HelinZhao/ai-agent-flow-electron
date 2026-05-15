import { useState, useRef, useCallback } from 'react'
import { ollamaApi, PullProgress } from '@renderer/lib/api'

interface Props {
  onDismissOnce: () => void
  onDismissPermanently: () => void
  /** 下载完成后的回调（可空，对外只影响自身状态） */
}

export default function ModelDownloadDialog({ onDismissOnce, onDismissPermanently }: Props) {
  const [isPulling, setIsPulling] = useState(false)
  const [progress, setProgress] = useState<PullProgress | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const progressPercent = progress?.total && progress?.completed
    ? Math.round((progress.completed / progress.total) * 100)
    : null

  const handlePull = useCallback(() => {
    setIsPulling(true)
    setProgress(null)
    ollamaApi.pullModel().then(res => {
      if (res.success) {
        cancelRef.current = ollamaApi.subscribePullProgress(p => {
          setProgress(p)
          if (p.status === 'success' || p.status === 'error') {
            setIsPulling(false)
          }
        })
      } else {
        setProgress({ status: 'error', message: res.message || '拉取失败' })
        setIsPulling(false)
      }
    }).catch(() => {
      setProgress({ status: 'error', message: '请求拉取失败' })
      setIsPulling(false)
    })
  }, [])

  const handleDismissOnce = useCallback(() => {
    if (cancelRef.current) cancelRef.current()
    onDismissOnce()
  }, [onDismissOnce])

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 mx-4 max-w-md w-full">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">需要下载 Embedding 模型</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">知识库功能依赖的组件</p>
            </div>
          </div>
          <button onClick={handleDismissOnce}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          内部知识库需要使用 <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 text-xs font-mono">bge-m3-q8_0</code> embedding 模型将文档转换为向量。
          是否立即下载？<span className="text-gray-400 dark:text-gray-500">（下载后可在设置页管理）</span>
        </p>

        {isPulling && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                正在下载...
              </span>
              {progressPercent !== null && (
                <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">{progressPercent}%</span>
              )}
            </div>
            <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent || 0}%` }} />
            </div>
            <button onClick={handleDismissOnce}
              className="mt-2 w-full text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
              后台下载，关闭此窗口
            </button>
          </div>
        )}

        {progress?.status === 'error' && !isPulling && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400">{progress.message || '下载失败，请检查网络连接后重试'}</p>
          </div>
        )}

        {progress?.status === 'success' && !isPulling && (
          <div className="mt-3 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              模型下载完成，知识库功能已就绪
            </p>
          </div>
        )}

        {!progress && !isPulling && (
          <div className="mt-5 flex flex-col gap-2">
            <button onClick={handlePull}
              className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
              下载模型
            </button>
            <div className="flex gap-2">
              <button onClick={handleDismissOnce}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                稍后再说
              </button>
              <button onClick={onDismissPermanently}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                不再提示
              </button>
            </div>
          </div>
        )}

        {progress?.status === 'error' && !isPulling && (
          <div className="mt-4">
            <button onClick={handlePull}
              className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
              重新下载
            </button>
            <button onClick={handleDismissOnce}
              className="w-full mt-2 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              稍后再说
            </button>
          </div>
        )}

        {progress?.status === 'success' && !isPulling && (
          <button onClick={handleDismissOnce}
            className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            开始使用
          </button>
        )}
      </div>
    </div>
  )
}
