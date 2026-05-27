import { useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, removeToast } from './toastStore'

const ICONS: Record<string, string> = {
  success: '✅', warning: '⚠️', info: 'ℹ️', error: '❌',
}

const STYLES: Record<string, string> = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
}

export default function ToastContainer() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return (
    <div className="fixed top-16 right-4 z-[9999] flex flex-col gap-2 max-w-md pointer-events-none">
      {items.map(t => (
        <div key={t.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm text-sm animate-slide-down ${STYLES[t.type]}`}
          style={{ animation: 'slide-down 0.2s ease-out' }}
        >
          <span>{ICONS[t.type]}</span>
          <span className="flex-1 break-words">{t.text}</span>
          <button onClick={() => removeToast(t.id)}
            className="ml-2 opacity-60 hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-opacity">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
