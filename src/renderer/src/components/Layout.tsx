import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import LLMConfigSwitcher from './LLMConfigSwitcher'
import { useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }: LayoutProps) => {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { path: '/', label: '工作流设计器', icon: '🔄' },
    { path: '/agents', label: 'Agent管理', icon: '🤖' },
    { path: '/skills', label: '技能管理', icon: '⚡' },
    { path: '/settings', label: 'API设置', icon: '⚙️' },
    { path: '/chat', label: 'AI对话', icon: '💬' }
  ]

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-800">
      {/* 左侧边栏导航 */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-r border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 z-40 w-16">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
          </div>

          {/* 导航项 */}
          <div className="flex-1 flex flex-col items-center py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`group relative p-3 rounded-xl transition-all duration-200 focus:outline-none ${location.pathname === item.path
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                  }`}
              >
                <span className="text-xl">{item.icon}</span>

                {/* 悬浮提示 */}
                <div className="absolute left-16 top-1/2 transform -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                  <div className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-lg whitespace-nowrap shadow-xl ">
                    {item.label}
                    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-3 h-3 bg-white dark:bg-gray-700 rotate-45"></div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* 顶部工具栏 */}
      <div className="hidden md:flex fixed top-0 left-16 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 z-40 h-16">
        <div className="flex justify-between items-center px-6 flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Agent Flow
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <LLMConfigSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* 移动端顶部导航栏 */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 z-40">
        <div className="flex justify-between items-center h-16 px-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Agent Flow
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <LLMConfigSwitcher />
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-600/50 transition-colors"
            >
              <div className="w-5 h-5 flex flex-col justify-center space-y-1">
                <div className={`w-full h-0.5 bg-gray-600 dark:bg-gray-300 transition-all ${isMobileMenuOpen ? 'rotate-45 translate-y-1' : ''}`}></div>
                <div className={`w-full h-0.5 bg-gray-600 dark:bg-gray-300 transition-all ${isMobileMenuOpen ? 'opacity-0' : ''}`}></div>
                <div className={`w-full h-0.5 bg-gray-600 dark:bg-gray-300 transition-all ${isMobileMenuOpen ? '-rotate-45 -translate-y-1' : ''}`}></div>
              </div>
            </button>
          </div>
        </div>

        {/* 移动端导航菜单 */}
        {isMobileMenuOpen && (
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${location.pathname === item.path
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-auto relative md:ml-0 ml-16 md:mt-16 mt-16">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
        <div className="relative z-10 h-full">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
