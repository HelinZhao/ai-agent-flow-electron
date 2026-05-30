import { tool } from 'langchain'
import { z } from 'zod'
import { getAssistContext } from '../routes/assist-context'

type BroadcastFn = (executionId: string, data: any) => void

/** 创建前端推送工具：AI 通过此工具将配置修改推送到前端页面 */
export function createFrontendActionTool(executionId: string, broadcast: BroadcastFn) {
  return tool(
    async ({ contextType, contextId, action, payload }: { contextType: string; contextId: string; action: string; payload: Record<string, any> }) => {
      broadcast(executionId, {
        type: 'frontend_action',
        contextType,
        contextId,
        action,
        payload,
      })
      return `操作指令已发送到前端页面「${contextType}」`
    },
    {
      name: 'suggestFrontendAction',
      description: `将配置数据实时推送到前端页面。当用户要求你帮忙填写或修改页面配置时使用。

先调用 getEditingContext 获取当前编辑上下文，确定字段名和当前值，再调用此工具推送修改。只需要传要修改的字段，不传的保留原样。

目前已支持的 contextType：
- node-config: 工作流节点配置。contextId 为节点 ID，action 为 "setConfig"，payload 为要修改的配置字段。
- trigger-editor: 触发器编辑。contextId 为触发器 ID，action 为 "setConfig"，payload 包含表单字段。
- skill-editor: 技能编辑。contextId 为技能 ID，action 为 "setConfig"，payload 包含表单字段。
- agent-editor: Agent 编辑。contextId 为 Agent ID，action 为 "setConfig"，payload 包含表单字段。
- task-editor: 任务编辑。contextId 为任务 ID，action 为 "setConfig"，payload 包含表单字段（title / description / priority）。
- team-editor: 团队编辑。contextId 为团队 ID，action 为 "setConfig"，payload 包含表单字段（name / description / captainId / memberIds / mode / autoClaimEnabled / autoClaimInterval）。`,
      schema: z.object({
        contextType: z.string().describe('页面类型：node-config / trigger-editor / skill-editor 等'),
        contextId: z.string().describe('节点 ID，用户通常会告诉你'),
        action: z.string().describe('操作类型，如 setConfig（设置配置）'),
        payload: z.record(z.any()).describe('操作数据 KV 对，例如 {"url":"https://...","method":"POST"}'),
      }),
    }
  )
}

/** 创建上下文读取工具：AI 通过此工具获取当前编辑上下文 */
export function createGetContextTool() {
  return tool(
    async () => {
      const data = getAssistContext()
      if (!data || !data.contextType) return '当前没有编辑上下文'
      let result = `【当前编辑上下文 - ${data.contextType}】\n名称: ${data.label}\nID: ${data.contextId}\n当前数据:\n`
      result += JSON.stringify(data.data, null, 2)
      if (data.schema) {
        result += '\n可用字段说明:'
        for (const [key, desc] of Object.entries(data.schema)) {
          result += `\n  ${key}: ${desc}`
        }
      }
      return result
    },
    {
      name: 'getEditingContext',
      description: `获取用户当前正在编辑的表单数据。当用户要求你帮忙填写或修改配置时，先调用此工具了解当前表单的字段名和已有值，然后再调用 suggestFrontendAction 推送修改。`,
      schema: z.object({}),
    }
  )
}
