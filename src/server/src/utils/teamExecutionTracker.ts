import { appendEvent } from './teamExecutionFileStore'
import type { HITLRequest, HITLResponse, HITLDecision } from './hitl'

// ============================================================
//  Types
// ============================================================

export interface MemberStatusEvent {
  type: 'member_status'
  executionId: string
  memberId: string
  memberName: string
  role: 'captain' | 'member'
  status: 'thinking' | 'using_tool' | 'done' | 'error'
  toolName?: string
  toolArgs?: Record<string, any>
  output?: string
}

export interface MemberOutputEvent {
  type: 'member_output'
  executionId: string
  memberId: string
  memberName: string
  role: 'captain' | 'member'
  output: string
}

export interface ToolApprovalRequiredEvent {
  type: 'tool_approval_required'
  executionId: string
  taskTitle?: string
  teamName?: string
  teamId?: string
  actionRequests: { name: string; args: Record<string, any>; description: string }[]
  reviewConfigs: { actionName: string; allowedDecisions: string[] }[]
}

export interface ExecutionCompleteEvent {
  type: 'execution_complete'
  executionId: string
  status: 'completed' | 'failed'
  result?: string
  error?: string
}

export type TeamExecutionEvent = MemberStatusEvent | MemberOutputEvent | ToolApprovalRequiredEvent | ExecutionCompleteEvent

/** SSE 事件携带服务端生成的唯一 seq，供前端去重 */
export type SSEServerEvent = TeamExecutionEvent & { _seq: number }

interface SSEClient {
  res: any
}

interface PendingApproval {
  request: HITLRequest
  resolve: (response: HITLResponse) => void
  reject: (err: Error) => void
}

// ============================================================
//  TeamExecutionTracker
// ============================================================

class TeamExecutionTracker {
  private sseClients = new Map<string, SSEClient[]>()
  /** 全局 SSE 客户端（订阅所有 execution 的事件） */
  private globalClients: SSEClient[] = []
  private pendingApprovals = new Map<string, PendingApproval>()
  private autoApprovedTools = new Map<string, Set<string>>()
  /** executionId → { taskTitle, teamName, teamId } 的元信息 */
  private executionMeta = new Map<string, { taskTitle?: string; teamName?: string; teamId?: string }>()
  /** 单调递增序列号，用于 SSE 事件唯一标识 */
  private seqCounter = 0

  /** 注册全局 SSE 连接（接收所有 execution 的事件） */
  addGlobalSSEClient(client: SSEClient): void {
    this.globalClients.push(client)
  }

  removeGlobalSSEClient(client: SSEClient): void {
    const idx = this.globalClients.indexOf(client)
    if (idx > -1) this.globalClients.splice(idx, 1)
  }

  /** 注册按 executionId 过滤的 SSE 连接 */
  addSSEClient(executionId: string, client: SSEClient): void {
    if (!this.sseClients.has(executionId)) this.sseClients.set(executionId, [])
    this.sseClients.get(executionId)!.push(client)
  }

  /** 移除 SSE 连接 */
  removeSSEClient(executionId: string, client: SSEClient): void {
    const clients = this.sseClients.get(executionId)
    if (!clients) return
    const idx = clients.indexOf(client)
    if (idx > -1) clients.splice(idx, 1)
    if (clients.length === 0) this.sseClients.delete(executionId)
  }

  /** 获取活跃 executionId 列表 */
  getActiveExecutionIds(): string[] {
    const ids = new Set<string>()
    // 有 SSE 订阅的
    for (const id of this.sseClients.keys()) ids.add(id)
    // 有待审批的（即使没有 SSE 订阅，也需要展示给用户）
    for (const id of this.pendingApprovals.keys()) ids.add(id)
    // 有元信息的（正在执行但还没有 SSE 订阅的阶段）
    for (const id of this.executionMeta.keys()) ids.add(id)
    return Array.from(ids)
  }

  /** 是否有前端在监听指定 execution */
  hasClients(executionId: string): boolean {
    const clients = this.sseClients.get(executionId)
    return !!clients && clients.length > 0
  }

  /** 设置执行元信息 */
  setExecutionMeta(executionId: string, meta: { taskTitle?: string; teamName?: string; teamId?: string }): void {
    this.executionMeta.set(executionId, meta)
  }

  /** 获取执行元信息 */
  getExecutionMeta(executionId: string): { taskTitle?: string; teamName?: string; teamId?: string } | undefined {
    return this.executionMeta.get(executionId)
  }

  /** 生成唯一序列号 */
  private nextSeq(): number {
    return ++this.seqCounter
  }

  /** 广播事件（推给 executionId 订阅者 + 全局订阅者），附带 _seq */
  private broadcast(executionId: string, event: TeamExecutionEvent): void {
    const sseEvent: SSEServerEvent = { ...event, _seq: this.nextSeq() }
    const message = `data: ${JSON.stringify(sseEvent)}\n\n`
    // 推给按 executionId 订阅的客户端
    const clients = this.sseClients.get(executionId)
    if (clients) {
      for (const client of clients) {
        try { client.res.write(message) } catch { /* ignore */ }
      }
    }
    // 推给全局订阅者
    for (const client of this.globalClients) {
      try { client.res.write(message) } catch { /* ignore */ }
    }
  }

  /** 追加事件到文件（不阻塞广播）。每条事件带唯一 createdAt 用于前端去重。 */
  /** @param eventType 持久化事件类型（如 member_status、tool_call、tool_approved），不限 SSE 事件类型 */
  private persistEvent(executionId: string, eventType: string, extra: Record<string, any> = {}): void {
    const meta = this.executionMeta.get(executionId)
    appendEvent(meta?.teamId, executionId, {
      id: '', // 占位，实际用 createdAt 去重
      executionId,
      eventType,
      createdAt: new Date().toISOString(),
      teamId: meta?.teamId,
      teamName: meta?.teamName,
      taskTitle: meta?.taskTitle,
      memberId: extra.memberId,
      memberName: extra.memberName,
      role: extra.role,
      data: extra,
    })
  }

  /** 获取 meta 信息供广播使用 */
  private metaForBroadcast(executionId: string): { teamId?: string; teamName?: string; taskTitle?: string } {
    const meta = this.executionMeta.get(executionId)
    return { teamId: meta?.teamId, teamName: meta?.teamName, taskTitle: meta?.taskTitle }
  }

  /** 推送成员状态 */
  pushMemberStatus(executionId: string, data: Omit<MemberStatusEvent, 'type' | 'executionId'>): void {
    this.broadcast(executionId, { type: 'member_status', executionId, ...data, ...this.metaForBroadcast(executionId) })
    this.persistEvent(executionId, 'member_status', data)
  }

  /** 推送成员输出 */
  pushMemberOutput(executionId: string, data: Omit<MemberOutputEvent, 'type' | 'executionId'>): void {
    this.broadcast(executionId, { type: 'member_output', executionId, ...data, ...this.metaForBroadcast(executionId) })
    this.persistEvent(executionId, 'member_output', data)
  }

  /** 推送工具审批请求 */
  pushToolApproval(executionId: string, request: HITLRequest): ToolApprovalRequiredEvent {
    const meta = this.metaForBroadcast(executionId)
    const event: ToolApprovalRequiredEvent = {
      type: 'tool_approval_required',
      executionId,
      taskTitle: meta.taskTitle,
      teamName: meta.teamName,
      teamId: meta.teamId,
      actionRequests: request.actionRequests,
      reviewConfigs: request.reviewConfigs,
    }
    this.broadcast(executionId, event)
    this.persistEvent(executionId, 'tool_call', { actionRequests: request.actionRequests })
    return event
  }

  /** 推送执行完成 */
  pushExecutionComplete(executionId: string, result: { status: 'completed' | 'failed'; result?: string; error?: string }): void {
    this.broadcast(executionId, { type: 'execution_complete', executionId, ...result, ...this.metaForBroadcast(executionId) })
    this.persistEvent(executionId, 'execution_complete', result)
    // 清除待审批（任务已结束，不再需要审批）
    const pending = this.pendingApprovals.get(executionId)
    if (pending) {
      this.pendingApprovals.delete(executionId)
      const decisions = pending.request.actionRequests.map(() => ({ type: 'reject' as const, message: '任务已终止' }))
      pending.resolve({ decisions })
      this.persistEvent(executionId, 'tool_approved', { decisions, reason: 'execution_terminated' })
    }
    // 清理资源（延时，给 SSE 客户端时间消费）
    setTimeout(() => {
      this.sseClients.delete(executionId)
      this.pendingApprovals.delete(executionId)
      this.autoApprovedTools.delete(executionId)
      this.executionMeta.delete(executionId)
    }, 5_000)
  }

  // ============================================================
  //  HITL / Tool Approval
  // ============================================================

  /** 注册待审批的工具调用（被 CallLLM 的 approvalCallback 调用） */
  registerPendingApproval(executionId: string, request: HITLRequest): Promise<HITLResponse> {
    return new Promise((resolve, reject) => {
      this.pendingApprovals.set(executionId, { request, resolve, reject })
      this.pushToolApproval(executionId, request)
    })
  }

  /** 提交审批决策 */
  approveToolCall(executionId: string, decisions: HITLDecision[]): boolean {
    const pending = this.pendingApprovals.get(executionId)
    if (!pending) return false
    this.pendingApprovals.delete(executionId)
    pending.resolve({ decisions })
    // 持久化审批结果，下次刷新后能恢复正确状态
    this.persistEvent(executionId, 'tool_approved', { decisions })
    return true
  }

  /** 设置自动审批（某工具后续自动放行） */
  setAutoApprove(executionId: string, toolName: string): boolean {
    if (!this.autoApprovedTools.has(executionId)) this.autoApprovedTools.set(executionId, new Set())
    this.autoApprovedTools.get(executionId)!.add(toolName)

    // 如果当前有等待审批且所有工具都已自动审批，直接放行
    const pending = this.pendingApprovals.get(executionId)
    if (pending) {
      const allApproved = pending.request.actionRequests.every(a => this.autoApprovedTools.get(executionId)?.has(a.name))
      if (allApproved) {
        this.pendingApprovals.delete(executionId)
        const decisions = pending.request.actionRequests.map(() => ({ type: 'approve' as const }))
        pending.resolve({ decisions })
        this.persistEvent(executionId, 'tool_approved', { decisions, autoApproved: true })
      }
    }
    return true
  }

  /** 检查某工具是否已自动审批 */
  isToolAutoApproved(executionId: string, toolName: string): boolean {
    return this.autoApprovedTools.get(executionId)?.has(toolName) ?? false
  }

  /** 获取待审批数量（供前端徽标使用） */
  getPendingApprovalCount(): number {
    return this.pendingApprovals.size
  }

  /** 获取待审批详情列表 */
  getPendingApprovalDetails(): Array<{
    executionId: string
    taskTitle?: string
    teamName?: string
    teamId?: string
    actionRequests: { name: string; args: Record<string, any>; description: string }[]
  }> {
    const result: Array<{
      executionId: string
      taskTitle?: string
      teamName?: string
      teamId?: string
      actionRequests: { name: string; args: Record<string, any>; description: string }[]
    }> = []
    for (const [executionId, pending] of this.pendingApprovals) {
      const meta = this.executionMeta.get(executionId)
      result.push({
        executionId,
        taskTitle: meta?.taskTitle,
        teamName: meta?.teamName,
        teamId: meta?.teamId,
        actionRequests: pending.request.actionRequests,
      })
    }
    return result
  }

  /** 获取当前活跃状态（供 SSE 重连后重放） */
  getActiveState(): { executionIds: string[]; pendingApprovals: Array<{
    executionId: string; taskTitle?: string; teamName?: string; teamId?: string
    actionRequests: { name: string; args: Record<string, any>; description: string }[]
  }> } {
    const executionIds = this.getActiveExecutionIds()
    const pendingApprovals = this.getPendingApprovalDetails()
    return { executionIds, pendingApprovals }
  }

  /** 清理指定 execution 的所有状态 */
  cleanup(executionId: string): void {
    this.sseClients.delete(executionId)
    this.pendingApprovals.delete(executionId)
    this.autoApprovedTools.delete(executionId)
    this.executionMeta.delete(executionId)
  }
}

export const teamExecutionTracker = new TeamExecutionTracker()
