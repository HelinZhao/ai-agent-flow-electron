import { VISION_MODEL_PATTERNS } from '../config'
import { Worker } from 'worker_threads'
import { SkillModel } from '../models'

export function isVisionModel(model: string): boolean {
  const lowerModel = model.toLowerCase()
  return VISION_MODEL_PATTERNS.some((pattern) => lowerModel.includes(pattern))
}

export interface SkillsContextResult {
  skillsContext: string
  enabledTools: string[]
}

/**
 * 根据技能 ID 列表构建技能上下文提示词，并自动注入 readSkill 工具。
 * 在 agent 对话、LLM 节点、触发器等多个调用点复用。
 */
export async function buildSkillsContext(
  skillIds: string[] | undefined,
  enabledTools: string[]
): Promise<SkillsContextResult> {
  if (!skillIds || skillIds.length === 0) {
    return { skillsContext: '', enabledTools }
  }
  const skills = await SkillModel.findAll({ where: { id: skillIds } })
  const skillsContext = '绑定技能:\n' + skills.map(s => `- ${s.id}: ${s.name} — ${s.description}`).join('\n')
    + '\n\n如需了解某个技能的详细内容，可使用 readSkill 工具传入技能 ID 进行读取。'
  const allEnabledTools = !enabledTools.includes('readSkill')
    ? [...enabledTools, 'readSkill']
    : enabledTools
  return { skillsContext, enabledTools: allEnabledTools }
}

export interface AttachmentPayload {
  id: string
  name: string
  type: string
  size: number
  category: 'image' | 'text' | 'pdf' | 'binary'
  dataUrl?: string // base64 data URI（仅临时传输，不持久化）
  textContent?: string // 文本内容（仅临时传输，不持久化）
  filePath?: string // 磁盘文件路径（持久化）
}

// 安全JSON解析函数
export const safeJsonParse = <T>(str: string | undefined, defaultValue: T): T => {
  if (!str) return defaultValue
  try {
    return JSON.parse(str)
  } catch (error) {
    console.error('JSON解析失败:', error)
    return defaultValue
  }
}

export function setAccurateTimer(type: 'interval' | 'timeout', callback: () => void, ms: number) {
  let worker: Worker | null = null
  let terminated = false

  function startWorker() {
    if (terminated) return

    worker = new Worker(
      `
    const { parentPort } = require('worker_threads');
    parentPort.on('message', (data) => {
      if (data.type === 'interval') {
        setInterval(() => parentPort.postMessage('tick'), data.ms);
      } else if (data.type === 'timeout') {
        setTimeout(() => parentPort.postMessage('tick'), data.ms);
      }
    });
  `,
      { eval: true }
    )

    worker.postMessage({ type, ms })

    worker.on('message', (msg) => {
      if (msg === 'tick') {
        callback()
      }
    })

    worker.on('error', (err) => {
      console.error('[setAccurateTimer] Worker error:', err)
    })

    worker.on('exit', (code) => {
      if (code !== 0 && !terminated) {
        console.warn(`[setAccurateTimer] Worker exited with code ${code}, restarting...`)
        startWorker()
      }
    })
  }

  startWorker()

  return {
    clearTimer: () => {
      terminated = true
      if (worker) worker.terminate()
    }
  }
}
