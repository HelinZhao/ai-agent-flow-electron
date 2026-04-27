import React, { useState, useCallback } from 'react';
import WorkflowDesigner from '@renderer/components/workflow/WorkflowDesigner';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { WorkflowNode, type Workflow } from '@renderer/types';
import { useMemoizedFn } from 'ahooks';
import { ReactFlowProvider } from '@xyflow/react';
import { useWorkflowExecution } from '@renderer/hooks/useWorkflowExecution';
import ExecutionProgressPanel from '@renderer/components/workflow/ExecutionProgressPanel';
import CustomInput from '@renderer/components/CustomInput';
import CustomButton from '@renderer/components/CustomButton';
import CustomTextarea from '@renderer/components/CustomTextarea';
import CustomFileUpload from '@renderer/components/CustomFileUpload';

export default function Workflow(): React.JSX.Element {
    const { workflows, addWorkflow, updateWorkflow, deleteWorkflow, activeLLMConfig } = useWorkflowStore();
    const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 过滤workflows基于搜索词
    const filteredWorkflows = workflows.filter(workflow =>
        workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (workflow.description && workflow.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const [isCreating, setIsCreating] = useState(false);
    const [newWorkflowName, setNewWorkflowName] = useState('');
    const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importJsonText, setImportJsonText] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const [showInputDialog, setShowInputDialog] = useState(false);
    const [workflowInput, setWorkflowInput] = useState('');
    const [pendingExecution, setPendingExecution] = useState(false);
    const [showProgressPanel, setShowProgressPanel] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    // 工作流执行监控
    const {
        progress,
        isRunning,
        error: executionError,
        executeWorkflow,
        stopExecution,
        pauseExecution,
        resumeExecution
    } = useWorkflowExecution({
        onProgress: () => {
            if (!showProgressPanel) {
                setShowProgressPanel(true);
            }
        },
        onComplete: () => {
            // 执行完成后的处理
        },
        onError: (errorMsg) => {
            console.error('工作流执行错误:', errorMsg);
        }
    });

    const handleCreateWorkflow = useMemoizedFn(async () => {
        if (!newWorkflowName.trim()) return;

        const startNode: WorkflowNode = {
            id: 'start-node',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: '开始' }
        };

        const endNode: WorkflowNode = {
            id: 'end-node',
            type: 'end',
            position: { x: 500, y: 100 },
            data: { label: '结束' }
        };

        const newWorkflow: Workflow = {
            id: '',
            name: newWorkflowName,
            description: '',
            nodes: [startNode, endNode],
            edges: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const createdWorkflow = await addWorkflow(newWorkflow);;
        if (createdWorkflow) {
            setCurrentWorkflow(createdWorkflow);
        }

        setNewWorkflowName('');
        setIsCreating(false);
    });

    const handleWorkflowChange = useCallback((updatedWorkflow: Partial<Workflow>) => {
        if (!currentWorkflow?.id) return
        updateWorkflow(currentWorkflow.id, updatedWorkflow);
        setCurrentWorkflow(prev => ({ ...prev, ...updatedWorkflow as Workflow }));
    }, [updateWorkflow, currentWorkflow?.id]);

    const handleSave = useCallback(() => {
        if (currentWorkflow) {
            try {
                updateWorkflow(currentWorkflow.id, currentWorkflow);
                alert('保存成功');
            } catch {
                alert('保存失败');
            }
        }
    }, [currentWorkflow, updateWorkflow]);

    const handleRun = useCallback(async () => {
        if (!currentWorkflow || !activeLLMConfig) {
            if (!activeLLMConfig) {
                alert('请先配置LLM API');
            }
            return;
        }

        setShowInputDialog(true);
    }, [currentWorkflow, activeLLMConfig]);

    const handleExecute = useCallback(async () => {
        if (!currentWorkflow || !workflowInput.trim()) return;

        setPendingExecution(true);
        setShowInputDialog(false);
        setShowProgressPanel(true);

        try {
            await executeWorkflow(currentWorkflow, workflowInput);
        } catch (error) {
            console.error('工作流执行失败:', error);
        } finally {
            setPendingExecution(false);
            setWorkflowInput('');
        }
    }, [currentWorkflow, workflowInput, executeWorkflow]);

    const handleImport = useCallback(() => {
        try {
            const importedWorkflow = JSON.parse(importJsonText) as Workflow;
            if (!importedWorkflow.name || !Array.isArray(importedWorkflow.nodes)) {
                throw new Error('无效的工作流格式');
            }

            const newWorkflow: Workflow = {
                ...importedWorkflow,
                id: `workflow-${Date.now()}`,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            addWorkflow(newWorkflow);
            setCurrentWorkflow(newWorkflow);
            setShowImportModal(false);
            setImportJsonText('');
            setImportError(null);
        } catch (error) {
            setImportError(error instanceof Error ? error.message : '导入失败');
        }
    }, [importJsonText, addWorkflow]);

    const handleImportFromFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                setImportJsonText(content);
                setShowImportModal(true);
            } catch (error) {
                console.error('文件读取失败:', error);
            }
        };
        reader.readAsText(file);

        // 清空input
        event.target.value = '';
    }, []);

    const handleEditWorkflow = useCallback((workflow: Workflow) => {
        setEditingWorkflow(workflow);
        setEditName(workflow.name);
        setEditDescription(workflow.description || '');
    }, []);

    const handleSaveEdit = useCallback(() => {
        if (!editingWorkflow || !editName.trim()) return;

        updateWorkflow(editingWorkflow.id, {
            name: editName.trim(),
            description: editDescription.trim(),
            updatedAt: new Date()
        });

        if (currentWorkflow?.id === editingWorkflow.id) {
            setCurrentWorkflow(prev => prev ? {
                ...prev,
                name: editName.trim(),
                description: editDescription.trim(),
                updatedAt: new Date()
            } : null);
        }

        setEditingWorkflow(null);
        setEditName('');
        setEditDescription('');
    }, [editingWorkflow, editName, editDescription, updateWorkflow, currentWorkflow]);

    const resetImportModal = useCallback(() => {
        setShowImportModal(false);
        setImportJsonText('');
        setImportError(null);
    }, []);

    return (
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">🔄</span>
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        工作流设计器
                    </h1>
                </div>
                <div className="flex space-x-2">
                    <CustomButton
                        onClick={() => setShowImportModal(true)}
                        variant="secondary"
                    >
                        <span>📁</span>
                        <span>导入</span>
                    </CustomButton>
                    <CustomFileUpload
                        accept=".json"
                        onChange={handleImportFromFile}
                    >
                        从文件导入
                    </CustomFileUpload>
                    <CustomButton
                        onClick={() => setIsCreating(true)}
                        variant="primary"
                    >
                        创建工作流
                    </CustomButton>
                </div>
            </div>

            {workflows.length === 0
                ? <div className="flex-1 flex items-center justify-center relative pb-4 pt-4 h-[calc(100vh-200px)] min-h-[820px] rounded-lg overflow-auto">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-gray-600/50"></div>
                    <div className="text-center relative z-10 max-w-4xl mx-auto px-6">
                        <div className="mb-8">
                            <div className="text-8xl mb-6 animate-bounce">🤖</div>
                            <h2 className="text-4xl leading-normal font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                                欢迎使用 AI Agent 工作流设计器
                            </h2>
                            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                                创建您的工作流，让AI按照您的设计执行复杂的任务
                            </p>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 max-w-4xl mx-auto">
                                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center justify-center space-x-2">
                                    <span>🚀</span>
                                    <span>快速开始</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="group text-center p-6 rounded-xl hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-all duration-300">
                                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <span className="text-2xl">⚙️</span>
                                        </div>
                                        <div className="text-lg font-semibold text-blue-600 mb-3">1. 配置API</div>
                                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">在API设置页面配置您的大模型API密钥，为您的AI代理提供强大的动力</p>
                                    </div>
                                    <div className="group text-center p-6 rounded-xl hover:bg-green-50/50 dark:hover:bg-gray-700/50 transition-all duration-300">
                                        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <span className="text-2xl">⚡</span>
                                        </div>
                                        <div className="text-lg font-semibold text-green-600 mb-3">2. 创建技能</div>
                                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">在技能管理页面创建和导入AI技能，扩展您代理的能力边界</p>
                                    </div>
                                    <div className="group text-center p-6 rounded-xl hover:bg-purple-50/50 dark:hover:bg-gray-700/50 transition-all duration-300">
                                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <span className="text-2xl">🔄</span>
                                        </div>
                                        <div className="text-lg font-semibold text-purple-600 mb-3">3. 设计工作流</div>
                                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">使用可视化工具设计AI执行流程，构建复杂而优雅的自动化方案</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <CustomButton
                                    onClick={() => setIsCreating(true)}
                                    variant="primary"
                                    size="xl"
                                    className="flex items-center space-x-3 group"
                                >
                                    <span className="text-xl">✨</span>
                                    <span>创建第一个工作流</span>
                                </CustomButton>
                                <CustomButton
                                    onClick={() => setShowImportModal(true)}
                                    variant="secondary"
                                    size="xl"
                                    className="flex items-center space-x-3"
                                >
                                    <span className="text-xl">📥</span>
                                    <span>导入现有工作流</span>
                                </CustomButton>
                            </div>
                        </div>
                    </div>
                </div>
                : <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
                    {/* 工作流设计器 */}
                    <div className="lg:col-span-3 flex flex-col min-h-[400px]">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 flex-1 flex flex-col overflow-auto">
                            {currentWorkflow ? (
                                <ReactFlowProvider>
                                    <WorkflowDesigner
                                        key={currentWorkflow.id}
                                        workflow={currentWorkflow}
                                        onWorkflowChange={handleWorkflowChange}
                                        onSave={handleSave}
                                        onRun={handleRun}
                                        isRunning={isRunning}
                                    />
                                </ReactFlowProvider>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-6xl mb-4">🔄</div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                            请选择一个工作流
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            从右侧列表中选择一个工作流开始编辑
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 工作流列表侧边栏 */}
                    <div className="lg:col-span-1 flex flex-col">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 flex-1 flex flex-col">
                            <div className="p-4 pb-2">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center space-x-2 mb-4">
                                    <span className="text-white font-bold text-lg">📋</span>
                                    <span>工作流列表</span>
                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                        {filteredWorkflows.length}
                                    </span>
                                </h3>

                                {/* 搜索框 */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-400">🔍</span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="搜索工作流..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/50 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 pt-0">
                                <div className="space-y-2">
                                    {filteredWorkflows.map((workflow) => (
                                        <div
                                            key={workflow.id}
                                            className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${currentWorkflow?.id === workflow.id
                                                ? 'border-blue-500/50 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20'
                                                : 'border-gray-200/50 dark:border-gray-600/50 hover:border-gray-300/50 dark:hover:border-gray-500/50 hover:shadow-sm bg-white/50 dark:bg-gray-700/30'
                                                }`}
                                            onClick={() => setCurrentWorkflow(workflow)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                                        {workflow.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {new Date(workflow.updatedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex space-x-1 ml-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditWorkflow(workflow);
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
                                                            setWorkflowToDelete(workflow.id);
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
                                    {filteredWorkflows.length === 0 && searchTerm && (
                                        <>
                                            <div className="text-4xl mb-3">🔍</div>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm  mb-1">未找到匹配的工作流</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500">尝试使用其他关键词搜索</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }


            {/* 创建工作流对话框 */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl text-blue-600">✨</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">创建新工作流</h3>
                            <p className="text-gray-600 dark:text-gray-400">输入工作流名称开始设计</p>
                        </div>
                        <div className="space-y-4">
                            <CustomInput
                                value={newWorkflowName}
                                onChange={(e) => setNewWorkflowName(e.target.value)}
                                placeholder="工作流名称"
                                autoFocus
                            />
                            <div className="flex space-x-3">
                                <CustomButton
                                    onClick={handleCreateWorkflow}
                                    variant="primary"
                                    className="flex-1"
                                    disabled={!newWorkflowName.trim()}
                                >
                                    创建
                                </CustomButton>
                                <CustomButton
                                    onClick={() => {
                                        setIsCreating(false);
                                        setNewWorkflowName('');
                                    }}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    取消
                                </CustomButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 编辑工作流对话框 */}
            {editingWorkflow && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl text-blue-600">✏️</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">编辑工作流</h3>
                            <p className="text-gray-600 dark:text-gray-400">修改工作流的基本信息</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    工作流名称
                                </label>
                                <CustomInput
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="输入工作流名称"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    描述（可选）
                                </label>
                                <CustomTextarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="输入工作流描述"
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="flex space-x-3">
                                <CustomButton
                                    onClick={handleSaveEdit}
                                    variant="primary"
                                    className="flex-1"
                                    disabled={!editName.trim()}
                                >
                                    保存
                                </CustomButton>
                                <CustomButton
                                    onClick={() => {
                                        setEditingWorkflow(null);
                                        setEditName('');
                                        setEditDescription('');
                                    }}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    取消
                                </CustomButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 删除确认对话框 */}
            {workflowToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl text-red-600">⚠️</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">确认删除</h3>
                            <p className="text-gray-600 dark:text-gray-400">此操作无法撤销，请确认是否删除该工作流？</p>
                        </div>
                        <div className="flex space-x-3">
                            <CustomButton
                                onClick={() => {
                                    deleteWorkflow(workflowToDelete);
                                    if (currentWorkflow?.id === workflowToDelete) {
                                        setCurrentWorkflow(null);
                                    }
                                    setWorkflowToDelete(null);
                                }}
                                variant="danger"
                                className="flex-1"
                            >
                                删除
                            </CustomButton>
                            <CustomButton
                                onClick={() => setWorkflowToDelete(null)}
                                variant="secondary"
                                className="flex-1"
                            >
                                取消
                            </CustomButton>
                        </div>
                    </div>
                </div>
            )}

            {/* 导入工作流对话框 */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">导入工作流JSON</h3>
                            <button
                                onClick={resetImportModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <span className="text-2xl">×</span>
                            </button>
                        </div>

                        {importError && (
                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-red-600 dark:text-red-400 text-sm">{importError}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex-1">
                                <CustomTextarea
                                    value={importJsonText}
                                    onChange={(e) => setImportJsonText(e.target.value)}
                                    placeholder="粘贴工作流JSON内容..."
                                    className="min-h-[300px] font-mono text-sm"
                                />
                            </div>
                            <div className="flex space-x-3">
                                <CustomButton
                                    onClick={handleImport}
                                    variant="primary"
                                    className="flex-1"
                                    disabled={!importJsonText.trim()}
                                >
                                    导入
                                </CustomButton>
                                <CustomButton
                                    onClick={resetImportModal}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    取消
                                </CustomButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 工作流输入对话框 */}
            {showInputDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl text-green-600">🚀</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">输入工作流参数</h3>
                            <p className="text-gray-600 dark:text-gray-400">请输入要传递给工作流的初始参数</p>
                        </div>
                        <div className="space-y-4">
                            <CustomTextarea
                                value={workflowInput}
                                onChange={(e) => setWorkflowInput(e.target.value)}
                                placeholder="输入工作流参数..."
                                className="min-h-[150px]"
                                autoFocus
                            />
                            <div className="flex space-x-3">
                                <CustomButton
                                    onClick={handleExecute}
                                    variant="primary"
                                    className="flex-1"
                                    disabled={!workflowInput.trim() || pendingExecution}
                                    loading={pendingExecution}
                                >
                                    开始执行
                                </CustomButton>
                                <CustomButton
                                    onClick={() => {
                                        setShowInputDialog(false);
                                        setWorkflowInput('');
                                    }}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    取消
                                </CustomButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 执行进度面板 */}
            {showProgressPanel && progress && (
                <div className="fixed bottom-4 right-4 w-96 z-50">
                    <ExecutionProgressPanel
                        progress={progress}
                        isRunning={isRunning}
                        onStop={() => {
                            stopExecution();
                            setShowProgressPanel(false);
                        }}
                        onPause={pauseExecution}
                        onResume={resumeExecution}
                    />
                    <button
                        onClick={() => {
                            stopExecution();
                            setShowProgressPanel(false);
                        }}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* 执行错误提示 */}
            {executionError && (
                <div className="fixed top-4 right-4 bg-red-50/90 dark:bg-red-900/20 backdrop-blur-md border border-red-200/50 dark:border-red-800/50 text-red-700 dark:text-red-300 px-6 py-4 rounded-2xl z-50 shadow-xl max-w-md">
                    <div className="flex items-start space-x-3">
                        <span className="text-xl text-red-500 flex-shrink-0 mt-0.5">⚠️</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-red-800 dark:text-red-200 mb-1">执行错误</p>
                            <p className="text-sm text-red-600 dark:text-red-400 break-words">{executionError}</p>
                        </div>
                        <button
                            onClick={() => { /* 清除错误状态 */ }}
                            className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0 p-1 hover:bg-red-100/50 dark:hover:bg-red-800/30 rounded transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}