import { useState, useEffect } from 'react'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import MessageBanner from '@renderer/components/ui/MessageBanner'
import { proxyApi } from '@renderer/lib/api'

export default function SettingsProxy() {
  const [enabled, setEnabled] = useState(false)
  const [protocol, setProtocol] = useState('http')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('8080')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxyApi.getConfig().then(config => {
      setEnabled(config.enabled)
      setProtocol(config.protocol || 'http')
      setHost(config.host || '')
      setPort(String(config.port || 8080))
      setUsername(config.username || '')
      setPassword(config.password || '')
    }).catch(() => {
      // ignore
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setMessage(null)
    try {
      const result = await proxyApi.saveConfig({
        enabled,
        protocol,
        host,
        port: parseInt(port, 10) || 8080,
        username: username || undefined,
        password: password || undefined,
      })
      setMessage({ type: 'success', text: result.message || '代理配置已保存' })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
        <svg className="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        加载中...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">代理设置</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">配置 HTTP/HTTPS 代理用于 LLM API 调用</p>
      </div>

      {message && (
        <MessageBanner type={message.type} text={message.text} onClose={() => setMessage(null)} autoCloseMs={3000} />
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">启用代理</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">开启后 LLM API 调用将通过代理转发</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}
              className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>

        <div className={`space-y-4 ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">协议</label>
            <CustomSelect
              value={protocol}
              onChange={setProtocol}
              options={[
                { value: 'http', label: 'HTTP' },
                { value: 'https', label: 'HTTPS' },
                { value: 'socks5', label: 'SOCKS5' },
              ]}
              size="sm"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">主机地址</label>
              <CustomInput type="text" value={host} onChange={e => setHost(e.target.value)}
                placeholder="127.0.0.1" size="sm" />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">端口</label>
              <CustomInput type="number" min={1} max={65535} value={port} onChange={e => setPort(e.target.value)}
                placeholder="8080" size="sm" />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">用户名（可选）</label>
              <CustomInput type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="username" size="sm" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">密码（可选）</label>
              <CustomInput type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" size="sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <CustomButton variant="primary" size="sm" onClick={handleSave} disabled={enabled && !host}>
          {loading ? '保存中...' : '保存配置'}
        </CustomButton>
      </div>
    </div>
  )
}
