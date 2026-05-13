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

import { StartNode, SkillNode, BranchNode, ApiNode, AgentNode, EndNode, LLMNode, CliNode, TextNode } from './NodeTypes';
import NodeConfigPanel from './NodeConfigPanel';
import { Workflow, WorkflowBranch, WorkflowEdge, WorkflowNode } from '@renderer/types';
import NodeListPanel from './NodeListPanel';
import { getNodeDefaultLabel } from './nodes';
import ContextMenu from './ContextMenu';
import ControlPanel from './ControlPanel';
import { autoLayout } from './layoutUtils';
import { LayoutDirectionContext, LayoutDirection } from './LayoutDirectionContext';
import { v4 as uuidv4 } from 'uuid';
import { useUpdateEffect } from 'ahooks';

const nodeTypes = {
  start: StartNode,
  skill: SkillNode,
  branch: BranchNode,
  api: ApiNode,
  llm: LLMNode,
  agent: AgentNode,
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
  }>({
    isOpen: false,
    branches: [],
    connection: null,
    selectedBranch: ''
  });
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>(workflow?.layoutDirection || 'horizontal');

  // 当切换工作流时，恢复其保存的布局方向
  useUpdateEffect(() => {
    setLayoutDirection(workflow?.layoutDirection || 'horizontal');
  }, [workflow?.layoutDirection]);

  const initialNodes: WorkflowNode[] = useMemo(() => {
    return workflow?.nodes?.map((node: WorkflowNode) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        label: node.data.label || getNodeDefaultLabel(node.type),
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

  // Refs for latest state (used by keyboard shortcuts and history)
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const onSaveRef = useRef(onSave);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  // Undo/redo history
  const historyRef = useRef<Array<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }>>([]);
  const historyIndexRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  const recordHistory = useCallback((ns?: WorkflowNode[], es?: WorkflowEdge[]) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const snapshot = {
      nodes: ns ?? nodesRef.current,
      edges: es ?? edgesRef.current,
    };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const entry = historyRef.current[historyIndexRef.current];
    skipHistoryRef.current = true;
    setNodes(entry.nodes);
    setEdges(entry.edges);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current];
    skipHistoryRef.current = true;
    setNodes(entry.nodes);
    setEdges(entry.edges);
  }, [setNodes, setEdges]);

  // 根据布局方向给每个节点加上 sourcePosition/targetPosition，触发 React Flow 内部重算 handle bounds 和边缘路径
  const positionedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      sourcePosition: layoutDirection === 'vertical' ? Position.Bottom : Position.Right,
      targetPosition: layoutDirection === 'vertical' ? Position.Top : Position.Left,
    }))
  }, [nodes, layoutDirection])

  // 同步画布实时数据给父组件（不触发重渲染，仅更新 ref）
  useEffect(() => {
    onCanvasChange?.(nodes, edges, layoutDirection);
  }, [nodes, edges, layoutDirection, onCanvasChange]);

  // 初始化历史记录（工作流切换时）
  useEffect(() => {
    historyRef.current = [{ nodes: initialNodes, edges: initialEdges }];
    historyIndexRef.current = 0;
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
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSaveRef.current(nodesRef.current, edgesRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

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
            selectedBranch: branches[0]?.id || ''
          });
          return; // 暂停连接，等待用户选择
        } else if (branches.length === 1) {
          // 只有一个分支，直接使用
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

      // 非分支节点或没有分支配置，直接创建连接
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
    const newEdge: WorkflowEdge = {
      ...branchSelection.connection!,
      id: `edge-${uuidv4()}`,
      label: selectedBranch?.label,
      condition: selectedBranch?.id || branchSelection.selectedBranch
    };
    const newEdges = [...edges, newEdge];
    setEdges(newEdges);
    recordHistory(nodes, newEdges);
    setBranchSelection({
      isOpen: false,
      branches: [],
      connection: null,
      selectedBranch: ''
    });
  }, [branchSelection, nodes, edges, setEdges, recordHistory]);

  const handleBranchSelectionCancel = useCallback(() => {
    setBranchSelection({
      isOpen: false,
      branches: [],
      connection: null,
      selectedBranch: ''
    });
  }, []);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: WorkflowNode) => {
    setSelectedNode(node || null);
  }, []);

  const onNodeDragStop = useCallback(() => {
    recordHistory();
  }, [recordHistory]);

  const onUnselectNode = useCallback(() => {
    setSelectedNode(null);
  }, [])

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setContextMenu({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
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
    setContextMenu(null);
  }, [nodes, edges, setNodes, recordHistory]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);


  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const nodeType = event.dataTransfer.getData('application/reactflow');
    if (!nodeType) return;

    // 使用 ReactFlow 的坐标转换确保位置准确
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
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Background />
            <Controls />
            <ControlPanel
              onSave={() => onSave(nodes, edges)}
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
        {branchSelection.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 w-full">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">选择分支</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">请选择要连接的分支条件：</p>

              <div className="space-y-3 mb-6">
                {branchSelection.branches.map((branch: any) => (
                  <label
                    key={branch.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="branch-selection"
                      value={branch.id}
                      checked={branchSelection.selectedBranch === branch.id}
                      onChange={(e) =>
                        setBranchSelection(prev => ({
                          ...prev,
                          selectedBranch: e.target.value
                        }))
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{branch.label}</div>
                      {branch.condition && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{branch.condition}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleBranchSelectionCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleBranchSelectionConfirm}
                  disabled={!branchSelection.selectedBranch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  确认连接
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <NodeListPanel />
    </div>
  );
}

export default memo(WorkflowDesigner)