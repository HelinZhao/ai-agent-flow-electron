import { LLMConfigModel, AgentModel, TeamModel } from '../models'
import { callLLMWithTracking } from './llm'
import { safeJsonParse, buildSkillsContext } from './shared'
import type { LLMConfig } from '../types'

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
  agent: any, prompt: string,
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
    undefined, finalTools, undefined, undefined,
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

    try {
      const decompResult = await callAgent(
        params.executionId, params.nodeId, params.llmConfig,
        captain, decompPrompt,
      )
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
      const result = await callAgent(
        params.executionId, params.nodeId, params.llmConfig,
        member, memberPrompt,
      )
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
        captain, synthesisPrompt,
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
      const result = await callAgent(
        params.executionId, params.nodeId, params.llmConfig,
        member, discussPrompt,
      )
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
        captain, synthesisPrompt,
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
      lastOutput = await callAgent(
        params.executionId, params.nodeId, params.llmConfig,
        member, promptParts.join('\n'),
      )
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
    metadata: { mode: 'pipeline', memberCount: orderedMembers.length, successCount: orderedMembers.length },
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
    return { output: '', metadata: { error: '团队没有成员' } }
  }

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

  return {
    output: result.output,
    metadata: { ...result.metadata, teamId: team.id, teamName: team.name, mode: team.mode },
  }
}
