import React, { useState, useCallback } from 'react';
import WorkflowDesigner from '@renderer/components/workflow/WorkflowDesigner';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { type Workflow, WorkflowNode } from '@renderer/types';
import { useMemoizedFn } from 'ahooks';
import { ReactFlowProvider } from '@xyflow/react';
import { useWorkflowExecution } from '@renderer/hooks/useWorkflowExecution';
import ExecutionProgressPanel from '@renderer/components/workflow/ExecutionProgressPanel';

export default function Workflow(): React.JSX.Element {
    const { workflows, addWorkflow, updateWorkflow, deleteWorkflow, activeLLMConfig } = useWorkflowStore();
    const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
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

    const handleCreateWorkflow = useCallback(async () => {
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
    }, [newWorkflowName, addWorkflow]);

    const handleWorkflowChange = useMemoizedFn((updatedWorkflow: Partial<Workflow>) => {
        setCurrentWorkflow({ ...currentWorkflow!, ...updatedWorkflow });
    });

    const validateWorkflow = useMemoizedFn((workflow: Workflow): string | null => {
        if (!workflow.nodes || workflow.nodes.length === 0) {
            return '工作流不能为空，请添加节点';
        }

        const startNodes = workflow.nodes.filter(node => node.type === 'start');

        if (startNodes.length === 0) {
            return '工作流必须包含一个开始节点';
        }

        if (startNodes.length > 1) {
            return '工作流只能包含一个开始节点';
        }

        return null; // 验证通过
    });

    const handleSave = useMemoizedFn(() => {
        if (!currentWorkflow) return;

        const validationError = validateWorkflow(currentWorkflow);
        if (validationError) {
            alert(validationError);
            return;
        }

        updateWorkflow(currentWorkflow.id, currentWorkflow);
        alert('工作流保存成功！');
    });

    const handleRun = useCallback(() => {
        if (!currentWorkflow || !activeLLMConfig) {
            alert('请先配置LLM API并保存工作流');
            return;
        }
        // 显示输入对话框
        setWorkflowInput('');
        setShowInputDialog(true);
    }, [currentWorkflow, activeLLMConfig]);

    const handleExecuteWorkflow = useCallback(async (input: string) => {
        if (!currentWorkflow) return;

        setShowInputDialog(false);
        setPendingExecution(false);

        try {
            // 使用新的监控API开始执行
           await executeWorkflow(currentWorkflow, input)
        } catch (error) {
            console.error('工作流执行失败:', error);
        }
    }, [currentWorkflow, executeWorkflow]);

    const handleCancelExecution = useCallback(() => {
        setShowInputDialog(false);
        setPendingExecution(false);
        setWorkflowInput('');
    }, []);

    const handleDeleteWorkflow = useCallback((workflowId: string) => {
        setWorkflowToDelete(workflowId);
    }, []);

    const confirmDeleteWorkflow = useCallback(() => {
        if (!workflowToDelete) return;

        deleteWorkflow(workflowToDelete);

        // If we deleted the current workflow, clear it
        if (currentWorkflow?.id === workflowToDelete) {
            setCurrentWorkflow(null);
        }

        setWorkflowToDelete(null);
    }, [workflowToDelete, deleteWorkflow, currentWorkflow]);

    const cancelDeleteWorkflow = useCallback(() => {
        setWorkflowToDelete(null);
    }, []);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                setImportJsonText(content);
                setImportError(null);
            } catch (error) {
                console.error(error)
                setImportError('文件读取失败');
            }
        };
        reader.readAsText(file);
    }, []);

    const validateAndImportWorkflow = useCallback(async () => {
        if (!importJsonText.trim()) {
            setImportError('请输入JSON内容');
            return;
        }

        try {
            const parsedWorkflow = JSON.parse(importJsonText);

            // Basic validation
            if (!parsedWorkflow.name || !parsedWorkflow.nodes || !parsedWorkflow.edges) {
                setImportError('JSON格式不正确，缺少必要字段');
                return;
            }

            // Create new workflow with generated ID and current timestamp
            const workflowToImport: Workflow = {
                ...parsedWorkflow,
                id: '', // Will be generated by addWorkflow
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const createdWorkflow = await addWorkflow(workflowToImport);
            if (createdWorkflow) {
                setCurrentWorkflow(createdWorkflow);
                setShowImportModal(false);
                setImportJsonText('');
                setImportError(null);
                alert('工作流导入成功！');
            }
        } catch (error) {
            console.error(error)
            setImportError('JSON解析失败，请检查格式');
        }
    }, [importJsonText, addWorkflow]);

    const closeImportModal = useCallback(() => {
        setShowImportModal(false);
        setImportJsonText('');
        setImportError(null);
    }, []);

    return (
        <div className="h-full flex flex-col">
            {/* 顶部工具栏 */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Agent 工作流设计器</h1>
                        <div className="relative">
                            <select
                                value={currentWorkflow?.id || ''}
                                onChange={(e) => {
                                    const workflow = workflows.find(w => w.id === e.target.value);
                                    setCurrentWorkflow(workflow || null);
                                }}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">选择工作流</option>
                                {workflows.map(workflow => (
                                    <option key={workflow.id} value={workflow.id}>
                                        {workflow.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isCreating ? (
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={newWorkflowName}
                                    onChange={(e) => setNewWorkflowName(e.target.value)}
                                    placeholder="输入工作流名称"
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkflow()}
                                />
                                <button
                                    onClick={handleCreateWorkflow}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    创建
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreating(false);
                                        setNewWorkflowName('');
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    取消
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                新建工作流
                            </button>
                        )}
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                        >
                            导入JSON
                        </button>
                        {currentWorkflow && (
                            <div className="flex flex-col space-y-1">
                                <button
                                    key={currentWorkflow.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteWorkflow(currentWorkflow.id);
                                    }}
                                    className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                    title="删除工作流"
                                >
                                    删除
                                </button>
                            </div>
                        )}
                    </div>

                    {currentWorkflow && (
                        <div className="text-sm text-gray-600">
                            当前工作流: {currentWorkflow.name}
                        </div>
                    )}
                </div>
            </div>

            {/* 主要内容区域 */}
            <div className="flex-1 flex">
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
                    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🤖</div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                欢迎使用 AI Agent 工作流设计器
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                创建您的工作流，让AI按照您的设计执行复杂的任务
                            </p>
                            <div className="space-y-4">
                                <div className="bg-white p-6 rounded-lg shadow-sm max-w-2xl mx-auto">
                                    <h3 className="font-medium text-gray-900 mb-4">快速开始</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <div className="font-medium text-blue-600 mb-2">1. 配置API</div>
                                            <p className="text-gray-600">在API设置页面配置您的大模型API密钥</p>
                                        </div>
                                        <div>
                                            <div className="font-medium text-green-600 mb-2">2. 创建技能</div>
                                            <p className="text-gray-600">在技能管理页面创建和导入AI技能</p>
                                        </div>
                                        <div>
                                            <div className="font-medium text-purple-600 mb-2">3. 设计工作流</div>
                                            <p className="text-gray-600">使用可视化工具设计AI执行流程</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                                >
                                    创建第一个工作流
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 删除确认对话框 */}
            {workflowToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">确认删除</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            您确定要删除这个工作流吗？此操作无法撤销。
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={cancelDeleteWorkflow}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                取消
                            </button>
                            <button
                                onClick={confirmDeleteWorkflow}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                删除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 导入JSON对话框 */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-4 max-h-screen overflow-y-auto">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">导入工作流JSON</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    选择JSON文件
                                </label>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">或者</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    粘贴JSON内容
                                </label>
                                <textarea
                                    value={importJsonText}
                                    onChange={(e) => setImportJsonText(e.target.value)}
                                    placeholder="在此粘贴工作流JSON内容..."
                                    rows={12}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            {importError && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                    <p className="text-sm text-red-600">{importError}</p>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={closeImportModal}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={validateAndImportWorkflow}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                                >
                                    导入
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 工作流输入对话框 */}
            {showInputDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            输入工作流执行内容
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                请输入要处理的内容:
                            </label>
                            <textarea
                                value={workflowInput}
                                onChange={(e) => setWorkflowInput(e.target.value)}
                                placeholder="请输入要传递给工作流的输入内容..."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleCancelExecution}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                disabled={pendingExecution}
                            >
                                取消
                            </button>
                            <button
                                onClick={() => handleExecuteWorkflow(workflowInput)}
                                disabled={!workflowInput.trim() || pendingExecution}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {pendingExecution ? '执行中...' : '执行'}
                            </button>
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
                <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
                    <div className="flex items-center justify-between">
                        <span>执行错误: {executionError}</span>
                        <button
                            onClick={() => { /* 清除错误状态 */ }}
                            className="text-red-700 hover:text-red-900 ml-4"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}