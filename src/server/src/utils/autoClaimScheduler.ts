import { Op } from 'sequelize'
import { TeamModel, LLMConfigModel, TaskModel } from '../models'
import { executeTeamStandalone } from './teamExecutor'
import { changeNotifier } from './dataChangeNotifier'
import { teamExecutionTracker } from './teamExecutionTracker'
import type { LLMConfig } from '../types'

/** 正在执行中的团队，调度器据此判断空闲状态 */
const busyTeams = new Set<string>()

/** 正在执行的任务 id → AbortController，用于取消执行 */
const executionMap = new Map<string, AbortController>()

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

    // 优先认领该团队之前驳回的任务（保留 claimedBy），没有则取普通待办
    let task = await TaskModel.findOne({
      where: { status: 'pending', claimedBy: team.id },
      order: [['priority', 'DESC'], ['updatedAt', 'ASC']],
    })
    if (!task) {
      task = await TaskModel.findOne({
        where: { status: 'pending', claimedBy: null },
        order: [['priority', 'DESC'], ['createdAt', 'ASC']],
      })
    }
    if (!task) {
      // 兜底：其他团队驳回超过 5 分钟无人处理的，任何空闲团队可认领
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
      task = await TaskModel.findOne({
        where: {
          status: 'pending',
          claimedBy: { [Op.ne]: null },
          updatedAt: { [Op.lt]: fiveMinAgo },
        },
        order: [['priority', 'DESC'], ['updatedAt', 'ASC']],
      })
    }
    if (!task) break // 没有待办任务了

    // 原子认领
    const [affected] = await TaskModel.update(
      { status: 'assigned', claimedBy: team.id, claimedAt: new Date() },
      { where: { id: task.id, status: 'pending' } },
    )
    if (affected === 0) continue
    changeNotifier.emitChange('tasks')

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
    changeNotifier.emitChange('tasks')
    busyTeams.add(teamId)

    // 异步执行，完成后自动处理下一个
    const abortController = new AbortController()
    executionMap.set(task.id, abortController)
    executeTask(task, teamId, llmConfig, abortController.signal)
      .catch((err) => {
        // AbortError 是预期的取消行为，不当作异常
        if (err?.name === 'AbortError') {
          console.log(`[Scheduler] 任务执行已终止: ${task.title}`)
        } else {
          console.error(`[Scheduler] 任务执行异常: ${task.title}`, err)
        }
      })
      .finally(() => {
        busyTeams.delete(teamId)
        executionMap.delete(task.id)
      })
  }
}

async function executeTask(task: any, teamId: string, llmConfig: LLMConfig, signal?: AbortSignal): Promise<void> {
  const executionId = `task:${task.id}`
  console.log(`[Scheduler] 团队开始执行任务: ${task.title}`)

  const team = await TeamModel.findByPk(teamId)

  const result = await executeTeamStandalone({
    teamId,
    taskDescription: task.description,
    llmConfig,
    executionId,
    nodeId: 'scheduler',
    signal,
    tracker: teamExecutionTracker,
    teamName: team?.name,
    taskTitle: task.title,
  })

  const meta = result.metadata || {}
  const mode = meta.mode as string
  const memberCount = meta.memberCount as number || 0
  const successCount = meta.successCount as number || 0

  // 流水线要求全部成功，其他模式部分成功即可
  const isFailed = mode === 'pipeline'
    ? successCount < memberCount
    : memberCount > 0 && successCount === 0

  // 如果任务已被取消（status 不再为 claimed），跳过更新
  const current = await TaskModel.findByPk(task.id)
  if (!current || current.status !== 'claimed') {
    console.log(`[Scheduler] 任务已取消，跳过状态更新: ${task.title}`)
    return
  }

  const execError = meta.error
  if (execError || isFailed) {
    await TaskModel.update(
      { status: 'failed', error: execError || '所有成员执行失败', completedAt: new Date() },
      { where: { id: task.id } },
    )
  } else {
    await TaskModel.update(
      { status: 'pending_review', result: result.output, completedAt: new Date() },
      { where: { id: task.id } },
    )
  }
  changeNotifier.emitChange('tasks')

  console.log(`[Scheduler] 团队完成任务，进入待验收: ${task.title}`)
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
  // 中断所有正在执行的 LLM 请求
  for (const ctrl of executionMap.values()) ctrl.abort()
  executionMap.clear()
}

/** 释放团队忙碌状态（取消任务时调用） */
export function freeTeam(teamId: string): void {
  busyTeams.delete(teamId)
}

/** 中断指定任务的 LLM 请求（取消任务时调用） */
export function cancelExecution(taskId: string): void {
  const ctrl = executionMap.get(taskId)
  if (ctrl) {
    ctrl.abort()
    executionMap.delete(taskId)
  }
}
