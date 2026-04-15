import React from 'react';

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
        <input
          type="url"
          value={config.apiConfig?.url || ''}
          onChange={(e) => updateApiConfig('url', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="https://api.example.com/endpoint"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          HTTP 方法
        </label>
        <select
          value={config.apiConfig?.method || 'GET'}
          onChange={(e) => updateApiConfig('method', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          请求头 (JSON格式)
        </label>
        <textarea
          value={config.apiConfig?.headers || ''}
          onChange={(e) => updateApiConfig('headers', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows={3}
          placeholder='{"Content-Type": "application/json"}'
        />
      </div>

      {(config.apiConfig?.method === 'POST' || config.apiConfig?.method === 'PUT') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            请求体 (JSON格式)
          </label>
          <textarea
            value={config.apiConfig?.body || ''}
            onChange={(e) => updateApiConfig('body', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
          />
        </div>
      )}
    </div>
  );
};

export default ApiConfig;