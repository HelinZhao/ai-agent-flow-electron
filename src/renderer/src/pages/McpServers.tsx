import { useEffect, useState } from 'react'
import { mcpApi, McpServer } from '@renderer/lib/mcpApi'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomSwitch from '@renderer/components/ui/CustomSwitch'
import McpServerFormModal, { McpServerFormData } from '@renderer/components/mcp/McpServerFormModal'
import McpToolInfo from '@renderer/components/mcp/McpToolInfo'
import { McpToolListModal } from '@renderer/components/mcp/McpToolInfo'

function formatTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  connected: { label: '已连接', dot: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' },
  disconnected: { label: '未连接', dot: 'bg-gray-400', bg: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
  error: { label: '错误', dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
}

export default function McpServers(): React.JSX.Element {
  const servers = useWorkflowStore(s => s.mcpServers)
  const fetchMcpServers = useWorkflowStore(s => s.fetchMcpServers)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServer | null>(null)
  const [showTools, setShowTools] = useState<McpServer | null>(null)
  const [operating, setOperating] = useState<string | null>(null)

  const refresh = async () => {
    try {
      await fetchMcpServers()
    } catch (error) {
      console.error('[MCP] 获取列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const handleSave = async (data: McpServerFormData) => {
    const args = data.args ? data.args.split('\n').map(a => a.trim()).filter(a => a.length > 0) : []
    if (editingServer) {
      await mcpApi.update(editingServer.id, {
        name: data.name,
        transportType: data.transportType,
        command: data.command || undefined,
        args: args.length > 0 ? args : undefined,
        url: data.url || undefined,
        enabled: data.enabled,
      })
    } else {
      await mcpApi.create({
        name: data.name,
        transportType: data.transportType,
        command: data.command || undefined,
        args: args.length > 0 ? args : undefined,
        url: data.url || undefined,
        enabled: data.enabled,
      })
    }
    setShowForm(false)
    setEditingServer(null)
    await refresh()
  }

  const openCreate = () => {
    setEditingServer(null)
    setShowForm(true)
  }

  const openEdit = (s: McpServer) => {
    setEditingServer(s)
    setShowForm(true)
  }

  const handleToggle = async (s: McpServer) => {
    setOperating(s.id)
    try {
      if (s.enabled) {
        await mcpApi.disconnect(s.id)
      }
      await mcpApi.update(s.id, { enabled: !s.enabled })
      await refresh()
    } finally {
      setOperating(null)
    }
  }

  const handleConnect = async (s: McpServer) => {
    setOperating(s.id)
    try {
      await mcpApi.connect(s.id)
      await refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : '连接失败')
    } finally {
      setOperating(null)
    }
  }

  const handleDisconnect = async (s: McpServer) => {
    setOperating(s.id)
    try {
      await mcpApi.disconnect(s.id)
      await refresh()
    } finally {
      setOperating(null)
    }
  }

  const handleRefresh = async (s: McpServer) => {
    setOperating(s.id)
    try {
      await mcpApi.refresh(s.id)
      await refresh()
    } finally {
      setOperating(null)
    }
  }

  const handleDelete = async (s: McpServer) => {
    if (!confirm(`确定删除 MCP 服务器「${s.name}」吗？\n删除后该服务器的工具将从所有 Agent 中移除。`)) return
    await mcpApi.delete(s.id)
  }

  const handleRefreshAll = async () => {
    setLoading(true)
    try {
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            MCP 服务
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            管理第三方 MCP（Model Context Protocol）服务器连接
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CustomButton variant="secondary" onClick={handleRefreshAll} loading={loading} size="sm">
            刷新全部
          </CustomButton>
          <CustomButton onClick={openCreate} size="sm">
            + 添加服务器
          </CustomButton>
        </div>
      </div>

      {/* list */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-4">
              <svg className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin opacity-60" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">加载中...</p>
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-4">
              <svg className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <path d="M8 12h8M12 8v8" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">暂无 MCP 服务器</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">点击上方按钮添加</p>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map(s => {
              const status = STATUS_CONFIG[s.connectionStatus] || STATUS_CONFIG.disconnected
              return (
                <div
                  key={s.id}
                  className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    {/* icon */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${s.connectionStatus === 'connected'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : s.connectionStatus === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-gray-50 dark:bg-gray-800'
                      }`}>
                      <svg className={`w-5 h-5 ${s.connectionStatus === 'connected'
                          ? 'text-green-500'
                          : s.connectionStatus === 'error'
                            ? 'text-red-500'
                            : 'text-gray-400'
                        }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </div>

                    {/* content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 dark:text-gray-100">{s.name}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${status.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          {s.transportType === 'stdio' ? 'Stdio' : 'SSE'}
                        </span>
                      </div>

                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {s.transportType === 'stdio'
                          ? `${s.command || '-'} ${(s.args || []).join(' ')}`
                          : s.url || '-'
                        }
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-1">
                        <button
                          onClick={() => setShowTools(s)}
                          className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          工具: {s.toolsCount}
                        </button>
                        {s.lastConnectedAt && (
                          <span>上次连接: {formatTime(s.lastConnectedAt)}</span>
                        )}
                        {s.error && (
                          <span className="text-red-400" title={s.error}>发生错误</span>
                        )}
                      </div>
                    </div>

                    {/* actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <CustomSwitch checked={s.enabled} onChange={() => handleToggle(s)} disabled={operating === s.id} />

                      <div className="flex items-center gap-0.5 ml-1 p-0.5 rounded-lg border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-800">
                        {s.connectionStatus === 'connected' ? (
                          <button
                            onClick={() => handleDisconnect(s)}
                            disabled={operating === s.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title="断开"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18.36 6.64A9 9 0 0 1 20.77 15" />
                              <path d="M6.16 6.16a9 9 0 0 0 1.68 12.68" />
                              <path d="M12 2v8" />
                              <path d="M2 2l20 20" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(s)}
                            disabled={operating === s.id || !s.enabled}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title="连接"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                          </button>
                        )}

                        <button
                          onClick={() => handleRefresh(s)}
                          disabled={operating === s.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                          title="刷新工具"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                        </button>

                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="删除"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* tools (collapsible) */}
                  {s.tools && s.tools.length > 0 && (
                    <div className="mt-3 ml-14">
                      <McpToolInfo tools={s.tools} serverName={s.name} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* form modal */}
      <McpServerFormModal
        open={showForm}
        editingServer={editingServer}
        onClose={() => { setShowForm(false); setEditingServer(null) }}
        onSave={handleSave}
      />

      {/* tool list modal */}
      {showTools && (
        <McpToolListModal
          open
          onClose={() => setShowTools(null)}
          tools={showTools.tools || []}
          serverName={showTools.name}
        />
      )}
    </div>
  )
}
