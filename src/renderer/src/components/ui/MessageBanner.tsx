import React, { useEffect, useRef, useState } from 'react'

type MessageType = 'success' | 'error' | 'info' | 'warning'

interface MessageBannerProps {
  type: MessageType
  text: string
  onClose?: () => void
  /** 自动关闭延时（毫秒），不传则不自动关闭 */
  autoCloseMs?: number
}

const ICONS: Record<MessageType, React.ReactNode> = {
  success: (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4m0 4h.01M10.29 3.86l-8.01 14A1 1 0 003 20h18a1 1 0 00.86-1.49l-8.01-14a1 1 0 00-1.72 0z" />
    </svg>
  )
}

const STYLES: Record<MessageType, string> = {
  success: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800',
  error: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800'
}

// Inject marquee keyframes once globally
let keyframesInjected = false
function ensureMarqueeKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return
  keyframesInjected = true
  const style = document.createElement('style')
  style.textContent =
    '@keyframes mb-marquee-loop{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}'
  document.head.appendChild(style)
}

const AVG_CHAR_WIDTH = 8 // px, text-sm 下平均字符宽度
const SPEED = 40 // px/s, 轮播恒定速度

const MessageBanner: React.FC<MessageBannerProps> = ({ type, text, onClose, autoCloseMs }) => {
  const textRef = useRef<HTMLSpanElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    ensureMarqueeKeyframes()
  }, [])

  useEffect(() => {
    if (!autoCloseMs || !onClose) return
    const timer = setTimeout(onClose, autoCloseMs)
    return () => clearTimeout(timer)
  }, [autoCloseMs, onClose])

  useEffect(() => {
    const textEl = textRef.current
    const wrapEl = wrapRef.current
    if (!textEl || !wrapEl) return

    const update = () => {
      setOverflowing(textEl.scrollWidth > wrapEl.clientWidth)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(textEl)
    ro.observe(wrapEl)
    return () => ro.disconnect()
  }, [text])

  return (
    <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between border ${STYLES[type]}`}>
      <div className="flex items-center space-x-2 min-w-0">
        {ICONS[type]}
        <div ref={wrapRef} className="overflow-hidden">
          {overflowing ? (
            <span
              ref={textRef}
              className="inline-flex whitespace-nowrap"
              style={{ animation: `mb-marquee-loop ${Math.max(4, (text.length * AVG_CHAR_WIDTH) / SPEED)}s linear infinite` }}
            >
              <span>{text}</span>
              <span>{text}</span>
            </span>
          ) : (
            <span ref={textRef} className="inline-block whitespace-nowrap">{text}</span>
          )}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-3 opacity-60 hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-opacity"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default MessageBanner
