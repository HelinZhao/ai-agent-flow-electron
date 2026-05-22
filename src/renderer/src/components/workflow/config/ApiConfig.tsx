import React from 'react';
import CustomSelect from '../../ui/CustomSelect';
import TemplateEditor from '../../ui/TemplateEditor';

interface ApiConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const ApiConfig: React.FC<ApiConfigProps> = ({ config, onConfigChange }) => {
  const updateApiConfig = (field: string, value: any) => {
    onConfigChange({
      ...config,
      apiConfig: { ...config.apiConfig, [field]: value }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          API URL *
        </label>
        <TemplateEditor
          value={config.apiConfig?.url || ''}
          onChange={(v) => updateApiConfig('url', v)}
          placeholder="https://api.example.com/endpoint"
          minHeight="36px"
          size="sm"
        />
        <p className="text-xs text-gray-400 mt-1">支持 {'{{paramName}}'} 引用 Start 节点参数</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          HTTP 方法
        </label>
        <CustomSelect
          value={config.apiConfig?.method || 'GET'}
          onChange={(value) => updateApiConfig('method', value)}
          options={[
            { value: 'GET', label: 'GET' },
            { value: 'POST', label: 'POST' },
            { value: 'PUT', label: 'PUT' },
            { value: 'DELETE', label: 'DELETE' }
          ]}
          placeholder="选择HTTP方法"
          size="sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          请求头 (JSON格式)
        </label>
        <TemplateEditor
          value={config.apiConfig?.headers || ''}
          onChange={(v) => updateApiConfig('headers', v)}
          placeholder='{"Content-Type": "application/json"}'
          minHeight="60px"
          size="sm"
        />
      </div>

      {(config.apiConfig?.method === 'POST' || config.apiConfig?.method === 'PUT') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            请求体 (JSON格式)
          </label>
          <TemplateEditor
            value={config.apiConfig?.body || ''}
            onChange={(v) => updateApiConfig('body', v)}
            minHeight="60px"
            size="sm"
          />
        </div>
      )}
    </div>
  );
};

export default ApiConfig;
