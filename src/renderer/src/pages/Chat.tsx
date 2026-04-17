import React, { useState, useRef, useEffect } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { Agent, ChatHistory, ChatMessage } from '@renderer/types';
import { chatHistoryApi } from '@renderer/lib/chatHistory';
import { workflowExecutionApi } from '@renderer/lib/api';

// 使用全局类型定义，不需要重复定义

export default function Chat(): React.JSX.Element {
    const { agents, workflows, activeLLMConfig } = useWorkflowStore();
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        if (!inputMessage.trim() || !selectedAgent || !activeLLMConfig) {
            if (!activeLLMConfig) {
                alert('请先配置LLM API');
            }
            return;
        }

        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            content: inputMessage,
            sender: 'user',
            timestamp: new Date().toISOString(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputMessage('');
        setIsLoading(true);

        try {
            // 获取Agent绑定的工作流
            const agentWorkflow = workflows.find(w => w.id === selectedAgent.workflowId);
            if (!agentWorkflow) {
                throw new Error('Agent未绑定有效的工作流');
            }

            // 执行AI Agent对话
            const { executionId, success } = await workflowExecutionApi.agentChatMonitor(
                selectedAgent.id,
                inputMessage,
                selectedAgent.id // 使用agent ID作为thread ID来维持对话记忆
            )
            if (!success) {
                throw new Error(`AI Agent 对话启动失败`)
            }

            // 等待执行完成并获取结果
            const { message, success: finalSuccess } = await workflowExecutionApi.waitForAgentChatResult(
                executionId,
                (progress) => {
                  // 可以在这里更新UI显示执行进度
                  console.log('执行进度:', progress.metrics)
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
            const errorMessage: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                content: `抱歉，处理您的消息时出现了错误: ${error instanceof Error ? error.message : '未知错误'}`,
                sender: 'agent',
                timestamp: new Date().toISOString(),
                agentId: selectedAgent.id,
            };
            const finalMessages = [...newMessages, errorMessage];
            setMessages(finalMessages);

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
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
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

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* 顶部工具栏 */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI 对话</h1>

                        <select
                            value={selectedAgent?.id || ''}
                            onChange={(e) => {
                                const agent = agents.find(a => a.id === e.target.value);
                                setSelectedAgent(agent || null);
                            }}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">选择Agent</option>
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.name}
                                </option>
                            ))}
                        </select>

                        {selectedAgent && (
                            <div className="flex items-center space-x-2">
                                {isLoadingHistory && (
                                    <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                                        <span>加载历史...</span>
                                    </div>
                                )}
                                <button
                                    onClick={startNewChat}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    新对话
                                </button>
                                <button
                                    onClick={clearCurrentChatHistory}
                                    className="px-4 py-2 border border-red-300 dark:border-red-600 rounded-md text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    清空历史
                                </button>
                            </div>
                        )}
                    </div>

                    {selectedAgent && (
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            当前Agent: {selectedAgent.name}
                        </div>
                    )}
                </div>
            </div>

            {/* 聊天内容区域 */}
            <div className="flex-1 flex overflow-auto">
                {/* 左侧Agent列表 */}
                <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-auto" >
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">可用Agents</h3>
                    <div className="space-y-2">
                        {agents.map(agent => (
                            <div
                                key={agent.id}
                                className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedAgent?.id === agent.id
                                    ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-600'
                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    } border`}
                                onClick={() => setSelectedAgent(agent)}
                            >
                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                    {agent.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {agent.description}
                                </div>
                            </div>
                        ))}
                        {agents.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                                还没有可用的Agent<br />
                                请先在Agent管理页面创建
                            </div>
                        )}
                    </div>
                </div>

                {/* 右侧聊天区域 */}
                <div className="flex-1 flex flex-col h-full">
                    {selectedAgent ? (
                        <>
                            {/* 消息列表 */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <div className="text-4xl mb-2">💬</div>
                                        <p>开始与 {selectedAgent.name} 对话</p>
                                    </div>
                                )}

                                {messages.map(message => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender === 'user'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                }`}
                                        >
                                            <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
                                            <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                                                }`}>
                                                {formatTime(message.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-300"></div>
                                                <span className="text-sm">思考中...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* 输入区域 */}
                            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                                <div className="flex space-x-2">
                                    <textarea
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="输入您的消息..."
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        rows={1}
                                        disabled={isLoading}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!inputMessage.trim() || isLoading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        发送
                                    </button>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    按 Enter 发送，Shift + Enter 换行
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-6xl mb-4">🤖</div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    选择一个Agent开始对话
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                    从左侧选择一个Agent，或者先在首页创建一个工作流
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}