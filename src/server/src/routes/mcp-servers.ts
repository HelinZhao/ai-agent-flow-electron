import { Router } from 'express'
import { McpServerModel, McpServerAttributes } from '../models'
import { mcpConnectionManager } from '../mcp'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// 获取所有 MCP 服务器列表（含实时状态和工具信息）
router.get('/', async (_req, res) => {
  try {
    const details = await mcpConnectionManager.getAllServerDetails()
    return res.status(200).json(details)
  } catch (error) {
    console.error('[MCP] 获取服务器列表失败:', error)
    return res.status(500).json({ error: '获取 MCP 服务器列表失败' })
  }
})

// 获取所有 MCP 工具（供前端工具选择器用）
router.get('/tools', async (_req, res) => {
  try {
    const defs = mcpConnectionManager.getMcpToolDefinitions()
    return res.status(200).json(defs)
  } catch (error) {
    console.error('[MCP] 获取工具列表失败:', error)
    return res.status(500).json({ error: '获取 MCP 工具列表失败' })
  }
})

// 获取单个 MCP 服务器详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const detail = await mcpConnectionManager.getServerDetail(id)
    if (!detail) {
      return res.status(404).json({ error: 'MCP 服务器不存在' })
    }
    return res.status(200).json(detail)
  } catch (error) {
    console.error(`[MCP] 获取服务器 ${req.params.id} 详情失败:`, error)
    return res.status(500).json({ error: '获取 MCP 服务器详情失败' })
  }
})

// 创建 MCP 服务器
router.post('/', async (req, res) => {
  try {
    const { name, transportType, command, args, url, enabled, settings } = req.body

    if (!name || !transportType) {
      return res.status(400).json({ error: '名称和传输类型不能为空' })
    }

    if (!['stdio', 'sse'].includes(transportType)) {
      return res.status(400).json({ error: '传输类型必须是 stdio 或 sse' })
    }

    if (transportType === 'sse' && !url) {
      return res.status(400).json({ error: 'SSE 传输类型需要提供 URL' })
    }

    const data: McpServerAttributes = {
      id: uuidv4(),
      name,
      transportType,
      command: command || undefined,
      args: args ? JSON.stringify(args) : undefined,
      url: url || undefined,
      enabled: enabled !== false,
      connectionStatus: 'disconnected',
      toolsCount: 0,
      settings: settings ? JSON.stringify(settings) : undefined,
    }
    const server = await McpServerModel.create(data)

    // 如果启用，自动连接
    if (server.enabled) {
      mcpConnectionManager.connectServer(server.id).catch(err => {
        console.warn(`[MCP] 服务器 ${name} 自动连接失败:`, err.message)
      })
    }

    const detail = await mcpConnectionManager.getServerDetail(server.id)
    return res.status(201).json(detail)
  } catch (error: any) {
    console.error('[MCP] 创建服务器失败:', error)
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: '服务器名称已存在' })
    }
    return res.status(500).json({ error: error?.message || '创建 MCP 服务器失败' })
  }
})

// 更新 MCP 服务器
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const server = await McpServerModel.findByPk(id)
    if (!server) {
      return res.status(404).json({ error: 'MCP 服务器不存在' })
    }

    const { name, transportType, command, args, url, enabled, settings } = req.body

    // 断开旧连接
    await mcpConnectionManager.disconnectServer(id).catch(() => {})

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (transportType !== undefined) {
      if (!['stdio', 'sse'].includes(transportType)) {
        return res.status(400).json({ error: '传输类型必须是 stdio 或 sse' })
      }
      updateData.transportType = transportType
    }
    if (command !== undefined) updateData.command = command || null
    if (args !== undefined) updateData.args = args ? JSON.stringify(args) : null
    if (url !== undefined) updateData.url = url || null
    if (enabled !== undefined) updateData.enabled = enabled
    if (settings !== undefined) updateData.settings = JSON.stringify(settings)

    await server.update(updateData)

    // 如果更新后启用，自动连接
    const updatedEnabled = enabled !== undefined ? enabled : server.enabled
    if (updatedEnabled) {
      mcpConnectionManager.connectServer(id).catch(err => {
        console.warn(`[MCP] 服务器 ${name || server.name} 自动连接失败:`, err.message)
      })
    }

    const detail = await mcpConnectionManager.getServerDetail(id)
    return res.status(200).json(detail)
  } catch (error: any) {
    console.error('[MCP] 更新服务器失败:', error)
    return res.status(500).json({ error: error?.message || '更新 MCP 服务器失败' })
  }
})

// 删除 MCP 服务器
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const server = await McpServerModel.findByPk(id)
    if (!server) {
      return res.status(404).json({ error: 'MCP 服务器不存在' })
    }

    // 断开连接
    await mcpConnectionManager.disconnectServer(id).catch(() => {})
    await server.destroy()
    return res.status(204).send()
  } catch (error) {
    console.error('[MCP] 删除服务器失败:', error)
    return res.status(500).json({ error: '删除 MCP 服务器失败' })
  }
})

// 手动连接 MCP 服务器
router.post('/:id/connect', async (req, res) => {
  try {
    const { id } = req.params
    const server = await McpServerModel.findByPk(id)
    if (!server) {
      return res.status(404).json({ error: 'MCP 服务器不存在' })
    }

    if (!server.enabled) {
      return res.status(400).json({ error: 'MCP 服务器已禁用，请先启用' })
    }

    await mcpConnectionManager.connectServer(id)
    return res.status(200).json({ message: `服务器 ${server.name} 连接成功` })
  } catch (error: any) {
    console.error('[MCP] 连接服务器失败:', error)
    return res.status(500).json({ error: error?.message || '连接 MCP 服务器失败' })
  }
})

// 手动断开 MCP 服务器
router.post('/:id/disconnect', async (req, res) => {
  try {
    const { id } = req.params
    const server = await McpServerModel.findByPk(id)
    if (!server) {
      return res.status(404).json({ error: 'MCP 服务器不存在' })
    }

    await mcpConnectionManager.disconnectServer(id)
    return res.status(200).json({ message: `服务器 ${server.name} 已断开` })
  } catch (error) {
    console.error('[MCP] 断开服务器失败:', error)
    return res.status(500).json({ error: '断开 MCP 服务器失败' })
  }
})

// 重新发现工具
router.post('/:id/refresh', async (req, res) => {
  try {
    const { id } = req.params
    const server = await McpServerModel.findByPk(id)
    if (!server) {
      return res.status(404).json({ error: 'MCP 服务器不存在' })
    }

    const toolsCount = await mcpConnectionManager.refreshServer(id)
    return res.status(200).json({ message: `已刷新，发现 ${toolsCount} 个工具`, toolsCount })
  } catch (error: any) {
    console.error('[MCP] 刷新工具失败:', error)
    return res.status(500).json({ error: error?.message || '刷新工具失败' })
  }
})

// 刷新所有连接
router.post('/refresh-all', async (_req, res) => {
  try {
    const { total, succeeded } = await mcpConnectionManager.refreshAllConnections()
    return res.status(200).json({ message: `已刷新 ${succeeded}/${total} 个服务器`, total, succeeded })
  } catch (error) {
    console.error('[MCP] 刷新所有连接失败:', error)
    return res.status(500).json({ error: '刷新所有连接失败' })
  }
})

export default router
