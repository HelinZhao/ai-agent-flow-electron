import { useState, useEffect } from 'react'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomSwitch from '@renderer/components/ui/CustomSwitch'
import MessageBanner from '@renderer/components/ui/MessageBanner'
import { useSettingsStore } from '@renderer/store/settingsStore'

export default function SettingsGeneral() {
  const {
    layoutDirection, setLayoutDirection,
    autoSave, setAutoSave,
    autoSaveInterval, setAutoSaveInterval,
    autoStart, setAutoStart,
    reset,
  } = useSettingsStore()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 页面加载时从主进程同步开机自启状态
  useEffect(() => {
    window.api.app.getAutoStart().then((enabled) => {
      setAutoStart(enabled)
    }).catch(() => {
      // 忽略错误，使用 store 中的默认值
    })
  }, [])

  const handleReset = () => {
    reset()
    setMessage({ type: 'success', text: '已恢复默认设置' })
  }

  const handleAutoStartChange = async (checked: boolean) => {
    setAutoStart(checked)
    try {
      await window.api.app.setAutoStart(checked)
    } catch {
      setAutoStart(!checked)
      setMessage({ type: 'error', text: '设置开机自启失败' })
    }
  }

  const handleRestart = async () => {
    await window.api.app.restart()
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
          <CustomSwitch checked={autoSave} onChange={setAutoSave} />
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

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">开机自启</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">系统启动时自动运行应用（支持 Windows / macOS / Linux）</p>
          </div>
          <CustomSwitch checked={autoStart} onChange={handleAutoStartChange} />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <CustomButton variant="primary" size="sm" onClick={handleRestart}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
          </svg>
          重启应用
        </CustomButton>
        <CustomButton variant="secondary" size="sm" onClick={handleReset}>恢复默认设置</CustomButton>
      </div>
    </div>
  )
}
