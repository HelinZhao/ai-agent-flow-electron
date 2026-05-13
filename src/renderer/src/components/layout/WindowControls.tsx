import { useState, useEffect } from 'react'

const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)

    const handleResize = () => {
      window.api.window.isMaximized().then(setIsMaximized)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMinimize = () => window.api.window.minimize()
  const handleMaximize = () => window.api.window.maximize()
  const handleClose = () => window.api.window.close()

  return (
    <div className="flex items-center h-full app-no-drag">
      <button
        onClick={handleMinimize}
        className="w-11 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 dark:hover:text-white transition-colors"
        title="最小化"
      >
        <svg width="10" height="1" viewBox="0 0 10 1">
          <rect width="10" height="1" fill="currentColor" />
        </svg>
      </button>
      <button
        onClick={handleMaximize}
        className="w-11 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 dark:hover:text-white transition-colors"
        title={isMaximized ? '还原' : '最大化'}
      >
        {isMaximized ? (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0" y="3.5" width="7" height="7" />
            <polyline points="3.5,3.5 3.5,0 10.5,0 10.5,7 7,7" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        )}
      </button>
      <button
        onClick={handleClose}
        className="w-11 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-500 hover:text-white dark:hover:text-white transition-colors"
        title="关闭"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  )
}

export default WindowControls