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
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) ?? null : null;

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
        setSelectedAgentId('__create__');
        setFormData({ name: '', description: '', instructions: '', workflowId: '' });
        setIsEditing(true);
    };

    const handleEdit = (agent: Agent): void => {
        setSelectedAgentId(agent.id);
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
            setSelectedAgentId(null);
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
            if (selectedAgentId === agent.id) {
                setSelectedAgentId(null);
                setIsEditing(false);
            }
        }
    };

    const handleBack = (): void => {
        setSelectedAgentId(null);
        setIsEditing(false);
    };

    // ========== 二级页面：Agent详情/编辑 ==========
    if (selectedAgentId) {
        return (
            <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* 顶部导航 */}
                <div className="flex items-center space-x-3 mb-6">
                    <button
                        onClick={handleBack}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">🤖</span>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                {isEditing ? (selectedAgent ? '编辑Agent' : '创建新Agent') : selectedAgent!.name}
                            </h3>
                            {!isEditing && selectedAgent!.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedAgent!.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                    <div className="px-6 py-6">
                        {isEditing ? (
                            <div className="space-y-6">
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
                                            if (!selectedAgent) handleBack();
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
                        ) : (
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                            {selectedAgent!.name}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">{selectedAgent!.description || '暂无描述'}</p>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(selectedAgent!)}
                                            className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center space-x-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <span>编辑</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(selectedAgent!)}
                                            className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center space-x-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span>删除</span>
                                        </button>
                                    </div>
                                </div>

                                {selectedAgent!.workflowId && (
                                    <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-blue-600">🔗</span>
                                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">绑定工作流: </span>
                                            <span className="text-sm text-blue-600 dark:text-blue-400">
                                                {workflows.find(w => w.id === selectedAgent!.workflowId)?.name || '未知工作流'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <MarkdownPreview content={selectedAgent!.instructions} className="border border-gray-200/50 dark:border-gray-600/50 rounded-xl p-4" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ========== 一级页面：Agent列表（卡片式） ==========
    return (
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {/* 标题栏 */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Agent管理
                </h1>
                <div className="flex space-x-2 items-center">
                    {/* 搜索栏 */}
                    <CustomInput
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="搜索Agent..."
                        size="sm"
                        hidden={agents.length === 0}
                        className='rounded-xl'
                        leftIcon={(
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        )}
                    />
                    <CustomButton
                        onClick={handleCreate}
                        variant="primary"
                        size="sm"
                    >
                        <span>✨</span>
                        <span>创建新Agent</span>
                    </CustomButton>
                </div>
            </div>

            {/* 卡片网格 */}
            {filteredAgents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAgents.map((agent) => (
                        <div
                            key={agent.id}
                            className="group/agent relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
                            onClick={() => setSelectedAgentId(agent.id)}
                        >
                            {/* 卡片顶部色带 */}
                            <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-blue-400 to-purple-500" />

                            {/* 卡片内容 */}
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start space-x-2.5 min-w-0">
                                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
                                            <span className="text-base">🤖</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                {agent.name}
                                            </h4>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                {agent.description || '暂无描述'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 绑定工作流信息 */}
                                {agent.workflowId && (
                                    <div className="flex items-center space-x-1.5 mb-3">
                                        <span className="text-xs text-blue-500">🔗</span>
                                        <span className="text-xs text-blue-500 dark:text-blue-400 truncate">
                                            {workflows.find(w => w.id === agent.workflowId)?.name || '未知工作流'}
                                        </span>
                                    </div>
                                )}

                                {/* 指令摘要 */}
                                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2">
                                    {agent.instructions ? agent.instructions.replace(/[#*\n]/g, ' ').substring(0, 100) + (agent.instructions.length > 100 ? '...' : '') : '暂无指令'}
                                </p>
                            </div>

                            {/* 悬浮操作栏 */}
                            <div className="absolute top-3 right-3 z-10 hidden group-hover/agent:flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(agent) }}
                                    className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    title="编辑"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(agent) }}
                                    className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="删除"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>

                            {/* 进入箭头 */}
                            <div className="absolute bottom-4 right-4 text-gray-300 dark:text-gray-600 group-hover/agent:text-blue-400 dark:group-hover/agent:text-blue-500 transition-colors">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
                    {searchTerm ? (
                        <>
                            <svg className="w-14 h-14 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="text-sm font-medium">未找到匹配的Agent</p>
                            <p className="text-xs mt-1">尝试使用其他关键词搜索</p>
                        </>
                    ) : (
                        <>
                            <div className="text-8xl mb-6">🤖</div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">还没有Agent</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">创建您的第一个AI Agent来管理工作流</p>
                            <button
                                onClick={handleCreate}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg font-medium"
                            >
                                创建第一个Agent
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
