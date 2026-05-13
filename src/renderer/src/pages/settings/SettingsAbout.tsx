const APP_VERSION = '1.0.0'

const LINKS = [
  { label: 'GitHub', url: 'https://github.com/your-org/agent-flow', icon: 'M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z' },
  { label: '文档', url: '#', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z' },
]

const TECH_STACK = [
  { name: 'Electron', desc: '跨平台桌面框架' },
  { name: 'React', desc: 'UI 组件库' },
  { name: 'TypeScript', desc: '类型安全的开发语言' },
  { name: 'LangGraph', desc: '工作流执行引擎' },
  { name: 'Express', desc: '本地 API 服务' },
  { name: 'SQLite', desc: '数据持久化存储' },
]

export default function SettingsAbout() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">关于</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">应用信息与技术栈</p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-2xl">AI</span>
        </div>
        <h4 className="text-xl font-bold text-gray-900 dark:text-white">Agent Flow</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">版本 {APP_VERSION}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 max-w-md mx-auto leading-relaxed">
          一个可视化的 AI 工作流编排平台，通过拖拽式画布构建复杂的 AI 自动化流程。
        </p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">相关链接</h4>
        <div className="space-y-2">
          {LINKS.map(link => (
            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-blue-300 dark:hover:border-blue-600/50 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d={link.icon} />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{link.label}</span>
              <svg className="w-4 h-4 ml-auto text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3" />
              </svg>
            </a>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">技术栈</h4>
        <div className="grid grid-cols-2 gap-2">
          {TECH_STACK.map(t => (
            <div key={t.name} className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
