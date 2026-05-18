import { useState, useRef, useEffect, useCallback } from 'react'
import { useWorkflowStore } from '@renderer/store/workflowStore'
import { workflowExecutionApi } from '@renderer/lib/api'
import type { ChatMessage as ChatMessageType, ToolApprovalRequest } from '@renderer/types'
import { TOOL_LABEL_MAP } from '@renderer/config'
import CustomButton from '@renderer/components/ui/CustomButton'

const SYSTEM_AGENT_ID = '00000000-0000-0000-0000-000000000001'
const SYSTEM_AGENT_NAME = '系统助手'
const BTN_SIZE = 48
const GAP = 24

export default function SystemAssistantChat() {
  const { agents, activeLLMConfig, addAgent } = useWorkflowStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<ToolApprovalRequest | null>(null)
  const [autoApprovedTools, setAutoApprovedTools] = useState<Set<string>>(new Set())
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const autoApprovedRef = useRef<Set<string>>(new Set())
  autoApprovedRef.current = autoApprovedTools
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; origLeft: number; origTop: number; dragging: boolean } | null>(null)
  const [pos, setPos] = useState(() => ({ x: window.innerWidth - BTN_SIZE - GAP, y: window.innerHeight - BTN_SIZE - GAP }))
  const posRef = useRef(pos)
  posRef.current = pos

  // 拖拽逻辑 — 直接操作 DOM，不触发 React 重渲染
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = btnRef.current
    if (!el) return
    e.preventDefault()
    el.style.transition = 'none'
    const rect = el.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: rect.left,
      origTop: rect.top,
      dragging: false,
    }
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = ev.clientX - d.startX
      const dy = ev.clientY - d.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.dragging = true
      el.style.left = `${Math.max(0, Math.min(window.innerWidth - BTN_SIZE, d.origLeft + dx))}px`
      el.style.top = `${Math.max(0, Math.min(window.innerHeight - BTN_SIZE, d.origTop + dy))}px`
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const d = dragRef.current
      if (d) {
        el.style.transition = ''
        if (!d.dragging) {
          setOpen((v) => !v)
        } else {
          posRef.current = { x: parseInt(el.style.left, 10), y: parseInt(el.style.top, 10) }
          setPos(posRef.current)
        }
      }
      dragRef.current = null
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const systemAgent = agents.find(a => a.id === SYSTEM_AGENT_ID || a.name === SYSTEM_AGENT_NAME)
  const creatingRef = useRef(false)

  // 确保系统助手存在
  useEffect(() => {
    if (systemAgent || creatingRef.current) return
    creatingRef.current = true
    // 延迟尝试，等 store 数据加载完成
    const timer = setTimeout(async () => {
      const exists = agents.find(a => a.id === SYSTEM_AGENT_ID || a.name === SYSTEM_AGENT_NAME)
      if (!exists) {
        try {
          await addAgent({
            name: SYSTEM_AGENT_NAME,
            description: 'Agent Flow 内置 AI 助手，帮助你了解和使用本应用',
            instructions: `你是 Agent Flow 的内置 AI 助手。

你的职责是帮助用户了解和使用 Agent Flow 这个 AI 工作流编排平台。

你可以回答以下方面的问题：
1. 工作流创建和编辑（节点类型、连线、布局）
2. Agent 配置（标准 Agent 和工作流 Agent 的区别）
3. 技能管理（创建和绑定技能）
4. 知识库使用（内部/外部知识库、RAG 检索）
5. 触发器设置（Cron 定时触发和 Webhook）
6. LLM 配置（支持哪些提供商、如何切换）
7. 工具调用和人工审批（HITL）
8. 应用常见问题排查

回答要求：
- 使用中文，简洁明了
- 如果问题超出你的知识范围，诚实地告诉用户你不确定
- 对于操作类问题，给出清晰的步骤指引
- 保持友好和耐心的语气`,
            type: 'standard',
            enabledTools: [
              'readFile', 'writeFile', 'listDirectory', 'executeCommand',
              'httpRequest', 'webSearch',
              'workflowsApi', 'agentsSkillsApi', 'knowledgeApi', 'configApi',
              'readSkill',
            ],
          })
        } catch (e) {
          console.error('[系统助手] 自动创建失败:', e)
        }
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [systemAgent, agents, addAgent])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    const agent = systemAgent || agents.find(a => a.id === SYSTEM_AGENT_ID)
    if (!text || loading) return
    if (!agent || !activeLLMConfig) {
      const hint = !agent ? '系统助手暂未就绪，请刷新后重试' : '请先在设置中配置 LLM 模型'
      setMessages([...messages, {
        id: `msg-${Date.now()}`,
        content: hint,
        sender: 'agent',
        timestamp: new Date().toISOString(),
      }])
      return
    }

    const userMsg: ChatMessageType = {
      id: `msg-${Date.now()}`,
      content: text,
      sender: 'user',
      timestamp: new Date().toISOString(),
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const { executionId, success } = await workflowExecutionApi.agentChatMonitor(
        agent.id, text, agent.id, [], Array.from(autoApprovedTools),
      )
      if (!success) throw new Error('对话启动失败')
      setCurrentExecutionId(executionId)

      const { message, success: finalSuccess } = await workflowExecutionApi.waitForAgentChatResultSSE(
        executionId,
        (progress) => {
          if (progress.type === 'tool_approval_required') {
            if (autoApprovedRef.current.size > 0 && progress.actionRequests.every((a) => autoApprovedRef.current.has(a.name))) {
              workflowExecutionApi.approveToolCall(executionId, progress.actionRequests.map(() => ({ type: 'approve' }))).catch(() => {})
            } else {
              setPendingApproval({ actionRequests: progress.actionRequests, reviewConfigs: progress.reviewConfigs })
            }
          } else if (progress.type === 'node_update') {
            setPendingApproval(null)
          }
        },
      )

      if (!finalSuccess) throw new Error(message)

      setMessages([...newMessages, {
        id: `msg-${Date.now() + 1}`,
        content: message,
        sender: 'agent',
        timestamp: new Date().toISOString(),
        agentId: agent.id,
      }])
    } catch (error) {
      setMessages([...newMessages, {
        id: `msg-${Date.now() + 1}`,
        content: `抱歉，处理消息时出错了: ${error instanceof Error ? error.message : '未知错误'}`,
        sender: 'agent',
        timestamp: new Date().toISOString(),
        agentId: agent.id,
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = useCallback(async (approved: boolean) => {
    if (!currentExecutionId || !pendingApproval) return
    try {
      await workflowExecutionApi.approveToolCall(
        currentExecutionId,
        pendingApproval.actionRequests.map(() => ({ type: approved ? 'approve' : 'reject' })),
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 计算聊天弹窗位置（优先在按钮上方，空间不够则下方）
  const popoverStyle = (() => {
    const pw = 384, ph = 384, gap = 8
    const left = Math.max(0, Math.min(pos.x, window.innerWidth - pw))
    const top = pos.y - ph - gap < 0 ? pos.y + BTN_SIZE + gap : pos.y - ph - gap
    return { left, top }
  })()

  return (
    <>
      {/* Floating button */}
      <button
        ref={btnRef}
        onMouseDown={handleMouseDown}
        className="fixed z-[100] w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        style={{ left: pos.x, top: pos.y }}
        title="系统助手"
      >
        {open ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat popover */}
      {open && <div className="fixed z-50 w-80 sm:w-96 h-96 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden" style={popoverStyle}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-gray-200 dark:border-gray-700">
            <span>✨</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1">系统助手</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">随时提问</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 dark:text-gray-500">你好！我是 Agent Flow 的系统助手</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">有什么可以帮助你的吗？</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && !pendingApproval && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 rounded-bl-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            {pendingApproval && (
              <div className="flex justify-start">
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 px-3 py-2.5 rounded-xl rounded-bl-md text-xs w-full">
                  <div className="font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    工具调用需要审批
                  </div>
                  <div className="space-y-1.5 mb-2">
                    {pendingApproval.actionRequests.map((action, i) => (
                      <div key={i} className="bg-white dark:bg-gray-700/50 rounded-lg p-2 border border-amber-100 dark:border-amber-800/30">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{TOOL_LABEL_MAP[action.name] || action.name}</div>
                        <div className="text-gray-500 dark:text-gray-400 mt-1 max-h-[60px] overflow-auto font-mono text-[10px]">
                          {JSON.stringify(action.args, null, 2)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CustomButton onClick={() => handleApprove(true)} variant="primary" size="xs">允许</CustomButton>
                    <CustomButton onClick={() => handleApprove(false)} variant="danger" size="xs">拒绝</CustomButton>
                    <CustomButton onClick={() => {
                      const uniqueTools = new Set(pendingApproval.actionRequests.map(a => a.name))
                      uniqueTools.forEach(name => handleAutoApprove(name))
                    }} variant="secondary" size="xs">本会话允许</CustomButton>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入问题..."
                rows={1}
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white flex items-center justify-center hover:from-amber-500 hover:to-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      }
    </>
  )
}
