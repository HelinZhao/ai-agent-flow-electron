/** 执行状态图标组件 */
export type ExecStatus = 'thinking' | 'using_tool' | 'done' | 'error'

export default function StatusIcon({ status, className }: { status?: string | null; className?: string }) {
  switch (status) {
    case 'thinking':
      return (
        <span
          className={`w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block ${className ?? ''}`}
        />
      )
    case 'using_tool':
      return <span className={`text-amber-500 ${className ?? ''}`}>🔧</span>
    case 'done':
      return <span className={`text-emerald-500 ${className ?? ''}`}>✓</span>
    case 'error':
      return <span className={`text-red-500 ${className ?? ''}`}>✗</span>
    default:
      return null
  }
}
