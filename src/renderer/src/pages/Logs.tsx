import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '@renderer/config'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
}

export default function Logs(): React.JSX.Element {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // 自动滚动
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // SSE 连接
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/logs/stream`)

    eventSource.onopen = () => setConnected(true)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'init') {
          setLogs(data.logs || [])
        } else if (data.type === 'log') {
          setLogs((prev) => [...prev.slice(-999), { timestamp: data.timestamp, level: data.level, message: data.message }])
        }
      } catch {
        // 忽略解析失败的消息
      }
    }

    eventSource.onerror = () => {
      setConnected(false)
    }

    return () => {
      eventSource.close()
    }
  }, [])

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.level !== filter) return false
    if (searchText && !log.message.toLowerCase().includes(searchText.toLowerCase())) return false
    return true
  })

  const levelColors: Record<string, string> = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-gray-400'
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 font-mono text-sm">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center space-x-3">
          {/* 连接状态 */}
          <span className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">{connected ? '已连接' : '未连接'}</span>
          </span>
          {/* 级别过滤 */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 text-xs text-gray-300 px-2 py-1 rounded border border-gray-700 outline-none focus:border-blue-500"
          >
            <option value="all">所有级别</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
          {/* 文本搜索 */}
          <input
            type="text"
            placeholder="搜索日志..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="bg-gray-800 text-xs text-gray-300 px-2 py-1 rounded border border-gray-700 w-40 outline-none focus:border-blue-500 placeholder-gray-500"
          />
          <span className="text-xs text-gray-500">{filteredLogs.length} 条</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              autoScroll ? 'text-blue-400 bg-gray-800' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            自动滚动
          </button>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-3 space-y-0.5"
        onScroll={(e) => {
          const el = e.currentTarget
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
          if (atBottom !== autoScroll) setAutoScroll(atBottom)
        }}
      >
        {filteredLogs.map((log, i) => (
          <div key={i} className="flex items-start space-x-2 hover:bg-gray-900/50 px-1.5 py-0.5 rounded">
            <span className="text-gray-600 text-xs whitespace-nowrap shrink-0 w-16 text-right">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span
              className={`shrink-0 w-10 text-xs font-semibold uppercase ${levelColors[log.level] || 'text-gray-400'}`}
            >
              {log.level}
            </span>
            <span className="text-gray-300 break-all whitespace-pre-wrap leading-5">{log.message}</span>
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            {connected ? '暂无日志' : '等待连接...'}
          </div>
        )}
      </div>
    </div>
  )
}
