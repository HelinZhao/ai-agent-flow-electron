import { TW_L1_SLOTS, TW_L2_SLOTS, TW_L3_SLOTS, TW_TICK_INTERVAL } from '../config'

interface WheelTask {
  triggerId: string
  fireAt: number // ms timestamp
}

interface TaskMeta {
  task: WheelTask
  level: 1 | 2 | 3
  slot: number
}

export class TimingWheel {
  private l1: (WheelTask | null)[][] = Array.from({ length: TW_L1_SLOTS }, () => [])
  private l2: (WheelTask | null)[][] = Array.from({ length: TW_L2_SLOTS }, () => [])
  private l3: (WheelTask | null)[][] = Array.from({ length: TW_L3_SLOTS }, () => [])

  private l1Idx = 0
  private l2Idx = 0
  private l3Idx = 0

  private timer: ReturnType<typeof setInterval> | null = null
  private taskMap = new Map<string, TaskMeta>()
  private cancelledIds = new Set<string>()

  /** 注入回调：当任务到期时由外部调用 */
  onFire: ((triggerId: string) => Promise<void>) | null = null

  // ---- public API ----

  /** 启动时间轮（每秒 tick） */
  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), TW_TICK_INTERVAL)
    console.log('[TimingWheel] 已启动')
  }

  /** 停止时间轮 */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    console.log('[TimingWheel] 已停止')
  }

  get running(): boolean {
    return this.timer !== null
  }

  /** 调度一个任务 */
  schedule(triggerId: string, fireAt: number): void {
    // 先取消旧的（如果有）
    this.cancel(triggerId)

    const now = Date.now()
    const delaySec = Math.max(0, Math.ceil((fireAt - now) / 1000))

    // 根据 delay 选择层级
    if (delaySec < TW_L1_SLOTS) {
      const slot = (this.l1Idx + delaySec) % TW_L1_SLOTS
      const task: WheelTask = { triggerId, fireAt }
      this.l1[slot].push(task)
      this.taskMap.set(triggerId, { task, level: 1, slot })
    } else if (delaySec < TW_L1_SLOTS * TW_L2_SLOTS) {
      const delayMin = Math.ceil(delaySec / 60)
      const slot = (this.l2Idx + delayMin) % TW_L2_SLOTS
      const task: WheelTask = { triggerId, fireAt }
      this.l2[slot].push(task)
      this.taskMap.set(triggerId, { task, level: 2, slot })
    } else if (delaySec < TW_L1_SLOTS * TW_L2_SLOTS * TW_L3_SLOTS) {
      const delayHour = Math.ceil(delaySec / 3600)
      const slot = (this.l3Idx + delayHour) % TW_L3_SLOTS
      const task: WheelTask = { triggerId, fireAt }
      this.l3[slot].push(task)
      this.taskMap.set(triggerId, { task, level: 3, slot })
    } else {
      // 超出 24 小时范围，放入最后一个 L3 槽位
      const slot = (this.l3Idx + TW_L3_SLOTS - 1) % TW_L3_SLOTS
      const task: WheelTask = { triggerId, fireAt }
      this.l3[slot].push(task)
      this.taskMap.set(triggerId, { task, level: 3, slot })
    }
  }

  /** 取消一个任务 */
  cancel(triggerId: string): void {
    if (this.taskMap.has(triggerId)) {
      this.cancelledIds.add(triggerId)
      this.taskMap.delete(triggerId)
    }
  }

  /** 获取所有已注册的 triggerId */
  getScheduledIds(): string[] {
    return Array.from(this.taskMap.keys())
  }

  /** 获取任务的 fireAt 时间戳，没有则返回 0 */
  getFireAt(triggerId: string): number {
    const meta = this.taskMap.get(triggerId)
    return meta ? meta.task.fireAt : 0
  }

  // ---- internal ----

  private tick(): void {
    // 1. 执行 L1 当前槽位所有到期任务
    this.executeSlot(this.l1[this.l1Idx])
    this.l1[this.l1Idx] = []

    // 2. 推进 L1 指针
    this.l1Idx = (this.l1Idx + 1) % TW_L1_SLOTS

    // 3. L1 完成一圈 → 级联 L2
    if (this.l1Idx === 0) {
      this.l2Idx = (this.l2Idx + 1) % TW_L2_SLOTS
      this.cascadeSlot(this.l2[this.l2Idx], 2)
      this.l2[this.l2Idx] = []

      // 4. L2 完成一圈 → 级联 L3
      if (this.l2Idx === 0) {
        this.l3Idx = (this.l3Idx + 1) % TW_L3_SLOTS
        this.cascadeSlot(this.l3[this.l3Idx], 3)
        this.l3[this.l3Idx] = []
      }
    }
  }

  /** 将某个层级的槽位任务降级到下层 */
  private cascadeSlot(tasks: (WheelTask | null)[], fromLevel: 2 | 3): void {
    const now = Date.now()
    for (const task of tasks) {
      if (!task || this.cancelledIds.has(task.triggerId)) {
        if (task) this.cancelledIds.delete(task.triggerId)
        continue
      }
      const remainingSec = Math.max(0, Math.ceil((task.fireAt - now) / 1000))

      if (fromLevel === 2) {
        // L2 → L1：剩余秒数应该在 0~60 以内
        const slot = (this.l1Idx + remainingSec) % TW_L1_SLOTS
        this.l1[slot].push(task)
        this.taskMap.set(task.triggerId, { task, level: 1, slot })
      } else {
        // L3 → L2：剩余秒数在 0~3600 以内
        if (remainingSec < TW_L1_SLOTS) {
          // 已经可以进 L1 了
          const slot = (this.l1Idx + remainingSec) % TW_L1_SLOTS
          this.l1[slot].push(task)
          this.taskMap.set(task.triggerId, { task, level: 1, slot })
        } else {
          const remainingMin = Math.ceil(remainingSec / 60)
          const slot = (this.l2Idx + remainingMin) % TW_L2_SLOTS
          this.l2[slot].push(task)
          this.taskMap.set(task.triggerId, { task, level: 2, slot })
        }
      }
    }
  }

  /** 执行一个槽位的所有到期任务 */
  private async executeSlot(tasks: (WheelTask | null)[]): Promise<void> {
    if (!this.onFire) return

    for (const task of tasks) {
      if (!task) continue
      if (this.cancelledIds.has(task.triggerId)) {
        this.cancelledIds.delete(task.triggerId)
        continue
      }
      // 任务即将执行，从 taskMap 移除
      this.taskMap.delete(task.triggerId)

      // 异步执行，不阻塞 tick
      this.onFire(task.triggerId).catch((err) => {
        console.error(`[TimingWheel] 执行任务 ${task.triggerId} 失败:`, err)
      })
    }
  }
}

/** 全局单例 */
export const timingWheel = new TimingWheel()

// ---- cron 解析工具 ----

const CRON_FIELD_RANGES = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 6],  // day of week
] as const

function parseCronField(field: string, [min, max]: readonly [number, number]): Set<number> {
  const values = new Set<number>()
  const parts = field.split(',')

  for (const part of parts) {
    if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i)
      continue
    }
    const stepMatch = part.match(/^(.+)\/(\d+)$/)
    let step = 1
    let range = part
    if (stepMatch) {
      range = stepMatch[1]
      step = parseInt(stepMatch[2], 10)
      if (step < 1) step = 1
    }
    if (range === '*') range = `${min}-${max}`

    if (range.includes('-')) {
      const [s, e] = range.split('-').map(Number)
      for (let i = s; i <= e; i += step) {
        if (i >= min && i <= max) values.add(i)
      }
    } else {
      const v = parseInt(range, 10)
      if (v >= min && v <= max) {
        // 对于有 step 的单值，从该值开始按 step 递增
        if (step > 1) {
          for (let i = v; i <= max; i += step) values.add(i)
        } else {
          values.add(v)
        }
      }
    }
  }

  return values
}

/**
 * 解析标准 5 段 cron 表达式，返回下次触发时间。
 * 若表达式永不匹配则返回 null。
 */
function cronToNextTimeInner(expression: string, from: Date): Date | null {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5) return null

  const validFields: Set<number>[] = []
  for (let i = 0; i < 5; i++) {
    const values = parseCronField(fields[i], CRON_FIELD_RANGES[i])
    if (values.size === 0) return null
    validFields.push(values)
  }

  const maxIterations = 366 * 24 * 60 // 最多搜索一年
  let current = new Date(from)
  current.setSeconds(0, 0)
  current.setMinutes(current.getMinutes() + 1) // 从下一秒开始

  for (let iter = 0; iter < maxIterations; iter++) {
    const minute = current.getMinutes()
    const hour = current.getHours()
    const dom = current.getDate()
    const month = current.getMonth() + 1
    const dow = current.getDay()

    if (
      validFields[0].has(minute) &&
      validFields[1].has(hour) &&
      validFields[2].has(dom) &&
      validFields[3].has(month) &&
      validFields[4].has(dow)
    ) {
      return current
    }

    // 前进 1 分钟
    current = new Date(current.getTime() + 60_000)
  }

  return null
}

/**
 * 解析 cron 表达式，返回下一次触发的毫秒时间戳。
 * 若解析失败或永不触发，返回 0。
 */
export function cronToNextTime(expression: string, from?: Date): number {
  try {
    const result = cronToNextTimeInner(expression, from || new Date())
    return result ? result.getTime() : 0
  } catch {
    return 0
  }
}

/** 人类可读的 cron 描述（简单版） */
export function describeCron(expression: string): string {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5) return '无效表达式'

  const [min, hour, dom, month, dow] = fields

  if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return '每分钟'
  }

  const parts: string[] = []

  // 分钟
  if (min.startsWith('*/')) {
    parts.push(`每 ${min.slice(2)} 分钟`)
  } else if (min !== '*' && min !== '0') {
    parts.push(`第 ${min} 分`)
  }

  // 小时
  if (hour.startsWith('*/')) {
    parts.push(`每 ${hour.slice(2)} 小时`)
  } else if (hour !== '*') {
    parts.push(`${hour}:00`)
  }

  // 星期
  const dowNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  if (dow !== '*' && dow !== '0,1,2,3,4,5,6' && dom === '*') {
    const days = dow.split(',').map((d) => dowNames[parseInt(d, 10)] || d)
    parts.push(days.join('、'))
  }

  // 日期
  if (dom !== '*') {
    parts.push(`每月 ${dom} 号`)
  }

  if (parts.length === 0) {
    if (min !== '*' && hour === '*') return `每小时第 ${min} 分`
    return expression
  }

  return parts.join(' ')
}
