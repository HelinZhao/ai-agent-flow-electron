import ThemeToggle from './ThemeToggle'
import LLMConfigSwitcher from './LLMConfigSwitcher'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import WindowControls from './WindowControls'
import SystemAssistantChat from '@renderer/components/SystemAssistantChat'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onNavigate: (page: string) => void
  loading: boolean
  navItems: { path: string; label: string; icon: React.ReactNode, page: React.ReactNode }[]
  onRefresh?: () => void
}
const isElectron = Boolean(window.electron || window.api)
const Layout: React.FC<LayoutProps> = ({ navItems, currentPage, onNavigate, loading, children, onRefresh }: LayoutProps) => {

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-800">
      {/* 顶部工具栏 */}
      <div className="hidden md:flex bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 h-12 app-drag z-40">
        <div className="flex justify-between items-center px-4 flex-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Agent Flow
            </span>
          </div>
          <div className="flex items-center space-x-3 app-no-drag">
            <div className="w-9 h-9 flex items-center justify-center">
              {loading ? (
                <svg className="w-4 h-4 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : onRefresh && (
                <button
                  onClick={onRefresh}
                  title="刷新数据"
                  className="rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                </button>
              )}
            </div>
            <LLMConfigSwitcher />
            <ThemeToggle />
          </div>
        </div>
        {isElectron && <WindowControls />}
      </div>
      {/* 移动端导航 */}
      <MobileNav
        currentPage={currentPage}
        onNavigate={onNavigate}
        navItems={navItems}
        isElectron={isElectron}
      />

      {/* 下方内容区域：侧边栏 + 主内容 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏导航 */}
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} navItems={navItems} />

        {/* 主内容区域 */}
        <main className="flex-1 overflow-auto relative">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
          {children}
          {navItems.map((item) => (
            <div key={item.path} className={`relative z-10 h-full ${currentPage === item.path ? '' : 'hidden'}`}>
              {item.page}
            </div>
          ))}
        </main>
      </div>
      {currentPage !== '/chat' && <SystemAssistantChat />}
    </div>
  )
}

export default Layout