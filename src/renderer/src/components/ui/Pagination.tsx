import { useMemo } from 'react'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  /** 'default': 页码按钮 + 文字上一页/下一页, 'simple': 纯箭头按钮 */
  variant?: 'default' | 'simple'
  /** 页码左侧额外文本(variant='simple'时生效), 如 "10 条 · " */
  totalLabel?: string
}

export default function Pagination({ page, totalPages, onChange, variant = 'default', totalLabel }: PaginationProps) {
  const pages = useMemo(() => {
    const arr: number[] = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) arr.push(i)
    return arr
  }, [page, totalPages])

  if (totalPages <= 1) return null

  if (variant === 'simple') {
    return (
      <div className="w-full flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {totalLabel}{page}/{totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex items-center justify-between">
      <span className="text-xs text-gray-400 dark:text-gray-500">
        第 {page}/{totalPages} 页
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          上一页
        </button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
              p === page
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          下一页
        </button>
      </div>
    </div>
  )
}
