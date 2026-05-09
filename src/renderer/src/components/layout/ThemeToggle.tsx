import React from 'react';
import { useThemeStore } from '@renderer/store/themeStore';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  const handleToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  };

  const resolvedIsDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <button
      onClick={handleToggle}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 hover:bg-white/70 dark:hover:bg-gray-600/50 transition-all duration-300 group overflow-hidden shrink-0"
      title={resolvedIsDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* 太阳图标 */}
        <div className={`absolute inset-0 transform transition-all duration-500 ${
          !resolvedIsDark
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        }`}>
          <svg
            className="w-5 h-5 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>

        {/* 月亮图标 */}
        <div className={`absolute inset-0 transform transition-all duration-500 ${
          resolvedIsDark
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}>
          <svg
            className="w-5 h-5 text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        </div>

        {/* 背景光效 */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
          !resolvedIsDark
            ? 'bg-amber-100 scale-150 opacity-20'
            : 'bg-indigo-900 scale-150 opacity-20'
        }`}></div>
      </div>

      {/* 悬停效果 */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </button>
  );
};

export default ThemeToggle;