import { Workflow, LLMConfig, WorkflowBranch } from '../types'
import { StateGraph, Annotation, START, END, CompiledStateGraph, interrupt, Command } from '@langchain/langgraph'
import { BaseMessage, AIMessage } from '@langchain/core/messages'
import { callLLMWithTracking } from './llm'
import { HITLRequest, HITLResponse, HITLDecision, ChoiceRequest, ChoiceResponse, CallLLMOptions } from './hitl'
import { getUserDataDir, saveAttachmentToDisk } from './file'
import { AttachmentPayload, buildHumanMessage } from './shared'
import { v4 as uuidv4 } from 'uuid'
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite'
import { DB_FILENAME, DANGEROUS_TOOLS } from '../config'
import { EnvVarModel } from '../models'
import { createFrontendActionTool, createGetContextTool } from '../tools/frontendTools'
import { ExecutionState, PASSTHROUGH_NODES, ExecutionTerminatedError, NodeExecutorDeps } from './executor/types'
import { executeMonitoredNode } from './executor/nodes'
import { mergeThreadAttachments } from './executor/helpers'
import fs from 'fs'
import path from 'path'

// 确保 checkpoint 数据库目录和表存在
import Database from 'better-sqlite3'

const checkpointPath = getUserDataDir(DB_FILENAME)
fs.mkdirSync(path.dirname(checkpointPath), { recursive: true })

// 手动建表（SqliteSaver.fromConnString 在部分版本下不自动建表）
try {
  const db = new Database(checkpointPath)
  db.exec(`CREATE TABLE IF NOT EXISTS checkpoints (
    thread_id TEXT NOT NULL, checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL, parent_checkpoint_id TEXT,
    type TEXT, checkpoint BLOB, metadata BLOB,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
  )`)
  db.exec(`CREATE TABLE IF NOT EXISTS writes (
    thread_id TEXT NOT NULL, checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL, task_id TEXT NOT NULL,
    idx INTEGER NOT NULL, channel TEXT NOT NULL,
    type TEXT, value BLOB,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
  )`)
  db.close()
} catch (e) {
  console.error('[Checkpoint] 建表失败:', e)
}

const checkpointer = SqliteSaver.fromConnString(checkpointPath)


export class MonitoredLangGraphExecutor {
  private executionStates = new Map<string, ExecutionState>()
  private sseClients = new Map<string, any[]>()
  private threadAttachments = new Map<string, AttachmentPayload[]>()
  private envVarsCache: Record<string, string> | null = null
  private agentCallStack = new Set<string>()
  private workflowCallStack = new Set<string>()

  private AppState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
    }),
  })

  /** 构建 NodeExecutorDeps，供 nodes.ts 中的执行器使用 */
  private getDeps(): NodeExecutorDeps {
    return {
      executionStates: this.executionStates,
      agentCallStack: this.agentCallStack,
      workflowCallStack: this.workflowCallStack,
      envVarsCache: this.envVarsCache,
      buildMonitoredLangGraph: (executionId, workflow, llmConfig) => this.buildMonitoredLangGraph(executionId, workflow, llmConfig),
      executeMonitoredLangGraph: (compiledGraph, input, executionId, threadId, attachments) =>
        this.executeMonitoredLangGraph(compiledGraph, input, executionId, threadId, attachments),
      broadcastToSSEClients: (executionId, data) => this.broadcastToSSEClients(executionId, data),
    }
  }

  // ============================================================
  //  启动执行
  // ============================================================
  async startExecution(
    workflow: Workflow,
    input: string,
    llmConfig: LLMConfig,
    agentId?: string,
    threadId?: string,
    attachments?: AttachmentPayload[],
    autoApprovedTools?: string[],
    params?: Record<string, any>,
  ): Promise<string> {
    const executionId = uuidv4()
    const effectiveThreadId = threadId || executionId

    const executionState: ExecutionState = {
      executionId,
      workflow,
      status: 'running',
      startTime: new Date(),
      nodeResults: new Map(),
      progress: 0,
      logs: [{ timestamp: new Date(), level: 'info', message: `开始执行工作流: ${workflow.name}` }],
      agentId,
      threadId: effectiveThreadId,
      autoApprovedToolTypes: new Set<string>(autoApprovedTools || []),
      pendingApproval: null,
      pendingChoice: null,
      attachments: [],
      params,
      variables: {},
    }

    let diskAttachments: AttachmentPayload[] | undefined
    if (attachments && attachments.length > 0) {
      diskAttachments = []
      for (const att of attachments) {
        try {
          const filePath = await saveAttachmentToDisk(att)
          diskAttachments.push({ id: att.id, name: att.name, type: att.type, size: att.size, category: att.category, filePath })
        } catch (error) {
          console.error(`保存附件 ${att.name} 到磁盘失败:`, error)
          diskAttachments.push(att)
        }
      }
      executionState.attachments = diskAttachments
    }

    this.executionStates.set(executionId, executionState)

    if (diskAttachments && diskAttachments.length > 0) {
      const threadKey = threadId || agentId || 'default-thread'
      const existing = this.threadAttachments.get(threadKey) || []
      const merged = [...existing]
      for (const att of diskAttachments) {
        if (!merged.some(e => e.id === att.id)) merged.push(att)
      }
      this.threadAttachments.set(threadKey, merged)
    }

    this.envVarsCache = null
    await this.ensureEnvVarsLoaded()

    this.executeWorkflowAsync(executionId, workflow, input, llmConfig, effectiveThreadId, attachments)
    return executionId
  }


  // ============================================================
  //  节点测试
  // ============================================================
  async testNode(workflow: Workflow, nodeId: string, input: string, llmConfig: LLMConfig) {
    const node = workflow.nodes.find(n => n.id === nodeId)
    if (!node) return { output: '', duration: 0, status: 'failed', error: '节点不存在' }

    const startTime = Date.now()
    try {
      const result = await executeMonitoredNode(this.getDeps(), {
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
      return { output: '', duration: Date.now() - startTime, status: 'failed', error: error instanceof Error ? error.message : '未知错误' }
    }
  }


  // ============================================================
  //  异步执行工作流
  // ============================================================
  private async executeWorkflowAsync(
    executionId: string,
    workflow: Workflow,
    input: string,
    llmConfig: LLMConfig,
    threadId?: string,
    attachments?: AttachmentPayload[],
  ): Promise<void> {
    try {
      const state = this.executionStates.get(executionId)
      if (!state) throw new Error('无效executionId')

      const compiledGraph = await this.buildMonitoredLangGraph(executionId, workflow, llmConfig)
      state.compiledGraph = compiledGraph
      await this.executeMonitoredLangGraph(compiledGraph, input, executionId, threadId, attachments)

      if (state.status === 'running') {
        state.status = 'completed'
        state.endTime = new Date()
        state.progress = 100
        state.logs.push({ timestamp: new Date(), level: 'info', message: '工作流执行完成' })
        this.broadcastToSSEClients(executionId, { type: 'execution_complete', executionId, status: 'completed', progress: 100, endTime: state.endTime })
      }
    } catch (error) {
      const state = this.executionStates.get(executionId)
      if (state && state.status === 'running') {
        state.status = 'failed'
        state.endTime = new Date()
        state.logs.push({ timestamp: new Date(), level: 'error', message: `工作流执行失败: ${error instanceof Error ? error.message : '未知错误'}` })
        this.broadcastToSSEClients(executionId, { type: 'execution_complete', executionId, status: 'failed', progress: state.progress, endTime: state.endTime, error: error instanceof Error ? error.message : '未知错误' })
      }
    }
  }


  // ============================================================
  //  LangGraph 图构建
  // ============================================================
  private async buildMonitoredLangGraph(executionId: string, workflow: Workflow, llmConfig: LLMConfig) {
    const nodes = workflow.nodes
    const edges = workflow.edges
    const branchMap: Record<string, WorkflowBranch> = {}
    const branch2Targets: Map<string, string[]> = new Map()
    const nodeResults = new Map<string, any>()
    const graph = new StateGraph(this.AppState)
    const connectedNodes = new Set<string>()
    const node2Sources = new Map<string, string[]>()
    const node2Targets = new Map<string, string[]>()
    const mergePredsMap = new Map<string, Set<string>>()
    const edgeGroups = new Map<string, { normal: string[]; error: string | null }>()

    for (const edge of edges) {
      if (edge.target) connectedNodes.add(edge.target)
      if (edge.source) connectedNodes.add(edge.source)

      if (edge.target && edge.source && edge.sourceType !== 'error') {
        if (!node2Sources.has(edge.target)) node2Sources.set(edge.target, [])
        if (!node2Targets.has(edge.source)) node2Targets.set(edge.source, [])
        node2Sources.get(edge.target)!.push(edge.source)
        node2Targets.get(edge.source)!.push(edge.target)
      }

      if (!edgeGroups.has(edge.source)) edgeGroups.set(edge.source, { normal: [], error: null })
      const g = edgeGroups.get(edge.source)!
      if (edge.sourceType === 'error') g.error = edge.target
      else g.normal.push(edge.target)
    }

    const validNodes = nodes.filter(node => connectedNodes.has(node.id))

    for (const node of validNodes) {
      const ends = node2Targets.get(node.id)
      graph.addNode(
        node.id,
        async (state: any) => {
          let input: string
          const lastMessage = state.messages[state.messages.length - 1]
          if (typeof lastMessage?.content === 'string') input = lastMessage.content
          else if (Array.isArray(lastMessage?.content))
            input = lastMessage.content.filter((part: any) => part.type === 'text').map((part: any) => part.text || '').join('\n')
          else input = ''

          const conversationHistory = state.messages || []
          const execState = this.executionStates.get(executionId)

          if (execState) {
            if (execState.status === 'paused') await interrupt('用户手动暂停')
            execState.currentNodeId = node.id
            execState.logs.push({ timestamp: new Date(), level: 'info', message: `开始执行节点: ${node.data?.label || node.id}`, nodeId: node.id })
          }

          const allAttachments = mergeThreadAttachments(this.threadAttachments, execState)
          const deps = this.getDeps()

          const nodeResult = await executeMonitoredNode(deps, {
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
            params: execState?.params,
          })

          if (execState) {
            execState.nodeResults = nodeResults
            const completedNodes = Array.from(execState.nodeResults.values()).filter(r => r.status === 'completed').length
            execState.progress = Math.round((completedNodes / nodes.length) * 100)

            execState.logs.push({
              timestamp: new Date(), level: nodeResult.error ? 'error' : 'info',
              message: nodeResult.error ? `节点执行失败: ${nodeResult.error}` : `节点执行完成: ${node.data?.label || node.id}`,
              nodeId: node.id,
            })

            this.broadcastToSSEClients(executionId, {
              type: 'node_update', executionId, nodeId: node.id, nodeLabel: node.data?.label || node.id,
              input: typeof input === 'object' ? JSON.stringify(input) : String(input || ''),
              output: nodeResult.output || '', status: nodeResult.error ? 'failed' : 'completed',
              progress: execState.progress,
              metrics: {
                executionId: execState.executionId, startTime: execState.startTime, endTime: execState.endTime,
                status: execState.status, totalNodes: nodes.length,
                completedNodes: Array.from(execState.nodeResults.values()).filter(n => n.status === 'completed').length,
                failedNodes: Array.from(execState.nodeResults.values()).filter(n => n.status === 'failed').length,
                progress: execState.progress,
              },
            })
          }

          if (PASSTHROUGH_NODES.has(node.type)) return { messages: [] }

          const aiMessage = new AIMessage({ content: nodeResult.output, name: node.id })
          return { messages: [aiMessage] }
        },
        { ends },
      )

      if (node.type === 'branch') {
        node.data.config?.branches?.forEach((branch: WorkflowBranch) => {
          branchMap[branch.id] = branch
          branch2Targets.set(branch.id, [])
        })
        graph.addConditionalEdges(node.id as any, () => {
          const nodeResult = nodeResults.get(node.id)
          return branch2Targets.get(nodeResult?.metadata?.branch) ?? []
        })
      } else if (node.type === 'if') {
        node.data.config?.branches?.forEach((branch: WorkflowBranch) => branch2Targets.set(branch.id, []))
        graph.addConditionalEdges(node.id as any, () => {
          const nodeResult = nodeResults.get(node.id)
          return branch2Targets.get(nodeResult?.metadata?.branch) ?? []
        })
      } else if (node.type === 'merge') {
        mergePredsMap.set(node.id, new Set(node2Sources.get(node.id) || []))
      }
    }

    for (const [source, group] of edgeGroups) {
      const srcNode = validNodes.find(n => n.id === source)
      if (srcNode?.type === 'branch' || srcNode?.type === 'if') {
        for (const t of group.normal) {
          const e = edges.find(edge => edge.source === source && edge.target === t)
          if (e?.condition) { branch2Targets.get(e.condition)?.push(t) }
          else { graph.addEdge(source as any, t as any) }
        }
        continue
      }

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
        for (const t of group.normal) graph.addEdge(source as any, t as any)
      }
    }

    const startNode = nodes.find(n => n.type === 'start')
    if (startNode) graph.addEdge(START, startNode.id as any)

    const endNode = nodes.find(n => n.type === 'end')
    if (endNode) graph.addEdge(endNode.id as any, END)

    return graph.compile({ checkpointer })
  }


  // ============================================================
  //  LangGraph 执行
  // ============================================================
  private async executeMonitoredLangGraph(
    compiledGraph: CompiledStateGraph<any, any>,
    input: string,
    executionId: string,
    threadId?: string,
    attachments?: AttachmentPayload[],
  ): Promise<string> {
    const abortController = new AbortController()
    const state = this.executionStates.get(executionId)
    if (state) {
      state.abortController = abortController
      state.logs.push({ timestamp: new Date(), level: 'info', message: '开始LangGraph执行' })
    }

    const config = { configurable: { thread_id: threadId }, signal: abortController.signal }

    try {
      const initialState = { messages: [await buildHumanMessage(input, attachments)] }
      const finalState = (await compiledGraph.invoke(initialState, config)) as { messages: BaseMessage[] }
      const lastMessage = finalState.messages[finalState.messages.length - 1]

      const executionPaths: string[] = []
      state?.nodeResults.forEach(item => executionPaths.push(item.metadata?.label ?? item.metadata?.id))

      const result = lastMessage.content + ''

      if (state) {
        state.logs.push({ timestamp: new Date(), level: 'info', message: `执行完成，结果: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}` })
      }
      return result
    } catch (error) {
      const s = this.executionStates.get(executionId)
      if (s) s.logs.push({ timestamp: new Date(), level: 'error', message: `LangGraph执行失败: ${error instanceof Error ? error.message : '未知错误'}` })
      throw error
    }
  }

  // ============================================================
  //  环境变量缓存
  // ============================================================
  private async ensureEnvVarsLoaded(): Promise<Record<string, string>> {
    if (this.envVarsCache) return this.envVarsCache
    try {
      const rows = await EnvVarModel.findAll()
      const map: Record<string, string> = {}
      for (const row of rows) map[row.name] = row.value
      this.envVarsCache = map
      return map
    } catch { return {} }
  }

  clearEnvVarsCache(): void { this.envVarsCache = null }

  // ============================================================
  //  状态查询与列表
  // ============================================================
  getExecutionState(executionId: string): ExecutionState | undefined {
    return this.executionStates.get(executionId)
  }

  getAllExecutions(statusFilter?: string): Array<{
    executionId: string; workflowName: string; status: 'running' | 'paused' | 'completed' | 'failed'
    startTime: string; endTime?: string; duration?: number; progress: number; totalNodes: number
    completedNodes: number; failedNodes: number; currentNodeLabel?: string; agentId?: string
  }> {
    const allStates = Array.from(this.executionStates.values())
    const filtered = statusFilter ? allStates.filter(s => s.status === statusFilter) : allStates
    return filtered.map(state => {
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
        executionId: state.executionId, workflowName: state.workflow.name, status: state.status,
        startTime: state.startTime.toISOString(), endTime: state.endTime?.toISOString(),
        duration: state.endTime ? state.endTime.getTime() - state.startTime.getTime() : Date.now() - state.startTime.getTime(),
        progress: state.progress, totalNodes, completedNodes, failedNodes, currentNodeLabel, agentId: state.agentId,
      }
    }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }


  // ============================================================
  //  停止 / 暂停 / 恢复
  // ============================================================
  stopExecution(executionId: string): void {
    const stopOne = (id: string) => {
      const state = this.executionStates.get(id)
      if (!state || state.status === 'completed') return
      state.status = 'completed'
      state.endTime = new Date()
      state.logs.push({ timestamp: new Date(), level: 'info', message: '执行被手动停止' })
      console.log(`[LLM Agent] 执行已被用户终止 (${id})`)
      state.abortController?.abort()
      state.pendingApproval?.reject(new ExecutionTerminatedError())
      state.pendingChoice?.reject(new ExecutionTerminatedError())
    }
    stopOne(executionId)
    for (const [id] of this.executionStates) {
      if (id.startsWith(`${executionId}:agent:`) || id.startsWith(`${executionId}:workflow:`)) stopOne(id)
    }
  }

  pauseExecution(executionId: string): void {
    const state = this.executionStates.get(executionId)
    if (state && state.status === 'running') {
      state.status = 'paused'
      state.logs.push({ timestamp: new Date(), level: 'info', message: '执行已暂停' })
    }
  }

  async resumeExecution(executionId: string): Promise<void> {
    try {
      const state = this.executionStates.get(executionId)
      if (!state) throw new Error('无效executionId')
      if (state.status === 'paused') {
        state.status = 'running'
        const config = { configurable: { thread_id: state.threadId } }
        state.logs.push({ timestamp: new Date(), level: 'info', message: '执行已恢复' })
        await state.compiledGraph?.invoke(new Command({ resume: true }), config)
        state.compiledGraph?.store?.stop()
        if (state.status === 'running') {
          state.status = 'completed'
          state.endTime = new Date()
          state.progress = 100
          state.logs.push({ timestamp: new Date(), level: 'info', message: '工作流执行完成' })
          this.broadcastToSSEClients(executionId, { type: 'execution_complete', executionId, status: 'completed', progress: 100, endTime: state.endTime })
        }
      }
    } catch (error) {
      const state = this.executionStates.get(executionId)
      if (state && state.status === 'running') {
        state.status = 'failed'
        state.endTime = new Date()
        state.logs.push({ timestamp: new Date(), level: 'error', message: `工作流执行失败: ${error instanceof Error ? error.message : '未知错误'}` })
        this.broadcastToSSEClients(executionId, { type: 'execution_complete', executionId, status: 'failed', progress: state.progress, endTime: state.endTime, error: error instanceof Error ? error.message : '未知错误' })
      }
    }
  }

  // ============================================================
  //  SSE 推送
  // ============================================================
  addSSEClient(executionId: string, client: any): void {
    if (!this.sseClients.has(executionId)) this.sseClients.set(executionId, [])
    this.sseClients.get(executionId)!.push(client)
  }

  removeSSEClient(executionId: string, client: any): void {
    const clients = this.sseClients.get(executionId)
    if (clients) {
      const index = clients.indexOf(client)
      if (index > -1) clients.splice(index, 1)
      if (clients.length === 0) this.sseClients.delete(executionId)
    }
  }

  broadcastToSSEClients(executionId: string, data: any): void {
    if (data.type === 'tool_approval_required' && (executionId.includes(':agent:') || executionId.includes(':workflow:'))) {
      const parentId = executionId.includes(':agent:') ? executionId.split(':agent:')[0] : executionId.split(':workflow:')[0]
      const subState = this.executionStates.get(executionId)
      const parentState = this.executionStates.get(parentId)
      if (subState?.pendingApproval && parentState) parentState.pendingApproval = subState.pendingApproval
      const parentClients = this.sseClients.get(parentId)
      if (parentClients) parentClients.forEach(client => { try { client.res.write(`data: ${JSON.stringify(data)}\n\n`) } catch { /* ignore */ } })
      return
    }

    const clients = this.sseClients.get(executionId)
    if (!clients || !this.executionStates.get(executionId)) return
    const message = `data: ${JSON.stringify(data)}\n\n`
    clients.forEach((client, index) => {
      try { client.res.write(message) }
      catch (error) { console.error('SSE发送失败，移除客户端:', error); clients.splice(index, 1) }
    })

    const executionState = this.executionStates.get(executionId)
    if (executionState && (executionState.status === 'completed' || executionState.status === 'failed')) {
      clients.forEach(client => { try { client.res.end() } catch (error) { console.error('SSE连接关闭失败:', error) } })
      this.sseClients.delete(executionId)
    }
  }

  getActiveSSEClients(): { executionId: string; clientCount: number }[] {
    return Array.from(this.sseClients.entries()).map(([executionId, clients]) => ({ executionId, clientCount: clients.length }))
  }

  // ============================================================
  //  HITL 审批
  // ============================================================
  approveToolCall(executionId: string, decisions: HITLDecision[]): boolean {
    const execState = this.executionStates.get(executionId)
    if (!execState || !execState.pendingApproval) return false
    const { resolve } = execState.pendingApproval
    execState.pendingApproval = null
    resolve({ decisions })
    return true
  }

  submitChoice(executionId: string, response: ChoiceResponse): boolean {
    const execState = this.executionStates.get(executionId)
    if (!execState || !execState.pendingChoice) return false
    const { resolve } = execState.pendingChoice
    execState.pendingChoice = null
    resolve(response)
    return true
  }

  setAutoApprove(executionId: string, toolName: string): boolean {
    const execState = this.executionStates.get(executionId)
    if (!execState) return false
    execState.autoApprovedToolTypes.add(toolName)

    if (execState.pendingApproval) {
      const allApproved = execState.pendingApproval.request.actionRequests.every(a => execState.autoApprovedToolTypes.has(a.name))
      if (allApproved) {
        const { resolve, request } = execState.pendingApproval
        execState.pendingApproval = null
        resolve({ decisions: request.actionRequests.map(() => ({ type: 'approve' })) })
      }
    }
    return true
  }


  // ============================================================
  //  线程管理
  // ============================================================
  async deleteThread(threadId: string): Promise<void> {
    await checkpointer.deleteThread(threadId)
    this.threadAttachments.delete(threadId)
  }


  // ============================================================
  //  直接对话（无工作流）
  // ============================================================
  async startDirectChat(
    input: string, llmConfig: LLMConfig, agent: { id: string; name: string; instructions: string },
    threadId?: string, attachments?: AttachmentPayload[], enabledTools?: string[],
    autoApprovedTools?: string[], skillsContext?: string, workingDirectory?: string,
  ): Promise<string> {
    const executionId = uuidv4()
    const effectiveThreadId = threadId || agent.id || 'default-thread'

    const minimalWorkflow: Workflow = {
      id: 'direct-chat', name: `对话: ${agent.name}`, description: '直接对话（无工作流）',
      nodes: [], edges: [], createdAt: new Date(), updatedAt: new Date(),
    }

    const executionState: ExecutionState = {
      executionId, workflow: minimalWorkflow, status: 'running', startTime: new Date(),
      nodeResults: new Map(), progress: 0,
      logs: [{ timestamp: new Date(), level: 'info', message: `开始直接对话: ${agent.name}` }],
      agentId: agent.id, threadId: effectiveThreadId,
      autoApprovedToolTypes: new Set<string>(autoApprovedTools || []),
      pendingApproval: null, pendingChoice: null, attachments: [], variables: {},
    }

    let diskAttachments: AttachmentPayload[] | undefined
    if (attachments && attachments.length > 0) {
      diskAttachments = []
      for (const att of attachments) {
        try {
          const filePath = await saveAttachmentToDisk(att)
          diskAttachments.push({ id: att.id, name: att.name, type: att.type, size: att.size, category: att.category, filePath })
        } catch { diskAttachments.push(att) }
      }
      executionState.attachments = diskAttachments
      const existing = this.threadAttachments.get(effectiveThreadId) || []
      const merged = [...existing]
      for (const att of diskAttachments) if (!merged.some(e => e.id === att.id)) merged.push(att)
      this.threadAttachments.set(effectiveThreadId, merged)
    }

    this.executionStates.set(executionId, executionState)
    this.executeDirectChatAsync(executionId, input, llmConfig, agent, effectiveThreadId, diskAttachments, enabledTools, skillsContext, workingDirectory)
    return executionId
  }

  private async executeDirectChatAsync(
    executionId: string, input: string, llmConfig: LLMConfig,
    agent: { id: string; name: string; instructions: string }, threadId: string,
    attachments?: AttachmentPayload[], enabledTools?: string[], skillsContext?: string,
    workingDirectory?: string,
  ): Promise<void> {
    try {
      const state = this.executionStates.get(executionId)

      let prompt = agent.instructions
      if (skillsContext) prompt = `【技能参考】\n${skillsContext}\n\n${prompt}`
      if (workingDirectory) prompt = `【工作目录】\n${workingDirectory}\n\n${prompt}`
      prompt += `\n\n用户输入: ${input}`

const choiceCallback = async (request: ChoiceRequest): Promise<ChoiceResponse> => {
        const execState = this.executionStates.get(executionId)
        if (!execState || execState.status !== 'running') throw new ExecutionTerminatedError()
        const choicePromise = new Promise<ChoiceResponse>((resolve, reject) => { execState.pendingChoice = { resolve, reject, request } })
        this.broadcastToSSEClients(executionId, { type: 'user_choice_required', executionId, question: request.question, options: request.options, allowMultiSelect: request.allowMultiSelect })
        return await choicePromise
      }

      const hasDangerousTools = (enabledTools || []).some((t: string) => DANGEROUS_TOOLS.includes(t))
      const llmOptions: CallLLMOptions = {
        choiceCallback,
        ...(hasDangerousTools
          ? {
            approvalCallback: async (request: HITLRequest): Promise<HITLResponse> => {
              const execState = this.executionStates.get(executionId)
              if (!execState || execState.status !== 'running') throw new ExecutionTerminatedError()
              const needApproval = request.actionRequests.filter(a => !execState.autoApprovedToolTypes.has(a.name))
              if (needApproval.length === 0) return { decisions: request.actionRequests.map(() => ({ type: 'approve' })) }
              const approvalPromise = new Promise<HITLResponse>((resolve, reject) => { execState.pendingApproval = { resolve, reject, request } })
              this.broadcastToSSEClients(executionId, { type: 'tool_approval_required', executionId, actionRequests: needApproval, reviewConfigs: request.reviewConfigs.filter(rc => needApproval.some(a => a.name === rc.actionName)) })
              const userResponse = await approvalPromise
              const decisions: HITLDecision[] = request.actionRequests.map(action => {
                if (execState.autoApprovedToolTypes.has(action.name)) return { type: 'approve' }
                return userResponse.decisions.find(d => d.type !== 'approve' || needApproval.some(a => a.name === action.name)) || { type: 'approve' }
              })
              return { decisions }
            }
          }
          : {}),
      }

      const extraTools: any[] = []
      if (agent.id === '00000000-0000-0000-0000-000000000001') {
        extraTools.push(createFrontendActionTool(executionId, (id, data) => this.broadcastToSSEClients(id, data)))
        extraTools.push(createGetContextTool())
      }
      const result = await callLLMWithTracking({ executionId, llmConfig, prompt, enabledTools: enabledTools || [], options: llmOptions, attachments, extraTools, checkpointer, threadId })

      if (state) {
        state.status = 'completed'
        state.endTime = new Date()
        state.progress = 100
        state.logs.push({ timestamp: new Date(), level: 'info', message: '直接对话完成' })
        state.nodeResults.set('direct-chat', { output: result, status: 'completed', metadata: { nodeId: 'direct-chat', type: 'direct-chat', label: '直接对话' } })
        this.broadcastToSSEClients(executionId, { type: 'execution_complete', executionId, status: 'completed', progress: 100, endTime: state.endTime })
      }
    } catch (error) {
      const state = this.executionStates.get(executionId)
      if (state && state.status === 'running') {
        state.status = 'failed'
        state.endTime = new Date()
        state.logs.push({ timestamp: new Date(), level: 'error', message: `直接对话失败: ${error instanceof Error ? error.message : '未知错误'}` })
        this.broadcastToSSEClients(executionId, { type: 'execution_complete', executionId, status: 'failed', progress: state.progress, endTime: state.endTime, error: error instanceof Error ? error.message : '未知错误' })
      }
    }
  }
}