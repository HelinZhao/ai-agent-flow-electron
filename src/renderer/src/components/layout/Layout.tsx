import ThemeToggle from './ThemeToggle'
import LLMConfigSwitcher from './LLMConfigSwitcher'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import WindowControls from './WindowControls'
import SystemAssistantChat from '@renderer/components/SystemAssistantChat'
import Footer from './Footer'

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
      <Footer loading={loading} onRefresh={onRefresh} />
    </div>
  )
}

export default Layout