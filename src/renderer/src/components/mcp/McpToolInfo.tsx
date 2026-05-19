import { useState } from 'react'
import { McpDiscoveredTool } from '@renderer/lib/mcpApi'
import Modal from '@renderer/components/ui/Modal'

interface McpToolInfoProps {
  tools: McpDiscoveredTool[]
  serverName: string
}

export default function McpToolInfo({ tools }: McpToolInfoProps) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null)

  if (tools.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
        暂无工具
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {tools.map(tool => (
        <div key={tool.toolId} className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <button
            onClick={() => setExpandedTool(expandedTool === tool.toolId ? null : tool.toolId)}
            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex-shrink-0">
                MCP
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{tool.name}</span>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${expandedTool === tool.toolId ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {expandedTool === tool.toolId && (
            <div className="px-3 pb-2">
              {tool.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{tool.description}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono break-all">
                工具ID: {tool.toolId}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

interface McpToolListModalProps {
  open: boolean
  onClose: () => void
  tools: McpDiscoveredTool[]
  serverName: string
}

export function McpToolListModal({ open, onClose, tools, serverName }: McpToolListModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${serverName} - 工具列表 (${tools.length})`}
    >
      <McpToolInfo tools={tools} serverName={serverName} />
    </Modal>
  )
}
