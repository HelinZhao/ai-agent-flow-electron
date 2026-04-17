import { Workflow, LLMConfig, WorkflowNode } from '../types'
import { SkillModel } from '../models'
import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { MemorySaver } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import { callLLM, executeApiCall } from '../utils'
import { v4 as uuidv4 } from 'uuid'

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
}
const menory = new MemorySaver()

// 带监控的LangGraph执行器
export class MonitoredLangGraphExecutor {
  private nodeResultMap = new Map<string, any>()
  private executionStates = new Map<string, ExecutionState>()
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
    threadId?: string
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
      ]
    }

    this.executionStates.set(executionId, executionState)

    // 在后台执行工作流
    this.executeWorkflowAsync(executionId, workflow, input, llmConfig, agentId, threadId)

    return executionId
  }

  // 异步执行工作流
  private async executeWorkflowAsync(
    executionId: string,
    workflow: Workflow,
    input: string,
    llmConfig: LLMConfig,
    agentId?: string,
    threadId?: string
  ): Promise<void> {
    try {
      const compiledGraph = await this.buildMonitoredLangGraph(executionId, workflow, llmConfig)
      await this.executeMonitoredLangGraph(compiledGraph, input, executionId, agentId, threadId)

      // 更新执行状态为完成
      const state = this.executionStates.get(executionId)
      if (state) {
        state.status = 'completed'
        state.endTime = new Date()
        state.progress = 100
        state.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: '工作流执行完成'
        })
      }
    } catch (error) {
      // 更新执行状态为失败
      const state = this.executionStates.get(executionId)
      if (state) {
        state.status = 'failed'
        state.endTime = new Date()
        state.logs.push({
          timestamp: new Date(),
          level: 'error',
          message: `工作流执行失败: ${error instanceof Error ? error.message : '未知错误'}`
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

    const graph = new StateGraph(this.WorkflowState)

    // 为每个工作流节点添加LangGraph节点
    for (const node of nodes) {
      const ends = edges.filter((edge) => edge.source === node.id).map((edge) => edge.target)

      graph.addNode(
        node.id,
        async (state: any) => {
          const input = state.messages[state.messages.length - 1]?.content || ''
          const conversationHistory = state.messages || []

          // 更新当前执行节点
          const execState = this.executionStates.get(executionId)
          if (execState) {
            execState.currentNodeId = node.id
            execState.logs.push({
              timestamp: new Date(),
              level: 'info',
              message: `开始执行节点: ${node.data?.label || node.id}`,
              nodeId: node.id
            })
          }

          const nodeResult = await this.executeMonitoredNode(
            executionId,
            node,
            input,
            llmConfig,
            conversationHistory
          )
          this.nodeResultMap.set(node.id, nodeResult)

          if (execState) {
            execState.nodeResults.set(node.id, nodeResult)

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
          const nodeResult = this.nodeResultMap.get(node.id)
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

    return graph.compile({
      checkpointer: menory
    })
  }

  // 执行带监控的LangGraph
  private async executeMonitoredLangGraph(
    compiledGraph: any,
    input: string,
    executionId: string,
    agentId?: string,
    threadId?: string
  ): Promise<string> {
    const config = {
      configurable: {
        thread_id: threadId || agentId || 'default-thread'
      }
    }

    try {
      const initialState = {
        messages: [new HumanMessage(input)]
      }

      const state = this.executionStates.get(executionId)
      if (state) {
        state.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: '开始LangGraph执行'
        })
      }

      const finalState = await compiledGraph.invoke(initialState, config)
      const lastMessage = finalState.messages[finalState.messages.length - 1]

      const executionPaths: string[] = []
      this.nodeResultMap.forEach((item) => {
        executionPaths.push(item.metadata?.label ?? item.metadata?.id)
      })

      const result = `工作流执行顺序：${executionPaths.join(' → ')}\n\n${lastMessage.content || '工作流执行完成'}`

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
    _executionId: string,
    node: WorkflowNode,
    input: string,
    llmConfig: LLMConfig,
    conversationHistory?: BaseMessage[]
  ) {
    const startTime = Date.now()

    try {
      const result = await this.executeNode(node, input, llmConfig, conversationHistory)
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
    node: WorkflowNode,
    input: string,
    llmConfig: LLMConfig,
    conversationHistory?: BaseMessage[]
  ) {
    switch (node.type) {
      case 'start':
        return {
          output: input,
          metadata: { nodeId: node.id, type: 'start', label: node.data?.label }
        }

      case 'skill':
        return await this.executeSkill(node, input, llmConfig, conversationHistory)

      case 'branch':
        return await this.executeBranch(node, input, llmConfig)

      case 'api':
        return await this.executeApi(node, input, llmConfig)

      case 'llm':
        return await this.executeLLM(node, input, llmConfig, conversationHistory)

      case 'agent':
        return await this.executeAgent(node, input, llmConfig, conversationHistory)

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
    conversationHistory?: BaseMessage[]
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
      const result = await callLLM(prompt, llmConfig, conversationHistory)

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
      return {
        output: input,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'skill',
          error: error instanceof Error ? error.message : '技能执行失败'
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
      return {
        output: input,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'api',
          error: error instanceof Error ? error.message : 'API调用失败'
        }
      }
    }
  }

  private async executeAgent(
    node: WorkflowNode,
    input: string,
    llmConfig: LLMConfig,
    conversationHistory?: BaseMessage[]
  ) {
    if (!node.data.config?.agentId) {
      return {
        output: input,
        metadata: {
          nodeId: node.id,
          type: 'agent',
          error: '未配置Agent ID',
          label: node.data?.label
        }
      }
    }

    try {
      const agentInstructions = `Agent ID: ${node.data.config.agentId}\n这是一个Agent节点`
      const prompt = `${agentInstructions}\n\n当前用户输入: ${input}\n\n请根据以上指令处理用户输入，只返回处理后的结果，不要重复用户输入的内容。`
      const result = await callLLM(prompt, llmConfig, conversationHistory)

      return {
        output: result,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'agent',
          agentId: node.data.config.agentId
        }
      }
    } catch (error) {
      return {
        output: input,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'agent',
          error: error instanceof Error ? error.message : 'Agent执行失败'
        }
      }
    }
  }

  private async executeLLM(
    node: WorkflowNode,
    input: string,
    llmConfig: LLMConfig,
    conversationHistory?: BaseMessage[]
  ) {
    try {
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
      const result = await callLLM(finalPrompt, llmConfig, conversationHistory)

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
      return {
        output: input,
        metadata: {
          nodeId: node.id,
          label: node.data?.label,
          type: 'llm',
          error: error instanceof Error ? error.message : 'LLM调用失败'
        }
      }
    }
  }

  private async evaluateBranches(branches: any[], input: string, llmConfig: LLMConfig) {
    try {
      const conditionText = branches
        .map((item, index) => `条件${index + 1} [ID: ${item.id}]: ${item.condition}`)
        .join('\n')

      const prompt = `你是一个条件评估引擎，请根据输入内容判断满足哪个条件。

可用条件:
${conditionText}

输入内容: ${input}

评估规则:
1. 仔细分析输入内容，判断其满足哪个条件
2. 只返回满足条件的ID值，不要包含任何其他文字、标点符号或解释
3. 如果多个条件都满足，返回第一个满足条件的ID
4. 如果没有任何条件满足，只返回字符串"null"
5. 返回格式必须严格：要么是条件ID，要么是"null"

请严格按照以上规则进行评估，只输出结果：`

      const result = await callLLM(prompt, llmConfig)
      const cleanResult = result.trim().replace(/[\s\n\r.,，。!！?？;；]/g, '')

      const isValidResult =
        branches.some((branch) => branch.id === cleanResult) || cleanResult === 'null'

      return isValidResult ? cleanResult : 'null'
    } catch (error) {
      console.error('条件评估失败:', error)
      return 'null'
    }
  }

  // 获取执行状态
  getExecutionState(executionId: string): ExecutionState | undefined {
    return this.executionStates.get(executionId)
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
  resumeExecution(executionId: string): void {
    const state = this.executionStates.get(executionId)
    if (state && state.status === 'paused') {
      state.status = 'running'
      state.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: '执行已恢复'
      })
    }
  }
}
