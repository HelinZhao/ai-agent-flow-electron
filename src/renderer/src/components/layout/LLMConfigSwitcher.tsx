import { useAppStore } from '@renderer/store/appStore';
import CustomSelect, { SelectOption } from '../ui/CustomSelect';
import ProviderIcon from '../ui/ProviderIcon';

function ConfigLabel({ name, provider, isActive }: { name: string; provider: string, isActive: boolean }) {
  return (
    <div className="flex items-center gap-2 mr-2">
      <ProviderIcon provider={provider} className="w-4 h-4 shrink-0" />
      <span className="font-medium">{name}</span>
      {isActive
        ? <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded">
          {provider}
        </span>
        : <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
          {provider}
        </span>
      }
    </div>
  );
}

export default function LLMConfigSwitcher() {
  const { llmConfigs, activeLLMConfig, activateLLMConfig } = useAppStore();

  if (!activeLLMConfig) {
    return (
      <div className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
        未配置
      </div>
    );
  }

  const options: SelectOption[] = llmConfigs.map((config) => ({
    value: config.id!,
    label: <ConfigLabel name={config.name} provider={config.provider} isActive={config.id === activeLLMConfig.id} />
  }));

  return (
    <CustomSelect
      value={activeLLMConfig.id!}
      onChange={(id) => activateLLMConfig(id)}
      options={options}
      size="sm"
      dropdownWidth={"auto"}
      variant="borderless"
      className="w-auto"
    />
  );
}