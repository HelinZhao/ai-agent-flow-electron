interface Props {
  onDismissOnce: () => void
  onDismissPermanently: () => void
}

export default function OllamaInstallDialog({ onDismissOnce, onDismissPermanently }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 mx-4 max-w-md w-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">需要安装 Ollama</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              知识库和部分功能依赖 Ollama 服务来运行本地模型。请先下载并安装 Ollama，安装完成后重启应用。
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer"
            className="block w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium text-sm text-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
            前往 Ollama 官网下载
          </a>
          <div className="flex gap-2 mt-1">
            <button onClick={onDismissOnce}
              className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              稍后再说
            </button>
            <button onClick={onDismissPermanently}
              className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              不再提示
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
