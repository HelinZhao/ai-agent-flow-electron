import React, { useState, useCallback } from 'react';
import WorkflowDesigner from '@renderer/components/workflow/WorkflowDesigner';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { type Workflow, WorkflowNode } from '@renderer/types';
import { useMemoizedFn } from 'ahooks';
import { ReactFlowProvider } from '@xyflow/react';
import { useWorkflowExecution } from '@renderer/hooks/useWorkflowExecution';
import ExecutionProgressPanel from '@renderer/components/workflow/ExecutionProgressPanel';
import CustomSelect from '@renderer/components/CustomSelect';
import CustomInput from '@renderer/components/CustomInput';
import CustomButton from '@renderer/components/CustomButton';
import CustomTextarea from '@renderer/components/CustomTextarea';
import CustomFileUpload from '@renderer/components/CustomFileUpload';

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
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 p-4 sticky top-0 z-30">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">🔄</span>
                            </div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                AI Agent 工作流设计器
                            </h1>
                        </div>
                        <div className="min-w-[200px]">
                            <CustomSelect
                                value={currentWorkflow?.id || ''}
                                onChange={(value) => {
                                    const workflow = workflows.find(w => w.id === value);
                                    setCurrentWorkflow(workflow || null);
                                }}
                                options={[
                                    { value: '', label: '选择工作流' },
                                    ...workflows.map(workflow => ({
                                        value: workflow.id,
                                        label: workflow.name
                                    }))
                                ]}
                                placeholder="选择工作流"
                            />
                        </div>

                        {isCreating ? (
                            <div className="flex items-center space-x-3">
                                <CustomInput
                                    type="text"
                                    value={newWorkflowName}
                                    onChange={(e) => setNewWorkflowName(e.target.value)}
                                    placeholder="输入工作流名称"
                                    className="w-48"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkflow()}
                                />
                                <CustomButton
                                    onClick={handleCreateWorkflow}
                                    variant="primary"
                                >
                                    创建
                                </CustomButton>
                                <CustomButton
                                    onClick={() => {
                                        setIsCreating(false);
                                        setNewWorkflowName('');
                                    }}
                                    variant="secondary"
                                >
                                    取消
                                </CustomButton>
                            </div>
                        ) : (
                            <CustomButton
                                onClick={() => setIsCreating(true)}
                                variant="success"
                            >
                                <span>✨</span>
                                <span>新建工作流</span>
                            </CustomButton>
                        )}
                        <CustomButton
                            onClick={() => setShowImportModal(true)}
                            variant="primary"
                        >
                            <span>📥</span>
                            <span>导入JSON</span>
                        </CustomButton>
                        {currentWorkflow && (
                            <CustomButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWorkflow(currentWorkflow.id);
                                }}
                                variant="danger"
                                title="删除工作流"
                            >
                                <span>🗑️</span>
                                <span>删除</span>
                            </CustomButton>
                        )}
                    </div>

                    {currentWorkflow && (
                        <div className="hidden lg:flex items-center space-x-2 px-4 py-2 bg-white/50 dark:bg-gray-700/50 rounded-xl backdrop-blur-sm">
                            <span className="text-sm text-gray-600 dark:text-gray-300">当前工作流:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{currentWorkflow.name}</span>
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
                    <div className="flex-1 flex items-center justify-center relative">
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
                                        <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
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
                )}
            </div>

            {/* 删除确认对话框 */}
            {workflowToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl text-red-600">⚠️</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">确认删除</h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                您确定要删除这个工作流吗？此操作无法撤销。
                            </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <CustomButton
                                onClick={cancelDeleteWorkflow}
                                variant="secondary"
                            >
                                取消
                            </CustomButton>
                            <CustomButton
                                onClick={confirmDeleteWorkflow}
                                variant="danger"
                            >
                                删除
                            </CustomButton>
                        </div>
                    </div>
                </div>
            )}

            {/* 导入JSON对话框 */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <span className="text-white text-lg">📥</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">导入工作流JSON</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    选择JSON文件
                                </label>
                                <CustomFileUpload
                                    accept=".json"
                                    onChange={handleFileUpload}
                                >
                                    选择JSON文件
                                </CustomFileUpload>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200/50 dark:border-gray-600/50" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white/95 dark:bg-gray-800/95 text-gray-500 dark:text-gray-400 font-medium">或者直接粘贴</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    粘贴JSON内容
                                </label>
                                <CustomTextarea
                                    value={importJsonText}
                                    onChange={(e) => setImportJsonText(e.target.value)}
                                    placeholder="在此粘贴工作流JSON内容..."
                                    rows={12}
                                    className="font-mono"
                                />
                            </div>

                            {importError && (
                                <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl p-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-red-500">⚠️</span>
                                        <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                <CustomButton
                                    onClick={closeImportModal}
                                    variant="secondary"
                                >
                                    取消
                                </CustomButton>
                                <CustomButton
                                    onClick={validateAndImportWorkflow}
                                    variant="primary"
                                >
                                    导入工作流
                                </CustomButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 工作流输入对话框 */}
            {showInputDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                                <span className="text-white text-lg">⚡</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                输入工作流执行内容
                            </h3>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                请输入要处理的内容:
                            </label>
                            <CustomTextarea
                                value={workflowInput}
                                onChange={(e) => setWorkflowInput(e.target.value)}
                                placeholder="请输入要传递给工作流的输入内容..."
                                rows={6}
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <CustomButton
                                onClick={handleCancelExecution}
                                variant="secondary"
                                disabled={pendingExecution}
                            >
                                取消
                            </CustomButton>
                            <CustomButton
                                onClick={() => handleExecuteWorkflow(workflowInput)}
                                variant="success"
                                disabled={!workflowInput.trim() || pendingExecution}
                            >
                                {pendingExecution ? (
                                    <>
                                        <span className="animate-spin">⚡</span>
                                        <span>执行中...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🚀</span>
                                        <span>执行工作流</span>
                                    </>
                                )}
                            </CustomButton>
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
        </div>
    );
}