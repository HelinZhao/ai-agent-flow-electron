import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@renderer/store/appStore';
import { AttachmentMetadata } from '@renderer/types';
import { AttachmentData, processFileAttachment, formatFileSize } from '@renderer/lib/attachmentUtils';
import { SERVER_BASE_URL, TOOL_LABEL_MAP } from '@renderer/config';
import { useConversation } from '@renderer/hooks/useConversation';
import AgentListSidebar from '@renderer/components/chat/AgentListSidebar';
import ChatMessage from '@renderer/components/chat/ChatMessage';
import ChatInput from '@renderer/components/chat/ChatInput';
import CustomButton from '@renderer/components/ui/CustomButton';
import CustomInput from '@renderer/components/ui/CustomInput';

export default function Chat(): React.JSX.Element {
  const { agents, activeLLMConfig, pinnedAgentIds, togglePinAgent } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [previewImage, setPreviewImage] = useState<AttachmentMetadata | null>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);
  const [inputHeight, setInputHeight] = useState(160);
  const MIN_INPUT = 100;
  const MAX_INPUT_RATIO = 0.6;

  const conv = useConversation();
  const {
    selectedAgent, setSelectedAgent,
    messages, inputMessage, setInputMessage, pendingAttachments, setPendingAttachments,
    draftAgentIds, unreadAgentIds, pendingAgentIds,
    isLoading, isLoadingHistory,
    pendingApproval,
    sentHistory,
    sendMessage, handleApprove, handleAutoApprove, handleTerminate,
    startNewChat, startNewChatForAgent, clearCurrentchatRecord, regenerate,
    loadMoreMessages, hasMoreMessages,
    messagesEndRef: convMessagesEndRef,
    searchAllMessages,
  } = conv

  // 输入框拖拽缩放
  const handleResizeStart = (e: React.MouseEvent): void => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = inputHeight;
    const container = chatAreaRef.current;
    const wrapper = inputWrapperRef.current;
    if (!container || !wrapper) return;
    const maxHeight = container.getBoundingClientRect().height * MAX_INPUT_RATIO;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      const height = Math.min(maxHeight, Math.max(MIN_INPUT, startHeight + delta));
      wrapper.style.height = `${height}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setInputHeight(parseInt(wrapper.style.height) || startHeight);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  // 加载更早消息时保持滚动位置
  useEffect(() => {
    if (pendingScrollRef.current) {
      const container = messageListRef.current
      if (container) {
        const { scrollTop, scrollHeight: oldHeight } = pendingScrollRef.current
        container.scrollTop = scrollTop + (container.scrollHeight - oldHeight)
      }
      pendingScrollRef.current = null
    }
  }, [messages])

  const handleLoadMore = (): void => {
    if (!selectedAgent) return
    const container = messageListRef.current
    if (container) {
      pendingScrollRef.current = {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
      }
    }
    loadMoreMessages(selectedAgent.id)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachmentData[] = [];
    for (const file of Array.from(files)) {
      try {
        newAttachments.push(await processFileAttachment(file));
      } catch (error) {
        console.error(`处理文件 ${file.name} 失败:`, error);
      }
    }

    setPendingAttachments([...pendingAttachments, ...newAttachments]);
    e.target.value = '';
  };

  const handleAttachmentClick = (att: AttachmentMetadata): void => {
    if (att.category === 'image') {
      setPreviewImage(att);
    } else {
      const url = att.url
        ? (att.url.startsWith('/') ? `${SERVER_BASE_URL}${att.url}` : att.url)
        : `${SERVER_BASE_URL}/api/attachments/${att.id}/${encodeURIComponent(att.name)}`;
      window.open(url, '_blank');
    }
  };

  const getPreviewImageUrl = (att: AttachmentMetadata): string => {
    if (att.url) return att.url.startsWith('/') ? `${SERVER_BASE_URL}${att.url}` : att.url;
    if (att.previewUrl) return att.previewUrl;
    return `${SERVER_BASE_URL}/api/attachments/${att.id}/${encodeURIComponent(att.name)}`;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
      {/* 顶部工具栏 */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/40 dark:border-gray-700/40 px-5 py-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">AI 对话</h2>
            {selectedAgent && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-md font-medium">
                {selectedAgent.name}
              </span>
            )}
          </div>

          {selectedAgent && (
            <div className="flex items-center space-x-2 h-6">
              {isLoadingHistory && (
                <div className="flex items-center space-x-1.5 text-xs text-gray-400 dark:text-gray-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400" />
                  <span>加载对话记录...</span>
                </div>
              )}
              {showSearch ? (
                <div className="w-44">
                  <CustomInput
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    placeholder="搜索消息..."
                    size="xs"
                    autoFocus
                    clearable
                    clearablePersist
                    onClear={() => { setShowSearch(false); setMessageSearch('') }}
                    leftIcon={
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                    }
                  />
                </div>
              ) : (
                <CustomButton variant="secondary" size="xs" onClick={() => setShowSearch(true)} title="搜索消息">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                </CustomButton>
              )}
              <CustomButton variant="secondary" size="xs" onClick={startNewChat}>
                <span>✨</span> 新对话
              </CustomButton>
              <CustomButton variant="danger" size="xs" onClick={clearCurrentchatRecord}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                对话记录
              </CustomButton>
            </div>
          )}
        </div>
      </div>

      {/* 聊天内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        <AgentListSidebar
          agents={agents}
          selectedAgent={selectedAgent}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSelectAgent={setSelectedAgent}
          onTogglePin={togglePinAgent}
          onNewChat={(agent) => startNewChatForAgent(agent)}
          pinnedAgentIds={pinnedAgentIds}
          draftAgentIds={draftAgentIds}
          unreadAgentIds={unreadAgentIds}
          pendingAgentIds={pendingAgentIds}
        />

        <div ref={chatAreaRef} className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {(() => {
            const { selectedAgent } = conv
            if (!selectedAgent) {
              return (
                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-gray-900/50">
                  <div className="text-center max-w-xs mx-auto px-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-400/10 dark:to-indigo-400/10 flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <span className="text-4xl">🤖</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 tracking-tight">AI Agent 对话助手</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">选择一个 Agent 开始智能对话，体验 AI 的强大能力</p>
                    <div className="flex flex-col gap-3 mb-8">
                      <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-200/50 dark:border-gray-700/40 text-left">
                        <span className="text-base mr-2">🎯</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">精准回答</span>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 pl-8">基于专业工作流提供准确回复</p>
                      </div>
                      <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-200/50 dark:border-gray-700/40 text-left">
                        <span className="text-base mr-2">💡</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">智能分析</span>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 pl-8">深度理解上下文，提供精准洞察</p>
                      </div>
                      <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-200/50 dark:border-gray-700/40 text-left">
                        <span className="text-base mr-2">🚀</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">高效执行</span>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 pl-8">快捷完成复杂任务流程</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <>
                <div ref={messageListRef} className={`${messages.length === 0 ? 'overflow-y-hidden' : 'overflow-y-auto'} overflow-x-hidden px-5 py-4 space-y-4 bg-gray-50/40 dark:bg-gray-900/30`} style={{ flex: 1, minHeight: 0 }}>
                  {(() => {
                    const searchTerm = messageSearch.trim().toLowerCase()
                    const hasSearch = searchTerm.length > 0
                    const filtered = hasSearch
                      ? searchAllMessages(searchTerm)
                      : messages

                    // 定位最后一条 agent 消息的索引（在过滤后的数组中的位置）
                    let lastAgentIdx = -1
                    if (!hasSearch) {
                      for (let i = filtered.length - 1; i >= 0; i--) {
                        if (filtered[i].sender === 'agent' && !isLoading) {
                          lastAgentIdx = i; break
                        }
                      }
                    }

                    return filtered.length === 0 && messages.length > 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                        <svg className="w-10 h-10 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <p className="text-sm">未找到匹配的消息</p>
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 flex items-center justify-center mb-5 shadow-sm">
                          <span className="text-2xl">💬</span>
                        </div>
                        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          开始与 {selectedAgent.name} 对话
                        </h3>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">发送消息开始对话，或询问 Agent 相关信息</p>
                      </div>
                    ) : (
                      <>
                        {hasMoreMessages && !hasSearch && (
                          <div className="flex justify-center pt-1 pb-2">
                            <button onClick={handleLoadMore}
                              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-700/50 border border-gray-200/60 dark:border-gray-600/40 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600/60 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12l7 7 7-7" />
                              </svg>
                              加载更早消息
                            </button>
                          </div>
                        )}
                        {filtered.map((message, idx) => (
                          <ChatMessage
                            key={message.id}
                            message={message}
                            agentName={selectedAgent!.name}
                            agentAvatarUrl={selectedAgent!.avatarUrl}
                            onAttachmentClick={handleAttachmentClick}
                            isLastAgent={idx === lastAgentIdx}
                            onRegenerate={idx === lastAgentIdx ? () => regenerate(agents, activeLLMConfig) : undefined}
                          />
                        ))}
                      </>
                    )
                  })()}

                  {isLoading && !pendingApproval && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-2.5 max-w-3xl">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5 shadow-sm">🤖</div>
                        <div className="bg-white dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/40 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce" />
                              <div className="w-1.5 h-1.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.12s' }} />
                              <div className="w-1.5 h-1.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.24s' }} />
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{selectedAgent.name} 正在思考...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {pendingApproval && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-2.5 max-w-[80%]">
                        <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5 shadow-sm">⚠️</div>
                        <div className="bg-white dark:bg-gray-700/80 border border-orange-200/60 dark:border-orange-600/40 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                            工具调用需要审批
                          </div>
                          <div className="space-y-1.5 mb-3">
                            {pendingApproval!.actionRequests.map((action, i) => (
                              <div key={i} className="bg-gray-50/80 dark:bg-gray-600/40 rounded-lg p-2.5 text-xs border border-gray-100 dark:border-gray-600/30">
                                <div className="font-medium text-gray-800 dark:text-gray-200">{TOOL_LABEL_MAP[action.name] || action.name}</div>
                                <div className="text-gray-500 dark:text-gray-400 mt-1 max-h-[80px] overflow-auto font-mono text-[10px]">
                                  {JSON.stringify(action.args, null, 2)}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <CustomButton onClick={() => handleApprove(true)} variant="primary" size="xs">允许</CustomButton>
                            <CustomButton onClick={() => handleApprove(false)} variant="danger" size="xs">拒绝</CustomButton>
                            <CustomButton onClick={() => {
                              const uniqueTools = new Set(pendingApproval!.actionRequests.map(a => a.name))
                              uniqueTools.forEach(name => handleAutoApprove(name))
                            }} variant="secondary" size="xs">本会话允许</CustomButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={convMessagesEndRef} />
                </div>

                <ChatInput
                  key={selectedAgent.id}
                  inputMessage={inputMessage}
                  onInputChange={setInputMessage}
                  onSend={() => sendMessage(
                    inputMessage,
                    pendingAttachments,
                    agents,
                    activeLLMConfig,
                  )}
                  disabled={isLoading}
                  placeholder={`向 ${selectedAgent.name} 发送消息...`}
                  attachments={pendingAttachments}
                  onAttachmentsChange={setPendingAttachments}
                  onFileSelect={handleFileSelect}
                  isLoading={isLoading}
                  onTerminate={handleTerminate}
                  inputHeight={inputHeight}
                  onResizeStart={handleResizeStart}
                  inputWrapperRef={inputWrapperRef}
                  sentHistory={sentHistory}
                />
              </>
            )
          })()}
        </div>
      </div>

      {/* 图片预览模态框 */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={getPreviewImageUrl(previewImage)}
              alt={previewImage.name}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center text-lg shadow-lg transition-colors">✕</button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-sm px-4 py-2 rounded-b-lg">
              {previewImage.name} · {formatFileSize(previewImage.size)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
