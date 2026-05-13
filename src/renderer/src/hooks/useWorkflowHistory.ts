import { useCallback, useRef } from 'react'
import { WorkflowNode, WorkflowEdge } from '@renderer/types'

interface HistoryEntry {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

interface UseWorkflowHistoryReturn {
  recordHistory: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void
  undo: (setNodes: (nodes: WorkflowNode[]) => void, setEdges: (edges: WorkflowEdge[]) => void) => void
  redo: (setNodes: (nodes: WorkflowNode[]) => void, setEdges: (edges: WorkflowEdge[]) => void) => void
  initHistory: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void
  skipHistoryRef: React.RefObject<boolean>
}

export function useWorkflowHistory(): UseWorkflowHistoryReturn {
  const historyRef = useRef<HistoryEntry[]>([])
  const historyIndexRef = useRef(-1)
  const skipHistoryRef = useRef(false)

  const recordHistory = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false
      return
    }
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push({ nodes, edges })
    if (historyRef.current.length > 50) {
      historyRef.current.shift()
    } else {
      historyIndexRef.current++
    }
  }, [])

  const undo = useCallback((
    setNodes: (nodes: WorkflowNode[]) => void,
    setEdges: (edges: WorkflowEdge[]) => void
  ) => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current--
    const entry = historyRef.current[historyIndexRef.current]
    skipHistoryRef.current = true
    setNodes(entry.nodes)
    setEdges(entry.edges)
  }, [])

  const redo = useCallback((
    setNodes: (nodes: WorkflowNode[]) => void,
    setEdges: (edges: WorkflowEdge[]) => void
  ) => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current++
    const entry = historyRef.current[historyIndexRef.current]
    skipHistoryRef.current = true
    setNodes(entry.nodes)
    setEdges(entry.edges)
  }, [])

  const initHistory = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
    historyRef.current = [{ nodes, edges }]
    historyIndexRef.current = 0
  }, [])

  return { recordHistory, undo, redo, initHistory, skipHistoryRef }
}
