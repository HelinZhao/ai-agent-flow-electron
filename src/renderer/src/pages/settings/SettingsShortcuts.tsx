const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], desc: '撤销' },
  { keys: ['Ctrl', 'Shift', 'Z'], desc: '重做' },
  { keys: ['Ctrl', 'Y'], desc: '重做（备选）' },
  { keys: ['Ctrl', 'S'], desc: '保存当前工作流' },
  { keys: ['Delete'], desc: '删除选中节点或连线' },
  { keys: ['Shift', '点击'], desc: '多选节点' },
  { keys: ['滚轮'], desc: '画布缩放' },
  { keys: ['拖拽节点'], desc: '移动节点位置' },
  { keys: ['拖拽连线'], desc: '在节点间创建连接' },
]

export default function SettingsShortcuts() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">快捷键</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">画布编辑器支持的键盘与鼠标操作</p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {SHORTCUTS.map((s, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-5 py-3 ${
              i < SHORTCUTS.length - 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''
            }`}
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">{s.desc}</span>
            <div className="flex items-center gap-1">
              {s.keys.map((k, j) => (
                <span key={j}>
                  <kbd className="px-2 py-1 text-xs font-mono rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shadow-sm">
                    {k}
                  </kbd>
                  {j < s.keys.length - 1 && <span className="mx-1 text-xs text-gray-400">+</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
