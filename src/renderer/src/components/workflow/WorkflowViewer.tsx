import { useState, useMemo } from 'react'
import { ReactFlowProvider, ReactFlow, Background, BackgroundVariant } from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { nodeTypes } from '@renderer/components/workflow/WorkflowDesigner'
import { LayoutDirectionContext } from '@renderer/components/workflow/LayoutDirectionContext'
import { WorkflowEdge, WorkflowNode } from '@renderer/types'
import NodeConfigPanel from './NodeConfigPanel'

interface WorkflowViewerData {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

function Viewer({ nodes, edges }: WorkflowViewerData) {
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)

  const rfNodes = useMemo<WorkflowNode[]>(() => nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { label: n.data.label, config: n.data.config },
  })), [nodes])

  const rfEdges = useMemo<WorkflowEdge[]>(() => edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    ...(edge.sourceType === 'error' ? {
      style: { stroke: '#ef4444', strokeDasharray: '6 3', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed', color: '#ef4444' },
    } : {}),
  })), [edges])

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnDrag
      zoomOnScroll
      fitView
      proOptions={{ hideAttribution: true }}
      onNodeClick={(_, node) => {
        const wfNode: WorkflowNode = {
          id: node.id,
          type: node.type as WorkflowNode['type'],
          position: node.position,
          data: node.data as WorkflowNode['data'],
        }
        setSelectedNode(wfNode)
      }}
      onlyRenderVisibleElements
      onPaneClick={() => setSelectedNode(null)}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          readOnly
        />
      )}
    </ReactFlow>
  )
}

export default function WorkflowViewer({ nodes, edges }: WorkflowViewerData) {
  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <ReactFlowProvider>
        <LayoutDirectionContext.Provider value="horizontal">
          <Viewer nodes={nodes} edges={edges} />
        </LayoutDirectionContext.Provider>
      </ReactFlowProvider>
    </div>
  )
}
