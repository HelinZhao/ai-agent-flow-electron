import React, { useState } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { Agent } from '@renderer/types';
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import MarkdownPreview from '@renderer/components/MarkdownPreview';
import CustomSelect from '@renderer/components/ui/CustomSelect';
import CustomInput from '@renderer/components/ui/CustomInput';
import CustomButton from '@renderer/components/ui/CustomButton';

const mdParser = new MarkdownIt(/* Markdown-it options */);
export default function Agents(): React.JSX.Element {
    const { agents, addAgent, updateAgent, deleteAgent, workflows } = useWorkflowStore();
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 过滤agents基于搜索词
    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agent.description && agent.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        instructions: '',
        workflowId: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = (): void => {
        setSelectedAgent(null);
        setFormData({ name: '', description: '', instructions: '', workflowId: '' });
        setIsEditing(true);
    };

    const handleEdit = (agent: Agent): void => {
        setSelectedAgent(agent);
        setFormData({
            name: agent.name,
            description: agent.description,
            instructions: agent.instructions,
            workflowId: agent.workflowId || ''
        });
        setIsEditing(true);
    };

    const handleSave = async (): Promise<void> => {
        if (!formData.name.trim() || !formData.instructions.trim()) return;

        setIsLoading(true);
        try {
            if (selectedAgent) {
                await updateAgent(selectedAgent.id, formData);
            } else {
                await addAgent(formData);
            }
            setIsEditing(false);
            setSelectedAgent(null);
            setFormData({ name: '', description: '', instructions: '', workflowId: '' });
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = (agent: Agent): void => {
        if (window.confirm(`确定要删除Agent "${agent.name}" 吗？`)) {
            deleteAgent(agent.id);
            if (selectedAgent?.id === agent.id) {
                setSelectedAgent(null);
                setIsEditing(false);
            }
        }
    };

    return (
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">🤖</span>
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Agent管理
                    </h1>
                </div>
                <div className="flex space-x-2">
                    <CustomButton
                        onClick={handleCreate}
                        variant="primary"
                        style={{ height: 46 }}
                    >
                        <span>✨</span>
                        <span>创建新Agent</span>
                    </CustomButton>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Agent列表 */}
                <div className="lg:col-span-1 flex flex-col overflow-auto">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 flex-1 flex flex-col">
                        <div className="p-4 pb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2 mb-4">
                                <span className="text-white font-bold text-lg">📋</span>
                                <span>Agent列表</span>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                    {filteredAgents.length}
                                </span>
                            </h3>

                            {/* 搜索框 */}
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
                        <div className="flex-1 overflow-y-auto p-4 pt-0">
                            <div className="space-y-2">
                                {filteredAgents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${selectedAgent?.id === agent.id
                                            ? 'border-blue-500/50 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20'
                                            : 'border-gray-200/50 dark:border-gray-600/50 hover:border-gray-300/50 dark:hover:border-gray-500/50 hover:shadow-sm bg-white/50 dark:bg-gray-700/30'
                                            }`}
                                        onClick={() => {
                                            setSelectedAgent(agent);
                                            setIsEditing(false);
                                        }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
                                                    {agent.name}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {agent.description || '暂无描述'}
                                                </p>
                                            </div>
                                            <div className="flex space-x-1 ml-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(agent);
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                                                    title="编辑"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(agent);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                                    title="删除"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredAgents.length === 0 && (
                                    <div className="text-center py-12">
                                        {searchTerm ? (
                                            <>
                                                <div className="text-4xl mb-3">🔍</div>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm  mb-1">未找到匹配的Agent</p>
                                                <p className="text-sm text-gray-400 dark:text-gray-500">尝试使用其他关键词搜索</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-4xl mb-3">🤖</div>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">还没有Agent</p>
                                                <p className="text-sm text-gray-400 dark:text-gray-500">点击上方按钮创建您的第一个AI Agent</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Agent编辑/预览 */}
                <div className="lg:col-span-2 flex flex-col overflow-auto">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            {isEditing ? (
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                            <span className="text-white text-sm">{selectedAgent ? '✏️' : '✨'}</span>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            {selectedAgent ? '编辑Agent' : '创建新Agent'}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Agent名称 *
                                            </label>
                                            <CustomInput
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="输入Agent名称"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                描述
                                            </label>
                                            <CustomInput
                                                type="text"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="输入Agent描述"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            绑定工作流
                                        </label>
                                        <CustomSelect
                                            value={formData.workflowId}
                                            onChange={(value) => setFormData({ ...formData, workflowId: value })}
                                            options={[
                                                { value: '', label: '选择工作流（可选）' },
                                                ...workflows.map(workflow => ({
                                                    value: workflow.id,
                                                    label: workflow.name
                                                }))
                                            ]}
                                            placeholder="选择工作流（可选）"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            可选：将此Agent绑定到一个现有的工作流
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Agent指令 *
                                        </label>
                                        <div className="border border-gray-200/50 dark:border-gray-600/50 rounded-xl overflow-hidden">
                                            <MdEditor
                                                style={{ height: '400px' }}
                                                renderHTML={text => mdParser.render(text)}
                                                value={formData.instructions}
                                                onChange={(value) => setFormData(prev => ({ ...prev, instructions: value.text }))}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            详细描述这个Agent的职责、行为模式和回复风格
                                        </p>
                                    </div>

                                    <div className="flex justify-end space-x-4 pt-4">
                                        <CustomButton
                                            onClick={() => {
                                                setIsEditing(false);
                                                setSelectedAgent(null);
                                                setFormData({ name: '', description: '', instructions: '', workflowId: '' });
                                            }}
                                            variant="secondary"
                                        >
                                            取消
                                        </CustomButton>
                                        <CustomButton
                                            onClick={handleSave}
                                            disabled={isLoading || !formData.name.trim() || !formData.instructions.trim()}
                                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <span className="animate-spin">⚡</span>
                                                    <span>保存中...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>💾</span>
                                                    <span>保存</span>
                                                </>
                                            )}
                                        </CustomButton>
                                    </div>
                                </div>
                            ) : selectedAgent ? (
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                                {selectedAgent.name}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-300">{selectedAgent.description || '暂无描述'}</p>
                                        </div>

                                        <button
                                            onClick={() => handleEdit(selectedAgent)}
                                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                                            title="编辑"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {selectedAgent.workflowId && (
                                        <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-blue-600">🔗</span>
                                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">绑定工作流: </span>
                                                <span className="text-sm text-blue-600 dark:text-blue-400">
                                                    {workflows.find(w => w.id === selectedAgent.workflowId)?.name || '未知工作流'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <MarkdownPreview content={selectedAgent.instructions} className="border border-gray-200/50 dark:border-gray-600/50 rounded-xl p-4" />
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="text-8xl mb-6">🤖</div>
                                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">选择一个Agent</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6">查看Agent详情或创建新的AI Agent</p>
                                    <button
                                        onClick={handleCreate}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg font-medium"
                                    >
                                        创建您的第一个Agent
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}