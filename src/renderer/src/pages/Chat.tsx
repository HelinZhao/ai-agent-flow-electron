import React, { useState, useRef, useEffect } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { Agent, AttachmentMetadata, ChatHistory, ChatMessage, ToolApprovalRequest } from '@renderer/types';
import { chatHistoryApi } from '@renderer/lib/chatHistory';
import { workflowExecutionApi } from '@renderer/lib/api';
import { AttachmentData, processFileAttachment, stripAttachmentForHistory, formatFileSize } from '@renderer/lib/attachmentUtils';
import CustomButton from '@renderer/components/CustomButton';
import MarkdownPreview from '@renderer/components/MarkdownPreview';
import AttachmentPreview from '@renderer/components/AttachmentPreview';
import AttachmentDisplay from '@renderer/components/AttachmentDisplay';
import CustomFileUpload from '@renderer/components/CustomFileUpload';

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
    const [messages, setMessages] = useState<ChatMessage[]>([]);
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

    // 过滤agents基于搜索词
    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agent.description && agent.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const scrollToBottom = (): void => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    const saveChatHistory = async (messagesToSave?: ChatMessage[]) => {
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
        const userMessage: ChatMessage = {
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

            const agentMessage: ChatMessage = {
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
            const errorMessage: ChatMessage = {
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

    const startNewChat = (): void => {
        // 先清除历史记录文件
        if (selectedAgent) {
            saveChatHistory([]);
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

    const formatTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
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
            const SERVER_URL = 'http://localhost:3100';
            const url = att.url
                ? (att.url.startsWith('/') ? `${SERVER_URL}${att.url}` : att.url)
                : `${SERVER_URL}/api/attachments/${att.id}/${encodeURIComponent(att.name)}`;
            window.open(url, '_blank');
        }
    };

    const getPreviewImageUrl = (att: AttachmentMetadata): string => {
        const SERVER_URL = 'http://localhost:3100';
        if (att.url) return att.url.startsWith('/') ? `${SERVER_URL}${att.url}` : att.url;
        if (att.previewUrl) return att.previewUrl;
        return `${SERVER_URL}/api/attachments/${att.id}/${encodeURIComponent(att.name)}`;
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
            {/* 顶部工具栏 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-lg">💬</span>
                            </div>
                            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                AI 对话
                            </h2>
                        </div>
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
                <div className="w-72 flex-shrink-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 p-4 overflow-y-auto">
                    <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">🤖</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Agent列表</h3>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                            {filteredAgents.length}
                        </span>
                    </div>

                    {/* 搜索框 */}
                    <div className="mb-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400">🔍</span>
                            </div>
                            <input
                                type="text"
                                placeholder="搜索Agent..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        {filteredAgents.map(agent => (
                            <div
                                key={agent.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${selectedAgent?.id === agent.id
                                    ? 'border-blue-500/50 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20'
                                    : 'border-gray-200/50 dark:border-gray-600/50 hover:border-gray-300/50 dark:hover:border-gray-500/50 hover:shadow-sm bg-white/50 dark:bg-gray-700/30'
                                    }`}
                                onClick={() => setSelectedAgent(agent)}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${selectedAgent?.id === agent.id
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                        }`}>
                                        {agent.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                            {agent.name}
                                        </div>
                                        {agent.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                {agent.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredAgents.length === 0 && (
                            <div className="text-center py-12">
                                {searchTerm ? (
                                    <>
                                        <div className="text-4xl mb-3">🔍</div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">未找到匹配的Agent</p>
                                        <p className="text-gray-400 dark:text-gray-500 text-xs">尝试使用其他关键词搜索</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-4xl mb-3">🤖</div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">暂无可用Agent</p>
                                        <p className="text-gray-400 dark:text-gray-500 text-xs">请先在Agent管理页面创建</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 右侧聊天区域 */}
                <div className="flex-1 flex flex-col min-w-0">
                    {selectedAgent ? (
                        <>
                            {/* 消息列表 */}
                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 bg-gradient-to-b from-white/50 to-gray-50/30 dark:from-gray-800/50 dark:to-gray-900/30">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <div className="text-6xl mb-4 animate-bounce">💬</div>
                                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            开始与 {selectedAgent.name} 对话
                                        </h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                                            发送消息开始对话，或询问Agent相关信息
                                        </p>
                                    </div>
                                )}

                                {messages.map(message => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} group`}
                                    >
                                        <div className={`flex items-start space-x-2 ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse max-w-[70%]' : 'max-w-[80%]'}`}>
                                            {/* 头像 */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 mt-1 ${message.sender === 'user'
                                                ? 'bg-gradient-to-r from-gray-500 to-gray-600'
                                                : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                                }`}>
                                                {message.sender === 'user' ? '👤' : '🤖'}
                                            </div>

                                            {/* 消息气泡 */}
                                            <div
                                                className={`px-4 py-3 shadow-sm min-w-0 ${message.sender === 'user'
                                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-sm'
                                                    : 'bg-white dark:bg-gray-700/80 text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-600/50 rounded-2xl rounded-bl-sm backdrop-blur-sm'
                                                    }`}
                                            >
                                                <AttachmentDisplay attachments={message.attachments} sender={message.sender} onAttachmentClick={handleAttachmentClick} />
                                                {message.sender === 'user'
                                                    ? <div className="text-sm leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
                                                    : <div className="text-sm leading-relaxed">
                                                        <MarkdownPreview content={message.content} />
                                                    </div>
                                                }
                                                <div className={`text-xs mt-2 flex items-center space-x-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                    <span>{formatTime(message.timestamp)}</span>
                                                    {message.sender === 'agent' && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="opacity-75">{selectedAgent.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {isLoading && !pendingApproval && (
                                    <div className="flex justify-start">
                                        <div className="flex items-start space-x-2 max-w-3xl">
                                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 mt-1">
                                                🤖
                                            </div>
                                            <div className="bg-white dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/50 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm backdrop-blur-sm">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex space-x-1">
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                    </div>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">{selectedAgent.name} 正在思考...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isLoading && pendingApproval && (
                                    <div className="flex justify-start">
                                        <div className="flex items-start space-x-2 max-w-[80%]">
                                            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 mt-1">
                                                ⚠️
                                            </div>
                                            <div className="bg-white dark:bg-gray-700/80 border border-orange-300/50 dark:border-orange-600/50 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm backdrop-blur-sm">
                                                <div className="text-sm text-gray-700 dark:text-gray-200 font-medium mb-2">
                                                    工具调用需要审批
                                                </div>
                                                <div className="space-y-2 mb-3">
                                                    {pendingApproval.actionRequests.map((action, i) => (
                                                        <div key={i} className="bg-gray-50 dark:bg-gray-600/50 rounded-lg p-2 text-xs">
                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                {TOOL_LABELS[action.name] || action.name}
                                                            </div>
                                                            <div className="text-gray-600 dark:text-gray-300 mt-1 max-h-[80px] overflow-auto">
                                                                {JSON.stringify(action.args, null, 2)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <CustomButton
                                                        onClick={() => handleApprove(true)}
                                                        variant="primary"
                                                        size="sm"
                                                    >
                                                        允许
                                                    </CustomButton>
                                                    <CustomButton
                                                        onClick={() => handleApprove(false)}
                                                        variant="danger"
                                                        size="sm"
                                                    >
                                                        拒绝
                                                    </CustomButton>
                                                    {pendingApproval.actionRequests.map((action) => (
                                                        <CustomButton
                                                            key={action.name}
                                                            onClick={() => handleAutoApprove(action.name)}
                                                            variant="secondary"
                                                            size="sm"
                                                        >
                                                            本会话允许{TOOL_LABELS[action.name] || action.name}
                                                        </CustomButton>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* 输入区域 */}
                            <div className="p-4 pt-0">
                                <div className="bg-gray-50/80 dark:bg-gray-700/50 rounded-2xl border border-gray-200/50 dark:border-gray-600/50 overflow-hidden backdrop-blur-sm">
                                    <div className="p-4">
                                        <AttachmentPreview
                                            attachments={pendingAttachments}
                                            onRemove={(id) => setPendingAttachments(prev => prev.filter(a => a.id !== id))}
                                        />
                                        <textarea
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            placeholder={`向 ${selectedAgent.name} 发送消息...`}
                                            className="w-full resize-none bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-h-[52px] max-h-[140px] text-base leading-relaxed"
                                            rows={1}
                                            disabled={isLoading}
                                            style={{
                                                overflow: 'hidden',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/30 border-t border-gray-200/30 dark:border-gray-600/30">
                                        <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                                            <CustomFileUpload
                                                onChange={handleFileSelect}
                                                multiple
                                                disabled={isLoading}
                                                size='sm'
                                                variant='ghost'
                                            >
                                                附件
                                            </CustomFileUpload>
                                            <div className="flex items-center space-x-1">
                                                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded text-xs">Enter</kbd>
                                                <span>发送</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded text-xs">Shift+Enter</kbd>
                                                <span>换行</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            <div className="text-xs text-gray-400 dark:text-gray-500">
                                                {inputMessage.length}/2000
                                            </div>
                                            {isLoading ? (
                                                <CustomButton
                                                    onClick={handleTerminate}
                                                    variant="danger"
                                                    size="sm"
                                                    className="flex items-center space-x-2 px-6"
                                                >
                                                    <span>⏹</span>
                                                    <span>终止</span>
                                                </CustomButton>
                                            ) : (
                                                <CustomButton
                                                    onClick={handleSendMessage}
                                                    disabled={!inputMessage.trim() && pendingAttachments.length === 0}
                                                    variant="primary"
                                                    size="sm"
                                                    className="flex items-center space-x-2 px-6"
                                                >
                                                    <span>🚀</span>
                                                    <span>发送</span>
                                                </CustomButton>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-gray-600/50">
                            <div className="text-center max-w-lg mx-auto px-6">
                                <div className="relative mb-8">
                                    <div className="text-8xl mb-4 animate-pulse">🤖</div>
                                    <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>
                                </div>
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                                    AI Agent 对话助手
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 text-lg mb-8">
                                    选择一个Agent开始智能对话，体验AI的强大能力
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                                        <div className="text-2xl mb-2">🎯</div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">精准回答</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">基于专业工作流提供准确回复</p>
                                    </div>
                                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                                        <div className="text-2xl mb-2">💡</div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">智能分析</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">深度理解问题并提供洞察</p>
                                    </div>
                                </div>

                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    💡 提示：从左侧选择一个Agent开始对话，或先在Agent管理页面创建新的Agent
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