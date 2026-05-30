import { useState, useEffect } from 'react'
import { checkHealth } from '@renderer/lib/api'
import { useAppStore } from '@renderer/store/appStore'
import { useSettingsStore } from '@renderer/store/settingsStore'
import GitPanel from '@renderer/components/git/GitPanel'

interface FooterProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const isElectron = Boolean(window.electron || window.api)

const Footer: React.FC<FooterProps> = ({ collapsed, onToggleCollapse }) => {
  const loading = useAppStore(state => state.loading);
  const initialize = useAppStore(state => state.initialize);
  const [connected, setConnected] = useState(true)
  const [cpu, setCpu] = useState(0)
  const [memory, setMemory] = useState(0)
  const gitEnabled = useSettingsStore(s => s.gitEnabled)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const poll = () => {
      checkHealth()
        .then(() => setConnected(true))
        .catch(() => setConnected(false))
      timer = setTimeout(poll, 15000)
    }
    poll()
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isElectron) return
    let timer: ReturnType<typeof setTimeout>
    const poll = () => {
      window.api!.system.getResources().then(r => {
        setCpu(r.cpu)
        setMemory(r.memory)
      }).catch(e => console.error('[Footer] getResources failed:', e))
      timer = setTimeout(poll, 5000)
    }
    poll()
    return () => clearTimeout(timer)
  }, [])

  return (
    <footer className="hidden md:flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 h-8 px-4 text-xs text-gray-400 dark:text-gray-500">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1" title={connected ? '服务已连接' : '服务未连接'}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{connected ? '已连接' : '断开'}</span>
        </span>
        {isElectron && (
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-0.5" title="CPU 使用率">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6v6H9z" />
              </svg>
              {cpu}%
            </span>
            <span className="flex items-center gap-0.5" title="内存占用">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
              </svg>
              {memory} MB
            </span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {gitEnabled && <GitPanel />}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            className="rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors p-1"
          >
            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {loading ? (
          <div className='p-1'>
            <svg className="w-3.5 h-3.5 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <button
            onClick={initialize}
            title="刷新数据"
            className="rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors p-1"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </button>
        )}
      </div>
    </footer>
  )
}

export default Footer
