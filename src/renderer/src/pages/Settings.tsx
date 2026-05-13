import React, { useState } from 'react';
import SettingsLLM from './settings/SettingsLLM';
import SettingsTheme from './settings/SettingsTheme';
import SettingsData from './settings/SettingsData';
import SettingsShortcuts from './settings/SettingsShortcuts';
import SettingsBackup from './settings/SettingsBackup';
import SettingsGeneral from './settings/SettingsGeneral';
import SettingsProxy from './settings/SettingsProxy';
import SettingsAbout from './settings/SettingsAbout';

const TAB_ICONS: Record<string, React.ReactNode> = {
  llm: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
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
  general: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  proxy: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4m0 4h.01" />
    </svg>
  ),
  shortcuts: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
    </svg>
  ),
  backup: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m14-7l-5 5-5-5m5 5V3" /><path d="M7 10l5 5 5-5" />
    </svg>
  ),
  about: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" />
    </svg>
  ),
}

const SETTINGS_TABS = [
  { id: 'llm', label: '模型配置', desc: 'LLM API 密钥与参数' },
  { id: 'general', label: '通用', desc: '应用偏好与默认行为' },
  { id: 'shortcuts', label: '快捷键', desc: '键盘与鼠标操作' },
  { id: 'backup', label: '备份', desc: '数据导入与导出' },
  { id: 'proxy', label: '代理', desc: 'HTTP 代理配置' },
  { id: 'theme', label: '外观主题', desc: '界面颜色与显示' },
  { id: 'data', label: '数据管理', desc: '数据库与存储空间' },
  { id: 'about', label: '关于', desc: '版本信息与技术栈' },
]

export default function Settings(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('llm');

  const renderContent = () => {
    switch (activeTab) {
      case 'llm':
        return <SettingsLLM />;
      case 'general':
        return <SettingsGeneral />;
      case 'shortcuts':
        return <SettingsShortcuts />;
      case 'backup':
        return <SettingsBackup />;
      case 'proxy':
        return <SettingsProxy />;
      case 'theme':
        return <SettingsTheme />;
      case 'data':
        return <SettingsData />;
      case 'about':
        return <SettingsAbout />;
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
        <nav className="flex-1 px-3 pt-4 pb-4 space-y-1 overflow-y-auto">
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
        <div className="w-full max-w-2xl h-fit">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}