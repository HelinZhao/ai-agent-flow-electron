import React, { useState, useCallback, useRef, useMemo } from 'react';
import WorkflowDesigner from '@renderer/components/workflow/WorkflowDesigner';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { WorkflowNode, WorkflowEdge, type Workflow } from '@renderer/types';
import { useMemoizedFn } from 'ahooks';
import { ReactFlowProvider } from '@xyflow/react';
import { useWorkflowExecution } from '@renderer/hooks/useWorkflowExecution';
import ExecutionProgressPanel from '@renderer/components/workflow/ExecutionProgressPanel';
import CustomInput from '@renderer/components/ui/CustomInput';
import CustomButton from '@renderer/components/ui/CustomButton';
import CustomTextarea from '@renderer/components/ui/CustomTextarea';
import CustomFileUpload from '@renderer/components/ui/CustomFileUpload';
import ResponsiveGrid from '@renderer/components/ui/ResponsiveGrid';
import MessageBanner from '@renderer/components/ui/MessageBanner';
import { NODE_DEFS_MAP } from '@renderer/components/workflow/nodes';
import InputDialog from '@renderer/components/workflow/InputDialog';
import { showToast } from '@renderer/components/ui/toast/MessageToast';
import { workflowApi } from '@renderer/lib/api';

export default function Workflow(): React.JSX.Element {
    const { workflows, addWorkflow, updateWorkflow, deleteWorkflow, initialize, activeLLMConfig } = useWorkflowStore();
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // 从 store 列表中查找当前选中工作流的持久化元数据
    const selectedWorkflow = useMemo(() =>
        selectedWorkflowId ? workflows.find(w => w.id === selectedWorkflowId) ?? null : null,
        [selectedWorkflowId, workflows]
    );

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
    const [showProgressPanel, setShowProgressPanel] = useState(false);

    // 画布实时数据的引用（不触发重渲染）
    const canvasDataRef = useRef<{ nodes: WorkflowNode[]; edges: WorkflowEdge[]; layoutDirection: 'horizontal' | 'vertical' }>({ nodes: [], edges: [], layoutDirection: 'horizontal' });
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    // 工作流执行监控
    const {
        progress,
        isRunning,
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
            showToast({ type: 'error', text: errorMsg });
        }
    });

    const handleCreateWorkflow = useMemoizedFn(async () => {
        if (!newWorkflowName.trim()) return;

        const startNode: WorkflowNode = {
            id: 'start-node',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: NODE_DEFS_MAP['start'].shortLabel }
        };

        const endNode: WorkflowNode = {
            id: 'end-node',
            type: 'end',
            position: { x: 500, y: 100 },
            data: { label: NODE_DEFS_MAP['end'].shortLabel }
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
            setSelectedWorkflowId(createdWorkflow.id);
        }

        setNewWorkflowName('');
        setIsCreating(false);
    });

    const validateStartNode = useCallback((nodes: WorkflowNode[]): string | null => {
        const startNodes = nodes.filter(n => n.type === 'start');
        if (startNodes.length === 0) {
            return '工作流必须包含一个开始节点';
        }
        if (startNodes.length > 1) {
            return '工作流只能包含一个开始节点，当前有 ' + startNodes.length + ' 个';
        }
        return null;
    }, []);

    const handleSave = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[], envVars?: Record<string, string>) => {
        if (!selectedWorkflow) return;
        const error = validateStartNode(nodes);
        if (error) {
            alert(error);
            return;
        }
        try {
            const updated = { ...selectedWorkflow, nodes, edges, envVars, layoutDirection: canvasDataRef.current.layoutDirection, updatedAt: new Date() };
            updateWorkflow(selectedWorkflow.id, updated);
            setSaveMessage({ type: 'success', text: '已保存' });
        } catch {
            setSaveMessage({ type: 'error', text: '保存失败' });
        }
    }, [selectedWorkflow, updateWorkflow, validateStartNode]);

    const handleRun = useCallback(async () => {
        if (!selectedWorkflow || !activeLLMConfig) {
            if (!activeLLMConfig) {
                alert('请先配置LLM API');
            }
            return;
        }

        setShowInputDialog(true);
    }, [selectedWorkflow, activeLLMConfig]);

    const handleExecute = useCallback(async (inputText?: string, formParams?: Record<string, any>) => {
        if (!selectedWorkflow) return;

        // 使用画布当前编辑中的数据而非已持久化的数据
        const canvasData = canvasDataRef.current;
        const workflowToRun: Workflow = {
            ...selectedWorkflow,
            nodes: canvasData.nodes.length > 0 ? canvasData.nodes : selectedWorkflow.nodes,
            edges: canvasData.edges.length > 0 ? canvasData.edges : selectedWorkflow.edges,
            layoutDirection: canvasData.layoutDirection || selectedWorkflow.layoutDirection,
        };

        setShowInputDialog(false);
        setShowProgressPanel(true);

        try {
            await executeWorkflow(workflowToRun, inputText ?? '', undefined, undefined, formParams);
        } catch (error) {
            console.error('工作流执行失败:', error);
        }
    }, [selectedWorkflow, executeWorkflow]);

    const handleImport = useCallback(async () => {
        try {
            const parsed = JSON.parse(importJsonText);

            // bundle 格式：含依赖，通过后端 API 导入
            if (parsed.type === 'workflow-bundle') {
                await workflowApi.importBundle(parsed)
                await initialize()
                setShowImportModal(false)
                setImportJsonText('')
                setImportError(null)
                return
            }

            // 旧格式：纯工作流 JSON
            const importedWorkflow = parsed as Workflow;
            if (!importedWorkflow.name || !Array.isArray(importedWorkflow.nodes)) {
                throw new Error('无效的工作流格式');
            }

            const startNodeError = validateStartNode(importedWorkflow.nodes);
            if (startNodeError) {
                throw new Error(startNodeError);
            }

            const newWorkflow: Workflow = {
                ...importedWorkflow,
                id: `workflow-${Date.now()}`,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            addWorkflow(newWorkflow);
            setSelectedWorkflowId(newWorkflow.id);
            setShowImportModal(false);
            setImportJsonText('');
            setImportError(null);
        } catch (error) {
            setImportError(error instanceof Error ? error.message : '导入失败');
        }
    }, [importJsonText, addWorkflow, validateStartNode]);

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

        setEditingWorkflow(null);
        setEditName('');
        setEditDescription('');
    }, [editingWorkflow, editName, editDescription, updateWorkflow, selectedWorkflowId]);

    const resetImportModal = useCallback(() => {
        setShowImportModal(false);
        setImportJsonText('');
        setImportError(null);
    }, []);

    const handleCardClick = useCallback((workflowId: string) => {
        setSelectedWorkflowId(workflowId);
    }, []);

    const handleBack = useCallback(() => {
        setSelectedWorkflowId(null);
        setShowProgressPanel(false)
    }, []);

    // ========== 二级页面：工作流设计画布 ==========
    if (selectedWorkflowId && selectedWorkflow) {
        return (
            <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
                {/* 顶部导航 */}
                <div className="flex items-center space-x-3 mb-4 flex-shrink-0 relative">
                    <button
                        onClick={handleBack}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">🔄</span>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{selectedWorkflow.name}</h3>
                            {selectedWorkflow.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedWorkflow.description}</p>
                            )}
                        </div>
                    </div>
                    {saveMessage && (
                        <div className="absolute top-0 right-0 z-50">
                            <MessageBanner
                                type={saveMessage.type}
                                text={saveMessage.text}
                                onClose={() => setSaveMessage(null)}
                                autoCloseMs={2000}
                            />
                        </div>
                    )}
                </div>

                {/* 设计画布 */}
                <div className="relative flex-1 min-h-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 overflow-auto">
                    <ReactFlowProvider>
                        <WorkflowDesigner
                            key={selectedWorkflow.id}
                            workflow={selectedWorkflow}
                            onSave={handleSave}
                            onRun={handleRun}
                            isRunning={isRunning}
                            onCanvasChange={(nodes, edges, layoutDirection) => {
                                canvasDataRef.current = { nodes, edges, layoutDirection: layoutDirection || 'horizontal' };
                            }}
                        />
                    </ReactFlowProvider>

                    {showProgressPanel && progress && (
                        <div className="fixed bottom-4 right-4 w-[500px] z-50">
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
                                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* 执行错误提示 - 通过 showToast 展示 */}

                    <InputDialog
                        open={showInputDialog}
                        onExecute={handleExecute}
                        onClose={() => setShowInputDialog(false)}
                        selectedWorkflow={selectedWorkflow}
                        canvasNodes={canvasDataRef.current.nodes}
                    />
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
                                            if (selectedWorkflowId === workflowToDelete) {
                                                setSelectedWorkflowId(null);
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
                </div>
            </div>
        );
    }

    // ========== 一级页面：工作流列表（卡片式） ==========
    return (
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {/* 标题栏 */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        工作流管理
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        设计和管理 AI 工作流，通过可视化编排实现复杂的自动化任务
                    </p>
                </div>
                <div className="flex space-x-2 items-center">
                    {/* 搜索栏 */}
                    <CustomInput
                        type="text"
                        placeholder="搜索工作流..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        size="sm"
                        hidden={workflows.length === 0}
                        className='rounded-xl'
                        leftIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>}
                    />
                    <CustomButton
                        onClick={() => setShowImportModal(true)}
                        variant="secondary"
                        size="sm"
                    >
                        <span>📁</span>
                        <span>导入</span>
                    </CustomButton>
                    <CustomFileUpload
                        accept=".json,.afbundle"
                        onChange={handleImportFromFile}
                        size="sm"
                    >
                        从文件导入
                    </CustomFileUpload>
                    <CustomButton
                        onClick={() => setIsCreating(true)}
                        variant="primary"
                        size="sm"
                    >
                        <span>✨</span>
                        <span>创建</span>
                    </CustomButton>
                </div>
            </div>

            {/* 空状态 */}
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
                : (
                    <div>
                        {/* 卡片网格 */}
                        <ResponsiveGrid>
                            {filteredWorkflows.map((workflow) => (
                                <div
                                    key={workflow.id}
                                    className="group/workflow relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
                                    onClick={() => handleCardClick(workflow.id)}
                                >
                                    {/* 卡片顶部色带 */}
                                    <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-blue-400 to-purple-500" />

                                    {/* 卡片内容 */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-start space-x-2.5 min-w-0">
                                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 flex-shrink-0">
                                                    <span className="text-base">🔄</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                        {workflow.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                        {new Date(workflow.updatedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 描述 */}
                                        {workflow.description ? (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{workflow.description}</p>
                                        ) : (
                                            <p className="text-xs text-gray-300 dark:text-gray-600 mb-3">暂无描述</p>
                                        )}

                                        {/* 节点统计 */}
                                        <div className="flex items-center space-x-3 text-xs text-gray-400 dark:text-gray-500">
                                            <span>{workflow.nodes.length} 节点</span>
                                            <span className="text-gray-300 dark:text-gray-600">·</span>
                                            <span>{workflow.edges.length} 连接</span>
                                        </div>
                                    </div>

                                    {/* 悬浮操作栏 */}
                                    <div className="absolute top-3 right-3 z-10 hidden group-hover/workflow:flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEditWorkflow(workflow) }}
                                            className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            title="编辑"
                                        >
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                workflowApi.exportBundle(workflow.id).then(bundle => {
                                                    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
                                                    const url = URL.createObjectURL(blob)
                                                    const a = document.createElement('a')
                                                    a.href = url
                                                    a.download = `${workflow.name}.afbundle`
                                                    a.click()
                                                    URL.revokeObjectURL(url)
                                                })
                                            }}
                                            className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                            title="导出"
                                        >
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5-5v12" /></svg>
                                        </button>
                                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setWorkflowToDelete(workflow.id) }}
                                            className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="删除"
                                        >
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>

                                    {/* 进入箭头 */}
                                    <div className="absolute bottom-3 right-3 text-gray-300 dark:text-gray-600 group-hover/workflow:text-blue-400 dark:group-hover/workflow:text-blue-500 transition-colors">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </div>
                            ))}
                        </ResponsiveGrid>

                        {/* 搜索无结果 */}
                        {filteredWorkflows.length === 0 && searchTerm && (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                                <svg className="w-14 h-14 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p className="text-sm font-medium">未找到匹配的工作流</p>
                                <p className="text-xs mt-1">尝试使用其他关键词搜索</p>
                            </div>
                        )}
                    </div>
                )
            }

            {/* ========== 创建工作流对话框 ========== */}
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

            {/* ========== 编辑工作流对话框 ========== */}
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

            {/* ========== 删除确认对话框 ========== */}
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
                                    if (selectedWorkflowId === workflowToDelete) {
                                        setSelectedWorkflowId(null);
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

            {/* ========== 导入工作流对话框 ========== */}
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
        </div >
    );
}
