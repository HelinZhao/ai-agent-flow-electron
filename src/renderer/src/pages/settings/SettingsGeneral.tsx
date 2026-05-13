import { useState } from 'react'
import CustomButton from '@renderer/components/ui/CustomButton'
import MessageBanner from '@renderer/components/ui/MessageBanner'
import { useSettingsStore } from '@renderer/store/settingsStore'

export default function SettingsGeneral() {
  const {
    layoutDirection, setLayoutDirection,
    autoSave, setAutoSave,
    autoSaveInterval, setAutoSaveInterval,
    reset,
  } = useSettingsStore()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleReset = () => {
    reset()
    setMessage({ type: 'success', text: '已恢复默认设置' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">通用设置</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">应用偏好与默认行为</p>
      </div>

      {message && (
        <MessageBanner type={message.type} text={message.text} onClose={() => setMessage(null)} autoCloseMs={2000} />
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">默认画布方向</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">新工作流的默认布局方向</p>
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            <button onClick={() => setLayoutDirection('horizontal')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${layoutDirection === 'horizontal'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
              水平
            </button>
            <button onClick={() => setLayoutDirection('vertical')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${layoutDirection === 'vertical'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
              垂直
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">自动保存</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">编辑工作流时自动保存到本地</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)}
              className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>

        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">自动保存间隔</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">两次自动保存之间的等待时间（秒）</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" min={5} max={300} value={autoSaveInterval}
              onChange={e => setAutoSaveInterval(Number(e.target.value))}
              disabled={!autoSave}
              className="w-20 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-40" />
            <span className="text-xs text-gray-500">秒</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <CustomButton variant="secondary" size="sm" onClick={handleReset}>恢复默认设置</CustomButton>
      </div>
    </div>
  )
}
