import React from 'react'

interface KnowledgeEmbeddingStatusProps {
  modelExists: boolean | null
  modelPulling: boolean
  modelPullProgress: { status?: string; message?: string; completed?: number; total?: number } | null
  onPull: () => void
}

const KnowledgeEmbeddingStatus: React.FC<KnowledgeEmbeddingStatusProps> = ({
  modelExists,
  modelPulling,
  modelPullProgress,
  onPull
}) => {
  if (modelExists === null) return null

  const borderColor = modelExists
    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
    : modelPullProgress?.status === 'error'
      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
      : modelPulling
        ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
        : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'

  return (
    <div className={`mb-5 p-4 rounded-xl border transition-colors ${borderColor}`}>
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
        <div className="flex-shrink-0">
          {modelExists ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />已就绪
            </span>
          ) : modelPulling ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
              下载中...
            </span>
          ) : !modelPullProgress?.status ? (
            <button onClick={onPull}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg">
              下载模型
            </button>
          ) : (
            <button onClick={onPull}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg">
              重新下载
            </button>
          )}
        </div>
      </div>
      {modelPulling && modelPullProgress && (
        <div className="mt-3">
          <div className="w-full h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${modelPullProgress.total && modelPullProgress.completed ? Math.round((modelPullProgress.completed / modelPullProgress.total) * 100) : 30}%` }} />
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {modelPullProgress.status}
            {modelPullProgress.completed != null && modelPullProgress.total != null
              ? ` (${Math.round(modelPullProgress.completed / 1024 / 1024)}MB / ${Math.round(modelPullProgress.total / 1024 / 1024)}MB)` : ''}
          </p>
        </div>
      )}
    </div>
  )
}

export default React.memo(KnowledgeEmbeddingStatus)
