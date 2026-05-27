import { WorkflowNode } from "@renderer/types";
import { useReactFlow } from "@xyflow/react";
import { memo, useCallback, useMemo, useState } from "react";
import { NODE_DEFS, NODE_CATEGORIES, getNodeDefaultLabel } from "./nodes";
import { v4 as uuidv4 } from 'uuid';

const NodeListPanel = (): React.JSX.Element => {
  const { addNodes } = useReactFlow<WorkflowNode>();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleGroup = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleAddNode = useCallback((type: WorkflowNode['type']) => {
    const newNode: WorkflowNode = {
      id: `node-${uuidv4()}`,
      type,
      position: { x: 300, y: 200 },
      data: {
        label: getNodeDefaultLabel(type),
      },
    };
    addNodes(newNode);
  }, [addNodes]);

  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/reactflow', nodeType);
  }, []);

  const groupedNodes = useMemo(() => {
    return NODE_CATEGORIES.map(cat => ({
      ...cat,
      nodes: NODE_DEFS.filter(n => n.category === cat.key),
    })).filter(g => g.nodes.length > 0)
  }, [])

  return sidebarCollapsed ? (
    <div className="flex-shrink-0 border-l border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center cursor-pointer"
      onClick={() => setSidebarCollapsed(false)} title="展开节点库">
      <svg className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 19l-7-7 7-7" />
      </svg>
    </div>
  ) : (
    <div className="w-56 flex-shrink-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-l border-slate-200 dark:border-slate-700 h-full flex flex-col overflow-hidden relative">
      <div className="px-5 py-4 flex-shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span>节点库</span>
          </h3>
          <button onClick={() => setSidebarCollapsed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="收起节点库">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {groupedNodes.map(group => {
          const isCollapsed = collapsed.has(group.key)
          return (
            <div key={group.key}>
              <button onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                <span>{group.label}</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {!isCollapsed && (
                <div className="space-y-2">
                  {group.nodes.map(def => (
                    <div
                      key={def.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, def.type)}
                      onClick={() => handleAddNode(def.type as WorkflowNode['type'])}
                      className={`group/item flex items-center space-x-3 px-4 py-3 text-sm rounded-lg cursor-move transition-all duration-300 hover:scale-105 active:scale-95 bg-white dark:bg-slate-700/50 hover:bg-gradient-to-r hover:from-${def.color}-50 hover:to-${def.color}-100 dark:hover:from-${def.color}-900/20 dark:hover:to-${def.color}-800/30 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 shadow-sm hover:shadow-lg dark:hover:shadow-black/10`}
                      title={def.defaultLabel}
                    >
                      <div className={`w-8 h-8 bg-gradient-to-br from-${def.color}-400 to-${def.color}-600 rounded-xl flex items-center justify-center shadow-sm group-hover/item:shadow-md transition-shadow duration-200`}>
                        <span className="text-white text-sm">{def.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{def.shortLabel}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{def.defaultLabel}</div>
                      </div>
                      <div className="flex flex-col space-y-1 opacity-0 group-hover/item:opacity-100 transition-all duration-200">
                        {def.type === 'start' && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">起点</span>
                        )}
                        {def.type === 'end' && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">终点</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="px-5 py-4 flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            <span>拖拽到画布</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            <span>点击添加</span>
          </div>
        </div>
      </div>
    </div>
  )
}
export default memo(NodeListPanel)