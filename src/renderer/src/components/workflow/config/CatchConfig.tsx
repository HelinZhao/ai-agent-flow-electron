import React from 'react'

const CatchConfig: React.FC = () => {
  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 space-y-1">
      <p className="font-medium text-red-700 dark:text-red-400">错误处理节点</p>
      <p>此节点连接到上游节点的错误出口。上游节点执行失败时，自动走此路径。</p>
      <ul className="list-disc list-inside space-y-0.5 text-gray-500 dark:text-gray-400">
        <li>output 已拼接为 <code className="font-mono">{'[节点名] 错误信息\n\n上游输出'}</code></li>
        <li>使用 <code className="font-mono">{'{{$input}}'}</code> 获取此格式文本</li>
        <li>需要原始错误信息用 <code className="font-mono">{'{{$nodes["catch节点ID"].metadata.upstreamError}}'}</code></li>
      </ul>
    </div>
  )
}

export default CatchConfig
