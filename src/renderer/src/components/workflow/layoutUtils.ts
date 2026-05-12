import dagre from 'dagre'
import { WorkflowNode, WorkflowEdge } from '@renderer/types'
import { LayoutDirection } from './LayoutDirectionContext'

const NODE_WIDTH = 140
const NODE_HEIGHT = 60

export function autoLayout(nodes: WorkflowNode[], edges: WorkflowEdge[], direction: LayoutDirection = 'horizontal'): WorkflowNode[] {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: direction === 'vertical' ? 'TB' : 'LR', nodesep: 100, ranksep: 160 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map(node => {
    const dagreNode = g.node(node.id)
    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      }
    }
  })
}