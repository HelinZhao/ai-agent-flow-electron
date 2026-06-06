import { tool } from 'langchain'
import { z } from 'zod'
import { ChoiceRequest, ChoiceResponse } from '../utils/hitl'

/** 创建用户选择工具：AI 通过此工具向用户提出选项并等待选择 */
export function createAskUserChoiceTool(choiceCallback: (req: ChoiceRequest) => Promise<ChoiceResponse>) {
  return tool(
    async ({ question, options, allowMultiSelect }: { question: string; options: { label: string; value: string; description?: string }[]; allowMultiSelect?: boolean }) => {
      const response = await choiceCallback({ question, options, allowMultiSelect })
      return JSON.stringify(response)
    },
    {
      name: 'askUserChoice',
      description: `当你需要用户做出决策或选择时调用此工具。
向用户提出一个问题并提供多个选项让用户选择。
设置 allowMultiSelect=true 允许用户选择多个选项。

返回格式：
- 单选：{"selectedValue":"...", "selectedLabel":"..."}
- 多选：{"selectedValues":[...], "selectedLabels":[...]}
- 取消：{"cancelled":true}（用户放弃选择）

注意：选项数量建议 2~5 个，每个选项的 label 应简洁明了。
如果选项较多，可以在 description 中补充说明。`,
      schema: z.object({
        question: z.string().describe('向用户提出的问题，简洁明确'),
        options: z.array(z.object({
          label: z.string().describe('选项的显示文本，简洁明了'),
          value: z.string().describe('选项的值（唯一标识），程序使用'),
          description: z.string().optional().describe('选项的详细说明，帮助用户理解差异'),
        })).min(2).max(10).describe('供用户选择的选项列表（2~10 个）'),
        allowMultiSelect: z.boolean().optional().default(false).describe('是否允许用户选择多个选项，默认 false（单选）'),
      }),
    }
  )
}
