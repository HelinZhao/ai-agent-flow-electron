import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { SERVER_BASE_URL } from '@renderer/config'

export interface ImagePreviewAction {
  icon: React.ReactNode
  label: string
  onClick: (e: React.MouseEvent) => void
}

interface ImagePreviewProps {
  /** 图片 URL（自动补全 SERVER_BASE_URL） */
  src: string
  /** 替代文本 */
  alt?: string
  /** 自定义子元素（传入 children 时不渲染 img） */
  children?: React.ReactNode
  /** 悬浮时额外操作按钮（排在预览按钮前面） */
  actions?: ImagePreviewAction[]
  /** 容器 class */
  className?: string
}

/** 解析图片完整 URL */
function resolveSrc(src: string): string {
  return src.startsWith('/api/') ? `${SERVER_BASE_URL}${src}` : src
}

/**
 * 图片预览组件
 * - 包裹图片或子元素，悬浮时显示操作遮罩
 * - 默认点击「放大」按钮全屏展示图片
 * - 支持通过 actions 配置额外按钮
 */
export default function ImagePreview({
  src,
  alt = '',
  children,
  actions,
  className = '',
}: ImagePreviewProps) {
  const [showPreview, setShowPreview] = useState(false)
  const fullSrc = resolveSrc(src)

  const handlePreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowPreview(true)
  }, [])

  return (
    <>
      <div className={`relative group overflow-hidden ${className}`}>
        {children}
        {/* 悬浮遮罩 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={handlePreview}
            title="查看大图"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/90 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          {actions?.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={action.onClick}
              title={action.label}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white/90 hover:text-white transition-colors"
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>

      {/* 全屏预览模态框 */}
      {showPreview && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={fullSrc}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center text-lg shadow-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
