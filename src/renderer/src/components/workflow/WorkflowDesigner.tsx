import React, { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
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

import { StartNode, SkillNode, BranchNode, ApiNode, AgentNode, EndNode, LLMNode, CliNode, TextNode, WorkflowNode as WorkflowNodeComponent } from './NodeTypes';
import NodeConfigPanel from './NodeConfigPanel';
import { Workflow, WorkflowBranch, WorkflowEdge, WorkflowNode } from '@renderer/types';
import NodeListPanel from './NodeListPanel';
import { getNodeDefaultLabel } from './nodes';
import ContextMenu from './ContextMenu';
import ControlPanel from './ControlPanel';
import BranchSelectionModal from './BranchSelectionModal';
import { autoLayout } from './layoutUtils';
import { LayoutDirectionContext, LayoutDirection } from './LayoutDirectionContext';
import { useWorkflowHistory } from '@renderer/hooks/useWorkflowHistory';
import { useSettingsStore } from '@renderer/store/settingsStore';
import { v4 as uuidv4 } from 'uuid';
import { useUpdateEffect } from 'ahooks';

const nodeTypes = {
  start: StartNode,
  skill: SkillNode,
  branch: BranchNode,
  api: ApiNode,
  llm: LLMNode,
  agent: AgentNode,
  workflow: WorkflowNodeComponent,
  cli: CliNode,
  text: TextNode,
  end: EndNode,
};

interface WorkflowDesignerProps {
  workflow: Workflow;
  onSave: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  onRun: () => void;
  isRunning: boolean;
  onCanvasChange?: (nodes: WorkflowNode[], edges: WorkflowEdge[], layoutDirection: LayoutDirection) => void;
}

function WorkflowDesigner(props: WorkflowDesignerProps): React.JSX.Element {
  const { workflow, onSave, onRun, isRunning, onCanvasChange } = props
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
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
  const { screenToFlowPosition, fitView, } = useReactFlow();
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

  // 快捷键：Ctrl+Z 撤销, Ctrl+Shift+Z / Ctrl+Y 重做, Ctrl+S 保存
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setNodes, setEdges]);

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

      // 如果源节点是分支节点，显示分支选择模态框
      if (sourceNode?.type === 'branch') {
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

      const newEdge: WorkflowEdge = {
        ...params,
        id: `edge-${uuidv4()}`
      };
      const newEdges = [...edges, newEdge];
      setEdges(newEdges);
      recordHistory(nodes, newEdges);
    },
    [nodes, edges, setEdges, recordHistory]
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
    const newNodes = nodes.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, label, config } } : n
    );
    setNodes(newNodes);

    const sourceNode = newNodes.find(n => n.id === nodeId);
    let newEdges = edges;
    if (sourceNode?.type === 'branch') {
      const branches: WorkflowBranch[] = config.branches || [];
      newEdges = edges.map(edge => {
        if (edge.source !== nodeId) return edge;
        const m = branches.find(b => b.id === edge.condition);
        return m ? { ...edge, label: m.label, condition: m.id } : edge;
      });
    }
    if (newEdges !== edges) setEdges(newEdges);
    recordHistory(newNodes, newEdges);
  }, [nodes, edges, setNodes, setEdges, recordHistory]);

  // 双击分支边重新选择分支
  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: any) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    if (sourceNode?.type !== 'branch') return;
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
            onContextMenu={handlePaneContextMenu}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Background />
            <Controls />
            <ControlPanel
              onSave={() => { onSave(nodes, edges); setManualSaveVersion(v => v + 1) }}
              onRun={onRun}
              isRunning={isRunning}
              onAutoLayout={handleAutoLayout}
              layoutDirection={layoutDirection}
              onToggleDirection={handleToggleDirection}
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
          />
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
