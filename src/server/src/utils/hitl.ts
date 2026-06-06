export interface HITLRequest {
  actionRequests: { name: string; args: Record<string, any>; description: string }[]
  reviewConfigs: { actionName: string; allowedDecisions: string[] }[]
}

export interface HITLDecision {
  type: 'approve' | 'reject'
  message?: string
}

export interface HITLResponse {
  decisions: HITLDecision[]
}

export interface ChoiceOption {
  label: string
  value: string
  description?: string
}

export interface ChoiceRequest {
  question: string
  options: ChoiceOption[]
  allowMultiSelect?: boolean
}

export interface ChoiceResponse {
  /** 单选时使用 */
  selectedValue?: string
  selectedLabel?: string
  /** 多选时使用 */
  selectedValues?: string[]
  selectedLabels?: string[]
  /** 用户取消 */
  cancelled?: boolean
}

export interface CallLLMOptions {
  approvalCallback?: (request: HITLRequest) => Promise<HITLResponse>
  choiceCallback?: (request: ChoiceRequest) => Promise<ChoiceResponse>
  cache?: boolean
  signal?: AbortSignal
}