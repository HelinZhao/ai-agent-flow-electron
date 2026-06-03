import { VISION_MODEL_PATTERNS } from '../config'
import { Worker } from 'worker_threads'
import { SkillModel } from '../models'
import { HumanMessage } from 'langchain'

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
export async function buildHumanMessage(input: string, attachments?: AttachmentPayload[]): Promise<HumanMessage> {
  if (!attachments || attachments.length === 0) {
    return new HumanMessage(input)
  }

  // 构建纯文本内容（图片数据不在LangGraph层面传递，而是在callLLM时注入）
  let textContent = input

  for (const att of attachments) {
    // 构造附件URL，供LLM工具（如知识库上传）引用
    const attUrl = `/api/attachments/${att.id}/${encodeURIComponent(att.name)}`

    switch (att.category) {
      case 'image':
        textContent += `\n[图片附件: ${att.name}]  URL: ${attUrl}`
        break
      case 'text':
        if (att.textContent) {
          textContent += `\n\n---\n文件: ${att.name}\n附件URL: ${attUrl}\n---\n${att.textContent}\n---`
        } else if (att.filePath) {
          try {
            const { loadAttachmentAsText } = await import('./file')
            const content = await loadAttachmentAsText(att.filePath)
            textContent += `\n\n---\n文件: ${att.name}\n附件URL: ${attUrl}\n---\n${content}\n---`
          } catch {
            textContent += `\n[文本文件: ${att.name} (${att.size} bytes, 内容无法读取)]  URL: ${attUrl}`
          }
        } else {
          textContent += `\n[文本文件: ${att.name} (${att.size} bytes, 内容无法读取)]  URL: ${attUrl}`
        }
        break
      case 'pdf':
        textContent += `\n[PDF文件: ${att.name} (${formatSize(att.size)})]  URL: ${attUrl}`
        break
      case 'binary':
        textContent += `\n[文件: ${att.name} (${att.type}, ${formatSize(att.size)})]  URL: ${attUrl}`
        break
    }
  }

  return new HumanMessage(textContent)
}


export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// 安全JSON解析函数（自动提取 markdown 代码块和裸 JSON）
export const safeJsonParse = <T>(str: string | undefined, defaultValue: T): T => {
  if (!str) return defaultValue

  // 尝试直接解析
  try {
    return JSON.parse(str)
  } catch { /* 继续尝试提取 */ }

  // 尝试提取 markdown 代码块中的 JSON（```json ... ```）
  const codeBlockMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch { /* 继续尝试 */ }
  }

  // 尝试提取第一个 { 到最后一个 } 之间的内容
  const firstBrace = str.indexOf('{')
  const lastBrace = str.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(str.slice(firstBrace, lastBrace + 1))
    } catch { /* 继续尝试 */ }
  }

  // 尝试提取第一个 [ 到最后一个 ] 之间的内容
  const firstBracket = str.indexOf('[')
  const lastBracket = str.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(str.slice(firstBracket, lastBracket + 1))
    } catch { /* 放弃 */ }
  }

  console.error('JSON解析失败:', str.substring(0, 200))
  return defaultValue
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