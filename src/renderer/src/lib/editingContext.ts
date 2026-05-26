export interface EditingContext {
  contextType: string
  contextId: string
  label: string
  data: Record<string, any>
  schema?: Record<string, string>
}

/** 格式化为 LLM 可见的上下文文本，自动注入到用户消息前 */
export function formatEditingContext(ctx: EditingContext): string {
  const lines: string[] = []
  lines.push(`【当前编辑上下文 - ${ctx.contextType}】`)
  lines.push(`名称: ${ctx.label}`)
  lines.push(`ID: ${ctx.contextId}`)
  lines.push(`当前数据:`)
  lines.push(JSON.stringify(ctx.data, null, 2))
  if (ctx.schema) {
    lines.push(`可用字段说明:`)
    for (const [key, desc] of Object.entries(ctx.schema)) {
      const value = ctx.data[key]
      lines.push(`  ${key}: ${desc}${value !== undefined ? ` (当前值: ${JSON.stringify(value)})` : ''}`)
    }
  }
  lines.push('')
  return lines.join('\n')
}
