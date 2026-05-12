import React, { useState } from 'react';
import SettingsLLM from './settings/SettingsLLM';
import SettingsTheme from './settings/SettingsTheme';
import SettingsData from './settings/SettingsData';
import SettingsKnowledge from './settings/SettingsKnowledge';

const TAB_ICONS: Record<string, React.ReactNode> = {
  llm: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  ),
  knowledge: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  theme: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  data: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
}

const SETTINGS_TABS = [
  { id: 'llm', label: '模型配置', desc: 'LLM API 密钥与参数' },
  { id: 'knowledge', label: '知识库', desc: '文档与向量检索' },
  { id: 'theme', label: '外观主题', desc: '界面颜色与显示' },
  { id: 'data', label: '数据管理', desc: '数据库与存储空间' },
]

export default function Settings(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('llm');

  const renderContent = () => {
    switch (activeTab) {
      case 'llm':
        return <SettingsLLM />;
      case 'knowledge':
        return <SettingsKnowledge />;
      case 'theme':
        return <SettingsTheme />;
      case 'data':
        return <SettingsData />;
      default:
        return <SettingsLLM />;
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-60 border-r border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">设置</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">应用偏好与配置</p>
            </div>
          </div>
        </div>

        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 pb-4 space-y-1">
          {SETTINGS_TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-xl transition-all duration-200 group relative ${isActive
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                  }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
                <span className={`flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                  {TAB_ICONS[tab.id]}
                </span>
                <div className="text-left">
                  <div className={`font-medium ${isActive ? '' : ''}`}>{tab.label}</div>
                  <div className={`text-xs mt-0.5 ${isActive ? 'text-blue-500/70 dark:text-blue-400/60' : 'text-gray-400 dark:text-gray-500'}`}>{tab.desc}</div>
                </div>
              </button>
            )
          })}
        </nav>
      </div>
      <div className="flex-1 flex justify-center p-6 overflow-auto bg-gray-50/50 dark:bg-gray-800/30">
        <div className="w-full max-w-2xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}