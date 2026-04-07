import { WorkflowNode } from "@renderer/types";
import { Panel, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";
import { getNodeDefaultLabel } from "./nodes";
import { v4 as uuidv4 } from 'uuid';

const NodeListPanel = ():  React.JSX.Element => {
  const { addNodes } = useReactFlow<WorkflowNode>();

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

  return (
    <Panel position="top-left">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg space-y-2">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">添加节点</h3>
        <div className="grid grid-cols-2 gap-2">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'start')}
            onClick={() => handleAddNode('start')}
            className="px-3 py-2 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 cursor-move"
          >
            开始
          </div>
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'skill')}
            onClick={() => handleAddNode('skill')}
            className="px-3 py-2 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 cursor-move"
          >
            技能
          </div>
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'branch')}
            onClick={() => handleAddNode('branch')}
            className="px-3 py-2 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 cursor-move"
          >
            分支
          </div>
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'api')}
            onClick={() => handleAddNode('api')}
            className="px-3 py-2 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200 cursor-move"
          >
            API
          </div>
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'llm')}
            onClick={() => handleAddNode('llm')}
            className="px-3 py-2 text-xs bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200 cursor-move"
          >
            LLM
          </div>
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'agent')}
            onClick={() => handleAddNode('agent')}
            className="px-3 py-2 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 cursor-move"
          >
            Agent
          </div>
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'end')}
            onClick={() => handleAddNode('end')}
            className="px-3 py-2 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 cursor-move"
          >
            结束
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          点击添加或拖拽到画布
        </p>
      </div>
    </Panel>
  )
}
export default memo(NodeListPanel)