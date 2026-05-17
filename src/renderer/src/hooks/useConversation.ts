import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Agent, AttachmentMetadata, ChatRecord, ToolApprovalRequest } from '@renderer/types'
import type { ChatMessage as ChatMessageType } from '@renderer/types'
import { chatRecordApi } from '@renderer/lib/chatRecord'
import { workflowExecutionApi } from '@renderer/lib/api'
import { AttachmentData, stripAttachmentForHistory } from '@renderer/lib/attachmentUtils'

function syncPending(executions: Record<string, string>, setState: (s: Set<string>) => void) {
  setState(new Set(Object.keys(executions)))
}

export function useConversation() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const [pendingApproval, setPendingApproval] = useState<ToolApprovalRequest | null>(null)
  const [autoApprovedTools, setAutoApprovedTools] = useState<Set<string>>(new Set())
  const [unreadAgentIds, setUnreadAgentIds] = useState<Set<string>>(new Set())
  const [pendingAgentIds, setPendingAgentIds] = useState<Set<string>>(new Set())

  const conversationsRef = useRef<Record<string, ChatMessageType[]>>({})
  const activeAgentRef = useRef<string | null>(null)
  const pendingExecutionsRef = useRef<Record<string, string>>({})
  const draftsRef = useRef<Record<string, { text: string; attachments: AttachmentData[] }>>({})
  // 每个 Agent 已发送的消息历史（用于方向键回溯）
  const sentHistoryRef = useRef<Record<string, string[]>>({})
  const unreadRef = useRef<Set<string>>(new Set())
  const pendingApprovalRef = useRef<Record<string, ToolApprovalRequest | null>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // SSE 回调里需要最新值，用 ref 避免闭包陈旧
  const autoApprovedRef = useRef<Set<string>>(new Set())
  autoApprovedRef.current = autoApprovedTools
  // switchAgent 有 [] 依赖，闭包里的 pendingApproval 永远是初始 null，必须用 ref 读取最新值
  const latestPendingApprovalRef = useRef<ToolApprovalRequest | null>(null)
  latestPendingApprovalRef.current = pendingApproval
  // 主动终止标记，避免 sendMessage 的 catch 产生错误回复
  const terminatingRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages])

  // 将对话写出到缓存 + 磁盘 + 处理未读/UI 更新的公共逻辑
  const finalizeResponse = useCallback(async (
    agentId: string,
    agentName: string,
    newMessages: ChatMessageType[],
    agentMessage: ChatMessageType,
  ) => {
    const finalMessages = [...newMessages, agentMessage]
    delete pendingExecutionsRef.current[agentId]
    syncPending(pendingExecutionsRef.current, setPendingAgentIds)
    conversationsRef.current[agentId] = finalMessages

    if (activeAgentRef.current === agentId) {
      setMessages(finalMessages)
    } else {
      unreadRef.current.add(agentId)
      setUnreadAgentIds(new Set(unreadRef.current))
    }

    if (!document.hasFocus() && window.api?.notify) {
      window.api.notify.flashFrame()
    }

    await chatRecordApi.saveRecord(agentId, agentName, finalMessages).catch(() => {})
  }, [])

  const switchAgent = useCallback((agent: Agent | null) => {
    // 用 ref 读取最新值避免闭包陈旧
    const prevId = activeAgentRef.current
    const currentMessages = conversationsRef.current[prevId ?? ''] ?? messages
    const currentInput = inputMessage
    const currentAttachments = pendingAttachments

    setSelectedAgent(agent)

    if (!agent) {
      activeAgentRef.current = null
      setMessages([])
      setInputMessage('')
      setPendingAttachments([])
      return
    }

    // 保存上个 Agent 的对话 + 草稿 + 待审批状态
    if (prevId) {
      if (currentMessages.length > 0) {
        conversationsRef.current[prevId] = currentMessages
      }
      if (currentInput || currentAttachments.length > 0) {
        draftsRef.current[prevId] = { text: currentInput, attachments: currentAttachments }
      } else {
        delete draftsRef.current[prevId]
      }
      if (latestPendingApprovalRef.current) {
        pendingApprovalRef.current[prevId] = latestPendingApprovalRef.current
      } else {
        delete pendingApprovalRef.current[prevId]
      }
    }

    setIsLoading(false)
    setCurrentExecutionId(null)
    setPendingApproval(null)
    activeAgentRef.current = agent.id

    // 恢复目标 Agent 的草稿
    const draft = draftsRef.current[agent.id]
    setInputMessage(draft?.text ?? '')
    setPendingAttachments(draft?.attachments ?? [])
    delete draftsRef.current[agent.id]

    if (unreadRef.current.has(agent.id)) {
      unreadRef.current.delete(agent.id)
      setUnreadAgentIds(new Set(unreadRef.current))
    }

    if (agent.id in conversationsRef.current) {
      setMessages(conversationsRef.current[agent.id])
    } else {
      loadchatRecord(agent.id)
    }

    const hasPending = agent.id in pendingExecutionsRef.current
    setIsLoading(hasPending)
    if (hasPending) setCurrentExecutionId(pendingExecutionsRef.current[agent.id])

    // 恢复待审批状态
    if (agent.id in pendingApprovalRef.current) {
      const saved = pendingApprovalRef.current[agent.id]
      delete pendingApprovalRef.current[agent.id]
      if (saved) setPendingApproval(saved)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // 故意省略依赖：switchAgent 只用 ref 读取最新值，不需要重建

  const loadchatRecord = useCallback(async (agentId: string) => {
    setIsLoadingHistory(true)
    try {
      const result = await chatRecordApi.loadRecord(agentId)
      if (result.success && result.history) {
        const history: ChatRecord = result.history
        conversationsRef.current[agentId] = history.messages
        setMessages(history.messages)
      } else {
        conversationsRef.current[agentId] = []
        setMessages([])
      }
    } catch {
      conversationsRef.current[agentId] = []
      setMessages([])
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  const sendMessage = useCallback(async (
    text: string,
    attachments: AttachmentData[],
    agents: Agent[],
    workflows: { id: string; workflowId?: string }[],
    activeLLMConfig: unknown,
  ) => {
    const agent = agents.find(a => a.id === selectedAgent?.id) || selectedAgent
    if ((!text.trim() && attachments.length === 0) || !agent || !activeLLMConfig) {
      if (!activeLLMConfig) alert('请先配置LLM API')
      return
    }

    const currentAgentId = agent.id
    const currentAgentName = agent.name
    const attachmentsMetadata: AttachmentMetadata[] = attachments.map(stripAttachmentForHistory)
    const userMessage: ChatMessageType = {
      id: `msg-${Date.now()}`,
      content: text || (attachments.length > 0 ? '(附件)' : ''),
      sender: 'user',
      timestamp: new Date().toISOString(),
      attachments: attachmentsMetadata,
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    conversationsRef.current[currentAgentId] = newMessages
    setInputMessage('')
    setPendingAttachments([])
    delete draftsRef.current[currentAgentId]
    // 立即存盘用户消息，防止 agent 回复前关应用导致丢失
    chatRecordApi.saveRecord(currentAgentId, currentAgentName, newMessages).catch(() => {})
    // 记录发送历史（按方向键回溯用）
    const history = sentHistoryRef.current[currentAgentId] || []
    if (text.trim() && (history.length === 0 || history[history.length - 1] !== text.trim())) {
      sentHistoryRef.current[currentAgentId] = [...history, text.trim()]
    }
    setIsLoading(true)

    const attachmentsPayload = attachments.map((att) => ({
      id: att.id, name: att.name, type: att.type, size: att.size,
      category: att.category, dataUrl: att.dataUrl, textContent: att.textContent,
    }))

    try {
      const agentWorkflow = workflows.find((w) => w.id === agent.workflowId)
      if (!agentWorkflow) throw new Error('Agent未绑定有效的工作流')

      const { executionId, success } = await workflowExecutionApi.agentChatMonitor(
        agent.id, userMessage.content, agent.id, attachmentsPayload,
        Array.from(autoApprovedTools),
      )
      if (!success) throw new Error('AI Agent 对话启动失败')

      setCurrentExecutionId(executionId)
      pendingExecutionsRef.current[currentAgentId] = executionId
      syncPending(pendingExecutionsRef.current, setPendingAgentIds)

      const { message, success: finalSuccess } = await workflowExecutionApi.waitForAgentChatResultSSE(
        executionId,
        (progress) => {
          // 用 ref 读取最新 autoApprovedTools，避免闭包陈旧
          const approved = autoApprovedRef.current
          if (progress.type === 'tool_approval_required') {
            if (approved.size > 0 && progress.actionRequests.every((a) => approved.has(a.name))) {
              workflowExecutionApi
                .approveToolCall(executionId, progress.actionRequests.map(() => ({ type: 'approve' })))
                .catch(() => {})
            } else {
              setPendingApproval({ actionRequests: progress.actionRequests, reviewConfigs: progress.reviewConfigs })
              scrollToBottom()
            }
          } else if (progress.type === 'node_update') {
            setPendingApproval(null)
          }
        },
      )

      if (!finalSuccess) throw new Error(`AI Agent 对话执行失败: ${message}`)

      await finalizeResponse(currentAgentId, currentAgentName, newMessages, {
        id: `msg-${Date.now() + 1}`,
        content: message, sender: 'agent',
        timestamp: new Date().toISOString(), agentId: currentAgentId,
      })
    } catch (error) {
      if (terminatingRef.current) {
        terminatingRef.current = false
        // 被主动终止，不追加错误回复，只保留已有对话
        conversationsRef.current[currentAgentId] = newMessages
      } else {
        await finalizeResponse(currentAgentId, currentAgentName, newMessages, {
          id: `msg-${Date.now() + 1}`,
          content: `抱歉，处理您的消息时出现了错误: ${error instanceof Error ? error.message : '未知错误'}`,
          sender: 'agent',
          timestamp: new Date().toISOString(), agentId: currentAgentId,
        })
      }
    } finally {
      delete pendingExecutionsRef.current[currentAgentId]
      delete pendingApprovalRef.current[currentAgentId]
      syncPending(pendingExecutionsRef.current, setPendingAgentIds)
      if (activeAgentRef.current === currentAgentId) {
        setIsLoading(false)
        setCurrentExecutionId(null)
      }
    }
  }, [selectedAgent, messages, autoApprovedTools, scrollToBottom, finalizeResponse])

  const handleApprove = useCallback(async (approved: boolean) => {
    if (!currentExecutionId || !pendingApproval) return
    try {
      await workflowExecutionApi.approveToolCall(
        currentExecutionId,
        pendingApproval.actionRequests.map(() => ({
          type: approved ? 'approve' : 'reject',
          message: approved ? undefined : '用户拒绝执行此工具',
        })),
      )
      setPendingApproval(null)
    } catch { /* ignore */ }
  }, [currentExecutionId, pendingApproval])

  const handleAutoApprove = useCallback(async (toolName: string) => {
    if (!currentExecutionId) return
    try {
      await workflowExecutionApi.setAutoApprove(currentExecutionId, toolName)
      setAutoApprovedTools((prev) => new Set([...prev, toolName]))
      setPendingApproval(null)
    } catch { /* ignore */ }
  }, [currentExecutionId])

  const handleTerminate = useCallback(async () => {
    if (!currentExecutionId) return
    terminatingRef.current = true
    try {
      await workflowExecutionApi.stopExecution(currentExecutionId)
    } catch { /* ignore */ }
    // 清理所有状态，包括 ref 中的执行和审批记录
    const agentId = activeAgentRef.current
    if (agentId) {
      delete pendingExecutionsRef.current[agentId]
      delete pendingApprovalRef.current[agentId]
      syncPending(pendingExecutionsRef.current, setPendingAgentIds)
    }
    setIsLoading(false)
    setCurrentExecutionId(null)
    setPendingApproval(null)
  }, [currentExecutionId])

  const startNewChat = useCallback(async () => {
    const agent = selectedAgent
    if (!agent) return
    if (messages.length === 0) { conversationsRef.current[agent.id] = []; setMessages([]); return }

    if (!window.confirm(
      `确定要开始新对话吗？\n\n这将清除与 ${agent.name} 的所有对话记录，同时清除AI的记忆（包括之前的对话上下文）。此操作不可恢复。`,
    )) return

    try { await workflowExecutionApi.deleteThread(agent.id) } catch { /* ignore */ }
    try {
      const result = await chatRecordApi.deleteRecord(agent.id)
      if (!result.success) console.error('清空对话记录文件失败:', result.error)
    } catch { /* ignore */ }

    conversationsRef.current[agent.id] = []
    setMessages([])
  }, [selectedAgent, messages])

  const clearCurrentchatRecord = useCallback(async () => {
    const agent = selectedAgent
    if (!agent) return
    if (!window.confirm(`确定要清空 ${agent.name} 的所有对话记录吗？此操作不可恢复。`)) return

    try {
      const result = await chatRecordApi.deleteRecord(agent.id)
      if (result.success) { conversationsRef.current[agent.id] = []; setMessages([]) }
      else { alert('清空对话记录失败，请检查控制台了解详情') }
    } catch { alert('清空对话记录时发生错误') }
  }, [selectedAgent])

  // 从末尾向前找到最后一条用户消息，删除其后所有消息并重新发送
  const regenerate = useCallback(async (
    agents: Agent[],
    workflows: { id: string; workflowId?: string }[],
    activeLLMConfig: unknown,
  ) => {
    const agent = agents.find(a => a.id === selectedAgent?.id) || selectedAgent
    if (!agent || messages.length === 0) return

    let lastUserIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') { lastUserIdx = i; break }
    }
    if (lastUserIdx === -1) return

    const userMsg = messages[lastUserIdx]
    const truncated = messages.slice(0, lastUserIdx + 1)
    conversationsRef.current[agent.id] = truncated
    setMessages(truncated)

    // 截断后重新发送用户消息
    await chatRecordApi.saveRecord(agent.id, agent.name, truncated).catch(() => {})
    await sendMessage(userMsg.content, userMsg.attachments || [], agents, workflows, activeLLMConfig)
  }, [selectedAgent, messages, sendMessage])

  const sentHistory = selectedAgent ? sentHistoryRef.current[selectedAgent.id] || [] : []

  const draftAgentIds = useMemo(
    () => new Set(Object.keys(draftsRef.current).filter((k) => draftsRef.current[k].text.length > 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputMessage, pendingAttachments, selectedAgent],
  )

  return {
    selectedAgent, setSelectedAgent: switchAgent,
    messages, inputMessage, setInputMessage, pendingAttachments, setPendingAttachments,
    draftAgentIds, unreadAgentIds, pendingAgentIds,
    isLoading, isLoadingHistory, currentExecutionId,
    pendingApproval, autoApprovedTools, setAutoApprovedTools,
    sentHistory,
    sendMessage, handleApprove, handleAutoApprove, handleTerminate,
    startNewChat, clearCurrentchatRecord, regenerate,
    scrollToBottom, messagesEndRef,
  }
}
