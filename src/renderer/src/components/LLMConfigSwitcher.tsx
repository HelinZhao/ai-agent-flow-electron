import React, { useState } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';

export default function LLMConfigSwitcher() {
  const { llmConfigs, activeLLMConfig, activateLLMConfig } = useWorkflowStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleConfigSwitch = async (configId: string) => {
    try {
      await activateLLMConfig(configId);
      setIsOpen(false);
    } catch (error) {
      console.error('切换配置失败:', error);
    }
  };

  if (!activeLLMConfig) {
    return (
      <div className="relative">
        <button
          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-600 dark:text-gray-300"
          disabled
        >
          <span>未配置</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {activeLLMConfig.name}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">
            {activeLLMConfig.provider}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-blue-600 dark:text-blue-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
          <div className="py-1">
            {llmConfigs.map((config) => (
              <button
                key={config.id}
                onClick={() => handleConfigSwitch(config.id!)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                  config.id === activeLLMConfig.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{config.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                    {config.provider}
                  </span>
                </div>
                {config.id === activeLLMConfig.id && (
                  <span className="text-blue-600 dark:text-blue-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}