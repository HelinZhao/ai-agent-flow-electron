import { Router } from 'express'
import { Op } from 'sequelize'
import { WorkflowModel, AgentModel, SkillModel, McpServerModel, KnowledgeBaseModel, KnowledgeChunkModel, TriggerModel } from '../models'
import { safeJsonParse } from '../utils/shared'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// 获取所有工作流（支持 ?name= 按名称搜索）
router.get('/', async (req, res) => {
  try {
    const where: any = {}
    if (req.query.name) {
      where.name = { [Op.like]: `%${req.query.name}%` }
    }
    if (req.query.createdAfter || req.query.createdBefore) {
      where.createdAt = {}
      if (req.query.createdAfter) where.createdAt[Op.gte] = new Date(req.query.createdAfter as string)
      if (req.query.createdBefore) where.createdAt[Op.lte] = new Date(req.query.createdBefore as string)
    }
    if (req.query.updatedAfter || req.query.updatedBefore) {
      where.updatedAt = {}
      if (req.query.updatedAfter) where.updatedAt[Op.gte] = new Date(req.query.updatedAfter as string)
      if (req.query.updatedBefore) where.updatedAt[Op.lte] = new Date(req.query.updatedBefore as string)
    }
    const workflows = await WorkflowModel.findAll({
      where,
      order: [['updatedAt', 'DESC']]
    })
    const result = workflows.map((item) => {
      const jsonItem = item.toJSON()
      return {
        ...jsonItem,
        nodes: safeJsonParse(jsonItem.nodes, []),
        edges: safeJsonParse(jsonItem.edges, [])
      }
    })

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.status(200).send(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('获取工作流列表错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 创建工作流
router.post('/', async (req, res) => {
  try {
    const { name, description, nodes, edges, layoutDirection } = req.body
    if (!name) {
      return res.status(400).json({ error: '名称为空' })
    }
    const workflow = await WorkflowModel.create({
      name,
      description,
      nodes: JSON.stringify(nodes || []),
      edges: JSON.stringify(edges || []),
      layoutDirection: layoutDirection || null
    })
    const json = workflow.toJSON()
    return res.status(201).json({
      ...json,
      nodes: safeJsonParse(json.nodes, []),
      edges: safeJsonParse(json.edges, [])
    })
  } catch (error) {
    console.error('创建工作流错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 获取单个工作流
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const workflow = await WorkflowModel.findByPk(id)

    if (!workflow) {
      return res.status(404).json({ error: '工作流不存在' })
    }
    return res.status(200).json({
      ...workflow.toJSON(),
      nodes: safeJsonParse(workflow.nodes, []),
      edges: safeJsonParse(workflow.edges, [])
    })
  } catch (error) {
    console.error('获取工作流错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 更新工作流
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, nodes, edges, layoutDirection } = req.body

    const workflow = await WorkflowModel.findByPk(id)
    if (!workflow) {
      return res.status(404).json({ error: '工作流不存在' })
    }

    await workflow.update({
      name: name || workflow.name,
      description: description || workflow.description,
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
      layoutDirection: layoutDirection || null
    })

    return res.status(200).json({
      ...workflow.toJSON(),
      nodes: safeJsonParse(workflow.nodes, []),
      edges: safeJsonParse(workflow.edges, []),
      layoutDirection: workflow.layoutDirection || undefined
    })
  } catch (error) {
    console.error('更新工作流错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 删除工作流
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const workflow = await WorkflowModel.findByPk(id)

    if (!workflow) {
      return res.status(404).json({ error: '工作流不存在' })
    }

    await workflow.destroy()
    return res.status(204).send()
  } catch (error) {
    console.error('删除工作流错误:', error)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 导出工作流（含依赖：子工作流、Agent、技能、MCP、知识库）
router.get('/:id/export', async (req, res) => {
  try {
    const { id } = req.params

    // 递归收集所有相关工作流（节点引用 + Agent 绑定）
    const allWorkflowIds = new Set<string>()
    const queue = [id]

    while (queue.length > 0) {
      const wfId = queue.shift()!
      if (allWorkflowIds.has(wfId)) continue
      allWorkflowIds.add(wfId)

      const wf = await WorkflowModel.findByPk(wfId)
      if (!wf) continue

      const nodes = safeJsonParse(wf.nodes, []) as any[]

      // 从节点配置中收集子工作流引用
      for (const node of nodes) {
        const cfg = node.data?.config || {}
        if (cfg.workflowId && cfg.workflowId !== wfId && !allWorkflowIds.has(cfg.workflowId)) {
          queue.push(cfg.workflowId)
        }
      }

      // 从节点引用的 Agent 中收集绑定工作流
      for (const node of nodes) {
        const cfg = node.data?.config || {}
        if (cfg.agentId) {
          const agent = await AgentModel.findByPk(cfg.agentId)
          if (agent?.workflowId && !allWorkflowIds.has(agent.workflowId)) {
            queue.push(agent.workflowId)
          }
        }
      }
    }

    // 加载所有工作流数据
    const allWorkflows: Array<{
      oldId: string
      name: string
      description: string
      nodes: any[]
      edges: any[]
      layoutDirection: string | null
      envVars: string | null
      triggers: any[]
    }> = []

    for (const wfId of allWorkflowIds) {
      const wf = await WorkflowModel.findByPk(wfId)
      if (!wf) continue
      const triggers = await TriggerModel.findAll({ where: { targetId: wfId } })
      allWorkflows.push({
        oldId: wf.id,
        name: wf.name,
        description: wf.description || '',
        nodes: safeJsonParse(wf.nodes, []) as any[],
        edges: safeJsonParse(wf.edges, []) as any[],
        layoutDirection: wf.layoutDirection,
        envVars: wf.envVars,
        triggers: triggers.map(t => ({
          name: t.name,
          type: t.type,
          cronExpression: t.cronExpression,
          input: t.input,
        })),
      })
    }

    // 收集 ALL 工作流的依赖 ID
    const agentIds = new Set<string>()
    const skillIds = new Set<string>()
    const mcpIds = new Set<string>()
    const kbIds = new Set<string>()

    for (const w of allWorkflows) {
      for (const node of w.nodes) {
        const cfg = node.data?.config || {}
        if (cfg.agentId) agentIds.add(cfg.agentId)
        if (cfg.skillId) skillIds.add(cfg.skillId)
        if (cfg.serverId) mcpIds.add(cfg.serverId)
        if (cfg.knowledgeBaseId) kbIds.add(cfg.knowledgeBaseId)
        if (cfg.skillIds) (cfg.skillIds as string[]).forEach((s: string) => skillIds.add(s))
      }
    }

    // 再检查所有 Agent 的 workflowId（可能指向尚未加入的工作流）
    const referencedAgentIds = Array.from(agentIds)
    if (referencedAgentIds.length > 0) {
      const existingIds = new Set(allWorkflows.map(w => w.oldId))
      const agents = await AgentModel.findAll({ where: { id: referencedAgentIds } })
      for (const agent of agents) {
        if (agent.workflowId && !existingIds.has(agent.workflowId)) {
          const wf = await WorkflowModel.findByPk(agent.workflowId)
          if (wf) {
            const triggers = await TriggerModel.findAll({ where: { targetId: agent.workflowId } })
            allWorkflows.push({
              oldId: wf.id,
              name: wf.name,
              description: wf.description || '',
              nodes: safeJsonParse(wf.nodes, []) as any[],
              edges: safeJsonParse(wf.edges, []) as any[],
              layoutDirection: wf.layoutDirection,
              envVars: wf.envVars,
              triggers: triggers.map(t => ({
                name: t.name,
                type: t.type,
                cronExpression: t.cronExpression,
                input: t.input,
              })),
            })
            existingIds.add(agent.workflowId)
          }
        }
      }
    }

    // 加载所有依赖实体
    const [agents, skills, mcps] = await Promise.all([
      AgentModel.findAll({ where: { id: Array.from(agentIds) } }),
      SkillModel.findAll({ where: { id: Array.from(skillIds) } }),
      McpServerModel.findAll({ where: { id: Array.from(mcpIds) } }),
    ])

    // 知识库 + 文档内容
    const knowledgeBases: any[] = []
    for (const kbId of kbIds) {
      const kb = await KnowledgeBaseModel.findByPk(kbId)
      if (kb) {
        const chunks = await KnowledgeChunkModel.findAll({ where: { knowledgeBaseId: kbId } })
        const docs = new Map<string, string[]>()
        for (const c of chunks) {
          if (!docs.has(c.documentName)) docs.set(c.documentName, [])
          docs.get(c.documentName)!.push(c.content)
        }
        knowledgeBases.push({
          name: kb.name,
          description: kb.description,
          documents: Array.from(docs.entries()).map(([name, contents]) => ({
            name,
            content: contents.join('\n\n'),
          })),
        })
      }
    }

    // 构建 bundle
    const mainWorkflow = allWorkflows.find(w => w.oldId === id) || allWorkflows[0]
    const subWorkflows = allWorkflows.filter(w => w.oldId !== id)

    const bundle: Record<string, any> = {
      type: 'workflow-bundle',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      workflow: {
        oldId: mainWorkflow.oldId,
        name: mainWorkflow.name,
        description: mainWorkflow.description,
        nodes: mainWorkflow.nodes,
        edges: mainWorkflow.edges,
        layoutDirection: mainWorkflow.layoutDirection || undefined,
        envVars: mainWorkflow.envVars ? safeJsonParse(mainWorkflow.envVars, undefined) : undefined,
      },
    }

    if (subWorkflows.length > 0) {
      bundle.subWorkflows = subWorkflows.map(w => ({
        oldId: w.oldId,
        name: w.name,
        description: w.description,
        nodes: w.nodes,
        edges: w.edges,
        layoutDirection: w.layoutDirection || undefined,
        envVars: w.envVars ? safeJsonParse(w.envVars, undefined) : undefined,
        triggers: w.triggers.length > 0 ? w.triggers : undefined,
      }))
    }

    if (agents.length > 0) {
      bundle.agents = agents.map(a => ({
        oldId: a.id,
        name: a.name,
        description: a.description,
        instructions: a.instructions,
        type: a.type,
        skillIds: a.skillIds ? JSON.parse(a.skillIds) : [],
        enabledTools: a.enabledTools ? JSON.parse(a.enabledTools) : [],
        workflowId: a.workflowId,
      }))
    }
    if (skills.length > 0) {
      bundle.skills = skills.map(s => ({
        oldId: s.id,
        name: s.name,
        description: s.description,
        content: s.content,
      }))
    }
    if (mcps.length > 0) {
      bundle.mcpServers = mcps.map(m => ({
        oldId: m.id,
        name: m.name,
        transportType: m.transportType,
        command: m.command,
        args: m.args ? JSON.parse(m.args) : [],
        url: m.url,
      }))
    }
    if (knowledgeBases.length > 0) {
      bundle.knowledgeBases = knowledgeBases
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(mainWorkflow.name)}.afbundle`)
    return res.status(200).send(JSON.stringify(bundle, null, 2))
  } catch (error) {
    console.error('导出工作流错误:', error)
    return res.status(500).json({ error: '导出失败' })
  }
})

// 导入工作流（完整 bundle）
router.post('/import', async (req, res) => {
  try {
    const bundle = req.body
    if (!bundle || bundle.type !== 'workflow-bundle') {
      return res.status(400).json({ error: '无效的 bundle 格式' })
    }

    const idMap = new Map<string, string>() // oldId → newId

    // ---- 第 1 轮：导入共享依赖（不引用工作流的实体） ----

    // 1. 导入技能
    if (bundle.skills) {
      for (const skill of bundle.skills) {
        const existing = await SkillModel.findOne({ where: { name: skill.name } })
        if (existing) {
          if (skill.oldId) idMap.set(skill.oldId, existing.id)
          continue
        }
        const created = await SkillModel.create({ name: skill.name, description: skill.description || '', content: skill.content })
        if (skill.oldId) idMap.set(skill.oldId, created.id)
      }
    }

    // 2. 导入 MCP 服务器
    if (bundle.mcpServers) {
      for (const mcp of bundle.mcpServers) {
        const existing = await McpServerModel.findOne({ where: { name: mcp.name } })
        if (existing) {
          if (mcp.oldId) idMap.set(mcp.oldId, existing.id)
          continue
        }
        const created = await McpServerModel.create({
          name: mcp.name,
          transportType: mcp.transportType || 'stdio',
          command: mcp.command,
          args: mcp.args ? JSON.stringify(mcp.args) : undefined,
          url: mcp.url,
        })
        if (mcp.oldId) idMap.set(mcp.oldId, created.id)
      }
    }

    // 3. 导入知识库
    if (bundle.knowledgeBases) {
      for (const kb of bundle.knowledgeBases) {
        const existing = await KnowledgeBaseModel.findOne({ where: { name: kb.name } })
        if (existing) continue
        const created = await KnowledgeBaseModel.create({ name: kb.name, description: kb.description || '', type: 'internal', config: '{}' })
        if (kb.documents) {
          for (const doc of kb.documents) {
            const chunks = doc.content.split(/\n{2,}/).filter(Boolean)
            for (let i = 0; i < chunks.length; i++) {
              await KnowledgeChunkModel.create({ knowledgeBaseId: created.id, documentName: doc.name, content: chunks[i], chunkIndex: i, enabled: true })
            }
          }
        }
      }
    }

    // ---- 第 2 轮：导入子工作流（先导入，让 idMap 中有映射） ----

    const remapNodeConfig = (cfg: Record<string, any>): Record<string, any> => {
      if (!cfg) return cfg
      const result = { ...cfg }
      if (result.agentId) result.agentId = idMap.get(result.agentId) || result.agentId
      if (result.skillId) result.skillId = idMap.get(result.skillId) || result.skillId
      if (result.serverId) result.serverId = idMap.get(result.serverId) || result.serverId
      if (result.knowledgeBaseId) result.knowledgeBaseId = idMap.get(result.knowledgeBaseId) || result.knowledgeBaseId
      if (result.skillIds) result.skillIds = result.skillIds.map((s: string) => idMap.get(s) || s)
      if (result.workflowId) result.workflowId = idMap.get(result.workflowId) || result.workflowId
      return result
    }

    const remapNodes = (nodes: any[]) =>
      (nodes || []).map((n: any) => ({
        ...n,
        data: { ...n.data, config: remapNodeConfig(n.data?.config || {}) },
      }))

    // 先导入子工作流（此时 workflowId 还无法重映射，因为主工作流未导入）
    const subWorkflows = bundle.subWorkflows || []
    for (const sw of subWorkflows) {
      const created = await WorkflowModel.create({
        name: sw.name + (sw._suffix || ''),
        description: sw.description || '',
        nodes: JSON.stringify(remapNodes(sw.nodes)),
        edges: JSON.stringify(sw.edges || []),
        layoutDirection: sw.layoutDirection || null,
        envVars: sw.envVars ? JSON.stringify(sw.envVars) : undefined,
      })
      if (sw.oldId) idMap.set(sw.oldId, created.id)

      // 子工作流的触发器
      if (sw.triggers) {
        for (const t of sw.triggers) {
          await TriggerModel.create({ name: t.name, type: t.type, cronExpression: t.cronExpression, input: t.input || '', targetType: 'workflow', targetId: created.id, enabled: false })
        }
      }
    }

    // ---- 第 3 轮：导入 Agent（此时可以重映射 workflowId） ----

    const agentsToUpdate: Array<{ agentId: string; workflowId: string }> = []
    if (bundle.agents) {
      for (const agent of bundle.agents) {
        const existing = await AgentModel.findOne({ where: { name: agent.name } })
        if (existing) {
          if (agent.oldId) idMap.set(agent.oldId, existing.id)
          continue
        }
        const remappedSkills = (agent.skillIds || []).map((sid: string) => idMap.get(sid) || sid)
        const remappedWorkflowId = agent.workflowId ? idMap.get(agent.workflowId) || agent.workflowId : undefined
        const created = await AgentModel.create({
          name: agent.name,
          description: agent.description || '',
          instructions: agent.instructions,
          type: agent.type || 'standard',
          skillIds: JSON.stringify(remappedSkills),
          enabledTools: JSON.stringify(agent.enabledTools || []),
          workflowId: remappedWorkflowId,
        })
        if (agent.oldId) idMap.set(agent.oldId, created.id)
      }
    }

    // ---- 第 4 轮：导入主工作流（所有依赖 ID 均可重映射） ----

    const mainWorkflow = bundle.workflow
    const workflow = await WorkflowModel.create({
      name: mainWorkflow.name + (mainWorkflow._suffix || ''),
      description: mainWorkflow.description || '',
      nodes: JSON.stringify(remapNodes(mainWorkflow.nodes)),
      edges: JSON.stringify(mainWorkflow.edges || []),
      layoutDirection: mainWorkflow.layoutDirection || null,
      envVars: mainWorkflow.envVars ? JSON.stringify(mainWorkflow.envVars) : undefined,
    })
    if (mainWorkflow.oldId) idMap.set(mainWorkflow.oldId, workflow.id)

    // 主工作流的触发器
    if (bundle.triggers) {
      for (const t of bundle.triggers) {
        await TriggerModel.create({ name: t.name, type: t.type, cronExpression: t.cronExpression, input: t.input || '', targetType: 'workflow', targetId: workflow.id, enabled: false })
      }
    }

    // 返回
    const json = workflow.toJSON()
    return res.status(201).json({
      ...json,
      nodes: safeJsonParse(json.nodes, []),
      edges: safeJsonParse(json.edges, []),
    })
  } catch (error) {
    console.error('导入工作流错误:', error)
    return res.status(500).json({ error: '导入失败: ' + (error instanceof Error ? error.message : String(error)) })
  }
})

export default router
