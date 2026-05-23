import React, { useRef } from 'react'
import { WorkflowNode, VariableConfig, type Workflow } from '@renderer/types'

interface InputDialogProps {
  open: boolean
  onExecute: (input: string, params?: Record<string, any>) => void
  onClose: () => void
  selectedWorkflow: Workflow | null
  canvasNodes: WorkflowNode[]
}

const InputDialog: React.FC<InputDialogProps> = ({ open, onExecute, onClose, selectedWorkflow, canvasNodes }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  if (!open) return null

  const nodes = canvasNodes.length > 0 ? canvasNodes : (selectedWorkflow?.nodes || [])
  const startNode = nodes.find((n: WorkflowNode) => n.type === 'start')
  const startParams = (startNode?.data?.config?.params as VariableConfig[]) || []
  const hasParams = startParams.length > 0

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const extraInput = inputRef.current?.value || ''
    if (!hasParams) return onExecute(extraInput)

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const params: Record<string, any> = {}
    for (const [key, value] of formData.entries()) {
      params[key] = value
    }
    startParams.forEach((p: VariableConfig) => {
      if (p.type === 'boolean') {
        const cb = (e.currentTarget as HTMLFormElement).elements.namedItem(p.name) as HTMLInputElement
        params[p.name] = cb?.checked ?? false
      }
      if (p.type === 'number') {
        params[p.name] = parseFloat(params[p.name] as string) || 0
      }
    })
    onExecute(extraInput, params)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-green-600">🚀</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {hasParams ? '填写工作流参数' : '输入工作流参数'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {hasParams ? '填写参数后点击执行，下游节点可通过 {{$params.xxx}} 引用' : '请输入要传递给工作流的初始参数'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {hasParams ? (
            <div className="space-y-3">
              {startParams.map((param: VariableConfig) => (
                <div key={param.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {param.displayName || param.name}
                    {param.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {param.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name={param.name} defaultChecked={!!param.defaultValue} className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{param.description || param.displayName}</span>
                    </label>
                  ) : param.type === 'number' ? (
                    <input type="number" name={param.name} defaultValue={String(param.defaultValue ?? '')} placeholder={param.description || `输入${param.displayName}`} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors" />
                  ) : param.type === 'array' ? (
                    <textarea name={param.name} defaultValue={param.defaultValue ?? ''} placeholder={param.description || `输入${param.displayName}，每行一个`} rows={3} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors resize-none" />
                  ) : (
                    <input type="text" name={param.name} defaultValue={param.defaultValue ?? ''} placeholder={param.description || `输入${param.displayName}`} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors" />
                  )}
                </div>
              ))}
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">附加文本输入（供 {'{{$input}}'} 引用）</summary>
                <textarea ref={inputRef} defaultValue="" placeholder="可选：输入附加文本，下游节点通过 {{$input}} 引用" rows={2} className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors resize-none" />
              </details>
            </div>
          ) : (
            <textarea ref={inputRef} defaultValue="" placeholder="输入工作流参数..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors min-h-[150px] resize-none" autoFocus />
          )}
          <div className="flex space-x-3 mt-6">
            <button type="submit" className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">开始执行</button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">取消</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InputDialog