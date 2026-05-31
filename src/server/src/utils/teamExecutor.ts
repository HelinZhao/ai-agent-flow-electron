import { LLMConfigModel, AgentModel, TeamModel } from '../models'
import { callLLMWithTracking } from './llm'
import { safeJsonParse, buildSkillsContext } from './shared'
import { teamExecutionTracker } from './teamExecutionTracker'
import { resetLogFile } from './teamExecutionFileStore'
import type { LLMConfig } from '../types'
import type { CallLLMOptions } from './hitl'

// ============================================================
//  可复用的团队执行逻辑（脱离 Workflow 节点上下文）
//  同时被 nodes.ts（工作流 Team 节点）和独立路由（直聊/触发器）使用
// ============================================================

export interface TeamExecParams {
  teamId: string
  taskDescription: string
  llmConfig: LLMConfig
  executionId: string
  nodeId: string
  logCallback?: (msg: string) => void
  signal?: AbortSignal
  tracker?: typeof teamExecutionTracker
  /** 团队名称（供 tracker 使用） */
  teamName?: string
  /** 任务标题（供 tracker 使用） */
  taskTitle?: string
  /** 团队配置：使用工具无需审批，自动放行 */
  autoApproveTools?: boolean
}

// ============================================================
//  内部辅助
// ============================================================

/** 解析 Agent 专属 LLM 配置 */
async function resolveAgentLlmConfig(agent: any, defaultLlmConfig: LLMConfig): Promise<LLMConfig> {
  if (agent.llmConfigId) {
    const dbConfig = await LLMConfigModel.findByPk(agent.llmConfigId)
    if (dbConfig) {
      return {
        provider: dbConfig.provider, apiKey: dbConfig.apiKey, model: dbConfig.model,
        baseUrl: dbConfig.baseUrl, temperature: dbConfig.temperature, maxTokens: dbConfig.maxTokens,
      }
    }
  }
  return defaultLlmConfig
}

/** 调用单个 Agent 并返回文本结果 */
async function callAgent(
  executionId: string, nodeId: string, llmConfig: LLMConfig,
  agent: any, prompt: string, signal?: AbortSignal,
  approvalCallback?: CallLLMOptions['approvalCallback'],
): Promise<string> {
  const agentLlmConfig = await resolveAgentLlmConfig(agent, llmConfig)

  const skillIds: string[] = agent.skillIds ? safeJsonParse(agent.skillIds, []) : []
  const enabledTools: string[] = agent.enabledTools ? safeJsonParse(agent.enabledTools, []) : []

  let finalPrompt = prompt
  let finalTools = enabledTools

  if (skillIds.length > 0) {
    const { skillsContext, enabledTools: updatedTools } = await buildSkillsContext(skillIds, enabledTools)
    finalPrompt = `${skillsContext}\n\n---\n\n${prompt}`
    finalTools = updatedTools
  }

  return await callLLMWithTracking(
    executionId, nodeId,
    agentLlmConfig.provider, agentLlmConfig.model,
    finalPrompt, agentLlmConfig,
    undefined, finalTools, { signal, approvalCallback }, undefined,
  )
}

function buildMemberListText(agentMap: Map<string, any>, memberIds: string[]): string {
  return memberIds.map(mid => {
    const a = agentMap.get(mid)
    if (!a) return `- ${mid}: 未找到`
    return `- ${a.name}: ${a.description || '暂无描述'}`
  }).join('\n')
}

function getMemberName(agentMap: Map<string, any>, id: string): string {
  return agentMap.get(id)?.name || id
}

/** 带 tracker 调用的成员执行包装 */
async function callMemberWithTracking(
  params: TeamExecParams, agentMap: Map<string, any>,
  memberId: string, role: 'captain' | 'member',
  prompt: string,
): Promise<string> {
  const memberName = getMemberName(agentMap, memberId)
  const member = agentMap.get(memberId)
  const tracker = params.tracker
  const execId = params.executionId

  tracker?.pushMemberStatus(execId, { memberId, memberName, role, status: 'thinking' })

  // 构造带有 HITL 的 approvalCallback
  const approvalCallback: CallLLMOptions['approvalCallback'] = member?.enabledTools?.length
    ? async (request) => {
        // 团队配置了无需审批→所有工具自动放行（不创建待审批条目）
        if (params.autoApproveTools) {
          tracker?.pushMemberStatus(execId, { memberId, memberName, role, status: 'using_tool', toolName: request.actionRequests[0]?.name, toolArgs: request.actionRequests[0]?.args })
          return { decisions: request.actionRequests.map(() => ({ type: 'approve' })) }
        }
        // 过滤已自动审批的工具
        const needApproval = request.actionRequests.filter(a => !tracker?.isToolAutoApproved(execId, a.name))
        if (needApproval.length === 0) {
          return { decisions: request.actionRequests.map(() => ({ type: 'approve' })) }
        }
        tracker?.pushMemberStatus(execId, { memberId, memberName, role, status: 'using_tool', toolName: needApproval[0]?.name, toolArgs: needApproval[0]?.args })
        const filteredRequest = { actionRequests: needApproval, reviewConfigs: request.reviewConfigs.filter(rc => needApproval.some(a => a.name === rc.actionName)) }
        return await tracker.registerPendingApproval(execId, filteredRequest)
      }
    : undefined

  try {
    const result = await callAgent(
      execId, params.nodeId, params.llmConfig,
      member, prompt, params.signal, approvalCallback,
    )
    tracker?.pushMemberOutput(execId, { memberId, memberName, role, output: result })
    tracker?.pushMemberStatus(execId, { memberId, memberName, role, status: 'done' })
    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '执行失败'
    tracker?.pushMemberStatus(execId, { memberId, memberName, role, status: 'error', output: errorMsg })
    throw error
  }
}

// ============================================================
//  三种协作模式
// ============================================================

async function executeCaptainDistribute(
  params: TeamExecParams, team: any, agentMap: Map<string, any>, memberIds: string[],
) {
  const captain = team.captainId ? agentMap.get(team.captainId) : null
  const { logCallback } = params

  // Step 1: 队长拆解
  const assignments: Record<string, string> = {}
  const assignAllFallback = () => {
    for (const mid of memberIds) assignments[mid] = params.taskDescription
  }

  if (captain) {
    const memberListText = buildMemberListText(agentMap, memberIds)
    const decompPrompt = [
      `你是团队「${team.name}」的队长 ${captain.name}。`,
      ``,
      `【团队任务】`,
      params.taskDescription,
      ``,
      `【团队成员】`,
      memberListText,
      ``,
      `请将上述任务拆分为子任务，并分配给合适的成员。`,
      `以 JSON 格式返回，格式为:`,
      `{`,
      `  "assignments": [`,
      `    { "memberId": "...", "subtask": "..." },`,
      `    ...`,
      `  ]`,
      `}`,
    ].join('\n')

    logCallback?.(`队长 ${captain.name} 开始拆解任务`)
    params.tracker?.pushMemberStatus(params.executionId, { memberId: team.captainId, memberName: captain.name, role: 'captain', status: 'thinking' })

    try {
      const decompResult = await callAgent(
        params.executionId, params.nodeId, params.llmConfig,
        captain, decompPrompt, params.signal,
      )
      if (decompResult) {
        params.tracker?.pushMemberOutput(params.executionId, { memberId: team.captainId, memberName: captain.name, role: 'captain', output: `队长拆解完成:\n${decompResult.slice(0, 500)}` })
      }
      const parsed: any = safeJsonParse(decompResult, null)
      if (parsed && parsed.assignments && Array.isArray(parsed.assignments)) {
        for (const a of parsed.assignments) {
          if (a.memberId && a.subtask) assignments[a.memberId] = a.subtask
        }
      }
      for (const mid of memberIds) {
        if (!assignments[mid]) assignments[mid] = params.taskDescription
      }
    } catch {
      assignAllFallback()
    }
  } else {
    assignAllFallback()
  }

  // Step 2: 成员执行
  const memberResults: Record<string, { output: string; error?: string }> = {}
  const orderedMembers = team.captainId
    ? memberIds.filter(id => id !== team.captainId)
    : memberIds

  for (const mid of orderedMembers) {
    const subtask = assignments[mid] || params.taskDescription
    const member = agentMap.get(mid)

    if (!member) {
      memberResults[mid] = { output: '', error: `Agent ${mid} 未找到` }
      continue
    }

    const memberPrompt = [
      `你所在的团队「${team.name}」正在执行任务。`,
      ``,
      `分配给你的子任务：`,
      subtask,
      ``,
      member.instructions,
      ``,
      `请完成你的子任务并直接输出结果。`,
    ].join('\n')

    logCallback?.(`成员 ${member.name} 开始执行子任务`)

    try {
      const result = await callMemberWithTracking(params, agentMap, mid, 'member', memberPrompt)
      memberResults[mid] = { output: result }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '成员执行失败'
      memberResults[mid] = { output: '', error: errorMsg }
      logCallback?.(`成员 ${member.name} 执行失败: ${errorMsg}`)
    }
  }

  // Step 3: 汇总
  let finalOutput: string

  if (captain) {
    const resultsText = orderedMembers
      .map(mid => {
        const name = getMemberName(agentMap, mid)
        const r = memberResults[mid]
        if (r.error) return `${name}: [失败] ${r.error}`
        return `${name}:\n${r.output}`
      })
      .join('\n\n')

    const synthesisPrompt = [
      `你是团队「${team.name}」的队长 ${captain.name}。`,
      ``,
      `以下是团队成员完成各自子任务后的结果：`,
      ``,
      resultsText,
      ``,
      `原始任务：`,
      params.taskDescription,
      ``,
      `请汇总所有成员的工作成果，形成一个完整的最终输出。如果某些成员执行失败，忽略其部分即可。`,
    ].join('\n')

    try {
      finalOutput = await callAgent(
        params.executionId, params.nodeId, params.llmConfig,
        captain, synthesisPrompt, params.signal,
      )
    } catch {
      finalOutput = orderedMembers
        .map(mid => `--- ${getMemberName(agentMap, mid)} ---\n${memberResults[mid].output || memberResults[mid].error || '无输出'}`)
        .join('\n\n')
    }
  } else {
    finalOutput = orderedMembers
      .map(mid => `--- ${getMemberName(agentMap, mid)} ---\n${memberResults[mid].output || memberResults[mid].error || '无输出'}`)
      .join('\n\n')
  }

  const successCount = Object.values(memberResults).filter(r => !r.error).length
  return {
    output: finalOutput,
    metadata: { mode: 'captain_distribute', memberCount: orderedMembers.length, successCount, hasCaptain: !!captain },
  }
}

async function executeDiscuss(
  params: TeamExecParams, team: any, agentMap: Map<string, any>, memberIds: string[],
) {
  const captain = team.captainId ? agentMap.get(team.captainId) : null
  const { logCallback } = params

  const memberResults: Record<string, { output: string; error?: string }> = {}

  const promises = memberIds.map(async (mid) => {
    const member = agentMap.get(mid)
    if (!member) {
      memberResults[mid] = { output: '', error: `Agent ${mid} 未找到` }
      return
    }

    const discussPrompt = [
      `你所在的团队「${team.name}」正在进行全员讨论。`,
      ``,
      `任务：`,
      params.taskDescription,
      ``,
      member.instructions,
      ``,
      `请基于你的专业知识独立分析此任务，输出你的见解和方案。`,
    ].join('\n')

    try {
      const result = await callMemberWithTracking(params, agentMap, mid, 'member', discussPrompt)
      memberResults[mid] = { output: result }
      logCallback?.(`成员 ${member.name} 完成讨论输出`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '成员执行失败'
      memberResults[mid] = { output: '', error: errorMsg }
    }
  })

  await Promise.all(promises)

  let finalOutput: string

  if (captain) {
    const resultsText = memberIds
      .map(mid => {
        const name = getMemberName(agentMap, mid)
        const r = memberResults[mid]
        if (r.error) return `${name}: [失败] ${r.error}`
        return `${name}:\n${r.output}`
      })
      .join('\n\n')

    const synthesisPrompt = [
      `你是团队「${team.name}」的队长 ${captain.name}。`,
      ``,
      `团队成员对以下任务进行了独立分析：`,
      params.taskDescription,
      ``,
      `各自的输出：`,
      resultsText,
      ``,
      `请汇总所有成员的观点，提取共识，指出分歧，形成一份综合性的最终结论。`,
    ].join('\n')

    try {
      finalOutput = await callAgent(
        params.executionId, params.nodeId, params.llmConfig,
        captain, synthesisPrompt, params.signal,
      )
    } catch {
      finalOutput = memberIds
        .map(mid => `--- ${getMemberName(agentMap, mid)} ---\n${memberResults[mid].output || memberResults[mid].error || '无输出'}`)
        .join('\n\n')
    }
  } else {
    finalOutput = memberIds
      .map(mid => `--- ${getMemberName(agentMap, mid)} ---\n${memberResults[mid].output || memberResults[mid].error || '无输出'}`)
      .join('\n\n')
  }

  const successCount = Object.values(memberResults).filter(r => !r.error).length
  return {
    output: finalOutput,
    metadata: { mode: 'discuss', memberCount: memberIds.length, successCount, hasCaptain: !!captain },
  }
}

async function executePipeline(
  params: TeamExecParams, team: any, agentMap: Map<string, any>, memberIds: string[],
) {
  const { logCallback } = params

  const orderedMembers = team.captainId
    ? [team.captainId, ...memberIds.filter(id => id !== team.captainId)]
    : memberIds

  let currentInput = params.taskDescription
  let lastOutput = ''
  let pipelineSuccessCount = 0

  for (let i = 0; i < orderedMembers.length; i++) {
    const mid = orderedMembers[i]
    const member = agentMap.get(mid)

    if (!member) {
      lastOutput = `[Agent ${mid} 未找到]`
      continue
    }

    const isFirst = i === 0
    const promptParts: string[] = []

    if (isFirst) {
      promptParts.push(
        `你是一个处理流水线的第一个环节。`,
        ``,
        `团队任务：`,
        params.taskDescription,
        ``,
        member.instructions,
        ``,
        `请处理上述任务，将结果传递给下一个环节。`,
      )
    } else {
      promptParts.push(
        `你是一个处理流水线的第 ${i + 1} 个环节。`,
        ``,
        `原始任务：`,
        params.taskDescription,
        ``,
        `上一环节的输出：`,
        currentInput,
        ``,
        member.instructions,
        ``,
        `请基于上一环节的输出继续处理，输出你处理后的结果。`,
      )
    }

    logCallback?.(`流水线环节 ${i + 1}/${orderedMembers.length}: ${member.name}`)

    try {
      const role = team.captainId && mid === team.captainId ? 'captain' : 'member'
      lastOutput = await callMemberWithTracking(params, agentMap, mid, role, promptParts.join('\n'))
      pipelineSuccessCount++
      currentInput = lastOutput
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '流水线环节执行失败'
      lastOutput = `[${member.name} 执行失败] ${errorMsg}`
      logCallback?.(`流水线环节 ${member.name} 失败: ${errorMsg}`)
      currentInput = lastOutput
    }
  }

  return {
    output: lastOutput,
    metadata: { mode: 'pipeline', memberCount: orderedMembers.length, successCount: pipelineSuccessCount },
  }
}

// ============================================================
//  公开入口
// ============================================================

/**
 * 独立执行团队协作（不依赖工作流节点上下文）。
 * 被以下入口共用：
 *   1. Workflow Team 节点（nodes.ts）
 *   2. POST /team-chat-monitor（直聊）
 *   3. Trigger fireTrigger（cron/webhook）
 *   4. taskPool 节点（需求池）
 */
export async function executeTeamStandalone(params: TeamExecParams): Promise<{
  output: string
  metadata: Record<string, any>
}> {
  const team = await TeamModel.findByPk(params.teamId)
  if (!team) {
    return { output: '', metadata: { error: '团队不存在' } }
  }

  const memberIds: string[] = safeJsonParse(team.memberIds, [])
  if (memberIds.length === 0) {
    params.tracker?.pushExecutionComplete(params.executionId, { status: 'failed', error: '团队没有成员' })
    return { output: '', metadata: { error: '团队没有成员' } }
  }

  // 从数据库读取的团队配置注入 params（调用方可能未传入）
  params.autoApproveTools = team.autoApproveTools ?? false

  // 任务重启时清除旧日志文件，避免新旧事件混淆
  resetLogFile(params.teamId, params.executionId)

  // 设置 tracker 元信息
  params.tracker?.setExecutionMeta(params.executionId, {
    taskTitle: params.taskTitle || params.taskDescription.slice(0, 100),
    teamName: params.teamName || team.name,
    teamId: params.teamId,
  })

  const allAgentIds = team.captainId
    ? [team.captainId, ...memberIds.filter(id => id !== team.captainId)]
    : memberIds
  const agents = await AgentModel.findAll({ where: { id: allAgentIds } })
  const agentMap = new Map(agents.map(a => [a.id, a]))

  params.logCallback?.(`团队「${team.name}」开始执行，模式: ${team.mode}，成员: ${memberIds.length} 人`)

  let result: { output: string; metadata: Record<string, any> }

  switch (team.mode) {
    case 'captain_distribute':
      result = await executeCaptainDistribute(params, team, agentMap, memberIds)
      break
    case 'discuss':
      result = await executeDiscuss(params, team, agentMap, memberIds)
      break
    case 'pipeline':
      result = await executePipeline(params, team, agentMap, memberIds)
      break
    default:
      result = await executeDiscuss(params, team, agentMap, memberIds)
  }

  params.logCallback?.(`团队「${team.name}」执行完成`)

  const hasError = result.metadata?.error
  const isFailed = result.metadata?.successCount === 0
  if (hasError || isFailed) {
    params.tracker?.pushExecutionComplete(params.executionId, { status: 'failed', error: hasError as string || '所有成员执行失败' })
  } else {
    params.tracker?.pushExecutionComplete(params.executionId, { status: 'completed', result: result.output })
  }

  return {
    output: result.output,
    metadata: { ...result.metadata, teamId: team.id, teamName: team.name, mode: team.mode },
  }
}
