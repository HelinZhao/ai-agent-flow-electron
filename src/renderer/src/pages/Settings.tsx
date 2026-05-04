import React, { useState } from 'react';
import SettingsLLM from './settings/SettingsLLM';
import SettingsTheme from './settings/SettingsTheme';
import SettingsData from './settings/SettingsData';

const SETTINGS_TABS = [
  { id: 'llm', label: '模型配置', icon: '🤖' },
  { id: 'theme', label: '外观主题', icon: '🎨' },
  { id: 'data', label: '数据管理', icon: '📦' },
]

export default function Settings(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('llm');

  const renderContent = () => {
    switch (activeTab) {
      case 'llm':
        return <SettingsLLM />;
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
      <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">设置</h2>
        </div>
        <nav className="space-y-1 px-2">
          {SETTINGS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 flex justify-center p-6 overflow-auto">
        <div className="w-full max-w-2xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}