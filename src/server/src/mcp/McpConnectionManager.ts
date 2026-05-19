import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import {
  ListToolsResultSchema,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { McpServerModel } from '../models'
import { zodObjectFromJsonSchema } from './schemaConverter'
import {
  MCP_TOOL_PREFIX,
  MCP_TOOL_CALL_TIMEOUT,
  MCP_MAX_RECONNECT_ATTEMPTS,
  MCP_RECONNECT_BASE_DELAY,
  MCP_RECONNECT_MAX_DELAY,
} from '../config'
import { changeNotifier } from '../utils/dataChangeNotifier'
import { z } from 'zod'

/** MCP 发现的一个工具定义 */
export interface McpDiscoveredTool {
  name: string
  description?: string
  inputSchema: any
}

/** MCP 工具信息（注册用） */
export interface McpToolInfo {
  toolId: string
  serverId: string
  serverName: string
  toolName: string
  description: string
}

/** 工具定义格式（与前端 TOOL_DEFINITIONS 一致） */
export interface McpToolDefinition {
  id: string
  label: string
  description: string
  serverName: string
}

/** 内部管理的 MCP 客户端连接 */
interface McpClientConnection {
  serverId: string
  serverName: string
  client: Client
  transport: StdioClientTransport | SSEClientTransport
  transportType: 'stdio' | 'sse'
  connected: boolean
  tools: McpDiscoveredTool[]
  error?: string
  reconnectAttempts: number
  abortController: AbortController
}

export class McpConnectionManager {
  private connections = new Map<string, McpClientConnection>()
  /** 工具 ID → DynamicStructuredTool */
  private mcpTools = new Map<string, DynamicStructuredTool>()
  /** 工具 ID → 元信息 */
  private mcpToolInfos = new Map<string, McpToolInfo>()
  private reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private initialized = false

  /**
   * 初始化：加载所有启用的 MCP 服务器配置并连接
   */
  async initialize(): Promise<void> {
    if (this.initialized) return
    this.initialized = true

    try {
      const servers = await McpServerModel.findAll({ where: { enabled: true } })
      console.log(`[MCP] 开始连接 ${servers.length} 个已启用的 MCP 服务器`)
      const results = await Promise.allSettled(
        servers.map(server => this.connectServer(server.id).catch(err => {
          console.warn(`[MCP] 服务器 ${server.name} 连接失败:`, err.message)
        }))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      console.log(`[MCP] 初始化完成: ${succeeded}/${servers.length} 个服务器连接成功`)
    } catch (error) {
      console.error('[MCP] 初始化失败:', error)
    }
  }

  /**
   * 关闭所有连接
   */
  async shutdown(): Promise<void> {
    this.initialized = false
    // 清除所有重连计时器
    for (const [serverId, timer] of this.reconnectTimers) {
      clearTimeout(timer)
      this.reconnectTimers.delete(serverId)
    }
    // 断开所有连接
    const disconnectPromises: Promise<void>[] = []
    for (const [serverId] of this.connections) {
      disconnectPromises.push(this.disconnectServer(serverId).catch(() => { }))
    }
    await Promise.allSettled(disconnectPromises)
    this.mcpTools.clear()
    this.mcpToolInfos.clear()
    console.log('[MCP] 所有连接已关闭')
  }

  /**
   * 连接单个 MCP 服务器
   */
  async connectServer(serverId: string): Promise<void> {
    const server = await McpServerModel.findByPk(serverId)
    if (!server) throw new Error(`MCP 服务器配置不存在: ${serverId}`)
    if (!server.enabled) throw new Error(`MCP 服务器 ${server.name} 已禁用`)

    // 断开已有连接
    await this.disconnectServer(serverId).catch(() => { })

    const abortController = new AbortController()
    const client = new Client(
      { name: `ai-agent-flow-${server.name}`, version: '1.0.0' },
      { capabilities: {} }
    )

    let transport: StdioClientTransport | SSEClientTransport

    if (server.transportType === 'stdio') {
      const args = server.args ? safeJsonParse<string[]>(server.args, []) : []
      transport = new StdioClientTransport({
        command: server.command || 'npx',
        args,
        // StdioClientTransport in newer SDK versions uses spawnOptions
        stderr: 'inherit' as any,
      })
    } else {
      const url = server.url
      if (!url) throw new Error('SSE 传输类型需要提供 URL')
      transport = new SSEClientTransport(new URL(url))
    }

    const conn: McpClientConnection = {
      serverId: server.id,
      serverName: server.name,
      client,
      transport,
      transportType: server.transportType,
      connected: false,
      tools: [],
      reconnectAttempts: 0,
      abortController,
    }

    this.connections.set(serverId, conn)

    // 注册传输关闭/错误事件
    transport.onclose = () => {
      conn.connected = false
      console.warn(`[MCP] 服务器 ${server.name} 传输连接已关闭`)
      this.updateServerStatus(server.id, 'disconnected', 0)
      this.scheduleReconnect(serverId)
    }
    transport.onerror = (error) => {
      conn.connected = false
      conn.error = error instanceof Error ? error.message : String(error)
      console.error(`[MCP] 服务器 ${server.name} 传输错误:`, conn.error)
      this.updateServerStatus(server.id, 'error', 0, conn.error)
      this.scheduleReconnect(serverId)
    }

    try {
      await client.connect(transport)
      conn.connected = true
      conn.reconnectAttempts = 0
      console.log(`[MCP] 服务器 ${server.name} 连接成功`)

      // 发现工具
      const tools = await this.discoverTools(serverId)
      conn.tools = tools

      // 注册工具
      this.registerTools(serverId, server.name, tools)

      await McpServerModel.update(
        {
          connectionStatus: 'connected',
          toolsCount: tools.length,
          lastConnectedAt: new Date().toISOString(),
        },
        { where: { id: server.id } }
      )

      changeNotifier.emitChange('mcp-servers')
    } catch (error) {
      conn.connected = false
      conn.error = error instanceof Error ? error.message : String(error)
      // 清理连接
      try { transport.close() } catch { }
      this.connections.delete(serverId)
      this.removeTools(serverId)

      await McpServerModel.update(
        {
          connectionStatus: 'error',
          toolsCount: 0,
        },
        { where: { id: server.id } }
      )

      changeNotifier.emitChange('mcp-servers')
      throw error
    }
  }

  /**
   * 断开单个 MCP 服务器
   */
  async disconnectServer(serverId: string): Promise<void> {
    // 清除重连计时器
    const timer = this.reconnectTimers.get(serverId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(serverId)
    }

    const conn = this.connections.get(serverId)
    if (conn) {
      conn.connected = false
      try {
        await conn.transport.close()
      } catch { }
      try {
        await conn.client.close()
      } catch { }
      this.connections.delete(serverId)
    }

    this.removeTools(serverId)

    await McpServerModel.update(
      { connectionStatus: 'disconnected', toolsCount: 0 },
      { where: { id: serverId } }
    ).catch(() => { })

    changeNotifier.emitChange('mcp-servers')
  }

  /**
   * 刷新单个服务器的工具列表
   */
  async refreshServer(serverId: string): Promise<number> {
    const conn = this.connections.get(serverId)
    if (!conn || !conn.connected) throw new Error('MCP 服务器未连接')

    const tools = await this.discoverTools(serverId)
    conn.tools = tools

    this.removeTools(serverId)
    this.registerTools(serverId, conn.serverName, tools)

    await McpServerModel.update(
      { toolsCount: tools.length },
      { where: { id: serverId } }
    ).catch(() => { })

    changeNotifier.emitChange('mcp-servers')
    return tools.length
  }

  /**
   * 刷新所有已连接服务器的工具列表
   */
  async refreshAllConnections(): Promise<{ total: number; succeeded: number }> {
    let succeeded = 0
    let total = 0
    for (const [serverId] of this.connections) {
      total++
      try {
        await this.refreshServer(serverId)
        succeeded++
      } catch (error) {
        console.warn(`[MCP] 刷新服务器 ${serverId} 失败:`, error)
      }
    }
    return { total, succeeded }
  }

  /**
   * 通过工具 ID 获取 LangChain DynamicStructuredTool
   */
  getMcpToolById(toolId: string): DynamicStructuredTool | undefined {
    return this.mcpTools.get(toolId)
  }

  /**
   * 获取所有 MCP LangChain 工具
   */
  getAllMcpTools(): DynamicStructuredTool[] {
    return Array.from(this.mcpTools.values())
  }

  /**
   * 获取所有 MCP 工具定义（供前端工具选择器用）
   */
  getMcpToolDefinitions(): McpToolDefinition[] {
    const defs: McpToolDefinition[] = []
    for (const info of this.mcpToolInfos.values()) {
      defs.push({
        id: info.toolId,
        label: `${info.serverName}: ${info.toolName}`,
        description: info.description || `MCP 工具 (${info.serverName})`,
        serverName: info.serverName,
      })
    }
    return defs
  }

  /**
   * 获取所有 MCP 工具元信息
   */
  getMcpToolInfos(): McpToolInfo[] {
    return Array.from(this.mcpToolInfos.values())
  }

  /**
   * 获取服务器连接状态
   */
  getServerConnections(): Map<string, McpClientConnection> {
    return this.connections
  }

  /**
   * 调用 MCP 工具的底层方法
   */
  private async callMcpTool(serverId: string, toolName: string, args: Record<string, any>): Promise<string> {
    const conn = this.connections.get(serverId)
    if (!conn || !conn.connected) {
      throw new Error(`MCP 服务器未连接 (serverId=${serverId})`)
    }

    const result = await conn.client.request(
      {
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      },
      CallToolResultSchema,
    )

    const content = result?.content
    if (!content) return '工具调用完成，无返回内容'

    if (typeof content === 'string') return content

    if (Array.isArray(content)) {
      return content
        .map((part: any) => {
          if (part.type === 'text') return part.text || ''
          if (part.type === 'resource') {
            const resource = part.resource
            return resource?.text || resource?.blob || JSON.stringify(resource)
          }
          return JSON.stringify(part)
        })
        .filter(Boolean)
        .join('\n')
    }

    return JSON.stringify(content)
  }

  /**
   * 按 serverId + toolName 直接调用 MCP 工具（供工作流节点使用）
   */
  public async callTool(serverId: string, toolName: string, args: Record<string, any>): Promise<string> {
    return this.callMcpTool(serverId, toolName, args)
  }

  /**
   * 工具 ID 生成：mcp_<serverName>_<toolName>
   */
  private getMcpToolId(serverName: string, toolName: string): string {
    const sanitizedServer = serverName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
    const sanitizedTool = toolName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
    return `${MCP_TOOL_PREFIX}${sanitizedServer}_${sanitizedTool}`
  }

  /**
   * 通过 tools/list 发现工具
   */
  private async discoverTools(serverId: string): Promise<McpDiscoveredTool[]> {
    const conn = this.connections.get(serverId)
    if (!conn) throw new Error(`连接未找到: ${serverId}`)

    try {
      const result = await conn.client.request(
        { method: 'tools/list', params: {} },
        ListToolsResultSchema,
      )

      const tools = result?.tools || []
      if (!Array.isArray(tools)) {
        console.warn(`[MCP] 服务器 ${conn.serverName} tools/list 返回格式异常`)
        return []
      }

      return tools.map((t: any) => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema || t.parameters || {},
      }))
    } catch (error) {
      console.error(`[MCP] 服务器 ${conn.serverName} tools/list 失败:`, error)
      return []
    }
  }

  /**
   * 将 MCP 工具注册为 DynamicStructuredTool
   */
  private registerTools(serverId: string, serverName: string, tools: McpDiscoveredTool[]): void {
    let registered = 0
    for (const tool of tools) {
      const toolId = this.getMcpToolId(serverName, tool.name)

      // 跳过已注册的工具（避免重复）
      if (this.mcpTools.has(toolId)) continue

      let schema: z.ZodObject<any>
      try {
        schema = zodObjectFromJsonSchema(tool.inputSchema)
      } catch (error) {
        console.warn(`[MCP] 工具 ${toolId} JSON Schema 转换失败，使用空参数:`, error)
        schema = z.object({})
      }

      const structuredTool = new DynamicStructuredTool({
        name: toolId,
        description: tool.description || `MCP 工具: ${serverName}/${tool.name}`,
        schema,
        func: async (args: Record<string, any>): Promise<string> => {
          // 设置超时
          const timeout = MCP_TOOL_CALL_TIMEOUT
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), timeout)

          try {
            return await this.callMcpTool(serverId, tool.name, args)
          } finally {
            clearTimeout(timeoutId)
          }
        },
      })

      this.mcpTools.set(toolId, structuredTool)
      this.mcpToolInfos.set(toolId, {
        toolId,
        serverId,
        serverName,
        toolName: tool.name,
        description: tool.description || '',
      })
      registered++
    }

    if (registered > 0) {
      console.log(`[MCP] 服务器 ${serverName} 注册了 ${registered} 个工具`)
    }
  }

  /**
   * 移除指定服务器注册的所有工具
   */
  private removeTools(serverId: string): void {
    const toolIdsToRemove: string[] = []
    for (const [toolId, info] of this.mcpToolInfos) {
      if (info.serverId === serverId) {
        toolIdsToRemove.push(toolId)
      }
    }
    for (const toolId of toolIdsToRemove) {
      this.mcpTools.delete(toolId)
      this.mcpToolInfos.delete(toolId)
    }
    if (toolIdsToRemove.length > 0) {
      console.log(`[MCP] 已移除服务器 ${serverId} 的 ${toolIdsToRemove.length} 个工具`)
    }
  }

  /**
   * 调度重连
   */
  private scheduleReconnect(serverId: string): void {
    // 如果已经初始化停止，不重连
    if (!this.initialized) return

    const conn = this.connections.get(serverId)
    if (!conn) return

    // 如果已经重新连上了，不重连
    if (conn.connected) return

    // 检查重连次数
    if (conn.reconnectAttempts >= MCP_MAX_RECONNECT_ATTEMPTS) {
      console.warn(`[MCP] 服务器 ${conn.serverName} 已达最大重连次数 (${MCP_MAX_RECONNECT_ATTEMPTS})，停止重连`)
      this.updateServerStatus(serverId, 'error', 0, `重连失败已达上限 (${MCP_MAX_RECONNECT_ATTEMPTS} 次)`)
      return
    }

    // 清理旧计时器
    const oldTimer = this.reconnectTimers.get(serverId)
    if (oldTimer) clearTimeout(oldTimer)

    // 计算延迟（指数退避）
    const delay = Math.min(
      MCP_RECONNECT_BASE_DELAY * Math.pow(2, conn.reconnectAttempts),
      MCP_RECONNECT_MAX_DELAY
    )
    conn.reconnectAttempts++

    console.log(`[MCP] 计划在 ${delay}ms 后重连服务器 ${conn.serverName} (第${conn.reconnectAttempts}次)`)

    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(serverId)
      try {
        await this.connectServer(serverId)
      } catch (error) {
        console.warn(`[MCP] 重连 ${conn.serverName} 失败:`, error instanceof Error ? error.message : String(error))
        // 继续调度下一次重连
        this.scheduleReconnect(serverId)
      }
    }, delay)

    this.reconnectTimers.set(serverId, timer)
  }

  /**
   * 更新数据库中的服务器状态
   */
  private async updateServerStatus(
    serverId: string,
    status: 'connected' | 'disconnected' | 'error',
    toolsCount?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = { connectionStatus: status }
      if (toolsCount !== undefined) updateData.toolsCount = toolsCount
      if (status === 'connected') updateData.lastConnectedAt = new Date().toISOString()
      if (errorMessage) {
        const server = await McpServerModel.findByPk(serverId)
        if (server) {
          const settings = safeJsonParse<Record<string, any>>(server.settings, {})
          settings.lastError = errorMessage
          updateData.settings = JSON.stringify(settings)
        }
      }
      await McpServerModel.update(updateData, { where: { id: serverId } })
    } catch { }
  }

  /**
   * 获取指定服务器的连接详情（供 API 返回）
   */
  async getServerDetail(serverId: string): Promise<Record<string, any> | null> {
    const server = await McpServerModel.findByPk(serverId)
    if (!server) return null

    const conn = this.connections.get(serverId)
    const toolInfos = Array.from(this.mcpToolInfos.values())
      .filter(info => info.serverId === serverId)
      .map(info => ({
        toolId: info.toolId,
        name: info.toolName,
        description: info.description,
      }))

    return {
      id: server.id,
      name: server.name,
      transportType: server.transportType,
      command: server.command,
      args: safeJsonParse<string[]>(server.args, []),
      url: server.url,
      enabled: server.enabled,
      connectionStatus: conn?.connected ? 'connected' : server.connectionStatus,
      toolsCount: conn?.tools.length || server.toolsCount || 0,
      tools: toolInfos,
      error: conn?.error,
      lastConnectedAt: server.lastConnectedAt,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    }
  }

  /**
   * 获取所有服务器列表（含实时状态和工具信息）
   */
  async getAllServerDetails(): Promise<Record<string, any>[]> {
    const servers = await McpServerModel.findAll({ order: [['createdAt', 'DESC']] })
    const details: Record<string, any>[] = []

    for (const server of servers) {
      const detail = await this.getServerDetail(server.id)
      if (detail) details.push(detail)
    }

    return details
  }
}

/** 安全 JSON 解析 */
function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/** 模块级单例 */
export const mcpConnectionManager = new McpConnectionManager()
