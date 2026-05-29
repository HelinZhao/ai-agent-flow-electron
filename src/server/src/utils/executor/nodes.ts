import { SkillModel, LLMConfigModel, AgentModel, WorkflowModel } from '../../models'
import { callLLM, callLLMWithTracking } from '../llm'
import { executeApiCall } from '../api'
import { executeCliCommand, executeCliTemplate } from '../cli'
import { retrieveContext } from '../knowledge'
import { mcpConnectionManager } from '../../mcp'
import { safeJsonParse, buildSkillsContext } from '../shared'
import { DANGEROUS_TOOLS } from '../../config'
import type { Workflow } from '../../types'
import type { DatabaseConfig } from '../database'
import type { CallLLMOptions } from '../hitl'
import type { HITLRequest, HITLDecision, HITLResponse } from '../hitl'
import type { ExecCtx, NodeExecutorDeps } from './types'
import { ExecutionTerminatedError } from './types'
import { resolveParams, resolveNodeRefs, buildNodeContext, parseInputAsArray, evaluateBranches, resolveNodeParams } from './helpers'

/**
 * 各节点类型的执行逻辑，由 monitoredExecutor.ts 中的主类调用以分散职责。
 *
 * executeMonitoredNode — 带自动重试的节点执行入口（由 LangGraph node 函数调用）
 * executeNode          — 按 node.type 分发到对应的 execute* 函数
 * executeSkill/Branch/… — 各节点类型的具体实现
 */

// ============================================================
//  带自动重试的节点执行入口
// ============================================================

export async function executeMonitoredNode(
  deps: NodeExecutorDeps,
  ctx: ExecCtx,
): Promise<Record<string, any>> {
  const startTime = Date.now()
  const retryCount = Math.max(0, ctx.node.data.config?.retryCount ?? 0)
  const retryDelay = Math.max(0, ctx.node.data.config?.retryDelay ?? 1000)
  const backoff = ctx.node.data.config?.retryBackoff ?? 'fixed'

  const execState = deps.executionStates.get(ctx.executionId)
  if (retryCount > 0 && execState) {
    execState.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `节点已配置重试: 最多 ${retryCount} 次, 间隔 ${retryDelay}ms, 退避策略: ${backoff}`,
      nodeId: ctx.node.id,
    })
  }

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    // 每次重试前检查执行是否已被终止
    if (deps.executionStates.get(ctx.executionId)?.status !== 'running') {
      throw new ExecutionTerminatedError()
    }

    if (attempt > 0) {
      const delay = backoff === 'exponential'
        ? retryDelay * Math.pow(2, attempt - 1)
        : retryDelay

      if (execState) {
        execState.logs.push({
          timestamp: new Date(),
          level: 'warn',
          message: `第 ${attempt}/${retryCount} 次重试 (等待 ${delay}ms)...`,
          nodeId: ctx.node.id,
        })
      }
      await Promise.race([
        new Promise(resolve => setTimeout(resolve, delay)),
        execState?.abortController?.signal
          ? new Promise((_, reject) => {
              const onAbort = () => reject(new ExecutionTerminatedError())
              execState!.abortController!.signal.addEventListener('abort', onAbort, { once: true })
            })
          : Promise.resolve(),
      ])
    }

    try {
      const result = await executeNode(deps, ctx)

      if ((result as any).error || (result as any).metadata?.error) {
        if (attempt < retryCount) continue
        const endTime = Date.now()
        return {
          nodeId: ctx.node.id,
          ...result,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          duration: endTime - startTime,
          status: 'failed',
        }
      }

      const endTime = Date.now()
      return {
        nodeId: ctx.node.id,
        ...result,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: endTime - startTime,
        status: 'completed',
      }
    } catch (error) {
      if (error instanceof ExecutionTerminatedError) throw error
      if (attempt < retryCount) continue

      const endTime = Date.now()
      return {
        output: ctx.input,
        error: error instanceof Error ? error.message : '节点执行失败',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: endTime - startTime,
        status: 'failed',
        metadata: { nodeId: ctx.node.id, type: ctx.node.type, label: ctx.node.data?.label },
      }
    }
  }

  throw new Error('unreachable')
}

/**
 * 按 node.type 分发到对应的节点执行器。
 * 不处理重试，由 executeMonitoredNode 包装。
 */
// --- 节点分发 ---
async function executeNode(deps: NodeExecutorDeps, ctx: ExecCtx): Promise<Record<string, any>> {
  const { node } = ctx
  switch (node.type) {
    case 'start': return { output: ctx.input, metadata: { nodeId: node.id, type: 'start', label: node.data?.label } }
    case 'skill': return await executeSkill(deps, ctx)
    case 'branch': return await executeBranch(deps, ctx)
    case 'api': return await executeApi(deps, ctx)
    case 'llm': return await executeLLM(deps, ctx)
    case 'agent': return await executeAgent(deps, ctx)
    case 'subWorkflow': return await executeSubWorkflow(deps, ctx)
    case 'cli': return await executeCli(deps, ctx)
    case 'mcp': return await executeMCP(deps, ctx)
    case 'knowledge': return await executeKnowledge(deps, ctx)
    case 'code': return await executeCode(deps, ctx)
    case 'sleep': return await executeSleep(ctx)
    case 'loop': return await executeLoop(deps, ctx)
    case 'transform': return await executeTransform(ctx)
    case 'split': return await executeSplit(deps, ctx)
    case 'if': return await executeIf(deps, ctx)
    case 'merge': return executeMerge(ctx)
    case 'catch': return executeCatch(ctx)
    case 'text': return await executeText(deps, ctx)
    case 'variable': return await executeVariable(deps, ctx)
    case 'database': return await executeDatabase(deps, ctx)
    case 'end': return { output: ctx.input, metadata: { nodeId: node.id, type: 'end', label: node.data?.label } }
    default: return { output: ctx.input, metadata: { nodeId: node.id, type: 'unknown', label: node.data?.label } }
  }
}

// ============================================================
//  各节点类型执行器（被 executeNode 分发）
// ============================================================

// --- 技能 ---
async function executeSkill(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, llmConfig, conversationHistory, attachments } = ctx
  if (!node.data.config?.skillId) {
    return { output: input, metadata: { nodeId: node.id, type: 'skill', error: '未配置技能ID' } }
  }
  try {
    const skill = await SkillModel.findByPk(node.data.config.skillId)
    if (!skill) {
      return { output: input, metadata: { nodeId: node.id, label: node.data?.label, type: 'skill', error: `技能不存在: ${node.data.config.skillId}` } }
    }
    const skillContent = `${skill.name}\n\n描述: ${skill.description}\n\n内容: ${skill.content}`
    const prompt = `${skillContent}\n\n当前用户输入: ${input}\n\n请根据以上技能内容处理用户输入，只返回处理后的结果，不要重复用户输入的内容。如果只是传递信息，请简洁地总结或转换，避免重复。`
    const result = await callLLMWithTracking(ctx.executionId, ctx.node.id, llmConfig.provider, llmConfig.model, prompt, llmConfig, conversationHistory, [], undefined, attachments)
    return { output: result, metadata: { nodeId: node.id, label: node.data?.label, type: 'skill', skillId: node.data.config.skillId, skillName: skill.name } }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '技能执行失败'
    return { output: errorMsg, metadata: { nodeId: node.id, label: node.data?.label, type: 'skill', error: errorMsg } }
  }
}

// --- 分支 ---
async function executeBranch(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, llmConfig, params, nodeResults, workflowEnvVars, variables } = ctx
  if (!node.data.config?.branches?.length) {
    return { output: input, metadata: { nodeId: node.id, type: 'branch', branch: null } }
  }
  try {
    const resolvedBranches = node.data.config.branches.map((b: any) => ({
      ...b,
      condition: resolveParams(b.condition || '', input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache),
    }))
    const branchId = await evaluateBranches(resolvedBranches, input, llmConfig)
    return {
      output: `条件评估成功，满足条件id: ${branchId}`,
      metadata: { nodeId: node.id, label: node.data?.label, type: 'branch', branch: branchId === 'null' ? null : branchId },
    }
  } catch (error) {
    return { output: '条件评估失败', metadata: { nodeId: node.id, label: node.data?.label, type: 'branch', branch: null, error: error instanceof Error ? error.message : '条件评估失败' } }
  }
}

// --- 条件 ---
async function executeIf(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, params, nodeResults, workflowEnvVars, variables } = ctx
  const branches: { id: string; condition: string }[] = node.data.config?.branches || []
  if (branches.length === 0) {
    return { output: input, metadata: { nodeId: node.id, type: 'if', label: node.data?.label, branch: null } }
  }
  try {
    for (const b of branches) {
      if (!b.condition.trim()) continue
      const resolved = resolveParams(b.condition, input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache)
      const fn = new Function('$input', '$params', `return Boolean(${resolved})`)
      const result = fn(input, params || {})
      if (result) {
        return { output: input, metadata: { nodeId: node.id, label: node.data?.label, type: 'if', branch: b.id } }
      }
    }
    return { output: input, metadata: { nodeId: node.id, label: node.data?.label, type: 'if', branch: null } }
  } catch (error) {
    return { output: input, metadata: { nodeId: node.id, label: node.data?.label, type: 'if', branch: null, error: error instanceof Error ? error.message : '条件执行失败' } }
  }
}

// --- API 调用 ---
async function executeApi(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, llmConfig, params, nodeResults, workflowEnvVars, variables } = ctx
  if (!node.data.config?.apiConfig?.url) {
    return { output: input, metadata: { nodeId: node.id, type: 'api', error: '未配置API URL' } }
  }
  try {
    const apiConfig = node.data.config.apiConfig
    const resolvedUrl = resolveParams(apiConfig.url || '', input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache)
    const resolvedHeaders = apiConfig.headers ? resolveParams(apiConfig.headers, input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache) : apiConfig.headers
    const resolvedBody = apiConfig.body ? resolveParams(apiConfig.body, input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache) : apiConfig.body
    const resolvedApiConfig = { ...apiConfig, url: resolvedUrl, headers: resolvedHeaders, body: resolvedBody }

    const apiResult = await executeApiCall(resolvedApiConfig)
    const processPrompt = `请处理以下API调用结果，并结合原始输入给出最终答案:\n\n原始输入: ${input}\n\nAPI结果: ${JSON.stringify(apiResult, null, 2)}`
    const result = await callLLMWithTracking(ctx.executionId, ctx.node.id, llmConfig.provider, llmConfig.model, processPrompt, llmConfig)

    return { output: result, metadata: { nodeId: node.id, label: node.data?.label, type: 'api', apiUrl: node.data.config.apiConfig.url, apiResult } }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'API调用失败'
    return { output: errorMsg, metadata: { nodeId: node.id, label: node.data?.label, type: 'api', error: errorMsg } }
  }
}

// --- 知识库 ---
async function executeKnowledge(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, params, nodeResults, workflowEnvVars, variables } = ctx
  const kbId = node.data.config?.knowledgeBaseId
  if (!kbId) {
    return { output: '未配置知识库', metadata: { nodeId: node.id, type: 'knowledge', label: node.data?.label, error: '未配置知识库' } }
  }
  const rawQuery = node.data.config?.query || '{{$input}}'
  const query = resolveParams(rawQuery, input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache)
  if (!query.trim()) {
    return { output: '', metadata: { nodeId: node.id, type: 'knowledge', label: node.data?.label } }
  }
  try {
    const topK = node.data.config?.topK || undefined
    const context = await retrieveContext(kbId, query, topK)
    return { output: context || '未检索到相关内容', metadata: { nodeId: node.id, type: 'knowledge', label: node.data?.label, kbId, query, topK } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { output: `检索失败: ${msg}`, metadata: { nodeId: node.id, type: 'knowledge', label: node.data?.label, error: msg } }
  }
}

// --- 数据库 ---
async function executeDatabase(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, params, nodeResults, workflowEnvVars, variables } = ctx
  const cfg: DatabaseConfig = {
    dbType: (node.data.config?.dbType as DatabaseConfig['dbType']) || 'sqlite',
    connectionConfig: resolveParams(node.data.config?.connectionConfig || '', input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache),
    sql: resolveParams(node.data.config?.sql || '', input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache),
    collection: node.data.config?.collection as string | undefined,
    operation: node.data.config?.operation as string | undefined,
    query: resolveParams(node.data.config?.query || '', input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache),
    mode: (node.data.config?.mode as DatabaseConfig['mode']) || 'query',
    timeout: (node.data.config?.timeout as number) || 30,
  }
  try {
    const { executeDatabaseQuery } = await import('../database')
    const result = await executeDatabaseQuery(cfg)
    return { output: result, metadata: { nodeId: node.id, type: 'database', label: node.data?.label, dbType: cfg.dbType, mode: cfg.mode } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { output: `数据库查询失败: ${msg}`, metadata: { nodeId: node.id, type: 'database', label: node.data?.label, error: msg } }
  }
}

// --- 变量 ---
async function executeVariable(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, params, nodeResults, workflowEnvVars, variables } = ctx
  const mode = node.data.config?.mode || 'set'
  const items: { name: string; value: string }[] = node.data.config?.items || []

  if (mode === 'set') {
    const newVars: Record<string, any> = { ...variables }
    const resolved: Record<string, string> = {}
    for (const item of items) {
      if (!item.name) continue
      const val = resolveParams(item.value || '', input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache)
      newVars[item.name] = val
      resolved[item.name] = val
    }
    const execState = deps.executionStates.get(ctx.executionId)
    if (execState) execState.variables = newVars
    return {
      output: Object.keys(resolved).length > 0 ? JSON.stringify(resolved, null, 2) : input,
      metadata: { nodeId: node.id, type: 'variable', label: node.data?.label, mode: 'set', variables: resolved },
    }
  } else {
    const result: Record<string, any> = {}
    for (const item of items) {
      if (!item.name) continue
      result[item.name] = variables[item.name] !== undefined ? variables[item.name] : ''
    }
    return {
      output: Object.keys(result).length > 0 ? JSON.stringify(result, null, 2) : input,
      metadata: { nodeId: node.id, type: 'variable', label: node.data?.label, mode: 'get', variables: result },
    }
  }
}

// --- MCP 工具 ---
async function executeMCP(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, params, nodeResults, workflowEnvVars, variables } = ctx
  const mcpConfig = node.data.config?.mcpConfig
  if (!mcpConfig?.serverId || !mcpConfig?.toolName) {
    return { output: input, metadata: { nodeId: node.id, type: 'mcp', error: '未配置 MCP 服务器或工具', label: node.data?.label } }
  }
  try {
    const args = mcpConfig.params || {}
    const resolvedArgs: Record<string, any> = {}
    for (const [key, value] of Object.entries(args)) {
      resolvedArgs[key] = typeof value === 'string' ? resolveParams(value, input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache) : value
    }
    const mcpResult = await mcpConnectionManager.callTool(mcpConfig.serverId, mcpConfig.toolName, resolvedArgs)
    return { output: mcpResult, metadata: { nodeId: node.id, label: node.data?.label, type: 'mcp', serverName: mcpConfig.serverName || mcpConfig.serverId, toolName: mcpConfig.toolName, mcpResult } }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'MCP 工具调用失败'
    return { output: errorMsg, metadata: { nodeId: node.id, label: node.data?.label, type: 'mcp', error: errorMsg } }
  }
}

// --- Agent ---
async function executeAgent(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { executionId, node, input, llmConfig, attachments } = ctx
  if (!node.data.config?.agentId) {
    return { output: input, metadata: { nodeId: node.id, type: 'agent', error: '未配置Agent ID', label: node.data?.label } }
  }
  const targetAgentId = node.data.config.agentId

  if (deps.agentCallStack.has(targetAgentId)) {
    const chain = [...deps.agentCallStack, targetAgentId].join(' → ')
    console.warn('[循环检测] Agent:', chain)
    return { output: input, metadata: { nodeId: node.id, type: 'agent', error: '检测到循环调用(' + chain + ')', agentId: targetAgentId } }
  }

  try {
    const agent = await AgentModel.findByPk(targetAgentId)
    if (!agent) {
      return { output: input, metadata: { nodeId: node.id, type: 'agent', error: 'Agent不存在', agentId: node.data.config.agentId } }
    }
    if (!agent.workflowId) {
      return { output: input, metadata: { nodeId: node.id, type: 'agent', error: 'Agent未绑定工作流', agentId: agent.id } }
    }
    const workflow = await WorkflowModel.findByPk(agent.workflowId)
    if (!workflow) {
      return { output: input, metadata: { nodeId: node.id, type: 'agent', error: '工作流不存在', workflowId: agent.workflowId } }
    }
    const workflowObj: Workflow = {
      id: workflow.id, name: workflow.name, description: workflow.description,
      nodes: safeJsonParse(workflow.nodes, []), edges: safeJsonParse(workflow.edges, []),
      envVars: safeJsonParse(workflow.envVars, {}), createdAt: workflow.createdAt, updatedAt: workflow.updatedAt,
    }

    const subExecutionId = `${executionId}:agent:${node.id}`
    const parentState = deps.executionStates.get(executionId)
    const inheritedAutoApprove = parentState?.autoApprovedToolTypes
      ? new Set(parentState.autoApprovedToolTypes) : new Set<string>()

    deps.executionStates.set(subExecutionId, {
      executionId: subExecutionId, workflow: workflowObj, status: 'running', startTime: new Date(),
      nodeResults: new Map(), progress: 0, logs: [], agentId: agent.id, threadId: undefined,
      autoApprovedToolTypes: inheritedAutoApprove, pendingApproval: null, attachments: undefined,
    })

    deps.agentCallStack.add(targetAgentId)
    try {
      const subGraph = await deps.buildMonitoredLangGraph(subExecutionId, workflowObj, llmConfig)
      const result = await deps.executeMonitoredLangGraph(subGraph, input, subExecutionId, subExecutionId, attachments)
      return { output: result, metadata: { nodeId: node.id, label: node.data?.label, type: 'agent', agentId: agent.id, agentName: agent.name, workflowName: workflow.name } }
    } finally {
      deps.executionStates.delete(subExecutionId)
      deps.agentCallStack.delete(targetAgentId)
    }
  } catch (error) {
    const subState = deps.executionStates.get(`${executionId}:agent:${node.id}`)
    if (subState?.status !== 'running') throw error
    const errorMsg = error instanceof Error ? error.message : 'Agent执行失败'
    return { output: errorMsg, metadata: { nodeId: node.id, type: 'agent', error: errorMsg, agentId: node.data.config?.agentId } }
  }
}

// --- 子工作流 ---
async function executeSubWorkflow(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { executionId, node, input, llmConfig, attachments, params: parentParams, nodeResults, workflowEnvVars, variables } = ctx
  const workflowId = node.data.config?.workflowId as string | undefined
  if (!workflowId) {
    return { output: input, metadata: { nodeId: node.id, type: 'subWorkflow', error: '未配置工作流ID', label: node.data?.label } }
  }

  if (deps.workflowCallStack.has(workflowId)) {
    const chain = [...deps.workflowCallStack, workflowId].join(' → ')
    console.warn('[循环检测] Workflow:', chain)
    return { output: input, metadata: { nodeId: node.id, type: 'subWorkflow', error: '检测到循环调用(' + chain + ')', workflowId } }
  }

  try {
    const workflow = await WorkflowModel.findByPk(workflowId)
    if (!workflow) {
      return { output: input, metadata: { nodeId: node.id, type: 'subWorkflow', error: '工作流不存在', workflowId } }
    }
    const workflowObj: Workflow = {
      id: workflow.id, name: workflow.name, description: workflow.description,
      nodes: safeJsonParse(workflow.nodes, []), edges: safeJsonParse(workflow.edges, []),
      envVars: safeJsonParse(workflow.envVars, {}), createdAt: workflow.createdAt, updatedAt: workflow.updatedAt,
    }
    if (!workflowObj.nodes || workflowObj.nodes.length === 0) {
      return { output: input, metadata: { nodeId: node.id, type: 'subWorkflow', error: '工作流为空，没有任何节点', workflowId, workflowName: workflow.name } }
    }

    const subExecutionId = `${executionId}:workflow:${node.id}`
    const parentState = deps.executionStates.get(executionId)
    const inheritedAutoApprove = parentState?.autoApprovedToolTypes
      ? new Set(parentState.autoApprovedToolTypes) : new Set<string>()

    const resolvedChildParams = resolveNodeParams(
      node.data.config?.params, input, parentParams, nodeResults, workflowEnvVars, variables, deps.envVarsCache,
    )

    deps.executionStates.set(subExecutionId, {
      executionId: subExecutionId, workflow: workflowObj, status: 'running', startTime: new Date(),
      nodeResults: new Map(), progress: 0, logs: [], agentId: undefined, threadId: undefined,
      autoApprovedToolTypes: inheritedAutoApprove, pendingApproval: null, attachments: undefined,
      params: resolvedChildParams,
    })

    deps.workflowCallStack.add(workflowId)
    try {
      const subGraph = await deps.buildMonitoredLangGraph(subExecutionId, workflowObj, llmConfig)
      const result = await deps.executeMonitoredLangGraph(subGraph, input, subExecutionId, subExecutionId, attachments)
      return { output: result, metadata: { nodeId: node.id, label: node.data?.label, type: 'subWorkflow', workflowId: workflow.id, workflowName: workflow.name } }
    } finally {
      deps.executionStates.delete(subExecutionId)
      deps.workflowCallStack.delete(workflowId)
    }
  } catch (error) {
    const subState = deps.executionStates.get(`${executionId}:workflow:${node.id}`)
    if (subState?.status !== 'running') throw error
    const errorMsg = error instanceof Error ? error.message : '工作流执行失败'
    return { output: errorMsg, metadata: { nodeId: node.id, type: 'subWorkflow', error: errorMsg, workflowId } }
  }
}

// --- LLM ---
async function executeLLM(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { executionId, node, input, llmConfig: defaultLlmConfig, conversationHistory, attachments, params, nodeResults, workflowEnvVars, variables: workflowVars } = ctx
  let llmConfig = defaultLlmConfig
  try {
    const nodeLlmConfigId = node.data.config?.llmConfigId as string | undefined
    if (nodeLlmConfigId) {
      const dbConfig = await LLMConfigModel.findByPk(nodeLlmConfigId)
      if (dbConfig) {
        llmConfig = {
          provider: dbConfig.provider, apiKey: dbConfig.apiKey, model: dbConfig.model,
          baseUrl: dbConfig.baseUrl, temperature: dbConfig.temperature, maxTokens: dbConfig.maxTokens,
        }
      } else {
        console.warn(`[executeLLM] 节点 ${node.data?.label || node.id} 指定的 LLM 配置 ${nodeLlmConfigId} 不存在，使用全局活跃配置`)
      }
    }

    let promptTemplate = node.data.config?.prompt || ''
    const varDefs = node.data.config?.variables || []
    const variablesMap: Record<string, any> = {}
    varDefs.forEach((variable: any) => { variablesMap[variable.name] = variable.defaultValue || '' })
    Object.keys(variablesMap).forEach((key) => {
      promptTemplate = promptTemplate.replace(new RegExp(`{{${key}}}`, 'g'), variablesMap[key])
    })
    promptTemplate = resolveParams(promptTemplate, input, params, nodeResults, workflowEnvVars, workflowVars, deps.envVarsCache)

    const finalPrompt = promptTemplate ? `${promptTemplate}\n\n当前用户输入: ${input}` : input
    const enabledTools = node.data.config?.enabledTools || []

    // RAG
    let promptWithRag = finalPrompt
    const { enableKnowledgeBase, knowledgeBaseId } = node.data.config || {}
    if (enableKnowledgeBase && knowledgeBaseId) {
      try {
        const ragContext = await retrieveContext(knowledgeBaseId, input)
        if (ragContext) promptWithRag = `【知识库参考资料】\n${ragContext}\n\n---\n\n${finalPrompt}`
      } catch (err) { console.error('知识库检索失败:', err) }
    }

    // Skills
    let promptWithSkills = promptWithRag
    let allEnabledTools = enabledTools
    const skillIds = node.data.config?.skillIds as string[] | undefined
    if (skillIds && skillIds.length > 0) {
      const { skillsContext, enabledTools: updatedTools } = await buildSkillsContext(skillIds, enabledTools)
      promptWithSkills = `${skillsContext}\n\n---\n\n${promptWithRag}`
      allEnabledTools = updatedTools
    }

    // HITL
    const hasDangerousTools = allEnabledTools.some((t: string) => DANGEROUS_TOOLS.includes(t))
    const options: CallLLMOptions = hasDangerousTools
      ? {
          approvalCallback: async (request: HITLRequest): Promise<HITLResponse> => {
            const execState = deps.executionStates.get(executionId)
            if (!execState || execState.status !== 'running') {
              throw new ExecutionTerminatedError()
            }
            const autoApproved: string[] = []
            const needApproval: { name: string; args: Record<string, any>; description: string }[] = []
            for (const action of request.actionRequests) {
              if (execState.autoApprovedToolTypes.has(action.name)) autoApproved.push(action.name)
              else needApproval.push(action)
            }
            if (needApproval.length === 0) {
              return { decisions: request.actionRequests.map(() => ({ type: 'approve' })) }
            }

            const approvalPromise = new Promise<HITLResponse>((resolve, reject) => {
              execState.pendingApproval = { resolve, reject, request }
            })
            deps.broadcastToSSEClients(executionId, {
              type: 'tool_approval_required', executionId,
              actionRequests: needApproval,
              reviewConfigs: request.reviewConfigs.filter(rc => needApproval.some(a => a.name === rc.actionName)),
            })

            const userResponse = await approvalPromise
            const decisions: HITLDecision[] = request.actionRequests.map((action) => {
              if (execState.autoApprovedToolTypes.has(action.name)) return { type: 'approve' }
              const userDecision = userResponse.decisions.find(d => d.type !== 'approve' || needApproval.some(a => a.name === action.name))
              return userDecision || { type: 'approve' }
            })
            return { decisions }
          },
        }
      : {}

    const result = await callLLMWithTracking(executionId, node.id, llmConfig.provider, llmConfig.model, promptWithSkills, llmConfig, conversationHistory, allEnabledTools, { ...options, cache: node.data.config?.enableCache ?? false }, attachments)
    return { output: result, metadata: { nodeId: node.id, label: node.data?.label, type: 'llm', prompt: promptTemplate, variables: variablesMap } }
  } catch (error) {
    if (error instanceof ExecutionTerminatedError) throw error
    const errorMsg = error instanceof Error ? error.message : 'LLM调用失败'
    return { output: errorMsg, metadata: { nodeId: node.id, label: node.data?.label, type: 'llm', error: errorMsg } }
  }
}

// --- CLI ---
async function executeCli(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, llmConfig, params, nodeResults, workflowEnvVars, variables } = ctx
  const cliConfig = node.data.config?.cliConfig
  const templateId = cliConfig?.templateId || 'custom'

  try {
    const resolvedWorkingDir = cliConfig?.workingDirectory
      ? resolveParams(cliConfig.workingDirectory, input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache)
      : cliConfig?.workingDirectory

    let result: { stdout: string; stderr: string; exitCode: number | null }
    let executedCommand: string

    if (templateId !== 'custom') {
      const cliVariables = cliConfig?.templateVariables || {}
      if (cliVariables.content === '{{$input}}') cliVariables.content = input
      result = await executeCliTemplate(templateId, cliVariables, {
        workingDirectory: resolvedWorkingDir, timeout: cliConfig?.timeout,
      })
      executedCommand = `[预设模板: ${templateId}]`
    } else {
      if (!cliConfig?.command) {
        return { output: input, metadata: { nodeId: node.id, type: 'cli', error: '未配置命令', label: node.data?.label } }
      }
      let resolvedCommand = cliConfig.command
      const cliVariables = cliConfig.templateVariables || {}
      Object.entries(cliVariables).forEach(([key, value]) => {
        resolvedCommand = resolvedCommand.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
      })
      resolvedCommand = resolveParams(resolvedCommand, input, params, nodeResults, workflowEnvVars, variables, deps.envVarsCache)
      result = await executeCliCommand({ command: resolvedCommand, workingDirectory: resolvedWorkingDir, timeout: cliConfig.timeout })
      executedCommand = resolvedCommand
    }

    const rawOutput = result.stderr ? `${result.stdout}\n[stderr]: ${result.stderr}` : result.stdout

    if (result.exitCode !== 0) {
      return { output: rawOutput, metadata: { nodeId: node.id, label: node.data?.label, type: 'cli', command: executedCommand, exitCode: result.exitCode, error: `命令退出码: ${result.exitCode}`, outputMode: cliConfig?.outputMode } }
    }

    if (cliConfig?.outputMode === 'llm_process') {
      const processPrompt = cliConfig.llmProcessPrompt
        ? cliConfig.llmProcessPrompt.replace(/\{\{output\}\}/g, rawOutput)
        : `请分析以下命令输出并提取关键信息:\n\n${rawOutput}`
      const llmResult = await callLLMWithTracking(ctx.executionId, ctx.node.id, llmConfig.provider, llmConfig.model, processPrompt, llmConfig)
      return { output: llmResult, metadata: { nodeId: node.id, label: node.data?.label, type: 'cli', command: executedCommand, rawOutput, exitCode: result.exitCode, outputMode: 'llm_process' } }
    }

    return { output: rawOutput, metadata: { nodeId: node.id, label: node.data?.label, type: 'cli', command: executedCommand, exitCode: result.exitCode, outputMode: 'raw' } }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'CLI命令执行失败'
    return { output: errorMsg, metadata: { nodeId: node.id, label: node.data?.label, type: 'cli', error: errorMsg } }
  }
}

// --- 错误捕获 ---
function executeCatch(ctx: ExecCtx) {
  const { node, input, nodeResults } = ctx
  let errorMsg = '未知错误'
  let failedNodeLabel = ''
  if (nodeResults) {
    for (const [, result] of nodeResults) {
      if (result?.status === 'failed') {
        errorMsg = result.error || result.metadata?.error || '节点执行失败'
        failedNodeLabel = result.metadata?.label || result.metadata?.nodeId || ''
      }
    }
  }
  return {
    output: `[${failedNodeLabel} 执行失败] ${errorMsg}\n\n${input}`,
    metadata: { nodeId: node.id, label: node.data?.label, type: 'catch', upstreamError: errorMsg, upstreamNodeLabel: failedNodeLabel },
  }
}

// --- 合并 ---
function executeMerge(ctx: ExecCtx) {
  const { node, nodeResults, node2Sources } = ctx
  const preds = node2Sources.get(node.id) || []
  const rawSep = node.data.config?.separator || '\\n---\\n'
  const sep = rawSep.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
  const parts: string[] = []
  for (const pid of preds) {
    const r = nodeResults?.get(pid)
    if (r?.output) parts.push(r.output)
  }
  return { output: parts.join(sep), metadata: { nodeId: node.id, label: node.data?.label, type: 'merge', mergedFrom: preds } }
}

// --- 转换 ---
async function executeTransform(ctx: ExecCtx) {
  const { node, input } = ctx
  const operation = node.data.config?.operation || 'jsonpath'
  const expression = node.data.config?.expression || ''

  if (!input && input !== '') {
    return { output: '', metadata: { nodeId: node.id, type: 'transform', label: node.data?.label } }
  }

  try {
    switch (operation) {
      case 'jsonpath': {
        if (!expression.trim()) return { output: input, metadata: { nodeId: node.id, type: 'transform', label: node.data?.label } }
        const parsed = JSON.parse(input)
        const tokens: string[] = []
        const tokenRegex = /\.(\w+)|\[(\d+)\]/g
        const firstMatch = expression.match(/^(\w+)/)
        if (firstMatch) tokens.push(firstMatch[1])
        let m: RegExpExecArray | null
        while ((m = tokenRegex.exec(expression)) !== null) {
          if (m[1] !== undefined) tokens.push(m[1])
          if (m[2] !== undefined) tokens.push('$idx$' + m[2])
        }
        let result: any = parsed
        for (const token of tokens) {
          if (result == null) break
          const idxMatch = token.match(/^\$idx\$(\d+)$/)
          if (idxMatch) result = result[parseInt(idxMatch[1])]
          else result = result[token]
        }
        const output = result !== undefined ? (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)) : ''
        return { output, metadata: { nodeId: node.id, type: 'transform', operation, expression, label: node.data?.label } }
      }
      case 'parse-json': {
        const parsed = JSON.parse(input)
        return { output: JSON.stringify(parsed, null, 2), metadata: { nodeId: node.id, type: 'transform', operation, label: node.data?.label } }
      }
      case 'to-json': {
        return { output: JSON.stringify(input), metadata: { nodeId: node.id, type: 'transform', operation, label: node.data?.label } }
      }
      default:
        return { output: input, metadata: { nodeId: node.id, type: 'transform', error: '未知操作', label: node.data?.label } }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '转换失败'
    return { output: input, metadata: { nodeId: node.id, type: 'transform', error: errorMsg, label: node.data?.label } }
  }
}

// --- 拆分 ---
async function executeSplit(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { executionId, node, input, llmConfig, params: parentParams, nodeResults, workflowEnvVars, variables } = ctx
  const workflowId = node.data.config?.workflowId as string | undefined
  if (!workflowId) {
    return { output: input, metadata: { nodeId: node.id, type: 'split', error: '未配置工作流ID', label: node.data?.label } }
  }

  const maxItems = Math.min(Math.max(1, node.data.config?.maxItems || 100), 1000)

  try {
    const workflow = await WorkflowModel.findByPk(workflowId)
    if (!workflow) {
      return { output: input, metadata: { nodeId: node.id, type: 'split', error: '工作流不存在', label: node.data?.label } }
    }
    const workflowObj: Workflow = {
      id: workflow.id, name: workflow.name, description: workflow.description,
      nodes: safeJsonParse(workflow.nodes, []), edges: safeJsonParse(workflow.edges, []),
      envVars: safeJsonParse(workflow.envVars, {}), createdAt: workflow.createdAt, updatedAt: workflow.updatedAt,
    }

    const parentState = deps.executionStates.get(executionId)
    const inheritedAutoApprove = parentState?.autoApprovedToolTypes
      ? new Set(parentState.autoApprovedToolTypes) : new Set<string>()

    const items = parseInputAsArray(input)
    const actualItems = Math.min(items.length, maxItems)
    const results: string[] = []

    for (let i = 0; i < actualItems; i++) {
      if (parentState?.status === 'paused' || parentState?.status === 'completed') break

      const subExecutionId = executionId + ':split:' + node.id + ':' + i
      const resolvedParams = resolveNodeParams(
        node.data.config?.params, input, parentParams, nodeResults, workflowEnvVars, variables, deps.envVarsCache,
        { _index: i },
      )

      deps.executionStates.set(subExecutionId, {
        executionId: subExecutionId, workflow: workflowObj, status: 'running', startTime: new Date(),
        nodeResults: new Map(), progress: 0, logs: [],
        autoApprovedToolTypes: inheritedAutoApprove, pendingApproval: null, attachments: undefined,
        params: resolvedParams,
      })

      try {
        const subGraph = await deps.buildMonitoredLangGraph(subExecutionId, workflowObj, llmConfig)
        const subResult = await deps.executeMonitoredLangGraph(subGraph, String(items[i]), subExecutionId, subExecutionId)
        results.push(subResult)
        deps.executionStates.delete(subExecutionId)
      } catch (error) {
        deps.executionStates.delete(subExecutionId)
        results.push('[拆分 ' + i + ' 失败] ' + (error instanceof Error ? error.message : '未知错误'))
      }
    }

    return { output: results.join('\n'), metadata: { nodeId: node.id, label: node.data?.label, type: 'split', items: results.length, total: items.length, workflowId, workflowName: workflow.name } }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '拆分执行失败'
    return { output: errorMsg, metadata: { nodeId: node.id, type: 'split', error: errorMsg, label: node.data?.label } }
  }
}

// --- 文本 ---
async function executeText(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, params, nodeResults, workflowEnvVars, variables: workflowVars } = ctx
  let textTemplate = node.data.config?.text || ''
  const varDefs = node.data.config?.variables || []

  const variablesMap: Record<string, any> = {}
  varDefs.forEach((variable: any) => { variablesMap[variable.name] = variable.defaultValue || '' })
  Object.keys(variablesMap).forEach((key) => {
    textTemplate = textTemplate.replace(new RegExp(`{{${key}}}`, 'g'), variablesMap[key])
  })

  textTemplate = resolveParams(textTemplate, input, params, nodeResults, workflowEnvVars, workflowVars, deps.envVarsCache)
  return { output: textTemplate, metadata: { nodeId: node.id, label: node.data?.label, type: 'text' } }
}

// --- 延时 ---
async function executeSleep(ctx: ExecCtx) {
  const { node, input } = ctx
  const sleepMs = Math.max(0, node.data.config?.sleepMs ?? 1000)
  if (sleepMs > 0) await new Promise(resolve => setTimeout(resolve, sleepMs))
  return { output: input, metadata: { nodeId: node.id, label: node.data?.label, type: 'sleep', sleepMs } }
}

// --- 代码 ---
async function executeCode(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { node, input, params, nodeResults } = ctx
  const code = node.data.config?.code || ''
  if (!code.trim()) {
    return { output: input, metadata: { nodeId: node.id, type: 'code', label: node.data?.label, error: '代码为空' } }
  }
  try {
    const resolvedCode = resolveNodeRefs(code, nodeResults)
    const $input = input
    const $params = params || {}
    const $nodes = buildNodeContext(nodeResults)
    const fn = new Function('$input', '$params', '$nodes', resolvedCode)
    const result = await fn($input, $params, $nodes)
    return { output: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result), metadata: { nodeId: node.id, label: node.data?.label, type: 'code', returnType: typeof result } }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '代码执行失败'
    return { output: errorMsg, metadata: { nodeId: node.id, label: node.data?.label, type: 'code', error: errorMsg } }
  }
}

// --- 循环 ---
async function executeLoop(deps: NodeExecutorDeps, ctx: ExecCtx) {
  const { executionId, node, input, llmConfig } = ctx
  const workflowId = node.data.config?.workflowId as string | undefined
  if (!workflowId) {
    return { output: input, metadata: { nodeId: node.id, type: 'loop', error: '未配置工作流ID', label: node.data?.label } }
  }

  const maxIter = Math.min(Math.max(1, node.data.config?.maxIterations || 100), 1000)
  const conditionText = (node.data.config?.condition || '').trim()

  try {
    const workflow = await WorkflowModel.findByPk(workflowId)
    if (!workflow) {
      return { output: input, metadata: { nodeId: node.id, type: 'loop', error: '工作流不存在', workflowId, label: node.data?.label } }
    }
    const workflowObj: Workflow = {
      id: workflow.id, name: workflow.name, description: workflow.description,
      nodes: safeJsonParse(workflow.nodes, []), edges: safeJsonParse(workflow.edges, []),
      envVars: safeJsonParse(workflow.envVars, {}), createdAt: workflow.createdAt, updatedAt: workflow.updatedAt,
    }

    const parentState = deps.executionStates.get(executionId)
    const inheritedAutoApprove = parentState?.autoApprovedToolTypes
      ? new Set(parentState.autoApprovedToolTypes) : new Set<string>()

    const results: string[] = []
    let currentInput = input

    for (let i = 0; i < maxIter; i++) {
      if (parentState?.status === 'paused' || parentState?.status === 'completed') break

      const subExecutionId = `${executionId}:loop:${node.id}:${i}`
      const loopParams = node.data.config?.params || {}
      const resolvedParams: Record<string, any> = { _index: i }
      for (const [k, v] of Object.entries(loopParams)) {
        resolvedParams[k] = typeof v === 'string' ? resolveParams(v, currentInput, { _index: i }, undefined, undefined, undefined, deps.envVarsCache) : v
      }

      deps.executionStates.set(subExecutionId, {
        executionId: subExecutionId, workflow: workflowObj, status: 'running', startTime: new Date(),
        nodeResults: new Map(), progress: 0, logs: [],
        autoApprovedToolTypes: inheritedAutoApprove, pendingApproval: null, attachments: undefined,
        params: resolvedParams,
      })

      let subOutput: string
      try {
        const subGraph = await deps.buildMonitoredLangGraph(subExecutionId, workflowObj, llmConfig)
        subOutput = await deps.executeMonitoredLangGraph(subGraph, currentInput, subExecutionId, subExecutionId)
        deps.executionStates.delete(subExecutionId)
      } catch (error) {
        deps.executionStates.delete(subExecutionId)
        subOutput = error instanceof Error ? error.message : '迭代执行失败'
      }

      results.push(subOutput)

      if (conditionText) {
        try {
          const fn = new Function('$input', `return Boolean(${conditionText})`)
          if (fn(subOutput)) break
        } catch { /* ignore */ }
      }

      currentInput = subOutput
    }

    return { output: results.join('\n'), metadata: { nodeId: node.id, label: node.data?.label, type: 'loop', iterations: results.length, maxIterations: maxIter, workflowId, workflowName: workflow.name } }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '循环执行失败'
    return { output: errorMsg, metadata: { nodeId: node.id, type: 'loop', error: errorMsg, label: node.data?.label } }
  }
}
