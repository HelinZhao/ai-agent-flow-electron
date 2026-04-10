import React, { useState } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { Agent } from '@renderer/types';
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';

const mdParser = new MarkdownIt(/* Markdown-it options */);
export default function Agents(): React.JSX.Element {
    const { agents, addAgent, updateAgent, deleteAgent, workflows } = useWorkflowStore();
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

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
                updateAgent(selectedAgent.id, formData);
            } else {
                addAgent(formData);
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agent管理</h1>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    创建新Agent
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Agent列表 */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Agent列表</h3>
                            <div className="space-y-2">
                                {agents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedAgent?.id === agent.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                            }`}
                                        onClick={() => {
                                            setSelectedAgent(agent);
                                            setIsEditing(false);
                                        }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {agent.name}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                                    {agent.description}
                                                </p>
                                            </div>
                                            <div className="flex space-x-1 ml-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(agent);
                                                    }}
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                                >
                                                    编辑
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(agent);
                                                    }}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {agents.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        还没有Agent，点击上方按钮创建
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Agent编辑/预览 */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                        {selectedAgent ? '编辑Agent' : '创建新Agent'}
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Agent名称 *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="输入Agent名称"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            描述
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="输入Agent描述"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            绑定工作流
                                        </label>
                                        <select
                                            value={formData.workflowId}
                                            onChange={(e) => setFormData({ ...formData, workflowId: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="">选择工作流（可选）</option>
                                            {workflows.map(workflow => (
                                                <option key={workflow.id} value={workflow.id}>
                                                    {workflow.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            可选：将此Agent绑定到一个现有的工作流
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Agent指令 *
                                        </label>
                                        <MdEditor
                                            className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" style={{ height: '400px' }}
                                            renderHTML={text => mdParser.render(text)}
                                            value={formData.instructions}
                                            onChange={(value) => setFormData(prev => ({ ...prev, instructions: value.text }))}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            详细描述这个Agent的职责、行为模式和回复风格
                                        </p>
                                    </div>

                                    <div className="flex justify-end space-x-3">
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setSelectedAgent(null);
                                                setFormData({ name: '', description: '', instructions: '', workflowId: '' });
                                            }}
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isLoading || !formData.name.trim() || !formData.instructions.trim()}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? '保存中...' : '保存'}
                                        </button>
                                    </div>
                                </div>
                            ) : selectedAgent ? (
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                            {selectedAgent.name}
                                        </h3>
                                        <button
                                            onClick={() => handleEdit(selectedAgent)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            编辑
                                        </button>
                                    </div>

                                    <div className="mb-4">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{selectedAgent.description}</span>
                                    </div>

                                    {selectedAgent.workflowId && (
                                        <div className="mb-4">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">绑定工作流: </span>
                                            <span className="text-sm text-blue-600 dark:text-blue-400">
                                                {workflows.find(w => w.id === selectedAgent.workflowId)?.name || '未知工作流'}
                                            </span>
                                        </div>
                                    )}
                                    <MdEditor
                                        className="border border-gray-300 rounded-md overflow-hidden" style={{ height: '500px' }}
                                        value={selectedAgent.instructions}
                                        renderHTML={text => mdParser.render(text)}
                                        config={{
                                            view: {
                                                menu: false,    // 隐藏菜单栏
                                                md: false,      // 隐藏编辑区
                                                html: true,     // 显示预览区
                                                fullScreen: false // 隐藏全屏按钮
                                            }
                                        }}
                                        readOnly={true}     // 设置为只读模式
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    <p>选择一个Agent查看详情，或创建新Agent</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}