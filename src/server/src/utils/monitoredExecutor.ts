import { Workflow, LLMConfig, WorkflowNode, WorkflowBranch } from '../types'
import { SkillModel } from '../models'
import {
  StateGraph,
  Annotation,
  START,
  END,
  CompiledStateGraph,
  interrupt,
  Command
} from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import { callLLM } from './llm'
import { executeApiCall } from './api'
import { executeCliCommand, executeCliTemplate } from './cli'
import { HITLRequest, HITLResponse, HITLDecision, CallLLMOptions } from './hitl'
import { getUserDataDir, saveAttachmentToDisk } from './file'
import { AttachmentPayload, safeJsonParse } from './shared'
import { retrieveContext } from './knowledge'
import { v4 as uuidv4 } from 'uuid'
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { DB_FILENAME, DANGEROUS_TOOLS } from '../config'
import { LLMConfigModel, AgentModel, WorkflowModel } from '../models'

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
  pendingApproval: { resolve: (response: HITLResponse) => void; request: HITLRequest } | null
  attachments?: AttachmentPayload[]
}
const checkpointer = SqliteSaver.fromConnString(getUserDataDir(DB_FILENAME));

// 带监控的LangGraph执行器
export class MonitoredLangGraphExecutor {
  private executionStates = new Map<string, ExecutionState>()
  private sseClients = new Map<string, any[]>() // executionId -> SSE clients
  // 线程级附件存储：跨对话累积图片等附件数据，供后续对话的callLLM注入
  private threadAttachments = new Map<string, AttachmentPayload[]>()
  // 当前正在执行的 agentId 栈，用于检测循环调用
  private agentCallStack = new Set<string>()
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
    autoApprovedTools?: string[]
  ): Promise<string> {
    const executionId = uuidv4()

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
      threadId,
      autoApprovedToolTypes: new Set<string>(autoApprovedTools || []),
      pendingApproval: null,
      attachments: [], // 将在下方替换为filePath版本
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

    // 在后台执行工作流
    this.executeWorkflowAsync(executionId, workflow, input, llmConfig, agentId, threadId, attachments)

    return executionId
  }

  // 异步执行工作流
  private async executeWorkflowAsync(
    executionId: string,
    workflow: Workflow,
    input: string,
    llmConfig: LLMConfig,
    agentId?: string,
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
      await this.executeMonitoredLangGraph(compiledGraph, input, executionId, agentId, threadId, attachments)
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
    const branchMap: Record<string, any> = {}
    const branch2NodeMap: Map<string, string[]> = new Map()
    const nodeResults = new Map<string, any>()
    const graph = new StateGraph(this.WorkflowState)

    // 为每个工作流节点添加LangGraph节点
    for (const node of nodes) {
      const ends = edges.filter((edge) => edge.source === node.id).map((edge) => edge.target)
      graph.addNode(
        node.id,
        async (state: any) => {
          const lastMessage = state.messages[state.messages.length - 1]
          let input: string
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

          const nodeResult = await this.executeMonitoredNode(
            executionId,
            node,
            input,
            llmConfig,
            conversationHistory,
            allAttachments
          )
          nodeResults.set(node.id, nodeResult)

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

          if (node.type === 'end' || node.type === 'start' || node.type === 'branch') {
            return { messages: [] }
          }

          const aiMessage = new AIMessage(nodeResult.output)
          return {
            messages: [aiMessage]
          }
        },
        { ends }
      )

      if (node.type === 'branch') {
        node.data.config?.branches?.forEach((branch: any) => {
          branchMap[branch.id] = branch
          branch2NodeMap.set(branch.id, [])
        })

        graph.addConditionalEdges(node.id as any, () => {
          const nodeResult = nodeResults.get(node.id)
          const nodeIds = branch2NodeMap.get(nodeResult?.metadata?.branch) ?? []
          return nodeIds
        })
      }
    }

    for (const edge of edges) {
      if (edge.condition) {
        const value = branch2NodeMap.get(edge.condition)
        value?.push(edge.target)
      } else {
        graph.addEdge(edge.source as any, edge.target as any)
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
    agentId?: string,
    threadId?: string,
    attachments?: AttachmentPayload[]
  ): Promise<string> {
    const config = {
      configurable: {
        thread_id: threadId || agentId || 'default-thread'
      }
    }

    try {
      const initialState = {
        messages: [await buildHumanMessage(input, attachments)]
      }

      const state = this.executionStates.get(executionId)
      if (state) {
        state.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: '开始LangGraph执行'
        })
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

  // 执行带监控的节点
  private async executeMonitoredNode(
    executionId: string,
    node: WorkflowNode,
    input: string,
    llmConfig: LLMConfig,
    conversationHistory?: BaseMessage[],
    attachments?: AttachmentPayload[]
  ) {
    const startTime = Date.now()

    try {
      const result = await this.executeNode(executionId, node, input, llmConfig, conversationHistory, attachments)
      const endTime = Date.now()

      return {
        nodeId: node.id,
        ...result,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: endTime - startTime,
        status: (result as any).error ? 'failed' : 'completed'
      }
    } catch (error) {
      const endTime = Date.now()

      return {
        output: input,
        error: error instanceof Error ? error.message : '节点执行失败',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: endTime - startTime,
        status: 'failed',
        metadata: { nodeId: node.id, type: node.type, label: node.data?.label }
      }
    }
  }

  // 原有的节点执行逻辑
  private async executeNode(
    executionId: string,
    node: WorkflowNode,
    input: string,
    llmConfig: LLMConfig,
    conversationHistory?: BaseMessage[],
    attachments?: AttachmentPayload[]
  ) {
    switch (node.type) {
      case 'start':
        return {
          output: input,
          metadata: { nodeId: node.id, type: 'start', label: node.data?.label }
        }

      case 'skill':
        return await this.executeSkill(node, input, llmConfig, conversationHistory, attachments)

      case 'branch':
        return await this.executeBranch(node, input, llmConfig)

      case 'api':
        return await this.executeApi(node, input, llmConfig)

      case 'llm':
        return await this.executeLLM(executionId, node, input, llmConfig, conversationHistory, attachments)

      case 'agent':
        return await this.executeAgent(executionId, node, input, llmConfig, conversationHistory, attachments)

      case 'cli':
        return await this.executeCli(node, input, llmConfig)

      case 'text':
        return await this.executeText(node, input)

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
  private async executeSkill(
    node: WorkflowNode,
    input: string,
    llmConfig: LLMConfig,
    conversationHistory?: BaseMessage[],
    attachments?: AttachmentPayload[]
  ) {
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

  private async executeBranch(node: WorkflowNode, input: string, llmConfig: LLMConfig) {
    if (!node.data.config?.branches?.length) {
      return {
        output: input,
        metadata: { nodeId: node.id, type: 'branch', branch: null }
      }
    }

    try {
      const branchId = await this.evaluateBranches(node.data.config.branches, input, llmConfig)

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

  private async executeApi(node: WorkflowNode, input: string, llmConfig: LLMConfig) {
    if (!node.data.config?.apiConfig?.url) {
      return {
        output: input,
        metadata: { nodeId: node.id, type: 'api', error: '未配置API URL' }
      }
    }

    try {
      const apiResult = await executeApiCall(node.data.config.apiConfig)
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

  private async executeAgent(
    executionId: string,
    node: WorkflowNode,
    input: string,
    llmConfig: LLMConfig,
    _conversationHistory?: BaseMessage[],
    attachments?: AttachmentPayload[]
  ) {
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
        const result = await this.executeMonitoredLangGraph(subGraph, input, subExecutionId, agent.id, subExecutionId, attachments)
        this.executionStates.delete(subExecutionId)

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
        this.agentCallStack.delete(targetAgentId)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Agent执行失败'
      return { output: errorMsg, metadata: { nodeId: node.id, type: 'agent', error: errorMsg, agentId: node.data.config?.agentId } }
    }
  }

  private async executeLLM(
    executionId: string,
    node: WorkflowNode,
    input: string,
    llmConfig: LLMConfig,
    conversationHistory?: BaseMessage[],
    attachments?: AttachmentPayload[]
  ) {
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
      const variables = node.data.config?.variables || []

      const variablesMap: Record<string, any> = {}
      variables.forEach((variable: any) => {
        variablesMap[variable.name] = variable.defaultValue || ''
      })

      Object.keys(variablesMap).forEach((key) => {
        const placeholder = `{{${key}}}`
        promptTemplate = promptTemplate.replace(new RegExp(placeholder, 'g'), variablesMap[key])
      })

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

      // 构建 HITL 宯批回调
      const hasDangerousTools = enabledTools.some((t: string) => DANGEROUS_TOOLS.includes(t))
      const options: CallLLMOptions = hasDangerousTools
        ? {
          approvalCallback: async (request: HITLRequest): Promise<HITLResponse> => {
            const execState = this.executionStates.get(executionId)
            if (!execState) {
              return { decisions: request.actionRequests.map(() => ({ type: 'reject', message: '执行状态不存在' })) }
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
            const approvalPromise = new Promise<HITLResponse>((resolve) => {
              execState.pendingApproval = { resolve, request }
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

      const result = await callLLM(promptWithRag, llmConfig, conversationHistory, enabledTools, { ...options, cache: node.data.config?.enableCache ?? false }, attachments)

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

  private async executeCli(node: WorkflowNode, input: string, llmConfig: LLMConfig) {
    const cliConfig = node.data.config?.cliConfig
    const templateId = cliConfig?.templateId || 'custom'

    try {
      // 预设模板走 Node.js 函数实现，自定义命令走 shell
      let result: { stdout: string; stderr: string; exitCode: number | null }
      let executedCommand: string

      if (templateId !== 'custom') {
        const variables = cliConfig?.templateVariables || {}
        // 对于 fs 类模板，把 {{input}} 也加入变量替换
        if (variables.content === '{{input}}') {
          variables.content = input
        }
        result = await executeCliTemplate(templateId, variables, {
          workingDirectory: cliConfig?.workingDirectory,
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
        resolvedCommand = resolvedCommand.replace(/\{\{input\}\}/g, input)
        result = await executeCliCommand({
          command: resolvedCommand,
          workingDirectory: cliConfig.workingDirectory,
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

  private async executeText(node: WorkflowNode, _input: string) {
    let textTemplate = node.data.config?.text || ''
    const variables = node.data.config?.variables || []

    const variablesMap: Record<string, any> = {}
    variables.forEach((variable: any) => {
      variablesMap[variable.name] = variable.defaultValue || ''
    })

    Object.keys(variablesMap).forEach((key) => {
      const placeholder = `{{${key}}}`
      textTemplate = textTemplate.replace(new RegExp(placeholder, 'g'), variablesMap[key])
    })

    return {
      output: textTemplate,
      metadata: {
        nodeId: node.id,
        label: node.data?.label,
        type: 'text',
      }
    }
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
    const state = this.executionStates.get(executionId)
    if (state) {
      state.status = 'completed'
      state.endTime = new Date()
      state.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: '执行被手动停止'
      })
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
            thread_id: state.threadId || state.agentId || 'default-thread'
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
    if (data.type === 'tool_approval_required' && executionId.includes(':agent:')) {
      const parentId = executionId.split(':agent:')[0]
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
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function buildHumanMessage(input: string, attachments?: AttachmentPayload[]): Promise<HumanMessage> {
  if (!attachments || attachments.length === 0) {
    return new HumanMessage(input)
  }

  // 构建纯文本内容（图片数据不在LangGraph层面传递，而是在callLLM时注入）
  let textContent = input

  for (const att of attachments) {
    switch (att.category) {
      case 'image':
        textContent += `\n[图片附件: ${att.name}]`
        break
      case 'text':
        if (att.textContent) {
          textContent += `\n\n---\n文件: ${att.name}\n---\n${att.textContent}\n---`
        } else if (att.filePath) {
          try {
            const { loadAttachmentAsText } = await import('./file')
            const content = await loadAttachmentAsText(att.filePath)
            textContent += `\n\n---\n文件: ${att.name}\n---\n${content}\n---`
          } catch {
            textContent += `\n[文本文件: ${att.name} (${att.size} bytes, 内容无法读取)]`
          }
        } else {
          textContent += `\n[文本文件: ${att.name} (${att.size} bytes, 内容无法读取)]`
        }
        break
      case 'pdf':
        textContent += `\n[PDF文件: ${att.name} (${formatSize(att.size)})]`
        break
      case 'binary':
        textContent += `\n[文件: ${att.name} (${att.type}, ${formatSize(att.size)})]`
        break
    }
  }

  return new HumanMessage(textContent)
}
