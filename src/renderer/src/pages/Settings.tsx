import React, { useState } from 'react';
import SettingsLLM from './settings/SettingsLLM';
import SettingsTheme from './settings/SettingsTheme';
import SettingsData from './settings/SettingsData';
import SettingsKnowledge from './settings/SettingsKnowledge';

const SETTINGS_TABS = [
  { id: 'llm', label: '模型配置', icon: '🤖' },
  { id: 'knowledge', label: '知识库', icon: '📚' },
  { id: 'theme', label: '外观主题', icon: '🎨' },
  { id: 'data', label: '数据管理', icon: '📦' },
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
      <div className="w-56 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
        <div className="px-5 py-5 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              设置
            </h1>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {SETTINGS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 text-sm rounded-xl transition-all duration-200 ${activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
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