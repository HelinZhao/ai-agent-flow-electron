import React, { useState, useRef, useEffect } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { Agent, AttachmentMetadata, ChatHistory, ToolApprovalRequest } from '@renderer/types';
import type { ChatMessage as ChatMessageType } from '@renderer/types';
import { chatHistoryApi } from '@renderer/lib/chatHistory';
import { workflowExecutionApi } from '@renderer/lib/api';
import { AttachmentData, processFileAttachment, stripAttachmentForHistory, formatFileSize } from '@renderer/lib/attachmentUtils';
import CustomButton from '@renderer/components/ui/CustomButton';
import AttachmentPreview from '@renderer/components/chat/AttachmentPreview';
import ChatMessage from '@renderer/components/chat/ChatMessage';
import CustomFileUpload from '@renderer/components/ui/CustomFileUpload';
import { SERVER_BASE_URL } from '@renderer/config';
import AgentListSidebar from '@renderer/components/chat/AgentListSidebar';

// 工具名称中文映射
const TOOL_LABELS: Record<string, string> = {
    readFile: '读取文件',
    writeFile: '写入文件',
    listDirectory: '列出目录',
    executeCommand: '执行命令',
    httpRequest: 'HTTP请求',
    webSearch: '网页搜索',
};

export default function Chat(): React.JSX.Element {
    const { agents, workflows, activeLLMConfig } = useWorkflowStore();
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
    const [pendingApproval, setPendingApproval] = useState<ToolApprovalRequest | null>(null);
    const [autoApprovedTools, setAutoApprovedTools] = useState<Set<string>>(new Set());
    const [pendingAttachments, setPendingAttachments] = useState<AttachmentData[]>([]);
    const [previewImage, setPreviewImage] = useState<AttachmentMetadata | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatAreaRef = useRef<HTMLDivElement>(null);
    const inputWrapperRef = useRef<HTMLDivElement>(null);
    const [inputHeight, setInputHeight] = useState(160);

    const scrollToBottom = (): void => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const MIN_INPUT = 100;
    const MAX_INPUT_RATIO = 0.6;

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

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 当选中Agent变化时，加载对应的对话历史
    useEffect(() => {
        if (selectedAgent) {
            loadChatHistory(selectedAgent.id);
        } else {
            setMessages([]);
        }
    }, [selectedAgent?.id]);

    // 保存对话历史到文件
    const saveChatHistory = async (messagesToSave?: ChatMessageType[]) => {
        if (selectedAgent && (messagesToSave || messages).length > 0) {
            try {
                const messagesToStore = messagesToSave || messages;
                await chatHistoryApi.saveHistory(
                    selectedAgent.id,
                    selectedAgent.name,
                    messagesToStore
                );
            } catch (error) {
                console.error('保存对话历史失败:', error);
            }
        }
    };

    // 加载对话历史
    const loadChatHistory = async (agentId: string) => {
        try {
            setIsLoadingHistory(true);
            const result = await chatHistoryApi.loadHistory(agentId);

            if (result.success && result.history) {
                const history: ChatHistory = result.history;
                setMessages(history.messages);
            } else {
                setMessages([]);
            }
        } catch (error) {
            console.error('加载对话历史失败:', error);
            setMessages([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleSendMessage = async (): Promise<void> => {
        if ((!inputMessage.trim() && pendingAttachments.length === 0) || !selectedAgent || !activeLLMConfig) {
            if (!activeLLMConfig) {
                alert('请先配置LLM API');
            }
            return;
        }

        const attachmentsMetadata: AttachmentMetadata[] = pendingAttachments.map(stripAttachmentForHistory);
        const userMessage: ChatMessageType = {
            id: `msg-${Date.now()}`,
            content: inputMessage || (pendingAttachments.length > 0 ? '(附件)' : ''),
            sender: 'user',
            timestamp: new Date().toISOString(),
            attachments: attachmentsMetadata,
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputMessage('');
        setPendingAttachments([]);
        setIsLoading(true);

        // 构建附件发送数据
        const attachmentsPayload = pendingAttachments.map(att => ({
            id: att.id,
            name: att.name,
            type: att.type,
            size: att.size,
            category: att.category,
            dataUrl: att.dataUrl,
            textContent: att.textContent,
        }))

        try {
            // 获取Agent绑定的工作流
            const agentWorkflow = workflows.find(w => w.id === selectedAgent.workflowId);
            if (!agentWorkflow) {
                throw new Error('Agent未绑定有效的工作流');
            }

            // 执行AI Agent对话
            const { executionId, success } = await workflowExecutionApi.agentChatMonitor(
                selectedAgent.id,
                userMessage.content,
                selectedAgent.id,
                attachmentsPayload,
                Array.from(autoApprovedTools)
            )
            if (!success) {
                throw new Error(`AI Agent 对话启动失败`)
            }
            setCurrentExecutionId(executionId)

            // 等待执行完成并获取结果（使用SSE）
            const { message, success: finalSuccess } = await workflowExecutionApi.waitForAgentChatResultSSE(
                executionId,
                (progress) => {
                    // 工具审批请求：暂停等待用户决策
                    if (progress.type === 'tool_approval_required') {
                        console.log('工具审批请求:', progress)
                        // 如果此工具类型已放权，自动审批
                        if (autoApprovedTools.size > 0 && progress.actionRequests.every(a => autoApprovedTools.has(a.name))) {
                            workflowExecutionApi.approveToolCall(
                                executionId,
                                progress.actionRequests.map(() => ({ type: 'approve' }))
                            ).catch(console.error)
                        } else {
                            setPendingApproval({
                                actionRequests: progress.actionRequests,
                                reviewConfigs: progress.reviewConfigs,
                            })
                            scrollToBottom()
                        }
                    } else if (progress.type === 'node_update') {
                        console.log(`节点 ${progress.nodeLabel} 已完成`)
                        // 工具审批已处理时清除
                        setPendingApproval(null)
                    }
                }
            )

            if (!finalSuccess) {
                throw new Error(`AI Agent 对话执行失败: ${message}`)
            }

            const agentMessage: ChatMessageType = {
                id: `msg-${Date.now() + 1}`,
                content: message,
                sender: 'agent',
                timestamp: new Date().toISOString(),
                agentId: selectedAgent.id,
            };

            const finalMessages = [...newMessages, agentMessage];
            setMessages(finalMessages);

            // 窗口未聚焦时闪烁任务栏提醒用户
            if (!document.hasFocus() && window.api?.notify) {
                window.api.notify.flashFrame()
            }

            // 自动保存对话历史（此时finalMessages已包含所有最新消息）
            if (selectedAgent && finalMessages.length > 0) {
                try {
                    await chatHistoryApi.saveHistory(
                        selectedAgent.id,
                        selectedAgent.name,
                        finalMessages
                    );
                } catch (error) {
                    console.error('保存对话历史失败:', error);
                }
            }
        } catch (error) {
            console.error('消息发送失败:', error);
            console.log(error)
            const errorMessage: ChatMessageType = {
                id: `msg-${Date.now() + 1}`,
                content: `抱歉，处理您的消息时出现了错误: ${error instanceof Error ? error.message : '未知错误'}`,
                sender: 'agent',
                timestamp: new Date().toISOString(),
                agentId: selectedAgent.id,
            };
            const finalMessages = [...newMessages, errorMessage];
            setMessages(finalMessages);

            // 窗口未聚焦时闪烁任务栏提醒用户
            if (!document.hasFocus() && window.api?.notify) {
                window.api.notify.flashFrame()
            }

            // 自动保存对话历史（此时finalMessages已包含所有最新消息）
            if (selectedAgent && finalMessages.length > 0) {
                try {
                    await chatHistoryApi.saveHistory(
                        selectedAgent.id,
                        selectedAgent.name,
                        finalMessages
                    );
                } catch (saveError) {
                    console.error('保存对话历史失败:', saveError);
                }
            }
        } finally {
            setIsLoading(false);
            setCurrentExecutionId(null);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputMessage.trim() || pendingAttachments.length > 0) {
                handleSendMessage();
            }
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newAttachments: AttachmentData[] = [];
        for (const file of Array.from(files)) {
            try {
                const attachment = await processFileAttachment(file);
                newAttachments.push(attachment);
            } catch (error) {
                console.error(`处理文件 ${file.name} 失败:`, error);
            }
        }

        setPendingAttachments(prev => [...prev, ...newAttachments]);

        // 重置 input value，确保下次选择同一文件时仍能触发 onChange
        e.target.value = '';
    };

    const handleTerminate = async (): Promise<void> => {
        if (!currentExecutionId) return;
        try {
            await workflowExecutionApi.stopExecution(currentExecutionId);
            setIsLoading(false);
            setCurrentExecutionId(null);
        } catch (error) {
            console.error('终止执行失败:', error);
        }
    };

    const startNewChat = async (): Promise<void> => {
        if (!selectedAgent) return;

        // 如果没有消息，直接清除无需确认
        if (messages.length === 0) {
            saveChatHistory([]);
            setMessages([]);
            return;
        }

        // 确认对话框：提示将清除对话历史和AI记忆
        const confirmMessage = `确定要开始新对话吗？\n\n这将清除与 ${selectedAgent.name} 的所有对话历史，同时清除AI的记忆（包括之前的对话上下文）。此操作不可恢复。`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        // 清除AI的checkpoint记忆
        try {
            await workflowExecutionApi.deleteThread(selectedAgent.id);
        } catch (error) {
            console.error('清除AI记忆失败:', error);
        }

        // 清除本地聊天历史文件
        try {
            const result = await chatHistoryApi.deleteHistory(selectedAgent.id);
            if (result.success) {
                console.log(`已清空Agent ${selectedAgent.name} 的对话历史`);
            } else {
                console.error('清空对话历史文件失败:', result.error);
            }
        } catch (error) {
            console.error('清空对话历史文件时发生错误:', error);
        }

        setMessages([]);
    };

    // 清空当前对话历史（删除文件）
    const clearCurrentChatHistory = async (): Promise<void> => {
        if (!selectedAgent) return;

        // 确认对话框
        const confirmMessage = `确定要清空 ${selectedAgent.name} 的所有对话历史吗？此操作不可恢复。`;
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            const result = await chatHistoryApi.deleteHistory(selectedAgent.id);
            if (result.success) {
                console.log(`已清空Agent ${selectedAgent.name} 的对话历史`);
                // 清空当前消息显示
                setMessages([]);
            } else {
                console.error('清空对话历史失败:', result.error);
                alert('清空对话历史失败，请检查控制台了解详情');
            }
        } catch (error) {
            console.error('清空对话历史时发生错误:', error);
            alert('清空对话历史时发生错误，请检查控制台了解详情');
        }
    };

    const handleApprove = async (approved: boolean): Promise<void> => {
        if (!currentExecutionId || !pendingApproval) return;
        try {
            await workflowExecutionApi.approveToolCall(
                currentExecutionId,
                pendingApproval.actionRequests.map(() => ({
                    type: approved ? 'approve' : 'reject',
                    message: approved ? undefined : '用户拒绝执行此工具',
                }))
            );
            setPendingApproval(null);
        } catch (error) {
            console.error('审批操作失败:', error);
        }
    };

    const handleAutoApprove = async (toolName: string): Promise<void> => {
        if (!currentExecutionId) return;
        try {
            await workflowExecutionApi.setAutoApprove(currentExecutionId, toolName);
            setAutoApprovedTools(prev => new Set([...prev, toolName]));
            setPendingApproval(null);
        } catch (error) {
            console.error('设置自动审批失败:', error);
        }
    };

    const handleAttachmentClick = (att: AttachmentMetadata): void => {
        if (att.category === 'image') {
            setPreviewImage(att);
        } else {
            // 非图片文件：用Express URL在新窗口打开
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
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                            AI 对话
                        </h2>
                        {selectedAgent && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-md font-medium">
                                {selectedAgent.name}
                            </span>
                        )}
                    </div>

                    {selectedAgent && (
                        <div className="flex items-center space-x-2">
                            {isLoadingHistory && (
                                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                                    <span>加载历史...</span>
                                </div>
                            )}
                            <CustomButton
                                onClick={startNewChat}
                                variant="secondary"
                                size="sm"
                                className="flex items-center space-x-1"
                            >
                                <span>✨</span>
                                <span>新对话</span>
                            </CustomButton>
                            <CustomButton
                                onClick={clearCurrentChatHistory}
                                variant="danger"
                                size="sm"
                                className="flex items-center space-x-1"
                            >
                                <span>🗑️</span>
                                <span>清空历史</span>
                            </CustomButton>
                        </div>
                    )}
                </div>
            </div>

            {/* 聊天内容区域 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 左侧Agent列表 */}
                <AgentListSidebar
                    agents={agents}
                    selectedAgent={selectedAgent}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSelectAgent={setSelectedAgent}
                />

                {/* 右侧聊天区域 */}
                <div ref={chatAreaRef} className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {selectedAgent ? (
                        <>
                            {/* 消息列表 */}
                            <div className="overflow-y-auto overflow-x-hidden px-5 py-5 space-y-4 bg-gray-50/40 dark:bg-gray-900/30" style={{ flex: 1, minHeight: 0 }}>
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full py-20">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 flex items-center justify-center mb-5 shadow-sm">
                                            <span className="text-2xl">💬</span>
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            开始与 {selectedAgent.name} 对话
                                        </h3>
                                        <p className="text-gray-400 dark:text-gray-500 text-xs">
                                            发送消息开始对话，或询问 Agent 相关信息
                                        </p>
                                    </div>
                                )}

                                {messages.map(message => (
                                    <ChatMessage
                                        key={message.id}
                                        message={message}
                                        agentName={selectedAgent.name}
                                        onAttachmentClick={handleAttachmentClick}
                                    />
                                ))}

                                {isLoading && !pendingApproval && (
                                    <div className="flex justify-start">
                                        <div className="flex items-start gap-2.5 max-w-3xl">
                                            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5 shadow-sm">
                                                🤖
                                            </div>
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

                                {isLoading && pendingApproval && (
                                    <div className="flex justify-start">
                                        <div className="flex items-start gap-2.5 max-w-[80%]">
                                            <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5 shadow-sm">
                                                ⚠️
                                            </div>
                                            <div className="bg-white dark:bg-gray-700/80 border border-orange-200/60 dark:border-orange-600/40 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                                                <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2.5 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                                                    工具调用需要审批
                                                </div>
                                                <div className="space-y-1.5 mb-3">
                                                    {pendingApproval.actionRequests.map((action, i) => (
                                                        <div key={i} className="bg-gray-50/80 dark:bg-gray-600/40 rounded-lg p-2.5 text-xs border border-gray-100 dark:border-gray-600/30">
                                                            <div className="font-medium text-gray-800 dark:text-gray-200">
                                                                {TOOL_LABELS[action.name] || action.name}
                                                            </div>
                                                            <div className="text-gray-500 dark:text-gray-400 mt-1 max-h-[80px] overflow-auto font-mono text-[10px]">
                                                                {JSON.stringify(action.args, null, 2)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <CustomButton
                                                        onClick={() => handleApprove(true)}
                                                        variant="primary"
                                                        size="xs"
                                                    >
                                                        允许
                                                    </CustomButton>
                                                    <CustomButton
                                                        onClick={() => handleApprove(false)}
                                                        variant="danger"
                                                        size="xs"
                                                    >
                                                        拒绝
                                                    </CustomButton>
                                                    <CustomButton
                                                        onClick={() => {
                                                            const uniqueTools = new Set(pendingApproval.actionRequests.map(a => a.name))
                                                            uniqueTools.forEach(name => handleAutoApprove(name))
                                                        }}
                                                        variant="secondary"
                                                        size="xs"
                                                    >
                                                        本会话允许
                                                    </CustomButton>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* 拖拽分隔条 */}
                            <div
                                className="h-2 cursor-ns-resize relative flex items-center justify-center group hover:bg-blue-500/5 transition-colors shrink-0"
                                onMouseDown={handleResizeStart}
                            >
                                <div className="w-7 h-0.5 rounded-full bg-gray-300/70 dark:bg-gray-600/70 group-hover:bg-blue-400/60 transition-colors" />
                            </div>

                            {/* 输入区域 */}
                            <div ref={inputWrapperRef} className="px-4 pb-4 pt-0 shrink-0" style={{ height: inputHeight, minHeight: MIN_INPUT }}>
                                <div className="bg-white dark:bg-gray-700/80 rounded-2xl border border-gray-200/50 dark:border-gray-600/40 overflow-hidden shadow-sm h-full flex flex-col">
                                    <div className="px-4 pt-3.5 pb-0 flex-1 flex flex-col min-h-0">
                                        <AttachmentPreview
                                            attachments={pendingAttachments}
                                            onRemove={(id) => setPendingAttachments(prev => prev.filter(a => a.id !== id))}
                                        />
                                        <textarea
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            placeholder={`向 ${selectedAgent.name} 发送消息...`}
                                            className="w-full resize-none bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm leading-relaxed flex-1 min-h-0"
                                            disabled={isLoading}
                                            style={{
                                                overflow: 'auto',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between px-3 pb-2.5 pt-1 shrink-0">
                                        <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                                            <CustomFileUpload
                                                onChange={handleFileSelect}
                                                multiple
                                                disabled={isLoading}
                                                size='xs'
                                                variant='ghost'
                                            >
                                                附件
                                            </CustomFileUpload>
                                            <div className="flex items-center gap-1">
                                                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-600/60 rounded text-[10px] font-medium">Enter</kbd>
                                                <span>发送</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-600/60 rounded text-[10px] font-medium">Shift+Enter</kbd>
                                                <span>换行</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                                                {inputMessage.length}/2000
                                            </span>
                                            {isLoading ? (
                                                <CustomButton
                                                    onClick={handleTerminate}
                                                    variant="danger"
                                                    size="xs"
                                                    className="flex items-center gap-1.5"
                                                >
                                                    <span>⏹</span>
                                                    <span>终止</span>
                                                </CustomButton>
                                            ) : (
                                                <CustomButton
                                                    onClick={handleSendMessage}
                                                    disabled={!inputMessage.trim() && pendingAttachments.length === 0}
                                                    variant="primary"
                                                    size="xs"
                                                    className="flex items-center gap-1.5"
                                                >
                                                    <span>发送</span>
                                                </CustomButton>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-gray-900/50">
                            <div className="text-center max-w-xs mx-auto px-6">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-400/10 dark:to-indigo-400/10 flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <span className="text-4xl">🤖</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 tracking-tight">
                                    AI Agent 对话助手
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                                    选择一个 Agent 开始智能对话，体验 AI 的强大能力
                                </p>

                                <div className="flex flex-col gap-3 mb-8">
                                    <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-200/50 dark:border-gray-700/40 text-left">
                                        <span className="text-base mr-2">🎯</span>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">精准回答</span>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 pl-8">基于专业工作流提供准确回复</p>
                                    </div>
                                    <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-200/50 dark:border-gray-700/40 text-left">
                                        <span className="text-base mr-2">💡</span>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">智能分析</span>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 pl-8">深度理解问题并提供洞察</p>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    从左侧选择一个 Agent 开始对话
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 图片预览模态框 */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]">
                        <img
                            src={getPreviewImageUrl(previewImage)}
                            alt={previewImage.name}
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center text-lg shadow-lg transition-colors"
                        >
                            ✕
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-sm px-4 py-2 rounded-b-lg">
                            {previewImage.name} · {formatFileSize(previewImage.size)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}