import { Router } from 'express'
import { Workflow, LLMConfig, WorkflowBranch, WorkflowNode } from '../types'
import { Skill, Agent, Workflow as WorkflowModel, LLMConfig as LLMConfigModel } from '../models'
import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { MemorySaver } from '@langchain/langgraph'
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
const router = Router()
const memory = new MemorySaver()

// 使用真正的LangGraph的执行器
class ServerLangGraphExecutor {
  private nodeResultMap = new Map<string, any>()
  // 定义工作流状态注解
  private WorkflowState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y)
    })
  })

  async executeWorkflow(
    workflow: Workflow,
    input: string,
    llmConfig: LLMConfig,
    agentId?: string,
    threadId?: string
  ): Promise<string> {
    try {
      // 构建LangGraph图结构
      const compiledGraph = await this.buildLangGraph(workflow, llmConfig)
      // 执行工作流
      const result = await this.executeLangGraph(compiledGraph, input, agentId, threadId)

      return result
    } catch (error) {
      throw new Error(`工作流执行失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  private async buildLangGraph(workflow: Workflow, llmConfig: LLMConfig) {
    const nodes = workflow.nodes
    const edges = workflow.edges
    const branchMap: Record<string, WorkflowBranch> = {}
    const branch2NodeMap: Map<string, string[]> = new Map() // key 为分支id，value为可能执行的后置节点id
    // 创建状态图
    const graph = new StateGraph(this.WorkflowState)

    // 为每个工作流节点添加LangGraph节点
    for (const node of nodes) {
      // 普通节点
      const ends = edges.filter((edge) => edge.source === node.id).map((edge) => edge.target)
      graph.addNode(
        node.id,
        async (state: any) => {
          const input = state.messages[state.messages.length - 1]?.content || ''
          const conversationHistory = state.messages || []
          const nodeResult = await this.executeNode(node, input, llmConfig, conversationHistory)
          this.nodeResultMap.set(node.id, nodeResult)
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
        node.data.config.branches.forEach((branche: WorkflowBranch) => {
          branchMap[branche.id] = branche
          branchMap[branche.id] = branche
          branch2NodeMap.set(branche.id, [])
        })
        graph.addConditionalEdges(node.id as any, () => {
          const nodeResult = this.nodeResultMap.get(node.id)
          const nodeIds = branch2NodeMap.get(nodeResult.metadata.branch) ?? []
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
    // 设置入口点
    const startNode = nodes.find((n) => n.type === 'start')
    if (startNode) {
      graph.addEdge(START, startNode.id as any)
    }

    // 设置出口点
    const endNode = nodes.find((n) => n.type === 'end')
    if (endNode) {
      graph.addEdge(endNode.id as any, END)
    }

    return graph.compile({
      checkpointer: memory // 设置记忆（上下文）
    })
  }

  private async executeLangGraph(
    compiledGraph: any,
    input: string,
    agentId?: string,
    threadId?: string
  ) {
    const config = {
      configurable: {
        thread_id: threadId || agentId || 'default-thread'
      }
    }

    try {
      // 构建包含历史消息的初始状态
      const initialState = {
        messages: [new HumanMessage(input)]
      }
      const finalState = await compiledGraph.invoke(initialState, config)
      // 返回最后一条消息的内容
      const lastMessage = finalState.messages[finalState.messages.length - 1]
      const executionPaths: string[] = []
      this.nodeResultMap.forEach((item) => {
        executionPaths.push(item.metadata.label ?? item.metadata.id)
      })
      return `工作流执行顺序：${executionPaths.join(' → ')}\n\n${lastMessage.content || '工作流执行完成'}`
    } catch (error) {
      console.error('LangGraph执行错误:', error)
      throw new Error(`LangGraph执行失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

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
      // 从数据库中获取技能内容
      const skill = await Skill.findByPk(node.data.config.skillId)

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

      // 使用技能的实际内容
      const skillContent = `${skill.name}\n\n描述: ${skill.description}\n\n内容: ${skill.content}`

      // 使用LLM执行技能，明确要求只返回处理结果，不要重复输入内容
      const prompt = `${skillContent}\n\n当前用户输入: ${input}\n\n请根据以上技能内容处理用户输入，只返回处理后的结果，不要重复用户输入的内容。如果只是传递信息，请简洁地总结或转换，避免重复。`
      const result = await this.callLLM(prompt, llmConfig, conversationHistory)

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
      // 执行API调用
      const apiResult = await this.executeApiCall(node.data.config.apiConfig)

      // 使用LLM处理API结果
      const processPrompt = `请处理以下API调用结果，并结合原始输入给出最终答案:\n\n原始输入: ${input}\n\nAPI结果: ${JSON.stringify(apiResult, null, 2)}`
      const result = await this.callLLM(processPrompt, llmConfig)

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
      // 在实际应用中，这里应该从数据库或store中获取Agent信息
      // 为了演示，我们使用一个简单的提示
      const agentInstructions = `Agent ID: ${node.data.config.agentId}\n这是一个Agent节点`

      // 使用Agent的指令和LLM处理输入
      const prompt = `${agentInstructions}\n\n当前用户输入: ${input}\n\n请根据以上指令处理用户输入，只返回处理后的结果，不要重复用户输入的内容。`
      const result = await this.callLLM(prompt, llmConfig, conversationHistory)

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
      // 替换提示词模板中的变量
      let promptTemplate = node.data.config.prompt
      const variables = node.data.config.variables || []

      // 将变量数组转换为对象格式以便替换
      const variablesMap: Record<string, any> = {}
      variables.forEach((variable: any) => {
        variablesMap[variable.name] = variable.defaultValue || ''
      })

      // 替换模板中的变量，支持 {{variableName}} 格式
      Object.keys(variablesMap).forEach((key) => {
        const placeholder = `{{${key}}}`
        promptTemplate = promptTemplate.replace(new RegExp(placeholder, 'g'), variablesMap[key])
      })

      // 将用户输入添加到提示词中
      const finalPrompt = promptTemplate ? `${promptTemplate}\n\n当前用户输入: ${input}` : input

      // 调用LLM
      const result = await this.callLLM(finalPrompt, llmConfig, conversationHistory)

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

  private async evaluateBranches(branches: WorkflowBranch[], input: string, llmConfig: LLMConfig) {
    try {
      const conditionText = branches.map((item) => `条件${item.id}:${item.condition}`).join('\n')
      const prompt = `请评估以下条件是否满足，只需回答条件的id其他文字不需返回,如条件1: a<0;\n条件2:a=0;若满足条件2，则回复2，如都不满足则回复null\n\n${conditionText}\n\n输入内容: ${input}`
      const result = await this.callLLM(prompt, llmConfig)

      return result
    } catch (error) {
      console.error('条件评估失败:', error)
      return 'null'
    }
  }

  private async callLLM(
    prompt: string,
    llmConfig: LLMConfig,
    conversationHistory: BaseMessage[] = []
  ): Promise<string> {
    try {
      const llm = new ChatOpenAI({
        model: llmConfig.model,
        temperature: llmConfig.temperature || 0.7,
        maxTokens: llmConfig.maxTokens || 2000,
        maxRetries: 2,
        apiKey: llmConfig.apiKey,
        // 其他配置参数可以在这里添加
        configuration: {
          baseURL: this.getLLMEndpoint(llmConfig)
        }
      })
      // 调用大模型
      const response = await llm.invoke([...conversationHistory, new HumanMessage(prompt)])
      // 提取响应内容
      return response.content.toString()
    } catch (error) {
      throw new Error(`LLM调用错误: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  private getLLMEndpoint(llmConfig: LLMConfig): string {
    switch (llmConfig.provider) {
      case 'openai':
        return 'https://api.openai.com/v1'
      case 'anthropic':
        return 'https://api.anthropic.com/v1'
      case 'azure':
        return llmConfig.baseUrl || ''
      case 'qwen':
        return llmConfig.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      case 'longcat':
        return llmConfig.baseUrl || 'https://api.longcat.chat/openai/v1'
      default:
        throw new Error(`不支持的LLM提供商: ${llmConfig.provider}`)
    }
  }

  private async executeApiCall(apiConfig: any): Promise<any> {
    try {
      const response = await fetch(apiConfig.url, {
        method: apiConfig.method,
        headers: apiConfig.headers || {},
        body: apiConfig.body ? JSON.stringify(apiConfig.body) : undefined,
        signal: apiConfig.timeout ? AbortSignal.timeout(apiConfig.timeout) : undefined
      })

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw new Error(`API调用错误: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
}

// 执行工作流的路由
router.post('/', async (req, res) => {
  try {
    const { workflow, input, agentId, threadId } = req.body

    // 验证必要参数
    if (!workflow || !input) {
      return res.status(400).json({ error: 'Missing required parameters (workflow and input)' })
    }

    // 查找启用的 LLM 配置
    const activeLLMConfig = await LLMConfigModel.findOne({
      where: { isActive: true }
    })

    if (!activeLLMConfig) {
      return res.status(400).json({
        error: 'No active LLM configuration found',
        message: 'Please configure and activate an LLM configuration first'
      })
    }

    // 将数据库中的 LLM 配置转换为 LLM 配置对象
    const llmConfig: LLMConfig = {
      provider: activeLLMConfig.provider,
      apiKey: activeLLMConfig.apiKey,
      model: activeLLMConfig.model,
      baseUrl: activeLLMConfig.baseUrl,
      temperature: activeLLMConfig.temperature,
      maxTokens: activeLLMConfig.maxTokens
    }

    // 执行工作流
    const executor = new ServerLangGraphExecutor()
    const result = await executor.executeWorkflow(workflow, input, llmConfig, agentId, threadId)

    return res.status(200).json({
      result,
      llmConfigName: activeLLMConfig.name
    })
  } catch (error) {
    console.error('工作流执行错误:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : '工作流执行失败'
    })
  }
})

// AI Agent 对话 API
router.post('/agent-chat', async (req, res) => {
  try {
    const { agentId, input, threadId } = req.body

    // 验证必要参数
    if (!agentId || !input) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '请提供 agentId 和 input 参数'
      })
    }

    // 查找 Agent
    const agent = await Agent.findByPk(agentId)
    if (!agent) {
      return res.status(404).json({
        error: 'Agent 不存在',
        message: `找不到 ID 为 ${agentId} 的 Agent，请检查 Agent ID 是否正确`
      })
    }

    // 检查 Agent 是否绑定了工作流
    if (!agent.workflowId) {
      return res.status(400).json({
        error: 'Agent 未绑定工作流',
        message: `Agent「${agent.name}」尚未绑定工作流，请先为该 Agent 配置工作流后再进行对话`
      })
    }

    // 查找绑定的工作流
    const workflow = await WorkflowModel.findByPk(agent.workflowId)
    if (!workflow) {
      return res.status(404).json({
        error: '工作流不存在',
        message: `Agent「${agent.name}」绑定的工作流不存在，请联系管理员检查配置`
      })
    }

    // 查找启用的 LLM 配置
    const activeLLMConfig = await LLMConfigModel.findOne({
      where: { isActive: true }
    })

    if (!activeLLMConfig) {
      return res.status(400).json({
        error: '未配置大模型',
        message: '请先配置并启用一个大模型配置，然后重试'
      })
    }

    // 将数据库中的工作流数据转换为工作流对象
    const workflowObj: Workflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: JSON.parse(workflow.nodes),
      edges: JSON.parse(workflow.edges),
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    }

    // 将数据库中的 LLM 配置转换为 LLM 配置对象
    const llmConfig: LLMConfig = {
      provider: activeLLMConfig.provider,
      apiKey: activeLLMConfig.apiKey,
      model: activeLLMConfig.model,
      baseUrl: activeLLMConfig.baseUrl,
      temperature: activeLLMConfig.temperature,
      maxTokens: activeLLMConfig.maxTokens
    }

    // 执行工作流
    const executor = new ServerLangGraphExecutor()
    const result = await executor.executeWorkflow(
      workflowObj,
      input,
      llmConfig,
      agentId,
      threadId || agentId // 使用 agentId 作为默认 threadId
    )

    return res.status(200).json({
      success: true,
      result,
      agentName: agent.name,
      workflowName: workflow.name,
      llmConfigName: activeLLMConfig.name
    })
  } catch (error) {
    console.error('AI Agent 对话执行错误:', error)
    return res.status(500).json({
      error: '对话执行失败',
      message: error instanceof Error ? error.message : '未知错误，请稍后重试'
    })
  }
})

export default router
