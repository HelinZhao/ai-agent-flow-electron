import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  useReactFlow,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { createPortal } from 'react-dom';

import { StartNode, SkillNode, BranchNode, ApiNode, AgentNode, EndNode, LLMNode } from './NodeTypes';
import NodeConfigPanel from './NodeConfigPanel';
import { Workflow, WorkflowBranch, WorkflowEdge, WorkflowNode } from '@renderer/types';
import NodeListPanel from './NodeListPanel';
import { getNodeDefaultLabel } from './nodes';
import ContextMenu from './ContextMenu';
import ControlPanel from './ControlPanel';
import { v4 as uuidv4 } from 'uuid';

const nodeTypes = {
  start: StartNode,
  skill: SkillNode,
  branch: BranchNode,
  api: ApiNode,
  llm: LLMNode,
  agent: AgentNode,
  end: EndNode,
};

interface WorkflowDesignerProps {
  workflow: Workflow;
  onWorkflowChange: (workflow: Partial<Workflow>) => void;
  onSave: () => void;
  onRun: () => Promise<void>;
}

function WorkflowDesigner({ workflow, onWorkflowChange, onSave, onRun }: WorkflowDesignerProps):  React.JSX.Element {
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
  const { screenToFlowPosition } = useReactFlow();

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
          setEdges((eds) => addEdge(newEdge, eds));
          return;
        }
      }

      // 非分支节点或没有分支配置，直接创建连接
      const newEdge: WorkflowEdge = {
        ...params,
        id: `edge-${uuidv4()}`
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodes, setEdges]
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
    setEdges((eds) => addEdge(newEdge, eds));
    setBranchSelection({
      isOpen: false,
      branches: [],
      connection: null,
      selectedBranch: ''
    });
  }, [branchSelection, setEdges]);

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

  useEffect(() => {
    onWorkflowChange({
      nodes: nodes,
      edges: edges,
      updatedAt: new Date()
    })
  }, [nodes, edges, onWorkflowChange])

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
    setNodes((nds) => nds.concat(newNode));
    setContextMenu(null);
  }, [setNodes]);

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

  return (
    <div className="flex h-screen w-screen">
      <div className="flex-1 h-full min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
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
          onPaneClick={handlePaneClick}
          onContextMenu={handlePaneContextMenu}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Background />
          <Controls />
          <NodeListPanel />
          <ControlPanel onSave={onSave} onRun={onRun} />
          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onClose={onUnselectNode}
            />
          )}
        </ReactFlow>

        {/* 右键菜单 */}
        {contextMenu && createPortal(
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onAddNode={handleAddNodeAtPosition}
            onClose={() => setContextMenu(null)}
            flowPosition={screenToFlowPosition({
              x: contextMenu.x,
              y: contextMenu.y,
            })}
          />,
          document.body
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
    </div>
  );
}

export default memo(WorkflowDesigner)