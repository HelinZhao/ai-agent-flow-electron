import React, { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  useReactFlow,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StartNode, SkillNode, BranchNode, ApiNode, AgentNode, EndNode, LLMNode, CliNode, TextNode, SubWorkflow, McpNode, CodeNode, NoteNode, LoopNode, CatchNode, TransformNode, SplitNode, MergeNode, SleepNode, IfNode, KnowledgeNode, VariableNode, DatabaseNode } from './NodeTypes';
import NodeConfigPanel from './NodeConfigPanel';
import { Workflow, WorkflowBranch, WorkflowEdge, WorkflowNode } from '@renderer/types';
import NodeListPanel from './NodeListPanel';
import { getNodeDefaultLabel } from './nodes';
import ContextMenu from './ContextMenu';
import ControlPanel from './ControlPanel';
import BranchSelectionModal from './BranchSelectionModal';
import NodeTestDialog from './NodeTestDialog';
import WorkflowEnvVarsModal from './WorkflowEnvVarsModal';
import { autoLayout } from './layoutUtils';
import { LayoutDirectionContext, LayoutDirection } from './LayoutDirectionContext';
import { useWorkflowHistory } from '@renderer/hooks/useWorkflowHistory';
import { useSettingsStore } from '@renderer/store/settingsStore';
import { v4 as uuidv4 } from 'uuid';
import { useUpdateEffect } from 'ahooks';

// eslint-disable-next-line react-refresh/only-export-components
export const nodeTypes = {
  start: StartNode,
  skill: SkillNode,
  branch: BranchNode,
  api: ApiNode,
  llm: LLMNode,
  agent: AgentNode,
  subWorkflow: SubWorkflow,
  cli: CliNode,
  text: TextNode,
  end: EndNode,
  mcp: McpNode,
  code: CodeNode,
  note: NoteNode,
  loop: LoopNode,
  catch: CatchNode,
  transform: TransformNode,
  split: SplitNode,
  merge: MergeNode,
  sleep: SleepNode,
  if: IfNode,
  knowledge: KnowledgeNode,
  variable: VariableNode,
  database: DatabaseNode,
};

interface WorkflowDesignerProps {
  workflow: Workflow;
  onSave: (nodes: WorkflowNode[], edges: WorkflowEdge[], envVars?: Record<string, string>) => void;
  onRun: () => void;
  isRunning: boolean;
  onCanvasChange?: (nodes: WorkflowNode[], edges: WorkflowEdge[], layoutDirection: LayoutDirection) => void;
}

function WorkflowDesigner(props: WorkflowDesignerProps): React.JSX.Element {
  const { workflow, onSave, onRun, isRunning, onCanvasChange } = props
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showEnvVars, setShowEnvVars] = useState(false)
  const [workflowEnvVars, setWorkflowEnvVars] = useState<Record<string, string>>(workflow.envVars || {})
  const [testNodeId, setTestNodeId] = useState<string | null>(null)
  const [branchSelection, setBranchSelection] = useState<{
    isOpen: boolean;
    branches: WorkflowBranch[];
    connection: Connection | null;
    selectedBranch: string;
    isEditing: boolean;
    editEdgeId: string | null;
  }>({
    isOpen: false,
    branches: [],
    connection: null,
    selectedBranch: '',
    isEditing: false,
    editEdgeId: null,
  });
  const { screenToFlowPosition, fitView, getNodes, getNode } = useReactFlow();
  const defaultDir = useSettingsStore.getState().layoutDirection
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>(workflow?.layoutDirection || defaultDir || 'horizontal');

  const { recordHistory, undo, redo, initHistory } = useWorkflowHistory();
  const [manualSaveVersion, setManualSaveVersion] = useState(0)

  // 当切换工作流时，恢复其保存的布局方向
  useUpdateEffect(() => {
    setLayoutDirection(workflow?.layoutDirection || useSettingsStore.getState().layoutDirection || 'horizontal');
  }, [workflow?.layoutDirection]);

  const initialNodes: WorkflowNode[] = useMemo(() => {
    return workflow?.nodes?.map((node: WorkflowNode) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        label: node.data?.label || getNodeDefaultLabel(node.type),
      },
    })) || [];
  }, [workflow?.nodes]);

  const initialEdges: WorkflowEdge[] = useMemo(() => {
    return workflow?.edges?.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      condition: edge.condition,
      sourceType: edge.sourceType,
      ...(edge.sourceType === 'error' ? {
        style: { stroke: '#ef4444', strokeDasharray: '6 3', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: '#ef4444' },
      } : {}),
    })) || [];
  }, [workflow?.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>(initialEdges);

  // Refs for latest state (used by keyboard shortcuts and change handlers)
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const onSaveRef = useRef(onSave);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const clipboardRef = useRef<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null>(null);
  const nodeMenuRef = useRef<HTMLDivElement>(null);

  const handleCopySelectedNodes = useCallback(() => {
    const selectedNodes = getNodes().filter(n => n.selected);
    if (selectedNodes.length === 0) return;
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const copiedEdges = edgesRef.current.filter(
      e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    );
    clipboardRef.current = {
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(copiedEdges)),
    };
  }, [getNodes]);

  const handlePasteNodes = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.nodes.length === 0) return;
    const idMap = new Map<string, string>();
    const newNodes: WorkflowNode[] = clipboardRef.current.nodes.map(n => {
      const newId = `node-${uuidv4()}`;
      idMap.set(n.id, newId);
      return {
        id: newId,
        type: n.type,
        position: { x: n.position.x + 80, y: n.position.y + 80 },
        data: JSON.parse(JSON.stringify(n.data)),
      };
    });
    const newEdges: WorkflowEdge[] = clipboardRef.current.edges.map(e => ({
      id: `edge-${uuidv4()}`,
      source: idMap.get(e.source) || e.source,
      target: idMap.get(e.target) || e.target,
      label: e.label,
      condition: e.condition,
    }));
    const allNodes = [...nodesRef.current, ...newNodes];
    const allEdges = [...edgesRef.current, ...newEdges];
    setNodes(allNodes);
    setEdges(allEdges);
    recordHistory(allNodes, allEdges);
  }, [setNodes, setEdges, recordHistory]);

  // 根据布局方向给每个节点加上 sourcePosition/targetPosition
  const positionedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      sourcePosition: layoutDirection === 'vertical' ? Position.Bottom : Position.Right,
      targetPosition: layoutDirection === 'vertical' ? Position.Top : Position.Left,
    }))
  }, [nodes, layoutDirection])

  // 同步画布实时数据给父组件
  useEffect(() => {
    onCanvasChange?.(nodes, edges, layoutDirection);
  }, [nodes, edges, layoutDirection, onCanvasChange]);

  // 初始化历史记录（工作流切换时）
  useEffect(() => {
    initHistory(initialNodes, initialEdges);
  }, [workflow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 快捷键：Ctrl+Z 撤销, Ctrl+Shift+Z / Ctrl+Y 重做, Ctrl+S 保存, Ctrl+C 复制, Ctrl+V 粘贴
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo(setNodes, setEdges);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo(setNodes, setEdges);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSaveRef.current(nodesRef.current, edgesRef.current);
        setManualSaveVersion(v => v + 1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // 有文本选中时不拦截，交给浏览器默认复制行为
        if (window.getSelection()?.toString().trim()) return;
        e.preventDefault();
        handleCopySelectedNodes();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePasteNodes();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setNodes, setEdges, getNodes, handleCopySelectedNodes, handlePasteNodes]);

  // 自动保存（从 settingsStore 读取，手动保存后重置间隔）
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const { autoSave, autoSaveInterval } = useSettingsStore.getState()
    if (autoSave && autoSaveInterval > 0) {
      timer = setInterval(() => {
        onSaveRef.current(nodesRef.current, edgesRef.current)
      }, autoSaveInterval * 1000)
    }
    return () => { if (timer) clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.id, manualSaveVersion])

  // 包装 onNodesChange/onEdgesChange，在删除时记录历史
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
    const removeIds = changes.filter((c: any) => c.type === 'remove').map((c: any) => c.id);
    if (removeIds.length > 0) {
      recordHistory(
        nodesRef.current.filter(n => !removeIds.includes(n.id)),
        edgesRef.current,
      );
    }
  }, [onNodesChange, recordHistory]);

  const handleEdgesChange = useCallback((changes: any[]) => {
    onEdgesChange(changes);
    const removeIds = changes.filter((c: any) => c.type === 'remove').map((c: any) => c.id);
    if (removeIds.length > 0) {
      recordHistory(
        nodesRef.current,
        edgesRef.current.filter(e => !removeIds.includes(e.id)),
      );
    }
  }, [onEdgesChange, recordHistory]);

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);

      // 如果源节点是分支/条件节点，显示分支选择模态框
      if (sourceNode?.type === 'branch' || sourceNode?.type === 'if') {
        const branches: WorkflowBranch[] = sourceNode.data.config?.branches || [];
        if (branches.length > 1) {
          setBranchSelection({
            isOpen: true,
            branches,
            connection: params,
            selectedBranch: branches[0]?.id || '',
            isEditing: false,
            editEdgeId: null,
          });
          return;
        } else if (branches.length === 1) {
          const newEdge: WorkflowEdge = {
            ...params,
            id: `edge-${params.source}-${params.target}-${Date.now()}`,
            label: branches[0].label,
            condition: branches[0].condition
          };
          const newEdges = [...edges, newEdge];
          setEdges(newEdges);
          recordHistory(nodes, newEdges);
          return;
        }
      }

      const isErrorEdge = getNode(params.target)?.type === 'catch'
      const newEdge: WorkflowEdge = {
        ...params,
        id: `edge-${uuidv4()}`,
        sourceType: isErrorEdge ? 'error' : undefined,
        style: isErrorEdge ? { stroke: '#ef4444', strokeDasharray: '6 3', strokeWidth: 2 } : undefined,
        markerEnd: isErrorEdge ? { type: 'arrowclosed', color: '#ef4444' } : undefined,
      };
      const newEdges = [...edges, newEdge];
      setEdges(newEdges);
      recordHistory(nodes, newEdges);
    },
    [nodes, edges, setEdges, recordHistory, getNodes]
  );

  const handleBranchSelectionConfirm = useCallback(() => {
    if (!branchSelection.connection) return;
    const selectedBranch = branchSelection.branches.find(
      (b) => b.id === branchSelection.selectedBranch
    );

    if (branchSelection.isEditing && branchSelection.editEdgeId) {
      // 编辑已有分支边的标签
      const newEdges = edges.map(edge => {
        if (edge.id !== branchSelection.editEdgeId) return edge;
        return {
          ...edge,
          label: selectedBranch?.label,
          condition: selectedBranch?.id || branchSelection.selectedBranch
        };
      });
      setEdges(newEdges);
      recordHistory(nodes, newEdges);
    } else {
      // 创建新分支边
      const newEdge: WorkflowEdge = {
        ...branchSelection.connection!,
        id: `edge-${uuidv4()}`,
        label: selectedBranch?.label,
        condition: selectedBranch?.id || branchSelection.selectedBranch
      };
      const newEdges = [...edges, newEdge];
      setEdges(newEdges);
      recordHistory(nodes, newEdges);
    }

    setBranchSelection({
      isOpen: false,
      branches: [],
      connection: null,
      selectedBranch: '',
      isEditing: false,
      editEdgeId: null,
    });
  }, [branchSelection, nodes, edges, setEdges, recordHistory]);

  const handleBranchSelectionCancel = useCallback(() => {
    setBranchSelection({
      isOpen: false,
      branches: [],
      connection: null,
      selectedBranch: '',
      isEditing: false,
      editEdgeId: null,
    });
  }, []);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: WorkflowNode) => {
    setSelectedNode(node || null);
  }, []);

  const onNodeDragStop = useCallback(() => {
    recordHistory(nodesRef.current, edgesRef.current);
  }, [recordHistory]);

  const onUnselectNode = useCallback(() => {
    setSelectedNode(null);
  }, [])

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setNodeContextMenu(null);
    setContextMenu({ x: event.pageX, y: event.pageY });
  }, []);

  const handlePaneClick = useCallback(() => {
    onUnselectNode();
  }, [onUnselectNode]);

  const handleAddNodeAtPosition = useCallback((type: WorkflowNode['type'], position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `node-${uuidv4()}`,
      type,
      position,
      data: {
        label: getNodeDefaultLabel(type),
      },
    };
    const newNodes = nodes.concat(newNode);
    setNodes(newNodes);
    recordHistory(newNodes, edges);
  }, [nodes, edges, setNodes, recordHistory]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData('application/reactflow');
    if (!nodeType) return;
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    handleAddNodeAtPosition(nodeType as WorkflowNode['type'], position);
  }, [handleAddNodeAtPosition, screenToFlowPosition]);

  const handleToggleDirection = useCallback(() => {
    setLayoutDirection(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')
  }, [])

  const handleAutoLayout = useCallback(() => {
    const newNodes = autoLayout(nodes, edges, layoutDirection);
    setNodes(newNodes);
    recordHistory(newNodes, edges);
    fitView();
  }, [nodes, edges, setNodes, layoutDirection, fitView, recordHistory]);

  // 保存节点配置时同步分支边的标签
  const handleSaveNode = useCallback((nodeId: string, label: string, config: Record<string, any>) => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const newNodes = currentNodes.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, label, config } } : n
    );
    setNodes(newNodes);

    const sourceNode = newNodes.find(n => n.id === nodeId);
    let newEdges = currentEdges;
    if (sourceNode?.type === 'branch') {
      const branches: WorkflowBranch[] = config.branches || [];
      newEdges = currentEdges.map(edge => {
        if (edge.source !== nodeId) return edge;
        const m = branches.find(b => b.id === edge.condition);
        return m ? { ...edge, label: m.label, condition: m.id } : edge;
      });
    }
    if (newEdges !== currentEdges) setEdges(newEdges);
    recordHistory(newNodes, newEdges);
  }, [setNodes, setEdges, recordHistory]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: WorkflowNode) => {
    event.preventDefault();
    event.stopPropagation();

    const currentNodes = getNodes();
    if (!getNode(node.id)?.selected) {
      setNodes(currentNodes.map(n => ({ ...n, selected: n.id === node.id })) as unknown as WorkflowNode[]);
    }

    setContextMenu(null);
    setNodeContextMenu({ x: event.pageX, y: event.pageY });
  }, [getNodes, setNodes, getNode]);

  // 节点右键菜单外部点击关闭
  useEffect(() => {
    if (!nodeContextMenu) return;

    const handler = (e: MouseEvent) => {
      if (nodeMenuRef.current && !nodeMenuRef.current.contains(e.target as Node)) {
        setNodeContextMenu(null);
      }
    };

    const id = setTimeout(() => {
      window.addEventListener('click', handler);
      window.addEventListener('contextmenu', handler);
    }, 0);

    return () => {
      clearTimeout(id);
      window.removeEventListener('click', handler);
      window.removeEventListener('contextmenu', handler);
    };
  }, [nodeContextMenu]);

  const handleDeleteSelectedNodes = useCallback(() => {
    const selectedIds = new Set(getNodes().filter(n => n.selected).map(n => n.id));
    if (selectedIds.size === 0) return;
    const remainingNodes = nodesRef.current.filter(n => !selectedIds.has(n.id));
    const remainingEdges = edgesRef.current.filter(
      e => !selectedIds.has(e.source) && !selectedIds.has(e.target)
    );
    setNodes(remainingNodes);
    setEdges(remainingEdges);
    recordHistory(remainingNodes, remainingEdges);
    setNodeContextMenu(null);
    setSelectedNode(null);
  }, [getNodes, setNodes, setEdges, recordHistory]);

  // 双击分支边重新选择分支
  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: any) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    if (sourceNode?.type !== 'branch' && sourceNode?.type !== 'if') return;
    const branches: WorkflowBranch[] = sourceNode.data.config?.branches || [];
    if (branches.length < 1) return;
    setBranchSelection({
      isOpen: true,
      branches,
      connection: { source: edge.source, target: edge.target, sourceHandle: null, targetHandle: null },
      selectedBranch: edge.condition || branches[0]?.id || '',
      isEditing: true,
      editEdgeId: edge.id,
    });
  }, [nodes]);

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 h-full min-h-0">
        <LayoutDirectionContext.Provider value={layoutDirection}>
          <ReactFlow
            nodes={positionedNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            className="bg-gray-50 dark:bg-gray-800 w-full h-full"
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            panOnScroll={false}
            elementsSelectable={true}
            nodesDraggable={true}
            nodesConnectable={true}
            multiSelectionKeyCode="Shift"
            deleteKeyCode="Delete"
            onNodesDelete={() => setSelectedNode(null)}
            onPaneClick={handlePaneClick}
            onNodeContextMenu={handleNodeContextMenu}
            onContextMenu={handlePaneContextMenu}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onlyRenderVisibleElements
          >
            <Background />
            <Controls />
            <ControlPanel
              onSave={() => { onSave(nodes, edges, workflowEnvVars); setManualSaveVersion(v => v + 1) }}
              onRun={onRun}
              isRunning={isRunning}
              onAutoLayout={handleAutoLayout}
              layoutDirection={layoutDirection}
              onToggleDirection={handleToggleDirection}
              onOpenEnvVars={() => setShowEnvVars(true)}
            />
            <WorkflowEnvVarsModal
              isOpen={showEnvVars}
              onClose={() => setShowEnvVars(false)}
              envVars={workflowEnvVars}
              onSave={setWorkflowEnvVars}
            />
            {selectedNode && (
              <NodeConfigPanel
                node={selectedNode}
                onClose={onUnselectNode}
                onSave={handleSaveNode}
                workflowId={workflow.id}
              />
            )}
          </ReactFlow>
          {testNodeId && (() => {
            const n = getNode(testNodeId)
            if (!n) return null
            return (
              <NodeTestDialog
                isOpen={!!testNodeId}
                onClose={() => setTestNodeId(null)}
                nodeId={n.id}
                nodeLabel={String(n.data?.label || '')}
                nodeType={n.type || ''}
                workflowJson={{ nodes: nodesRef.current, edges: edgesRef.current }}
              />
            )
          })()}
        </LayoutDirectionContext.Provider>

        {/* 右键菜单 */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onAddNode={handleAddNodeAtPosition}
            onClose={() => setContextMenu(null)}
            flowPosition={screenToFlowPosition({
              x: contextMenu.x,
              y: contextMenu.y,
            })}
            onPaste={handlePasteNodes}
            hasClipboard={!!(clipboardRef.current?.nodes.length)}
          />
        )}

        {/* 节点右键菜单 */}
        {nodeContextMenu && createPortal(
          <div
            ref={nodeMenuRef}
            className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-1 z-50 min-w-[120px]"
            style={{ left: nodeContextMenu.x, top: nodeContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const sel = getNodes().find(n => n.selected)
                if (sel) setTestNodeId(sel.id)
                setNodeContextMenu(null)
              }}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-purple-600 dark:text-purple-400"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              执行
            </button>
            <button
              onClick={() => { handleCopySelectedNodes(); setNodeContextMenu(null) }}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              复制
            </button>
            <button
              onClick={() => { handleDeleteSelectedNodes(); setNodeContextMenu(null) }}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </button>
          </div>,
          document.body
        )}

        {/* 分支选择模态框 */}
        <BranchSelectionModal
          isOpen={branchSelection.isOpen}
          branches={branchSelection.branches}
          connection={branchSelection.connection}
          selectedBranch={branchSelection.selectedBranch}
          onSelectBranch={(id) => setBranchSelection(prev => ({ ...prev, selectedBranch: id }))}
          onConfirm={handleBranchSelectionConfirm}
          onCancel={handleBranchSelectionCancel}
        />
      </div>
      <NodeListPanel />
    </div>
  );
}

export default memo(WorkflowDesigner)
