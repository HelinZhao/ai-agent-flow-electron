import api from './api'

export interface McpServer {
  id: string
  name: string
  transportType: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
  enabled: boolean
  connectionStatus: 'connected' | 'disconnected' | 'error'
  toolsCount: number
  tools?: McpDiscoveredTool[]
  error?: string
  lastConnectedAt?: string
  createdAt: string
  updatedAt: string
}

export interface McpDiscoveredTool {
  toolId: string
  name: string
  description: string
  inputSchema?: any
}

export interface McpToolDefinition {
  id: string
  label: string
  description: string
  serverName: string
}

export const mcpApi = {
  getAll: (): Promise<McpServer[]> =>
    api.get('/mcp-servers'),

  getById: (id: string): Promise<McpServer> =>
    api.get(`/mcp-servers/${id}`),

  create: (data: {
    name: string
    transportType: 'stdio' | 'sse'
    command?: string
    args?: string[]
    url?: string
    enabled?: boolean
  }): Promise<McpServer> =>
    api.post('/mcp-servers', data),

  update: (id: string, data: Partial<McpServer>): Promise<McpServer> =>
    api.put(`/mcp-servers/${id}`, data),

  delete: (id: string): Promise<void> =>
    api.delete(`/mcp-servers/${id}`),

  connect: (id: string): Promise<{ message: string }> =>
    api.post(`/mcp-servers/${id}/connect`),

  disconnect: (id: string): Promise<{ message: string }> =>
    api.post(`/mcp-servers/${id}/disconnect`),

  refresh: (id: string): Promise<{ message: string; toolsCount: number }> =>
    api.post(`/mcp-servers/${id}/refresh`),

  refreshAll: (): Promise<{ message: string; total: number; succeeded: number }> =>
    api.post('/mcp-servers/refresh-all'),

  getTools: (): Promise<McpToolDefinition[]> =>
    api.get('/mcp-servers/tools'),
}
