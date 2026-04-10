import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }: LayoutProps) => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: '工作流设计器' },
    { path: '/agents', label: 'Agent管理' },
    { path: '/skills', label: '技能管理' },
    { path: '/settings', label: 'API设置' },
    { path: '/chat', label: 'AI对话' }
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === item.path
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
export default Layout
