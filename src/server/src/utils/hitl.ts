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

export interface CallLLMOptions {
  approvalCallback?: (request: HITLRequest) => Promise<HITLResponse>
  cache?: boolean
}