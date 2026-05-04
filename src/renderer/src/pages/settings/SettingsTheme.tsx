import React, { useState } from 'react'
import { useThemeStore, Theme } from '@renderer/store/themeStore'

const THEME_OPTIONS: { value: Theme; label: string; icon: string; description: string }[] = [
  { value: 'light', label: '浅色模式', icon: '☀️', description: '明亮界面，适合日间使用' },
  { value: 'dark', label: '深色模式', icon: '🌙', description: '暗色界面，减少眼睛疲劳' },
  { value: 'system', label: '跟随系统', icon: '💻', description: '自动跟随操作系统主题设置' },
]

export default function SettingsTheme(): React.JSX.Element {
  const { theme, setTheme } = useThemeStore()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSetTheme = (value: Theme) => {
    setTheme(value)
    setMessage({ type: 'success', text: `已切换到${THEME_OPTIONS.find(o => o.value === value)?.label}` })
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">外观主题</h3>
      <div className="grid grid-cols-3 gap-4">
        {THEME_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleSetTheme(opt.value)}
            className={`p-5 border-2 rounded-xl text-center transition-all ${theme === opt.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
          >
            <div className="text-3xl mb-3">{opt.icon}</div>
            <div className={`text-sm font-medium ${theme === opt.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
              {opt.label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {opt.description}
            </div>
          </button>
        ))}
      </div>
      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}