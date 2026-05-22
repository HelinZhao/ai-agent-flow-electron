import React from 'react'
import Modal from '../ui/Modal'

interface VariableReferenceModalProps {
  isOpen: boolean
  onClose: () => void
}

const VARIABLE_TABLE = [
  { syntax: '{{$input}}', description: '上游相邻节点的文本输出', example: '用户输入的内容' },
  { syntax: '{{$params.xxx}}', description: 'Start 节点定义的参数（支持 $params.user.name 嵌套路径）', example: '参数值' },
  { syntax: '{{$nodes["节点ID"].output}}', description: '按 ID 引用任意已完成节点的文本输出', example: '上游节点的输出结果' },
  { syntax: '{{$nodes["节点ID"].metadata.xxx}}', description: '引用节点 metadata 中的字段（如 .label / .error）', example: '节点标签' },
  { syntax: '{{$env.xxx}}', description: '读取运行环境的系统环境变量', example: '/home/user' },
  { syntax: '{{$now}}', description: '当前时间的 ISO 字符串', example: '2026-05-22T10:30:00.000Z' },
  { syntax: '{{$now.date}}', description: '当前日期', example: '2026-05-22' },
  { syntax: '{{$now.time}}', description: '当前时间', example: '10:30:00' },
  { syntax: '{{$now.timestamp}}', description: '当前 Unix 毫秒时间戳', example: '1716369000000' },
  { syntax: '{{$now.year}}', description: '当前年份', example: '2026' },
  { syntax: '{{$now.month}}', description: '当前月份（补零）', example: '05' },
  { syntax: '{{$now.day}}', description: '当前日期（补零）', example: '22' },
  { syntax: '{{$now.hour}}', description: '当前小时（24小时制，补零）', example: '10' },
  { syntax: '{{$now.minute}}', description: '当前分钟（补零）', example: '30' },
  { syntax: '{{$now.second}}', description: '当前秒数（补零）', example: '00' },
]

const VariableReferenceModal: React.FC<VariableReferenceModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      wide
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm shadow-md">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <div>
            <span>变量参考表</span>
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
              在文本/LLM/API/CLI 等节点的输入字段中使用以下变量
            </p>
          </div>
        </div>
      }
    >
      {/* 表头 */}
      <div className="grid grid-cols-[180px_1fr_160px] gap-3 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 -mx-1">
        <span>变量</span>
        <span>说明</span>
        <span>示例</span>
      </div>

      {/* 行 */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700/50 -mx-1">
        {VARIABLE_TABLE.map((row) => (
          <div
            key={row.syntax}
            className="grid grid-cols-[180px_1fr_160px] gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
          >
            <code className="text-sm font-mono font-semibold text-purple-600 dark:text-purple-400 break-all">
              {row.syntax}
            </code>
            <span className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
              {row.description}
            </span>
            <code className="text-sm font-mono text-gray-500 dark:text-gray-400 truncate">
              {row.example}
            </code>
          </div>
        ))}
      </div>

      {/* 使用提示 */}
      <div className="px-3 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-700 dark:text-amber-300 space-y-1">
        <p className="font-medium">提示</p>
        <p>在编辑器中输入 <code className="font-mono font-semibold text-amber-700 dark:text-amber-300">$</code> 可触发自动补全。</p>
        <p>Code 节点中直接用 JS 变量：<code className="font-mono font-semibold">$input</code>、<code className="font-mono font-semibold">$params</code>、<code className="font-mono font-semibold">$nodes["id"].output</code></p>
      </div>
    </Modal>
  )
}

export default VariableReferenceModal
