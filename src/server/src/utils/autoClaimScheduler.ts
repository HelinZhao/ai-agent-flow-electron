import { TeamModel, LLMConfigModel, TaskModel } from '../models'
import { executeTeamStandalone } from './teamExecutor'
import type { LLMConfig } from '../types'

/** 正在执行中的团队，调度器据此判断空闲状态 */
const busyTeams = new Set<string>()

let globalTimer: ReturnType<typeof setInterval> | null = null

let llmConfigCache: LLMConfig | null = null
let lastConfigFetch = 0
const CONFIG_TTL = 30_000

async function getLlmConfig(): Promise<LLMConfig | null> {
  const now = Date.now()
  if (!llmConfigCache || now - lastConfigFetch > CONFIG_TTL) {
    const cfg = await LLMConfigModel.findOne({ where: { isActive: true } })
    if (cfg) {
      llmConfigCache = {
        provider: cfg.provider, apiKey: cfg.apiKey, model: cfg.model,
        baseUrl: cfg.baseUrl, temperature: cfg.temperature, maxTokens: cfg.maxTokens,
      }
    } else {
      llmConfigCache = null
    }
    lastConfigFetch = now
  }
  return llmConfigCache
}

async function tick(): Promise<void> {
  const llmConfig = await getLlmConfig()
  if (!llmConfig) return

  // Step 1: 为开启了 auto-claim 的空闲团队认领待办任务
  const idleTeams = await TeamModel.findAll({
    where: { autoClaimEnabled: true },
  })
  for (const team of idleTeams) {
    if (busyTeams.has(team.id)) continue

    const task = await TaskModel.findOne({
      where: { status: 'pending' },
      order: [['priority', 'DESC'], ['createdAt', 'ASC']],
    })
    if (!task) break // 没有待办任务了

    // 原子认领
    const [affected] = await TaskModel.update(
      { status: 'assigned', claimedBy: team.id, claimedAt: new Date() },
      { where: { id: task.id, status: 'pending' } },
    )
    if (affected === 0) continue

    console.log(`[Scheduler] 团队「${team.name}」认领任务: ${task.title}`)
  }

  // Step 2: 执行所有已指派但未开始的任务（按 team 分组，空闲的才执行）
  const assigned = await TaskModel.findAll({
    where: { status: 'assigned' },
    order: [['priority', 'DESC'], ['createdAt', 'ASC']],
  })

  // 按团队分组，每个团队只执行第一个
  const seen = new Set<string>()
  for (const task of assigned) {
    const teamId = task.claimedBy
    if (!teamId || seen.has(teamId) || busyTeams.has(teamId)) continue
    seen.add(teamId)

    // 标记为执行中
    await TaskModel.update({ status: 'claimed' }, { where: { id: task.id } })
    busyTeams.add(teamId)

    // 异步执行，完成后自动处理下一个
    executeTask(task, teamId, llmConfig).finally(() => {
      busyTeams.delete(teamId)
    })
  }
}

async function executeTask(task: any, teamId: string, llmConfig: LLMConfig): Promise<void> {
  console.log(`[Scheduler] 团队开始执行任务: ${task.title}`)

  const result = await executeTeamStandalone({
    teamId,
    taskDescription: task.description,
    llmConfig,
    executionId: `scheduler-${task.id}`,
    nodeId: 'scheduler',
  })

  const hasError = result.metadata?.error
  if (hasError) {
    await TaskModel.update(
      { status: 'failed', error: hasError, completedAt: new Date() },
      { where: { id: task.id } },
    )
  } else {
    await TaskModel.update(
      { status: 'completed', result: result.output, completedAt: new Date() },
      { where: { id: task.id } },
    )
  }

  console.log(`[Scheduler] 团队完成任务: ${task.title}`)
}

export function startAutoClaimScheduler(): void {
  if (globalTimer) return
  globalTimer = setInterval(() => { tick() }, 2000)
  globalTimer.unref()
}

export function stopAutoClaimScheduler(): void {
  if (globalTimer) {
    clearInterval(globalTimer)
    globalTimer = null
  }
  busyTeams.clear()
}
