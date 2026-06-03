import { callLLM } from '../llm'
import type { ExecutionState } from './types'
import type { LLMConfig, WorkflowBranch } from '../../types'
import type { AttachmentPayload } from '../shared'

/**
 * 替换模板中的占位符：
 * - {{$input}} → 当前节点接收到的上游输入
 * - {{$params.xxx}} → 当前执行上下文中 Start 节点定义的参数 xxx
 * - {{$nodes["id"].output}} → 引用任意已完成节点的输出
 * - {{$env.xxx}} → 工作流级环境变量
 * - {{$global.xxx}} → 全局环境变量
 * - {{$now}} / {{$now.date}} / {{$now.time}} / {{$now.timestamp}} → 当前时间
 */
export function resolveParams(
  template: string,
  input: string,
  params?: Record<string, any>,
  nodeResults?: Map<string, any>,
  workflowEnvVars?: Record<string, string>,
  variables?: Record<string, any>,
  envVarsCache?: Record<string, string> | null,
): string {
  let result = template.replace(/\{\{\$input\}\}/g, input)

  if (params) {
    result = result.replace(/\{\{\$params\.([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\}\}/g, (match, path) => {
      const keys = path.split('.')
      let value: any = params
      for (const key of keys) {
        if (value == null || typeof value !== 'object') return match
        value = value[key]
      }
      return value !== undefined && value !== null ? String(value) : match
    })
  }

  if (workflowEnvVars) {
    result = result.replace(/\{\{\$env\.([a-zA-Z_]\w*)\}\}/g, (match, key) => {
      return workflowEnvVars[key] !== undefined ? workflowEnvVars[key] : match
    })
  }

  if (envVarsCache) {
    result = result.replace(/\{\{\$global\.([a-zA-Z_]\w*)\}\}/g, (match, key) => {
      return envVarsCache[key] !== undefined ? envVarsCache[key] : match
    })
  }

  // {{$now}} / {{$now.format}} → 当前时间
  result = result.replace(/\{\{\$now(?:\.(\w+))?\}\}/g, (_, format) => {
    const now = new Date()
    switch (format) {
      case 'timestamp': return String(now.getTime())
      case 'date': return now.toISOString().slice(0, 10)
      case 'time': return now.toTimeString().slice(0, 8)
      case 'iso': return now.toISOString()
      case 'year': return String(now.getFullYear())
      case 'month': return String(now.getMonth() + 1).padStart(2, '0')
      case 'day': return String(now.getDate()).padStart(2, '0')
      case 'hour': return String(now.getHours()).padStart(2, '0')
      case 'minute': return String(now.getMinutes()).padStart(2, '0')
      case 'second': return String(now.getSeconds()).padStart(2, '0')
      default: return now.toISOString()
    }
  })

  if (variables) {
    result = result.replace(/\{\{\$vars\.([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\}\}/g, (match, path) => {
      const keys = path.split('.')
      let value: any = variables
      for (const key of keys) {
        if (value == null || typeof value !== 'object') return match
        value = value[key]
      }
      return value !== undefined && value !== null ? String(value) : match
    })
  }

  if (nodeResults && nodeResults.size > 0) {
    result = resolveNodeRefs(result, nodeResults)
  }

  result = result.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    try {
      const trimmed = expr.trim()
      if (!trimmed) return match
      if (/^[\w.$[\]"]+$/.test(trimmed)) return match
      const fn = new Function('$input', '$params', `return (${trimmed})`)
      const val = fn(input, params || {})
      return val !== undefined && val !== null ? String(val) : match
    } catch {
      return match
    }
  })

  return result
}

/**
 * 解析字符串中的 $nodes["xxx"] / $nodes.xxx 表达式，替换为实际节点输出
 */
export function resolveNodeRefs(template: string, nodeResults?: Map<string, any>): string {
  if (!nodeResults || nodeResults.size === 0) return template

  return template.replace(
    /\{\{\$nodes(?:\["([^"]+)"\]|\.([a-zA-Z_]\w*))((?:\.[a-zA-Z_$][\w$]*)*)\}\}|\$nodes(?:\["([^"]+)"\]|\.([a-zA-Z_]\w*))((?:\.[a-zA-Z_$][\w$]*)*)/g,
    (match, id1, id2, fieldPath1, id3, id4, fieldPath2) => {
      const nodeId = id1 || id2 || id3 || id4
      const fieldPath = fieldPath1 || fieldPath2 || ''
      const result = nodeResults.get(nodeId)
      if (!result) return match

      const fields = fieldPath ? fieldPath.split('.').filter(Boolean) : []
      let value: any = result
      for (const field of fields) {
        if (value == null) return match
        value = value[field]
      }

      if (value === undefined || value === null) return match
      if (typeof value === 'object') return JSON.stringify(value, null, 2)
      return String(value)
    },
  )
}

/** 将 nodeResults 构建为 $nodes 查找对象 */
export function buildNodeContext(nodeResults?: Map<string, any>): Record<string, any> {
  const ctx: Record<string, any> = {}
  if (!nodeResults) return ctx
  for (const [nodeId, result] of nodeResults) {
    ctx[nodeId] = {
      output: result.output,
      metadata: result.metadata,
      status: result.status,
    }
  }
  return ctx
}

/** 将输入解析为数组：优先 JSON.parse，否则按换行拆分 */
export function parseInputAsArray(input: string): string[] {
  if (!input || input.trim().length === 0) return []
  try {
    const parsed = JSON.parse(input)
    if (Array.isArray(parsed)) {
      return parsed.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item))
    }
    return [String(parsed)]
  } catch {
    return input.split('\n').filter(line => line.trim().length > 0)
  }
}

/** 合并当前执行附件与线程级累积附件（按id去重） */
export function mergeThreadAttachments(
  threadAttachments: Map<string, AttachmentPayload[]>,
  execState?: ExecutionState,
): AttachmentPayload[] | undefined {
  if (!execState) return undefined
  const threadKey = execState.threadId || execState.agentId || 'default-thread'
  const threadAtts = threadAttachments.get(threadKey) || []
  const currentAtts = execState.attachments || []
  const merged = [...threadAtts]
  for (const att of currentAtts) {
    if (!merged.some(e => e.id === att.id)) {
      merged.push(att)
    }
  }
  return merged.length > 0 ? merged : undefined
}

/** LLM 评估分支条件 */
export async function evaluateBranches(branches: WorkflowBranch[], input: string, llmConfig: LLMConfig) {
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
    const { content: result } = await callLLM({ prompt, llmConfig, options: { cache: true } })
    const cleanResult = result.trim().replace(/[\s\n\r.,，。!！?？;；]/g, '')
    const isValidResult = !Number.isNaN(Number(cleanResult))
    return isValidResult ? branches[Number(cleanResult) - 1].id : 'null'
  } catch (error) {
    console.error('条件评估失败:', error)
    return 'null'
  }
}

/** 从执行上下文解析参数（用于子工作流、split、loop 等） */
export function resolveNodeParams(
  nodeConfigParams: Record<string, any> | undefined,
  input: string,
  parentParams: Record<string, any> | undefined,
  nodeResults: Map<string, any> | undefined,
  workflowEnvVars: Record<string, string> | undefined,
  variables: Record<string, any> | undefined,
  envVarsCache: Record<string, string> | null,
  extra?: Record<string, any>,
): Record<string, any> {
  const resolved: Record<string, any> = { ...extra }
  for (const [k, v] of Object.entries(nodeConfigParams || {})) {
    resolved[k] = typeof v === 'string'
      ? resolveParams(v, input, parentParams, nodeResults, workflowEnvVars, variables, envVarsCache)
      : v
  }
  return resolved
}
