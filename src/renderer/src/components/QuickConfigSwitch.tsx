import { useWorkflowStore } from '@renderer/store/workflowStore';

interface QuickConfigSwitchProps {
  className?: string;
}

export default function QuickConfigSwitch({ className = '' }: QuickConfigSwitchProps) {
  const { llmConfigs, activeLLMConfig, activateLLMConfig } = useWorkflowStore();

  const handleQuickSwitch = async (configId: string) => {
    try {
      await activateLLMConfig(configId);
    } catch (error) {
      console.error('快速切换配置失败:', error);
    }
  };

  if (llmConfigs.length <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm text-gray-600 dark:text-gray-400">快速切换:</span>
      <div className="flex space-x-1">
        {llmConfigs.slice(0, 3).map((config) => (
          <button
            key={config.id}
            onClick={() => handleQuickSwitch(config.id!)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              config.id === activeLLMConfig?.id
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
            title={config.name}
          >
            {config.name.length > 8 ? config.name.substring(0, 8) + '...' : config.name}
          </button>
        ))}
        {llmConfigs.length > 3 && (
          <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
            +{llmConfigs.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}