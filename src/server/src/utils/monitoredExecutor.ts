import { Workflow, LLMConfig, WorkflowNode, WorkflowBranch } from '../types'
import { SkillModel } from '../models'
import { StateGraph, Annotation, START, END, CompiledStateGraph, interrupt, Command } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import { callLLM } from './llm'
import { executeApiCall } from './api'
import { executeCliCommand, executeCliTemplate } from './cli'
import { HITLRequest, HITLResponse, HITLDecision, CallLLMOptions } from './hitl'
import { getUserDataDir, saveAttachmentToDisk } from './file'
import { AttachmentPayload, safeJsonParse, buildSkillsContext, buildHumanMessage } from './shared'
import { retrieveContext } from './knowledge'
import { v4 as uuidv4 } from 'uuid'
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { DB_FILENAME, DANGEROUS_TOOLS } from '../config'
import { LLMConfigModel, AgentModel, WorkflowModel, EnvVarModel } from '../models'
import { mcpConnectionManager } from '../mcp'
import { createFrontendActionTool, createGetContextTool } from '../tools/frontendTools'
import type { DatabaseConfig } from '../utils/database'

// 执行状态存储
interface ExecutionState {
  executionId: string
  workflow: Workflow
  status: 'running' | 'paused' | 'completed' | 'failed'
  startTime: Date
  endTime?: Date
  currentNodeId?: string
  nodeResults: Map<string, any>
  progress: number
  logs: Array<{
    timestamp: Date
    level: 'info' | 'warn' | 'error'
    message: string
    nodeId?: string
  }>
  agentId?: string
  threadId?: string
  compiledGraph?: CompiledStateGraph<any, any>
  autoApprovedToolTypes: Set<string>
  pendingApproval: { resolve: (response: HITLResponse) => void; reject: (error: Error) => void; request: HITLRequest } | null
  attachments?: AttachmentPayload[]
  abortController?: AbortController
  params?: Record<string, any>
  variables?: Record<string, any>
}
const checkpointer = SqliteSaver.fromConnString(getUserDataDir(DB_FILENAME));

/** 节点执行上下文，替代平铺参数传递给各 executor */
interface ExecCtx {
  executionId: string
  node: WorkflowNode
  input: string
  llmConfig: LLMConfig
  conversationHistory?: BaseMessage[]
  attachments?: AttachmentPayload[]
  params?: Record<string, any>
  nodeResults?: Map<string, any>
  workflowEnvVars?: Record<string, string>
  variables: Record<string, any>
  node2Sources: Map<string, string[]>
  node2Targets: Map<string, string[]>
}

// 手动终止时使用的专用错误，各 catch 块据此透传而非吞掉
/** 这些节点透传 input，不产生 AI message */
const PASSTHROUGH_NODES = new Set(['end', 'start', 'branch', 'if', 'merge'])

class ExecutionTerminatedError extends Error {
  constructor() { super('执行已被手动终止') }
}

// 带监控的LangGraph执行器
export class MonitoredLangGraphExecutor {
  private executionStates = new Map<string, ExecutionState>()
  private sseClients = new Map<string, any[]>() // executionId -> SSE clients
  // 线程级附件存储：跨对话累积图片等附件数据，供后续对话的callLLM注入
  private threadAttachments = new Map<string, AttachmentPayload[]>()
  // 线程级对话历史：用于直接对话（无工作流）模式下的上下文记忆
  private threadMessages = new Map<string, BaseMessage[]>()
  // DB 环境变量缓存（全局，不受执行生命周期影响）
  private envVarsCache: Record<string, string> | null = null
  
  // 当前正在执行的 agentId 栈，用于检测循环调用
  private agentCallStack = new Set<string>()
  // 当前正在执行的 workflowId 栈，用于检测工作流节点循环调用
  private workflowCallStack = new Set<string>()
  private WorkflowState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y)
    })
  })

  // 开始执行工作流
  async startExecution(
    workflow: Workflow,
    input: string,
    llmConfig: LLMConfig,
    agentId?: string,
    threadId?: string,
    attachments?: AttachmentPayload[],
    autoApprovedTools?: string[],
    params?: Record<string, any>
  ): Promise<string> {
    const executionId = uuidv4()
    const effectiveThreadId = threadId || executionId

    // 初始化执行状态
    const executionState: ExecutionState = {
      executionId,
      workflow,
      status: 'running',
      startTime: new Date(),
      nodeResults: new Map(),
      progress: 0,
      logs: [
        {
          timestamp: new Date(),
          level: 'info',
          message: `开始执行工作流: ${workflow.name}`
        }
      ],
      agentId,
      threadId: effectiveThreadId,
      autoApprovedToolTypes: new Set<string>(autoApprovedTools || []),
      pendingApproval: null,
      attachments: [], // 将在下方替换为filePath版本
      params,
      variables: {},
    }

    // 将附件数据保存到磁盘，释放内存中的base64字符串
    let diskAttachments: AttachmentPayload[] | undefined
    if (attachments && attachments.length > 0) {
      diskAttachments = []
      for (const att of attachments) {
        try {
          const filePath = await saveAttachmentToDisk(att)
          diskAttachments.push({
            id: att.id,
            name: att.name,
            type: att.type,
            size: att.size,
            category: att.category,
            filePath,
          })
        } catch (error) {
          console.error(`保存附件 ${att.name} 到磁盘失败:`, error)
          // 保存失败时保留原始dataUrl（降级处理）
          diskAttachments.push(att)
        }
      }
      executionState.attachments = diskAttachments
    }

    this.executionStates.set(executionId, executionState)

    // 线程级累积附件（轻量filePath引用，无base64）
    if (diskAttachments && diskAttachments.length > 0) {
      const threadKey = threadId || agentId || 'default-thread'
      const existing = this.threadAttachments.get(threadKey) || []
      const merged = [...existing]
      for (const att of diskAttachments) {
        if (!merged.some(e => e.id === att.id)) {
          merged.push(att)
        }
      }
      this.threadAttachments.set(threadKey, merged)
    }

    // 刷新环境变量缓存（每次执行重新加载，确保编辑后即时生效）
    this.envVarsCache = null
    await this.ensureEnvVarsLoaded()

    // 在后台执行工作流
    this.executeWorkflowAsync(executionId, workflow, input, llmConfig, effectiveThreadId, attachments)

    return executionId
  }


  async testNode(workflow: Workflow, nodeId: string, input: string, llmConfig: LLMConfig) {
    const node = workflow.nodes.find(n => n.id === nodeId)
    if (!node) return { output: '', duration: 0, status: 'failed', error: '节点不存在' }

    const startTime = Date.now()
    try {
      const result = await this.executeMonitoredNode({
        executionId: 'test-' + nodeId,
        node,
        input,
        llmConfig,
        nodeResults: new Map(),
        node2Sources: new Map(),
        node2Targets: new Map(),
        variables: {},
      })
      return {
        output: result.output || '',
        duration: result.duration || (Date.now() - startTime),
        status: result.status || 'completed',
        error: result.error,
        metadata: result.metadata,
      }
    } catch (error) {
      return {
        output: '',
        duration: Date.now() - startTime,
        status: 'failed',
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }


  // 异步执行工作流
  private async executeWorkflowAsync(
    executionId: string,
    workflow: Workflow,
    input: string,
    llmConfig: LLMConfig,
    threadId?: string,
    attachments?: AttachmentPayload[]
  ): Promise<void> {
    try {
      const state = this.executionStates.get(executionId)
      if (!state) {
        throw new Error('无效executionId')
      }
      const compiledGraph = await this.buildMonitoredLangGraph(executionId, workflow, llmConfig)
      state.compiledGraph = compiledGraph
      await this.executeMonitoredLangGraph(compiledGraph, input, executionId, threadId, attachments)
      // 检查是否被暂停，如果是则不更新为完成状态
      if (state.status === 'running') {
        // 更新执行状态为完成
        state.status = 'completed'
        state.endTime = new Date()
        state.progress = 100
        state.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: '工作流执行完成'
        })

        // 广播执行完成
        this.broadcastToSSEClients(executionId, {
          type: 'execution_complete',
          executionId,
          status: 'completed',
          progress: 100,
          endTime: state.endTime
        })
      }
    } catch (error) {
      // 检查是否被暂停，如果是则不更新为失败状态
      const state = this.executionStates.get(executionId)
      if (state && state.status === 'running') {
        // 更新执行状态为失败
        state.status = 'failed'
        state.endTime = new Date()
        state.logs.push({
          timestamp: new Date(),
          level: 'error',
          message: `工作流执行失败: ${error instanceof Error ? error.message : '未知错误'}`
        })

        // 广播执行失败
        this.broadcastToSSEClients(executionId, {
          type: 'execution_complete',
          executionId,
          status: 'failed',
          progress: state.progress,
          endTime: state.endTime,
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }
  }

  // 构建带监控的LangGraph
  private async buildMonitoredLangGraph(
    executionId: string,
    workflow: Workflow,
    llmConfig: LLMConfig
  ) {
    const nodes = workflow.nodes
    const edges = workflow.edges
    const branchMap: Record<string, WorkflowBranch> = {}
    const branch2Targets: Map<string, string[]> = new Map()
    const nodeResults = new Map<string, any>()
    const graph = new StateGraph(this.WorkflowState)
    // 过滤游离节点：找出有连接的节点
    const connectedNodes = new Set<string>()
    // 收集有连接的节点 + 构建前驱映射（合并一次遍历）
    const node2Sources = new Map<string, string[]>()
    // 收集有连接的节点 + 构建后驱映射（合并一次遍历）
    const node2Targets = new Map<string, string[]>()

    // 构建 Merge 前驱集：mergeNodeId → Set<前驱ID>
    const mergePredsMap = new Map<string, Set<string>>()

    const edgeGroups = new Map<string, { normal: string[]; error: string | null }>()

    for (const edge of edges) {
      if (edge.target) connectedNodes.add(edge.target)
      if (edge.source) connectedNodes.add(edge.source)

      if (edge.target && edge.source && edge.sourceType !== 'error') {
        if (!node2Sources.has(edge.target)) {
          node2Sources.set(edge.target, [])
        }
        if (!node2Targets.has(edge.source)) {
          node2Targets.set(edge.source, [])
        }
        node2Sources.get(edge.target)!.push(edge.source)
        node2Targets.get(edge.source)!.push(edge.target)
      }


      if (!edgeGroups.has(edge.source)) {
        edgeGroups.set(edge.source, { normal: [], error: null })
      }
      const g = edgeGroups.get(edge.source)!
      if (edge.sourceType === 'error') {
        g.error = edge.target
      } else {
        g.normal.push(edge.target)
      }
    }

    // 过滤掉游离节点，只保留有连接的节点
    const validNodes = nodes.filter((node) => connectedNodes.has(node.id))

    // 为每个工作流节点添加LangGraph节点
    for (const node of validNodes) {
      const ends = node2Targets.get(node.id)
      graph.addNode(
        node.id,
        async (state: any) => {
          let input: string
          const lastMessage = state.messages[state.messages.length - 1]
          if (typeof lastMessage?.content === 'string') {
            input = lastMessage.content
          } else if (Array.isArray(lastMessage?.content)) {
            input = lastMessage.content
              .filter((part: any) => part.type === 'text')
              .map((part: any) => part.text || '')
              .join('\n')
          } else {
            input = ''
          }
          const conversationHistory = state.messages || []
          const execState = this.executionStates.get(executionId)
          // 更新当前执行节点
          if (execState) {
            if (execState.status === 'paused') {
              await interrupt('用户手动暂停')
            }
            execState.currentNodeId = node.id
            execState.logs.push({
              timestamp: new Date(),
              level: 'info',
              message: `开始执行节点: ${node.data?.label || node.id}`,
              nodeId: node.id
            })
          }

          // 合并当前执行附件与线程级累积附件，确保后续对话也能获取图片数据
          const allAttachments = this.mergeThreadAttachments(execState)

          const nodeResult = await this.executeMonitoredNode({
            executionId,
            node,
            input,
            llmConfig,
            conversationHistory,
            attachments: allAttachments,
            params: execState?.params,
            nodeResults,
            node2Sources,
            node2Targets,
            workflowEnvVars: execState?.workflow?.envVars,
            variables: execState?.variables || {},
          })
          nodeResults.set(node.id, {
            ...nodeResult,
            input: typeof input === 'object' ? JSON.stringify(input) : String(input || ''),
            variables: execState?.variables ? { ...execState.variables } : undefined,
          })

          if (execState) {
            execState.nodeResults = nodeResults
            // 计算进度
            const completedNodes = Array.from(execState.nodeResults.values()).filter(
              (result) => result.status === 'completed'
            ).length
            execState.progress = Math.round((completedNodes / nodes.length) * 100)

            execState.logs.push({
              timestamp: new Date(),
              level: nodeResult.error ? 'error' : 'info',
              message: nodeResult.error
                ? `节点执行失败: ${nodeResult.error}`
                : `节点执行完成: ${node.data?.label || node.id}`,
              nodeId: node.id
            })

            // 广播SSE更新
            this.broadcastToSSEClients(executionId, {
              type: 'node_update',
              executionId,
              nodeId: node.id,
              nodeLabel: node.data?.label || node.id,
              input: typeof input === 'object' ? JSON.stringify(input) : String(input || ''),
              output: nodeResult.output || '',
              status: nodeResult.error ? 'failed' : 'completed',
              progress: execState.progress,
              metrics: {
                executionId: execState.executionId,
                startTime: execState.startTime,
                endTime: execState.endTime,
                status: execState.status,
                totalNodes: nodes.length,
                completedNodes: Array.from(execState.nodeResults.values()).filter(
                  (n) => n.status === 'completed'
                ).length,
                failedNodes: Array.from(execState.nodeResults.values()).filter(
                  (n) => n.status === 'failed'
                ).length,
                progress: execState.progress
              }
            })
          }
          
          if (PASSTHROUGH_NODES.has(node.type)) {
            return { messages: [] }
          }

          const aiMessage = new AIMessage({ content: nodeResult.output, name: node.id })
          return {
            messages: [aiMessage]
          }
        },
        { ends }
      )

      if (node.type === 'branch') {
        node.data.config?.branches?.forEach((branch: WorkflowBranch) => {
          branchMap[branch.id] = branch
          branch2Targets.set(branch.id, [])
        })

        graph.addConditionalEdges(node.id as any, () => {
          const nodeResult = nodeResults.get(node.id)
          const nodeIds = branch2Targets.get(nodeResult?.metadata?.branch) ?? []
          return nodeIds
        })
      } else if (node.type === 'if') {
        node.data.config?.branches?.forEach((branch: WorkflowBranch) => {
          branch2Targets.set(branch.id, [])
        })

        graph.addConditionalEdges(node.id as any, () => {
          const nodeResult = nodeResults.get(node.id)
          const nodeIds = branch2Targets.get(nodeResult?.metadata?.branch) ?? []
          return nodeIds
        })
      } else if (node.type === 'merge') {
        mergePredsMap.set(node.id, new Set(node2Sources.get(node.id) || []))
      }
    }


    // ---- 第二次遍历 edgeGroups：向 LangGraph 注册边（含 Merge 前驱等待 + error 路由） ----
    for (const [source, group] of edgeGroups) {
      const srcNode = validNodes.find(n => n.id === source)
      if (srcNode?.type === 'branch' || srcNode?.type === 'if') {
        for (const t of group.normal) {
          const e = edges.find(edge => edge.source === source && edge.target === t)
          if (e?.condition) {
            const v = branch2Targets.get(e.condition)
            v?.push(t)
          } else {
            graph.addEdge(source as any, t as any)
          }
        }
        continue
      }

      // 检查是否有目标节点是 Merge
      const mergeTarget = group.normal.find(t => mergePredsMap.has(t))
      if (mergeTarget) {
        graph.addConditionalEdges(source as any, () => {
          const r = nodeResults.get(source)
          if (group.error && r?.status === 'failed') return [group.error!]
          const allReady = [...(mergePredsMap.get(mergeTarget) || new Set<string>())].every(pid => nodeResults.has(pid))
          if (!allReady) return []
          return group.normal
        })
      } else if (group.error) {
        graph.addConditionalEdges(source as any, () => {
          const r = nodeResults.get(source)
          if (r?.status === 'failed') return [group.error!]
          return group.normal
        })
      } else {
        for (const t of group.normal) {
          graph.addEdge(source as any, t as any)
        }
      }
    }

    const startNode = nodes.find((n) => n.type === 'start')
    if (startNode) {
      graph.addEdge(START, startNode.id as any)
    }

    const endNode = nodes.find((n) => n.type === 'end')
    if (endNode) {
      graph.addEdge(endNode.id as any, END)
    }

    return graph.compile({ checkpointer })
  }

  // 执行带监控的LangGraph
  private async executeMonitoredLangGraph(
    compiledGraph: CompiledStateGraph<any, any>,
    input: string,
    executionId: string,
    threadId?: string,
    attachments?: AttachmentPayload[]
  ): Promise<string> {
    const abortController = new AbortController()
    const state = this.executionStates.get(executionId)
    if (state) {
      state.abortController = abortController
      state.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: '开始LangGraph执行'
      })
    }

    const config = {
      configurable: {
        thread_id: threadId
      },
      signal: abortController.signal
    }

    try {
      const initialState = {
        messages: [await buildHumanMessage(input, attachments)]
      }

      const finalState = (await compiledGraph.invoke(initialState, config)) as {
        messages: BaseMessage[]
      }
      const lastMessage = finalState.messages[finalState.messages.length - 1]

      const executionPaths: string[] = []
      state?.nodeResults.forEach((item) => {
        executionPaths.push(item.metadata?.label ?? item.metadata?.id)
      })

      // const result = `工作流执行顺序：${executionPaths.join(' → ')}\n\n${lastMessage.content || '工作流执行完成'}`
      const result = lastMessage.content + ''

      if (state) {
        state.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: `执行完成，结果: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`
        })
      }

      return result
    } catch (error) {
      const state = this.executionStates.get(executionId)
      if (state) {
        state.logs.push({
          timestamp: new Date(),
          level: 'error',
          message: `LangGraph执行失败: ${error instanceof Error ? error.message : '未知错误'}`
        })
      }
      throw error
    }
  }

  // 执行带监控的节点（含自动重试）
  private async executeMonitoredNode(ctx: ExecCtx) {
    const startTime = Date.now()
    const retryCount = Math.max(0, ctx.node.data.config?.retryCount ?? 0)
    const retryDelay = Math.max(0, ctx.node.data.config?.retryDelay ?? 1000)
    const backoff = ctx.node.data.config?.retryBackoff ?? 'fixed'

    // 记录原始执行到日志
    const execState = this.executionStates.get(ctx.executionId)
    if (retryCount > 0 && execState) {
      execState.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: `节点已配置重试: 最多 ${retryCount} 次, 间隔 ${retryDelay}ms, 退避策略: ${backoff}`,
        nodeId: ctx.node.id
      })
    }

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      if (attempt > 0) {
        const delay = backoff === 'exponential'
          ? retryDelay * Math.pow(2, attempt - 1)
          : retryDelay

        if (execState) {
          execState.logs.push({
            timestamp: new Date(),
            level: 'warn',
            message: `第 ${attempt}/${retryCount} 次重试 (等待 ${delay}ms)...`,
            nodeId: ctx.node.id
          })
        }

        await new Promise(resolve => setTimeout(resolve, delay))
      }

      try {
        const result = await this.executeNode(ctx)

        // 节点自身已捕获错误（error 可能在顶层或 metadata.error 中）
        if ((result as any).error || (result as any).metadata?.error) {
          if (attempt < retryCount) continue  // 还有重试机会
          const endTime = Date.now()
          return {
            nodeId: ctx.node.id,
            ...result,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            duration: endTime - startTime,
            status: 'failed'
          }
        }

        const endTime = Date.now()
        return {
          nodeId: ctx.node.id,
          ...result,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          duration: endTime - startTime,
          status: 'completed'
        }
      } catch (error) {
        if (error instanceof ExecutionTerminatedError) throw error

        if (attempt < retryCount) continue  // 还有重试机会

        const endTime = Date.now()
        return {
          output: ctx.input,
          error: error instanceof Error ? error.message : '节点执行失败',
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          duration: endTime - startTime,
          status: 'failed',
          metadata: { nodeId: ctx.node.id, type: ctx.node.type, label: ctx.node.data?.label }
        }
      }
    }

    // unreachable, but TS needs it
    throw new Error('unreachable')
  }

  // 原有的节点执行逻辑
  private async executeNode(ctx: ExecCtx) {
    const { node, input } = ctx
    switch (node.type) {
      case 'start':
        return {
          output: input,
          metadata: { nodeId: node.id, type: 'start', label: node.data?.label }
        }

      case 'skill':
        return await this.executeSkill(ctx)

      case 'branch':
        return await this.executeBranch(ctx)

      case 'api':
        return await this.executeApi(ctx)

      case 'llm':
        return await this.executeLLM(ctx)

      case 'agent':
        return await this.executeAgent(ctx)

      case 'subWorkflow':
        return await this.executeSubWorkflow(ctx)

      case 'cli':
        return await this.executeCli(ctx)

      case 'mcp':
        return await this.executeMCP(ctx)

      case 'knowledge':
        return await this.executeKnowledge(ctx)

      case 'code':
        return await this.executeCode(ctx)

      case 'sleep':
        return await this.executeSleep(ctx)

      case 'loop':
        return await this.executeLoop(ctx)

      case 'transform':
        return await this.executeTransform(ctx)

      case 'split':
        return await this.executeSplit(ctx)

      case 'if':
        return await this.executeIf(ctx)

      case 'merge':
        return await this.executeMerge(ctx)

      case 'catch':
        return await this.executeCatch(ctx)

      case 'text':
        return await this.executeText(ctx)

      case 'variable':
        return await this.executeVariable(ctx)

      case 'database':
        return await this.executeDatabase(ctx)

      case 'end':
        return {
          output: input,
          metadata: { nodeId: node.id, type: 'end', label: node.data?.label }
        }

      default:
        return {
          output: input,
          metadata: { nodeId: node.id, type: 'unknown', label: node.data?.label }
        }
    }
  }

  // 原有的节点执行方法（skill, branch, api, llm, agent）保持不变
  private async executeSkill(ctx: ExecCtx) {
    const { node, input, llmConfig, conversationHistory, attachments } = ctx
    if (!node.data.config?.skillId) {
      return {
        output: input,
        metadata: { nodeId: node.id, type: 'skill', error: '未配置技能ID' }
      }
    }

    try {
      const skill = await SkillModel.findByPk(node.data.config.skillId)

      if (!skill) {
        return {
          output: input,
          metadata: {
            nodeId: node.id,
            label: node.data?.label,
            type: 'skill',
            error: `技能不存在: ${node.data.config.skillId}`
          }
        }
      }

      const skillContent = `${skill.name}\n\n描述: ${skill.description}\n\n内容: ${skill.content}`
      const prompt = `${skillContent}\n\n当前用户输入: ${input}\n\n请根据以上技能内容处理用户输入，只返回处理后的结果，不要重复用户输入的内容。如果只是传递信息，请简洁地总结或转换，避免重复。`
      const result = await callLLM(prompt, llmConfig, conversationHistory, [], undefined, attachments)

      return {
        output: result,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'skill',
          skillId: node.data.config.skillId,
          skillName: skill.name
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '技能执行失败'
      return {
        output: errorMsg,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'skill',
          error: errorMsg
        }
      }
    }
  }

  private async executeBranch(ctx: ExecCtx) {
    const { node, input, llmConfig, params, nodeResults, workflowEnvVars, variables } = ctx
    if (!node.data.config?.branches?.length) {
      return {
        output: input,
        metadata: { nodeId: node.id, type: 'branch', branch: null }
      }
    }

    try {
      // 解析 condition 中的模板变量
      const resolvedBranches = node.data.config.branches.map((b: any) => ({
        ...b,
        condition: this.resolveParams(b.condition || '', input, params, nodeResults, workflowEnvVars, variables)
      }))
      const branchId = await this.evaluateBranches(resolvedBranches, input, llmConfig)

      return {
        output: `条件评估成功，满足条件id: ${branchId}`,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'branch',
          branch: branchId === 'null' ? null : branchId
        }
      }
    } catch (error) {
      return {
        output: `条件评估失败`,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'branch',
          branch: null,
          error: error instanceof Error ? error.message : '条件评估失败'
        }
      }
    }
  }

  private async executeIf(ctx: ExecCtx) {
    const { node, input, params, nodeResults, workflowEnvVars, variables } = ctx
    const branches: { id: string; condition: string }[] = node.data.config?.branches || []
    if (branches.length === 0) {
      return {
        output: input,
        metadata: { nodeId: node.id, type: 'if', label: node.data?.label, branch: null }
      }
    }
    try {
      for (const b of branches) {
        if (!b.condition.trim()) continue
        const resolved = this.resolveParams(b.condition, input, params, nodeResults, workflowEnvVars, variables)
        const fn = new Function('$input', '$params', `return Boolean(${resolved})`)
        const result = fn(input, params || {})
        if (result) {
          return {
            output: input,
            metadata: { nodeId: node.id, label: node.data?.label, type: 'if', branch: b.id }
          }
        }
      }
      // 无条件满足
      return {
        output: input,
        metadata: { nodeId: node.id, label: node.data?.label, type: 'if', branch: null }
      }
    } catch (error) {
      return {
        output: input,
        metadata: {
          nodeId: node.id, label: node.data?.label, type: 'if',
          branch: null,
          error: error instanceof Error ? error.message : '条件执行失败'
        }
      }
    }
  }

  /**
   * 替换模板中的占位符：
   * - {{$input}} → 当前节点接收到的上游输入
   * - {{$params.xxx}} → 当前执行上下文中 Start 节点定义的参数 xxx
   * - {{$nodes["id"].output}} → 引用任意已完成节点的输出
   * - {{$env.xxx}} → 工作流级环境变量（编辑器"环境变量"按钮配置）
   * - {{$global.xxx}} → 全局环境变量（设置 → 环境变量页面管理）
   * - {{$now}} / {{$now.date}} / {{$now.time}} / {{$now.timestamp}} → 当前时间
   */
  private resolveParams(template: string, input: string, params?: Record<string, any>, nodeResults?: Map<string, any>, workflowEnvVars?: Record<string, string>, variables?: Record<string, any>): string {
    // {{$input}} → 上游输入
    let result = template.replace(/\{\{\$input\}\}/g, input)

    // {{$params.xxx.yyy}} → params 中按路径取值
    if (params) {
      result = result.replace(/\{\{\$params\.([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\}\}/g, (match, path) => {
        const keys = path.split('.')
        let value: any = params
        for (const key of keys) {
          if (value == null || typeof value !== 'object') return match
          value = value[key]
        }
        return value !== undefined && value !== null ? String(value) : match
      })
    }

    // {{$env.xxx}} → 工作流级环境变量（通过 ExecCtx.workflowEnvVars 传入）
    if (workflowEnvVars) {
      result = result.replace(/\{\{\$env\.([a-zA-Z_]\w*)\}\}/g, (match, key) => {
        return workflowEnvVars[key] !== undefined ? workflowEnvVars[key] : match
      })
    }

    // {{$global.xxx}} → 全局环境变量（从 DB environment_variables 表加载）
    {
      const globalMap = this.envVarsCache
      if (globalMap) {
        result = result.replace(/\{\{\$global\.([a-zA-Z_]\w*)\}\}/g, (match, key) => {
          return globalMap[key] !== undefined ? globalMap[key] : match
        })
      }
    }

    // {{$now}} / {{$now.format}} → 当前时间
    result = result.replace(/\{\{\$now(?:\.(\w+))?\}\}/g, (_, format) => {
      const now = new Date()
      switch (format) {
        case 'timestamp': return String(now.getTime())
        case 'date': return now.toISOString().slice(0, 10)
        case 'time': return now.toTimeString().slice(0, 8)
        case 'iso': return now.toISOString()
        case 'year': return String(now.getFullYear())
        case 'month': return String(now.getMonth() + 1).padStart(2, '0')
        case 'day': return String(now.getDate()).padStart(2, '0')
        case 'hour': return String(now.getHours()).padStart(2, '0')
        case 'minute': return String(now.getMinutes()).padStart(2, '0')
        case 'second': return String(now.getSeconds()).padStart(2, '0')
        default: return now.toISOString()
      }
    })

    // {{$vars.xxx}} → 工作流变量（由 variable 节点设置）
    if (variables) {
      result = result.replace(/\{\{\$vars\.([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\}\}/g, (match, path) => {
        const keys = path.split('.')
        let value: any = variables
        for (const key of keys) {
          if (value == null || typeof value !== 'object') return match
          value = value[key]
        }
        return value !== undefined && value !== null ? String(value) : match
      })
    }

    // {{$nodes["id"].output}} / $nodes["id"].output → 节点引用
    if (nodeResults && nodeResults.size > 0) {
      result = this.resolveNodeRefs(result, nodeResults)
    }

    // {{表达式}} → 将已替换的模板变量作为 JS 表达式求值
    // 支持如 {{$params.a + $params.b}}、{{$input.toUpperCase()}} 等
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
      try {
        const trimmed = expr.trim()
        if (!trimmed) return match
        // 只对包含运算符或函数调用的表达式求值，纯变量引用保留原样
        if (/^[\w.$[\]"]+$/.test(trimmed)) return match
        const fn = new Function('$input', '$params', `return (${trimmed})`)
        const val = fn(input, params || {})
        return val !== undefined && val !== null ? String(val) : match
      } catch {
        return match
      }
    })

    return result
  }

  private async executeApi(ctx: ExecCtx) {
    const { node, input, llmConfig, params } = ctx
    if (!node.data.config?.apiConfig?.url) {
      return {
        output: input,
        metadata: { nodeId: node.id, type: 'api', error: '未配置API URL' }
      }
    }

    try {
      // 解析 API 配置中的 {{$input}}、{{$params.xxx}} 和 $nodes 占位符
      const apiConfig = node.data.config.apiConfig
      const { nodeResults, workflowEnvVars, variables } = ctx
      const resolvedUrl = this.resolveParams(apiConfig.url || '', input, params, nodeResults, workflowEnvVars, variables)
      const resolvedHeaders = apiConfig.headers ? this.resolveParams(apiConfig.headers, input, params, nodeResults, workflowEnvVars, variables) : apiConfig.headers
      const resolvedBody = apiConfig.body ? this.resolveParams(apiConfig.body, input, params, nodeResults, workflowEnvVars, variables) : apiConfig.body
      const resolvedApiConfig = { ...apiConfig, url: resolvedUrl, headers: resolvedHeaders, body: resolvedBody }

      const apiResult = await executeApiCall(resolvedApiConfig)
      const processPrompt = `请处理以下API调用结果，并结合原始输入给出最终答案:\n\n原始输入: ${input}\n\nAPI结果: ${JSON.stringify(apiResult, null, 2)}`
      const result = await callLLM(processPrompt, llmConfig)

      return {
        output: result,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'api',
          apiUrl: node.data.config.apiConfig.url,
          apiResult
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'API调用失败'
      return {
        output: errorMsg,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'api',
          error: errorMsg
        }
      }
    }
  }

  private async executeKnowledge(ctx: ExecCtx) {
    const { node, input, params, nodeResults, workflowEnvVars, variables } = ctx
    const kbId = node.data.config?.knowledgeBaseId
    if (!kbId) {
      return { output: '未配置知识库', metadata: { nodeId: node.id, type: 'knowledge', label: node.data?.label, error: '未配置知识库' } }
    }
    const rawQuery = node.data.config?.query || '{{$input}}'
    const query = this.resolveParams(rawQuery, input, params, nodeResults, workflowEnvVars, variables)
    if (!query.trim()) {
      return { output: '', metadata: { nodeId: node.id, type: 'knowledge', label: node.data?.label } }
    }
    try {
      const topK = node.data.config?.topK || undefined
      const context = await retrieveContext(kbId, query, topK)
      return {
        output: context || '未检索到相关内容',
        metadata: { nodeId: node.id, type: 'knowledge', label: node.data?.label, kbId, query, topK }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return { output: `检索失败: ${msg}`, metadata: { nodeId: node.id, type: 'knowledge', label: node.data?.label, error: msg } }
    }
  }

  private async executeDatabase(ctx: ExecCtx) {
    const { node, input, params, nodeResults, workflowEnvVars, variables } = ctx
    const cfg: DatabaseConfig = {
      dbType: (node.data.config?.dbType as DatabaseConfig['dbType']) || 'sqlite',
      connectionConfig: this.resolveParams(node.data.config?.connectionConfig || '', input, params, nodeResults, workflowEnvVars, variables),
      sql: this.resolveParams(node.data.config?.sql || '', input, params, nodeResults, workflowEnvVars, variables),
      collection: node.data.config?.collection as string | undefined,
      operation: node.data.config?.operation as string | undefined,
      query: this.resolveParams(node.data.config?.query || '', input, params, nodeResults, workflowEnvVars, variables),
      mode: (node.data.config?.mode as DatabaseConfig['mode']) || 'query',
      timeout: (node.data.config?.timeout as number) || 30,
    }
    try {
      const { executeDatabaseQuery } = await import('../utils/database')
      const result = await executeDatabaseQuery(cfg)
      return {
        output: result,
        metadata: { nodeId: node.id, type: 'database', label: node.data?.label, dbType: cfg.dbType, mode: cfg.mode }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return { output: `数据库查询失败: ${msg}`, metadata: { nodeId: node.id, type: 'database', label: node.data?.label, error: msg } }
    }
  }

  private async executeVariable(ctx: ExecCtx) {
    const { node, input, params, nodeResults, workflowEnvVars, variables } = ctx
    const mode = node.data.config?.mode || 'set'
    const items: { name: string; value: string }[] = node.data.config?.items || []

    if (mode === 'set') {
      // 设置变量：依次解析每个变量的值并存储到 execState.variables
      const newVars: Record<string, any> = { ...variables }
      const resolved: Record<string, string> = {}
      for (const item of items) {
        if (!item.name) continue
        const val = this.resolveParams(item.value || '', input, params, nodeResults, workflowEnvVars, variables)
        newVars[item.name] = val
        resolved[item.name] = val
      }
      // 更新执行状态的 variables
      const execState = this.executionStates.get(ctx.executionId)
      if (execState) execState.variables = newVars
      return {
        output: Object.keys(resolved).length > 0 ? JSON.stringify(resolved, null, 2) : input,
        metadata: { nodeId: node.id, type: 'variable', label: node.data?.label, mode: 'set', variables: resolved }
      }
    } else {
      // 获取变量：按名称取出并输出
      const result: Record<string, any> = {}
      for (const item of items) {
        if (!item.name) continue
        result[item.name] = variables[item.name] !== undefined ? variables[item.name] : ''
      }
      return {
        output: Object.keys(result).length > 0 ? JSON.stringify(result, null, 2) : input,
        metadata: { nodeId: node.id, type: 'variable', label: node.data?.label, mode: 'get', variables: result }
      }
    }
  }

  private async executeMCP(ctx: ExecCtx) {
    const { node, input, params, nodeResults, workflowEnvVars, variables } = ctx
    const mcpConfig = node.data.config?.mcpConfig
    if (!mcpConfig?.serverId || !mcpConfig?.toolName) {
      return {
        output: input,
        metadata: { nodeId: node.id, type: 'mcp', error: '未配置 MCP 服务器或工具', label: node.data?.label }
      }
    }

    try {
      const args = mcpConfig.params || {}
      const resolvedArgs: Record<string, any> = {}
      for (const [key, value] of Object.entries(args)) {
        resolvedArgs[key] = typeof value === 'string' ? this.resolveParams(value, input, params, nodeResults, workflowEnvVars, variables) : value
      }

      const mcpResult = await mcpConnectionManager.callTool(mcpConfig.serverId, mcpConfig.toolName, resolvedArgs)

      return {
        output: mcpResult,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'mcp',
          serverName: mcpConfig.serverName || mcpConfig.serverId,
          toolName: mcpConfig.toolName,
          mcpResult
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'MCP 工具调用失败'
      return {
        output: errorMsg,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'mcp',
          error: errorMsg
        }
      }
    }
  }

  private async executeAgent(ctx: ExecCtx) {
    const { executionId, node, input, llmConfig, attachments } = ctx
    if (!node.data.config?.agentId) {
      return { output: input, metadata: { nodeId: node.id, type: 'agent', error: '未配置Agent ID', label: node.data?.label } }
    }

    const targetAgentId = node.data.config.agentId

    // 检测循环调用
    if (this.agentCallStack.has(targetAgentId)) {
      const chain = [...this.agentCallStack, targetAgentId].join(' → ')
      console.warn('[循环检测] Agent:', chain)
      return { output: input, metadata: { nodeId: node.id, type: 'agent', error: '检测到循环调用(' + chain + ')', agentId: targetAgentId } }
    }

    try {
      // 查找 Agent 及其绑定的工作流
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
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: safeJsonParse(workflow.nodes, []),
        edges: safeJsonParse(workflow.edges, []),
        envVars: safeJsonParse(workflow.envVars, {}),
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      }

      // 为子工作流创建独立 executionId，继承父状态的放权工具列表
      const subExecutionId = `${executionId}:agent:${node.id}`
      const parentState = this.executionStates.get(executionId)
      const inheritedAutoApprove = parentState?.autoApprovedToolTypes
        ? new Set(parentState.autoApprovedToolTypes)
        : new Set<string>()

      this.executionStates.set(subExecutionId, {
        executionId: subExecutionId,
        workflow: workflowObj,
        status: 'running',
        startTime: new Date(),
        nodeResults: new Map(),
        progress: 0,
        logs: [],
        agentId: agent.id,
        threadId: undefined,
        autoApprovedToolTypes: inheritedAutoApprove,
        pendingApproval: null,
        attachments: undefined,
      })

      this.agentCallStack.add(targetAgentId)
      try {
        const subGraph = await this.buildMonitoredLangGraph(subExecutionId, workflowObj, llmConfig)
        const result = await this.executeMonitoredLangGraph(subGraph, input, subExecutionId, subExecutionId, attachments)

        return {
          output: result,
          metadata: {
            nodeId: node.id,
            label: node.data?.label,
            type: 'agent',
            agentId: agent.id,
            agentName: agent.name,
            workflowName: workflow.name,
          },
        }
      } finally {
        this.executionStates.delete(subExecutionId)
        this.agentCallStack.delete(targetAgentId)
      }
    } catch (error) {
      // 手动终止时向上传播错误，停止整条执行链
      const subState = this.executionStates.get(`${executionId}:agent:${node.id}`)
      if (subState?.status !== 'running') {
        throw error
      }
      const errorMsg = error instanceof Error ? error.message : 'Agent执行失败'
      return { output: errorMsg, metadata: { nodeId: node.id, type: 'agent', error: errorMsg, agentId: node.data.config?.agentId } }
    }
  }

  private async executeSubWorkflow(ctx: ExecCtx) {
    const { executionId, node, input, llmConfig, attachments, params: parentParams, nodeResults, workflowEnvVars, variables } = ctx
    const workflowId = node.data.config?.workflowId as string | undefined
    if (!workflowId) {
      return { output: input, metadata: { nodeId: node.id, type: 'subWorkflow', error: '未配置工作流ID', label: node.data?.label } }
    }

    // 检测循环调用
    if (this.workflowCallStack.has(workflowId)) {
      const chain = [...this.workflowCallStack, workflowId].join(' → ')
      console.warn('[循环检测] Workflow:', chain)
      return { output: input, metadata: { nodeId: node.id, type: 'subWorkflow', error: '检测到循环调用(' + chain + ')', workflowId } }
    }

    try {
      const workflow = await WorkflowModel.findByPk(workflowId)
      if (!workflow) {
        return { output: input, metadata: { nodeId: node.id, type: 'subWorkflow', error: '工作流不存在', workflowId } }
      }

      const workflowObj: Workflow = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: safeJsonParse(workflow.nodes, []),
        edges: safeJsonParse(workflow.edges, []),
        envVars: safeJsonParse(workflow.envVars, {}),
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      }

      // 空工作流检查
      if (!workflowObj.nodes || workflowObj.nodes.length === 0) {
        return { output: input, metadata: { nodeId: node.id, type: 'subWorkflow', error: '工作流为空，没有任何节点', workflowId, workflowName: workflow.name } }
      }

      // 为子工作流创建独立 executionId，继承父状态的放权工具列表
      const subExecutionId = `${executionId}:workflow:${node.id}`
      const parentState = this.executionStates.get(executionId)
      const inheritedAutoApprove = parentState?.autoApprovedToolTypes
        ? new Set(parentState.autoApprovedToolTypes)
        : new Set<string>()

      this.executionStates.set(subExecutionId, {
        executionId: subExecutionId,
        workflow: workflowObj,
        status: 'running',
        startTime: new Date(),
        nodeResults: new Map(),
        progress: 0,
        logs: [],
        agentId: undefined,
        threadId: undefined,
        autoApprovedToolTypes: inheritedAutoApprove,
        pendingApproval: null,
        attachments: undefined,
        // 子工作流参数：先解析父级 {{$params.xxx}} 占位符再传给子工作流
        // 即用户在子工作流节点配置中填入的 {{$params.name}} 会被父工作流的 params.name 替换
        params: (() => {
          const resolved: Record<string, any> = {}
          for (const [k, v] of Object.entries(node.data.config?.params || {})) {
            resolved[k] = typeof v === 'string' ? this.resolveParams(v, input, parentParams, nodeResults, workflowEnvVars, variables) : v
          }
          return resolved
        })(),
      })

      this.workflowCallStack.add(workflowId)
      try {
        const subGraph = await this.buildMonitoredLangGraph(subExecutionId, workflowObj, llmConfig)
        const result = await this.executeMonitoredLangGraph(subGraph, input, subExecutionId, subExecutionId, attachments)

        return {
          output: result,
          metadata: {
            nodeId: node.id,
            label: node.data?.label,
            type: 'subWorkflow',
            workflowId: workflow.id,
            workflowName: workflow.name,
          },
        }
      } finally {
        this.executionStates.delete(subExecutionId)
        this.workflowCallStack.delete(workflowId)
      }
    } catch (error) {
      const subState = this.executionStates.get(`${executionId}:workflow:${node.id}`)
      if (subState?.status !== 'running') {
        throw error
      }
      const errorMsg = error instanceof Error ? error.message : '工作流执行失败'
      return { output: errorMsg, metadata: { nodeId: node.id, type: 'subWorkflow', error: errorMsg, workflowId } }
    }
  }

  private async executeLLM(ctx: ExecCtx) {
    const { executionId, node, input, llmConfig: defaultLlmConfig, conversationHistory, attachments, params, nodeResults, workflowEnvVars, variables: workflowVars } = ctx
    let llmConfig = defaultLlmConfig
    try {
      // 如果节点指定了 LLM 配置 ID，从数据库读取并覆盖
      const nodeLlmConfigId = node.data.config?.llmConfigId as string | undefined
      if (nodeLlmConfigId) {
        const dbConfig = await LLMConfigModel.findByPk(nodeLlmConfigId)
        if (dbConfig) {
          llmConfig = {
            provider: dbConfig.provider,
            apiKey: dbConfig.apiKey,
            model: dbConfig.model,
            baseUrl: dbConfig.baseUrl,
            temperature: dbConfig.temperature,
            maxTokens: dbConfig.maxTokens
          }
        } else {
          console.warn(`[executeLLM] 节点 ${node.data?.label || node.id} 指定的 LLM 配置 ${nodeLlmConfigId} 不存在，使用全局活跃配置`)
        }
      }

      let promptTemplate = node.data.config?.prompt || ''
      const varDefs = node.data.config?.variables || []

      const variablesMap: Record<string, any> = {}
      varDefs.forEach((variable: any) => {
        variablesMap[variable.name] = variable.defaultValue || ''
      })

      Object.keys(variablesMap).forEach((key) => {
        const placeholder = `{{${key}}}`
        promptTemplate = promptTemplate.replace(new RegExp(placeholder, 'g'), variablesMap[key])
      })

      // 解析 {{$input}} 和 {{$params.xxx}} 占位符
      promptTemplate = this.resolveParams(promptTemplate, input, params, nodeResults, workflowEnvVars, workflowVars)

      const finalPrompt = promptTemplate ? `${promptTemplate}\n\n当前用户输入: ${input}` : input
      const enabledTools = node.data.config?.enabledTools || []

      // RAG 知识库增强：检索上下文并注入 prompt
      let promptWithRag = finalPrompt
      const { enableKnowledgeBase, knowledgeBaseId } = node.data.config || {}
      if (enableKnowledgeBase && knowledgeBaseId) {
        try {
          const ragContext = await retrieveContext(knowledgeBaseId, input)
          if (ragContext) {
            promptWithRag = `【知识库参考资料】\n${ragContext}\n\n---\n\n${finalPrompt}`
          }
        } catch (err) {
          console.error('知识库检索失败:', err)
        }
      }

      // 技能绑定：注入技能列表并添加 readSkill 工具
      let promptWithSkills = promptWithRag
      let allEnabledTools = enabledTools
      const skillIds = node.data.config?.skillIds as string[] | undefined
      if (skillIds && skillIds.length > 0) {
        const { skillsContext, enabledTools: updatedTools } = await buildSkillsContext(skillIds, enabledTools)
        promptWithSkills = `${skillsContext}\n\n---\n\n${promptWithRag}`
        allEnabledTools = updatedTools
      }

      // 构建 HITL 宯批回调
      const hasDangerousTools = allEnabledTools.some((t: string) => DANGEROUS_TOOLS.includes(t))
      const options: CallLLMOptions = hasDangerousTools
        ? {
          approvalCallback: async (request: HITLRequest): Promise<HITLResponse> => {
            const execState = this.executionStates.get(executionId)
            if (!execState || execState.status !== 'running') {
              throw new ExecutionTerminatedError()
            }

            // 按工具类型判断：已放行的工具自动批准，其余需要审批
            const autoApproved: string[] = []
            const needApproval: { name: string; args: Record<string, any>; description: string }[] = []
            for (const action of request.actionRequests) {
              if (execState.autoApprovedToolTypes.has(action.name)) {
                autoApproved.push(action.name)
              } else {
                needApproval.push(action)
              }
            }

            // 全部已放行
            if (needApproval.length === 0) {
              return { decisions: request.actionRequests.map(() => ({ type: 'approve' })) }
            }

            // 先设置 pendingApproval（broadcastToSSEClients 会读取它同步到父状态）
            const approvalPromise = new Promise<HITLResponse>((resolve, reject) => {
              execState.pendingApproval = { resolve, reject, request }
            })

            // 广播 SSE 请求审批事件
            this.broadcastToSSEClients(executionId, {
              type: 'tool_approval_required',
              executionId,
              actionRequests: needApproval,
              reviewConfigs: request.reviewConfigs.filter(rc => needApproval.some(a => a.name === rc.actionName)),
            })

            const userResponse = await approvalPromise

            // 合并结果：自动批准的 + 用户决策的
            const decisions: HITLDecision[] = request.actionRequests.map((action) => {
              if (execState.autoApprovedToolTypes.has(action.name)) {
                return { type: 'approve' }
              }
              const userDecision = userResponse.decisions.find(d => d.type !== 'approve' || needApproval.some(a => a.name === action.name))
              return userDecision || { type: 'approve' }
            })

            return { decisions }
          }
        }
        : {}

      const result = await callLLM(promptWithSkills, llmConfig, conversationHistory, allEnabledTools, { ...options, cache: node.data.config?.enableCache ?? false }, attachments)

      return {
        output: result,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'llm',
          prompt: promptTemplate,
          variables: variablesMap
        }
      }
    } catch (error) {
      if (error instanceof ExecutionTerminatedError) throw error
      const errorMsg = error instanceof Error ? error.message : 'LLM调用失败'
      return {
        output: errorMsg,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'llm',
          error: errorMsg
        }
      }
    }
  }

  private async executeCli(ctx: ExecCtx) {
    const { node, input, llmConfig, params, nodeResults, workflowEnvVars, variables } = ctx
    const cliConfig = node.data.config?.cliConfig
    const templateId = cliConfig?.templateId || 'custom'

    try {
      const resolvedWorkingDir = cliConfig?.workingDirectory
        ? this.resolveParams(cliConfig.workingDirectory, input, params, nodeResults, workflowEnvVars, variables)
        : cliConfig?.workingDirectory
      // 预设模板走 Node.js 函数实现，自定义命令走 shell
      let result: { stdout: string; stderr: string; exitCode: number | null }
      let executedCommand: string

      if (templateId !== 'custom') {
        const variables = cliConfig?.templateVariables || {}
        // 对于 fs 类模板，把 {{$input}} 也加入变量替换
        if (variables.content === '{{$input}}') {
          variables.content = input
        }
        result = await executeCliTemplate(templateId, variables, {
          workingDirectory: resolvedWorkingDir,
          timeout: cliConfig?.timeout,
        })
        executedCommand = `[预设模板: ${templateId}]`
      } else {
        if (!cliConfig?.command) {
          return {
            output: input,
            metadata: { nodeId: node.id, type: 'cli', error: '未配置命令', label: node.data?.label }
          }
        }
        let resolvedCommand = cliConfig.command
        const variables = cliConfig.templateVariables || {}
        Object.entries(variables).forEach(([key, value]) => {
          resolvedCommand = resolvedCommand.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
        })
        resolvedCommand = this.resolveParams(resolvedCommand, input, params, nodeResults, workflowEnvVars, variables)
        result = await executeCliCommand({
          command: resolvedCommand,
          workingDirectory: resolvedWorkingDir,
          timeout: cliConfig.timeout,
        })
        executedCommand = resolvedCommand
      }

      const rawOutput = result.stderr
        ? `${result.stdout}\n[stderr]: ${result.stderr}`
        : result.stdout

      if (result.exitCode !== 0) {
        return {
          output: rawOutput,
          metadata: {
            nodeId: node.id,
            label: node.data?.label,
            type: 'cli',
            command: executedCommand,
            exitCode: result.exitCode,
            error: `命令退出码: ${result.exitCode}`,
            outputMode: cliConfig?.outputMode,
          }
        }
      }

      if (cliConfig?.outputMode === 'llm_process') {
        const processPrompt = cliConfig.llmProcessPrompt
          ? cliConfig.llmProcessPrompt.replace(/\{\{output\}\}/g, rawOutput)
          : `请分析以下命令输出并提取关键信息:\n\n${rawOutput}`

        const llmResult = await callLLM(processPrompt, llmConfig)
        return {
          output: llmResult,
          metadata: {
            nodeId: node.id,
            label: node.data?.label,
            type: 'cli',
            command: executedCommand,
            rawOutput,
            exitCode: result.exitCode,
            outputMode: 'llm_process',
          }
        }
      }

      return {
        output: rawOutput,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'cli',
          command: executedCommand,
          exitCode: result.exitCode,
          outputMode: 'raw',
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'CLI命令执行失败'
      return {
        output: errorMsg,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'cli',
          error: errorMsg,
        }
      }
    }
  }

  private async executeCatch(ctx: ExecCtx) {
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
      output: '[' + failedNodeLabel + ' 执行失败] ' + errorMsg + '\n\n' + input,
      metadata: {
        nodeId: node.id,
        label: node.data?.label,
        type: 'catch',
        upstreamError: errorMsg,
        upstreamNodeLabel: failedNodeLabel,
      }
    }
  }


  private async executeMerge(ctx: ExecCtx) {
    const { node, nodeResults, node2Sources } = ctx
    const preds = node2Sources.get(node.id) || []
    const rawSep = node.data.config?.separator || '\\n---\\n'
    const sep = rawSep.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
    const parts: string[] = []
    for (const pid of preds) {
      const r = nodeResults?.get(pid)
      if (r?.output) parts.push(r.output)
    }
    return {
      output: parts.join(sep),
      metadata: { nodeId: node.id, label: node.data?.label, type: 'merge', mergedFrom: preds }
    }
  }

  private async executeTransform(ctx: ExecCtx) {
    const { node, input } = ctx
    const operation = node.data.config?.operation || 'jsonpath'
    const expression = node.data.config?.expression || ''

    if (!input && input !== '') {
      return { output: '', metadata: { nodeId: node.id, type: 'transform', label: node.data?.label } }
    }

    try {
      switch (operation) {
        case 'jsonpath': {
          if (!expression.trim()) {
            return { output: input, metadata: { nodeId: node.id, type: 'transform', label: node.data?.label } }
          }
          const parsed = JSON.parse(input)
          // 用 matchAll 提取所有 token：属性名 或 [n]
          // 支持 data.name、data[0]、[0]、data[0].name、data[0][1] 等
          const tokens: string[] = []
          const tokenRegex = /\.(\w+)|\[(\d+)\]/g
          const firstMatch = expression.match(/^(\w+)/)  // 开头可能有无点号前缀的属性名
          if (firstMatch) {
            tokens.push(firstMatch[1])
          }
          let m: RegExpExecArray | null
          while ((m = tokenRegex.exec(expression)) !== null) {
            if (m[1] !== undefined) tokens.push(m[1])     // .name
            if (m[2] !== undefined) tokens.push('$idx$' + m[2])  // [0]
          }
          let result: any = parsed
          for (const token of tokens) {
            if (result == null) break
            const idxMatch = token.match(/^\$idx\$(\d+)$/)
            if (idxMatch) {
              result = result[parseInt(idxMatch[1])]
            } else {
              result = result[token]
            }
          }
          const output = result !== undefined ? (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)) : ''
          return {
            output,
            metadata: { nodeId: node.id, type: 'transform', operation, expression, label: node.data?.label }
          }
        }
        case 'parse-json': {
          const parsed = JSON.parse(input)
          return {
            output: JSON.stringify(parsed, null, 2),
            metadata: { nodeId: node.id, type: 'transform', operation, label: node.data?.label }
          }
        }
        case 'to-json': {
          return {
            output: JSON.stringify(input),
            metadata: { nodeId: node.id, type: 'transform', operation, label: node.data?.label }
          }
        }
        default:
          return { output: input, metadata: { nodeId: node.id, type: 'transform', error: '未知操作', label: node.data?.label } }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '转换失败'
      return { output: input, metadata: { nodeId: node.id, type: 'transform', error: errorMsg, label: node.data?.label } }
    }
  }

  private async executeSplit(ctx: ExecCtx) {
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
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: safeJsonParse(workflow.nodes, []),
        edges: safeJsonParse(workflow.edges, []),
        envVars: safeJsonParse(workflow.envVars, {}),
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      }

      const parentState = this.executionStates.get(executionId)
      const inheritedAutoApprove = parentState?.autoApprovedToolTypes
        ? new Set(parentState.autoApprovedToolTypes)
        : new Set<string>()

      const items = this.parseInputAsArray(input)
      const actualItems = Math.min(items.length, maxItems)
      const results: string[] = []

      for (let i = 0; i < actualItems; i++) {
        if (parentState?.status === 'paused' || parentState?.status === 'completed') break

        const subExecutionId = executionId + ':split:' + node.id + ':' + i
        this.executionStates.set(subExecutionId, {
          executionId: subExecutionId,
          workflow: workflowObj,
          status: 'running',
          startTime: new Date(),
          nodeResults: new Map(),
          progress: 0,
          logs: [],
          autoApprovedToolTypes: inheritedAutoApprove,
          pendingApproval: null,
          attachments: undefined,
          params: (() => {
            const resolved: Record<string, any> = { _index: i }
            for (const [k, v] of Object.entries(node.data.config?.params || {})) {
              resolved[k] = typeof v === 'string' ? this.resolveParams(v, input, parentParams, nodeResults, workflowEnvVars, variables) : v
            }
            return resolved
          })(),
        })

        try {
          const subGraph = await this.buildMonitoredLangGraph(subExecutionId, workflowObj, llmConfig)
          const subResult = await this.executeMonitoredLangGraph(subGraph, String(items[i]), subExecutionId, subExecutionId)
          results.push(subResult)
          this.executionStates.delete(subExecutionId)
        } catch (error) {
          this.executionStates.delete(subExecutionId)
          results.push('[拆分 ' + i + ' 失败] ' + (error instanceof Error ? error.message : '未知错误'))
        }
      }

      return {
        output: results.join('\n'),
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'split',
          items: results.length,
          total: items.length,
          workflowId,
          workflowName: workflow.name,
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '拆分执行失败'
      return { output: errorMsg, metadata: { nodeId: node.id, type: 'split', error: errorMsg, label: node.data?.label } }
    }
  }

  private async executeText(ctx: ExecCtx) {
    const { node, input, params, nodeResults, workflowEnvVars, variables: workflowVars } = ctx
    let textTemplate = node.data.config?.text || ''
    const varDefs = node.data.config?.variables || []

    const variablesMap: Record<string, any> = {}
    varDefs.forEach((variable: any) => {
      variablesMap[variable.name] = variable.defaultValue || ''
    })

    Object.keys(variablesMap).forEach((key) => {
      const placeholder = `{{${key}}}`
      textTemplate = textTemplate.replace(new RegExp(placeholder, 'g'), variablesMap[key])
    })

    textTemplate = this.resolveParams(textTemplate, input, params, nodeResults, workflowEnvVars, workflowVars)

    return {
      output: textTemplate,
      metadata: {
        nodeId: node.id,
        label: node.data?.label,
        type: 'text',
      }
    }
  }

  private async executeSleep(ctx: ExecCtx) {
    const { node, input } = ctx
    const sleepMs = Math.max(0, node.data.config?.sleepMs ?? 1000)
    if (sleepMs > 0) {
      await new Promise(resolve => setTimeout(resolve, sleepMs))
    }
    return {
      output: input,
      metadata: { nodeId: node.id, label: node.data?.label, type: 'sleep', sleepMs }
    }
  }

  private async executeCode(ctx: ExecCtx) {
    const { node, input, params, nodeResults } = ctx
    const code = node.data.config?.code || ''

    if (!code.trim()) {
      return {
        output: input,
        metadata: { nodeId: node.id, type: 'code', label: node.data?.label, error: '代码为空' }
      }
    }

    try {
      // 解析代码中的 $nodes[...] 引用
      const resolvedCode = this.resolveNodeRefs(code, nodeResults)

      // 构建执行上下文：上游输入、Start 参数、所有已完成节点的输出
      const $input = input
      const $params = params || {}
      const $nodes = this.buildNodeContext(nodeResults)

      // 使用 new Function 执行（沙箱：不注入 require/process/module/global）
      const fn = new Function('$input', '$params', '$nodes', resolvedCode)
      const result = await fn($input, $params, $nodes)

      return {
        output: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'code',
          returnType: typeof result,
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '代码执行失败'
      return {
        output: errorMsg,
        metadata: { nodeId: node.id, label: node.data?.label, type: 'code', error: errorMsg }
      }
    }
  }

  private async executeLoop(ctx: ExecCtx) {
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
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: safeJsonParse(workflow.nodes, []),
        edges: safeJsonParse(workflow.edges, []),
        envVars: safeJsonParse(workflow.envVars, {}),
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      }

      const parentState = this.executionStates.get(executionId)
      const inheritedAutoApprove = parentState?.autoApprovedToolTypes
        ? new Set(parentState.autoApprovedToolTypes)
        : new Set<string>()

      const results: string[] = []
      let currentInput = input  // 初始输入，之后每轮取上一轮的输出

      for (let i = 0; i < maxIter; i++) {
        if (parentState?.status === 'paused' || parentState?.status === 'completed') break

        // 执行一轮子工作流
        const subExecutionId = `${executionId}:loop:${node.id}:${i}`
        // 解析用户配置的参数（支持 {{$input}}、{{$params._index}} 等表达式）
        const loopParams = node.data.config?.params || {}
        const resolvedParams: Record<string, any> = { _index: i }
        for (const [k, v] of Object.entries(loopParams)) {
          resolvedParams[k] = typeof v === 'string' ? this.resolveParams(v, currentInput, { _index: i }) : v
        }

        this.executionStates.set(subExecutionId, {
          executionId: subExecutionId,
          workflow: workflowObj,
          status: 'running',
          startTime: new Date(),
          nodeResults: new Map(),
          progress: 0,
          logs: [],
          autoApprovedToolTypes: inheritedAutoApprove,
          pendingApproval: null,
          attachments: undefined,
          params: resolvedParams,
        })

        let subOutput: string
        try {
          const subGraph = await this.buildMonitoredLangGraph(subExecutionId, workflowObj, llmConfig)
          subOutput = await this.executeMonitoredLangGraph(subGraph, currentInput, subExecutionId, subExecutionId)
          this.executionStates.delete(subExecutionId)
        } catch (error) {
          this.executionStates.delete(subExecutionId)
          subOutput = error instanceof Error ? error.message : '迭代执行失败'
        }

        results.push(subOutput)

        // 有终止条件时，JS 表达式评估（注入 $input 为上一轮输出）
        if (conditionText) {
          try {
            const fn = new Function('$input', `return Boolean(${conditionText})`)
            if (fn(subOutput)) break
          } catch {
            // 表达式有语法错误时忽略，继续循环
          }
        }

        // 本轮输出作为下一轮的输入（反馈回路）
        currentInput = subOutput
      }

      return {
        output: results.join('\n'),
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'loop',
          iterations: results.length,
          maxIterations: maxIter,
          workflowId,
          workflowName: workflow.name,
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '循环执行失败'
      return { output: errorMsg, metadata: { nodeId: node.id, type: 'loop', error: errorMsg, label: node.data?.label } }
    }
  }

  /** 将输入解析为数组：优先 JSON.parse，否则按换行拆分 */
  private parseInputAsArray(input: string): string[] {
    if (!input || input.trim().length === 0) return []
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) {
        return parsed.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item))
      }
      return [String(parsed)]
    } catch {
      return input.split('\n').filter(line => line.trim().length > 0)
    }
  }

  /**
   * 将 nodeResults 构建为 $nodes 查找对象
   * 结果格式: { nodeId: { output, metadata, status } }
   */
  private buildNodeContext(nodeResults?: Map<string, any>): Record<string, any> {
    const ctx: Record<string, any> = {}
    if (!nodeResults) return ctx
    for (const [nodeId, result] of nodeResults) {
      ctx[nodeId] = {
        output: result.output,
        metadata: result.metadata,
        status: result.status,
      }
    }
    return ctx
  }

  /**
   * 解析字符串中的 $nodes["xxx"] 或 $nodes.xxx 表达式，替换为实际节点输出
   * 同时支持 {{$nodes["nodeId"].output}} 花括号包裹形式（推荐）和裸写形式。
   * 支持链式字段访问：$nodes["nodeId"].output 或 $nodes["nodeId"].metadata.field
   *
   * 匹配模式:
   *   {{$nodes["nodeId"].field.subfield}}
   *   {{$nodes.nodeId.field.subfield}}
   *   $nodes["nodeId"].field.subfield  (bare)
   */
  private resolveNodeRefs(template: string, nodeResults?: Map<string, any>): string {
    if (!nodeResults || nodeResults.size === 0) return template

    return template.replace(/\{\{\$nodes(?:\["([^"]+)"\]|\.([a-zA-Z_]\w*))((?:\.[a-zA-Z_$][\w$]*)*)\}\}|\$nodes(?:\["([^"]+)"\]|\.([a-zA-Z_]\w*))((?:\.[a-zA-Z_$][\w$]*)*)/g, (match, id1, id2, fieldPath1, id3, id4, fieldPath2) => {
      const nodeId = id1 || id2 || id3 || id4
      const fieldPath = fieldPath1 || fieldPath2 || ''
      const result = nodeResults.get(nodeId)
      if (!result) return match

      // 沿字段路径导航：.output -> ["output"], .metadata.label -> ["metadata","label"]
      const fields = fieldPath ? fieldPath.split('.').filter(Boolean) : []
      let value: any = result
      for (const field of fields) {
        if (value == null) return match
        value = value[field]
      }

      if (value === undefined || value === null) return match
      if (typeof value === 'object') return JSON.stringify(value, null, 2)
      return String(value)
    })
  }

  /**
   * 从数据库加载环境变量并缓存（惰性加载，仅在首次调用时查询 DB）
   */
  private async ensureEnvVarsLoaded(): Promise<Record<string, string>> {
    if (this.envVarsCache) return this.envVarsCache
    try {
      const rows = await EnvVarModel.findAll()
      const map: Record<string, string> = {}
      for (const row of rows) {
        map[row.name] = row.value
      }
      this.envVarsCache = map
      return map
    } catch {
      return {}
    }
  }

  /** 清除环境变量缓存（增/删/改后由外部调用，未来可接入 SSE） */
  clearEnvVarsCache(): void {
    this.envVarsCache = null
  }

  private async evaluateBranches(branches: WorkflowBranch[], input: string, llmConfig: LLMConfig) {
    try {
      const conditionText = branches
        .map((item, index) => `条件${index + 1}: ${item.condition}`)
        .join('\n')

      const prompt = `你是一个条件评估引擎，请根据输入内容判断满足哪个条件。

可用条件:
${conditionText}

输入内容: ${input}

评估规则:
1. 仔细分析输入内容，判断其满足哪个条件
2. 只返回满足条件的序号，不要包含任何其他文字、标点符号或解释
3. 如果多个条件都满足，返回第一个满足条件的序号
4. 如果没有任何条件满足，只返回字符串"null"
5. 返回格式必须严格：要么是条件的序号，要么是"null"

请严格按照以上规则进行评估，只输出结果：`
      const result = await callLLM(prompt, llmConfig, undefined, undefined, { cache: true })
      const cleanResult = result.trim().replace(/[\s\n\r.,，。!！?？;；]/g, '')
      const isValidResult = !Number.isNaN(Number(cleanResult))
      return isValidResult ? branches[Number(cleanResult) - 1].id : 'null'
    } catch (error) {
      console.error('条件评估失败:', error)
      return 'null'
    }
  }

  // 合并当前执行附件与线程级累积附件（按id去重）
  private mergeThreadAttachments(execState?: ExecutionState): AttachmentPayload[] | undefined {
    if (!execState) return undefined
    const threadKey = execState.threadId || execState.agentId || 'default-thread'
    const threadAtts = this.threadAttachments.get(threadKey) || []
    const currentAtts = execState.attachments || []
    const merged = [...threadAtts]
    for (const att of currentAtts) {
      if (!merged.some(e => e.id === att.id)) {
        merged.push(att)
      }
    }
    return merged.length > 0 ? merged : undefined
  }

  // 获取执行状态
  getExecutionState(executionId: string): ExecutionState | undefined {
    return this.executionStates.get(executionId)
  }

  // 获取所有执行摘要（监控列表用）
  getAllExecutions(statusFilter?: string): Array<{
    executionId: string
    workflowName: string
    status: 'running' | 'paused' | 'completed' | 'failed'
    startTime: string
    endTime?: string
    duration?: number
    progress: number
    totalNodes: number
    completedNodes: number
    failedNodes: number
    currentNodeLabel?: string
    agentId?: string
  }> {
    const allStates = Array.from(this.executionStates.values())

    const filtered = statusFilter
      ? allStates.filter(s => s.status === statusFilter)
      : allStates

    return filtered
      .map(state => {
        const nodeResultsArr = Array.from(state.nodeResults.values())
        const totalNodes = state.workflow.nodes.length
        const completedNodes = nodeResultsArr.filter((n: any) => n.status === 'completed').length
        const failedNodes = nodeResultsArr.filter((n: any) => n.status === 'failed').length
        let currentNodeLabel: string | undefined
        if (state.currentNodeId) {
          const node = nodeResultsArr.find((n: any) => n.nodeId === state.currentNodeId)
          currentNodeLabel = node?.metadata?.label || node?.nodeLabel || state.currentNodeId
        }
        return {
          executionId: state.executionId,
          workflowName: state.workflow.name,
          status: state.status,
          startTime: state.startTime.toISOString(),
          endTime: state.endTime?.toISOString(),
          duration: state.endTime
            ? state.endTime.getTime() - state.startTime.getTime()
            : Date.now() - state.startTime.getTime(),
          progress: state.progress,
          totalNodes,
          completedNodes,
          failedNodes,
          currentNodeLabel,
          agentId: state.agentId
        }
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }

  // 停止执行
  stopExecution(executionId: string): void {
    const stopOne = (id: string) => {
      const state = this.executionStates.get(id)
      if (!state || state.status === 'completed') return
      state.status = 'completed'
      state.endTime = new Date()
      state.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: '执行被手动停止'
      })
      console.log(`[LLM Agent] 执行已被用户终止 (${id})`)
      state.abortController?.abort()
      // 拒绝 pendingApproval Promise，让审批回调直接抛异常中断 LLM 执行链
      state.pendingApproval?.reject(new ExecutionTerminatedError())
    }

    stopOne(executionId)
    // 同时停止所有子 agent / 子工作流执行（ID 格式：parentExecutionId:agent:nodeId / parentExecutionId:workflow:nodeId）
    for (const [id] of this.executionStates) {
      if (id.startsWith(`${executionId}:agent:`) || id.startsWith(`${executionId}:workflow:`)) {
        stopOne(id)
      }
    }
  }

  // 暂停执行
  pauseExecution(executionId: string): void {
    const state = this.executionStates.get(executionId)
    if (state && state.status === 'running') {
      state.status = 'paused'
      state.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: '执行已暂停'
      })
    }
  }

  // 恢复执行
  async resumeExecution(executionId: string): Promise<void> {
    try {
      const state = this.executionStates.get(executionId)
      if (!state) {
        throw new Error('无效executionId')
      }
      if (state && state.status === 'paused') {
        state.status = 'running'
        const config = {
          configurable: {
            thread_id: state.threadId
          }
        }
        state.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: '执行已恢复'
        })
        await state.compiledGraph?.invoke(new Command({ resume: true }), config)
        state.compiledGraph?.store?.stop()
        // 检查是否被暂停，如果是则不更新为完成状态
        if (state.status === 'running') {
          // 更新执行状态为完成
          state.status = 'completed'
          state.endTime = new Date()
          state.progress = 100
          state.logs.push({
            timestamp: new Date(),
            level: 'info',
            message: '工作流执行完成'
          })

          // 广播执行完成
          this.broadcastToSSEClients(executionId, {
            type: 'execution_complete',
            executionId,
            status: 'completed',
            progress: 100,
            endTime: state.endTime
          })
        }
      }
    } catch (error) {
      // 检查是否被暂停，如果是则不更新为失败状态
      const state = this.executionStates.get(executionId)
      if (state && state.status === 'running') {
        // 更新执行状态为失败
        state.status = 'failed'
        state.endTime = new Date()
        state.logs.push({
          timestamp: new Date(),
          level: 'error',
          message: `工作流执行失败: ${error instanceof Error ? error.message : '未知错误'}`
        })

        // 广播执行失败
        this.broadcastToSSEClients(executionId, {
          type: 'execution_complete',
          executionId,
          status: 'failed',
          progress: state.progress,
          endTime: state.endTime,
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }
  }
  // SSE相关方法
  // 添加SSE客户端
  addSSEClient(executionId: string, client: any): void {
    if (!this.sseClients.has(executionId)) {
      this.sseClients.set(executionId, [])
    }
    this.sseClients.get(executionId)!.push(client)
  }

  // 移除SSE客户端
  removeSSEClient(executionId: string, client: any): void {
    const clients = this.sseClients.get(executionId)
    if (clients) {
      const index = clients.indexOf(client)
      if (index > -1) {
        clients.splice(index, 1)
      }
      if (clients.length === 0) {
        this.sseClients.delete(executionId)
      }
    }
  }

  // 向指定执行的所有SSE客户端发送更新
  broadcastToSSEClients(executionId: string, data: any): void {
    // 如果是子工作流的审批请求，转发到父 executionId 的 SSE 客户端
    if (data.type === 'tool_approval_required' && (executionId.includes(':agent:') || executionId.includes(':workflow:'))) {
      const parentId = executionId.includes(':agent:') ? executionId.split(':agent:')[0] : executionId.split(':workflow:')[0]
      const subState = this.executionStates.get(executionId)
      const parentState = this.executionStates.get(parentId)
      // 将子工作流的 pendingApproval 同步到父状态，使 approveToolCall 能解析到
      if (subState?.pendingApproval && parentState) {
        parentState.pendingApproval = subState.pendingApproval
      }
      // 向父 execution 的 SSE 客户端发送审批事件
      const parentClients = this.sseClients.get(parentId)
      if (parentClients) {
        const message = `data: ${JSON.stringify(data)}\n\n`
        parentClients.forEach((client) => {
          try { client.res.write(message) } catch { /* ignore */ }
        })
      }
      return
    }

    const clients = this.sseClients.get(executionId)
    if (!clients) return

    const executionState = this.executionStates.get(executionId)
    if (!executionState) return

    const message = `data: ${JSON.stringify(data)}\n\n`

    clients.forEach((client, index) => {
      try {
        client.res.write(message)
      } catch (error) {
        // 如果发送失败，移除该客户端
        console.error('SSE发送失败，移除客户端:', error)
        clients.splice(index, 1)
      }
    })

    // 如果执行完成，清理客户端
    if (executionState.status === 'completed' || executionState.status === 'failed') {
      clients.forEach((client) => {
        try {
          client.res.end()
        } catch (error) {
          console.error('SSE连接关闭失败:', error)
        }
      })
      this.sseClients.delete(executionId)
    }
  }

  // 获取所有活跃的SSE客户端（用于调试）
  getActiveSSEClients(): { executionId: string; clientCount: number }[] {
    return Array.from(this.sseClients.entries()).map(([executionId, clients]) => ({
      executionId,
      clientCount: clients.length
    }))
  }

  // 用户审批工具调用
  approveToolCall(executionId: string, decisions: HITLDecision[]): boolean {
    const execState = this.executionStates.get(executionId)
    if (!execState || !execState.pendingApproval) return false

    const { resolve } = execState.pendingApproval
    const response: HITLResponse = { decisions }
    execState.pendingApproval = null
    resolve(response)
    return true
  }

  // 按工具类型设置会话级放权
  setAutoApprove(executionId: string, toolName: string): boolean {
    const execState = this.executionStates.get(executionId)
    if (!execState) return false

    execState.autoApprovedToolTypes.add(toolName)

    // 如果当前有等待中的审批且包含该工具，立即放行
    if (execState.pendingApproval) {
      const allApproved = execState.pendingApproval.request.actionRequests.every(
        (a) => execState.autoApprovedToolTypes.has(a.name)
      )
      if (allApproved) {
        const { resolve, request } = execState.pendingApproval
        const response: HITLResponse = {
          decisions: request.actionRequests.map(() => ({ type: 'approve' }))
        }
        execState.pendingApproval = null
        resolve(response)
      }
    }

    return true
  }

  // 删除线程的checkpoint记忆和附件数据
  async deleteThread(threadId: string): Promise<void> {
    await checkpointer.deleteThread(threadId)
    this.threadAttachments.delete(threadId)
    this.threadMessages.delete(threadId)
  }

  // 直接对话（无工作流）：直接用 agent 指令调 LLM
  async startDirectChat(
    input: string,
    llmConfig: LLMConfig,
    agent: { id: string; name: string; instructions: string },
    threadId?: string,
    attachments?: AttachmentPayload[],
    enabledTools?: string[],
    autoApprovedTools?: string[],
    skillsContext?: string
  ): Promise<string> {
    const executionId = uuidv4()
    const effectiveThreadId = threadId || agent.id || 'default-thread'

    const minimalWorkflow: Workflow = {
      id: 'direct-chat',
      name: `对话: ${agent.name}`,
      description: '直接对话（无工作流）',
      nodes: [],
      edges: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const executionState: ExecutionState = {
      executionId,
      workflow: minimalWorkflow,
      status: 'running',
      startTime: new Date(),
      nodeResults: new Map(),
      progress: 0,
      logs: [{ timestamp: new Date(), level: 'info', message: `开始直接对话: ${agent.name}` }],
      agentId: agent.id,
      threadId: effectiveThreadId,
      autoApprovedToolTypes: new Set<string>(autoApprovedTools || []),
      pendingApproval: null,
      attachments: [],
      variables: {},
    }

    // 附件落地磁盘
    let diskAttachments: AttachmentPayload[] | undefined
    if (attachments && attachments.length > 0) {
      diskAttachments = []
      for (const att of attachments) {
        try {
          const filePath = await saveAttachmentToDisk(att)
          diskAttachments.push({ id: att.id, name: att.name, type: att.type, size: att.size, category: att.category, filePath })
        } catch {
          diskAttachments.push(att)
        }
      }
      executionState.attachments = diskAttachments
      // 累积到线程级
      const existing = this.threadAttachments.get(effectiveThreadId) || []
      const merged = [...existing]
      for (const att of diskAttachments) {
        if (!merged.some(e => e.id === att.id)) merged.push(att)
      }
      this.threadAttachments.set(effectiveThreadId, merged)
    }

    this.executionStates.set(executionId, executionState)

    // 后台执行
    this.executeDirectChatAsync(executionId, input, llmConfig, agent, effectiveThreadId, diskAttachments, enabledTools, skillsContext)

    return executionId
  }

  private async executeDirectChatAsync(
    executionId: string,
    input: string,
    llmConfig: LLMConfig,
    agent: { id: string; name: string; instructions: string },
    threadId: string,
    attachments?: AttachmentPayload[],
    enabledTools?: string[],
    skillsContext?: string
  ): Promise<void> {
    try {
      const state = this.executionStates.get(executionId)

      // 恢复线程级对话历史
      const conversationHistory = this.threadMessages.get(threadId) || []
      const userMessage = new HumanMessage(input)
      const updatedHistory = [...conversationHistory, userMessage]

      // 构建 prompt：技能参考 + agent 指令 + 用户输入
      let prompt = agent.instructions
      if (skillsContext) {
        prompt = `【技能参考】\n${skillsContext}\n\n${prompt}`
      }
      prompt += `\n\n用户输入: ${input}`

      // 构建 HITL 审批回调（危险工具需要用户确认）
      const hasDangerousTools = (enabledTools || []).some((t: string) => DANGEROUS_TOOLS.includes(t))
      const llmOptions: CallLLMOptions = hasDangerousTools
        ? {
          approvalCallback: async (request: HITLRequest): Promise<HITLResponse> => {
            const execState = this.executionStates.get(executionId)
            if (!execState || execState.status !== 'running') {
              throw new ExecutionTerminatedError()
            }

            // 已放行的工具自动批准
            const needApproval = request.actionRequests.filter(
              a => !execState.autoApprovedToolTypes.has(a.name)
            )
            if (needApproval.length === 0) {
              return { decisions: request.actionRequests.map(() => ({ type: 'approve' })) }
            }

            const approvalPromise = new Promise<HITLResponse>((resolve, reject) => {
              execState.pendingApproval = { resolve, reject, request }
            })

            this.broadcastToSSEClients(executionId, {
              type: 'tool_approval_required',
              executionId,
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
          }
        }
        : {}

      // 调用 LLM
      const extraTools: any[] = []
      if (agent.id === '00000000-0000-0000-0000-000000000001') {
        extraTools.push(createFrontendActionTool(executionId, (id, data) => this.broadcastToSSEClients(id, data)))
        extraTools.push(createGetContextTool())
      }
      const result = await callLLM(prompt, llmConfig, updatedHistory, enabledTools || [], llmOptions, attachments, extraTools)

      // 保存对话历史
      const aiMessage = new AIMessage(result)
      this.threadMessages.set(threadId, [...updatedHistory, aiMessage])

      if (state) {
        state.status = 'completed'
        state.endTime = new Date()
        state.progress = 100
        state.logs.push({ timestamp: new Date(), level: 'info', message: '直接对话完成' })
        state.nodeResults.set('direct-chat', {
          output: result,
          status: 'completed',
          metadata: { nodeId: 'direct-chat', type: 'direct-chat', label: '直接对话' }
        })
        this.broadcastToSSEClients(executionId, {
          type: 'execution_complete', executionId, status: 'completed', progress: 100, endTime: state.endTime
        })
      }
    } catch (error) {
      const state = this.executionStates.get(executionId)
      if (state && state.status === 'running') {
        state.status = 'failed'
        state.endTime = new Date()
        state.logs.push({ timestamp: new Date(), level: 'error', message: `直接对话失败: ${error instanceof Error ? error.message : '未知错误'}` })
        this.broadcastToSSEClients(executionId, {
          type: 'execution_complete', executionId, status: 'failed', progress: state.progress, endTime: state.endTime,
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }
  }
}