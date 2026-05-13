import React, { useState } from 'react'
import MessageBanner from '@renderer/components/ui/MessageBanner'
import { useThemeStore, Theme } from '@renderer/store/themeStore'

const THEME_OPTIONS: { value: Theme; label: string; icon: string; description: string; preview: string }[] = [
  {
    value: 'light',
    label: '浅色模式',
    icon: '☀️',
    description: '明亮界面，适合日间使用',
    preview: 'bg-white border-gray-200',
  },
  {
    value: 'dark',
    label: '深色模式',
    icon: '🌙',
    description: '暗色界面，减少眼睛疲劳',
    preview: 'bg-gray-900 border-gray-600',
  },
  {
    value: 'system',
    label: '跟随系统',
    icon: '💻',
    description: '自动跟随操作系统主题设置',
    preview: 'bg-gradient-to-r from-white to-gray-900 border-gray-300',
  },
]

export default function SettingsTheme(): React.JSX.Element {
  const { theme, setTheme } = useThemeStore()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSetTheme = (value: Theme) => {
    setTheme(value)
    setMessage({ type: 'success', text: `已切换到${THEME_OPTIONS.find(o => o.value === value)?.label}` })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">外观主题</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">选择您偏好的界面主题</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {THEME_OPTIONS.map(opt => {
          const isActive = theme === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSetTheme(opt.value)}
              className={`relative p-5 rounded-xl border-2 transition-all duration-200 text-center group ${isActive
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 shadow-md shadow-blue-500/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                }`}
            >
              {/* Mini preview */}
              <div className={`h-12 rounded-lg mb-4 border-2 ${opt.preview} ${isActive ? 'border-blue-400 dark:border-blue-500' : ''} flex items-center justify-center transition-colors`}>
                <span className="text-2xl">{opt.icon}</span>
              </div>

              <div className={`text-sm font-semibold transition-colors ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                {opt.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {opt.description}
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {message && (
        <MessageBanner
          type="success"
          text={message.text}
          onClose={() => setMessage(null)}
          autoCloseMs={2000}
        />
      )}
    </div>
  )
}
