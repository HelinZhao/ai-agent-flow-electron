import React, { useState, useEffect } from 'react';
import { mcpApi, McpServer } from '@renderer/lib/mcpApi';
import CustomSelect from '../../ui/CustomSelect';
import CustomInput from '../../ui/CustomInput';
import CustomTextarea from '../../ui/CustomTextarea';

interface McpConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

/** 根据 JSON Schema 的 properties 定义渲染参数表单 */
function renderParamFields(
  params: Record<string, any>,
  schema: any,
  onChange: (key: string, value: any) => void,
) {
  if (!schema?.properties) return null

  return (
    <div className="space-y-3">
      {Object.entries<any>(schema.properties).map(([key, propSchema]) => {
        const value = params[key] ?? propSchema.default ?? ''
        const required = Array.isArray(schema.required) && schema.required.includes(key)
        const label = propSchema.title || key
        const desc = propSchema.description || ''

        // 根据 type 渲染不同的输入组件
        const isLongText = propSchema.type === 'string' && (
          (propSchema.maxLength && propSchema.maxLength > 200) ||
          key.toLowerCase().includes('content') ||
          key.toLowerCase().includes('text') ||
          key.toLowerCase().includes('prompt') ||
          key.toLowerCase().includes('description')
        )

        if (propSchema.enum && Array.isArray(propSchema.enum)) {
          return (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <CustomSelect
                size="xs"
                value={value}
                onChange={(v) => onChange(key, v)}
                options={propSchema.enum.map((e: string) => ({ value: e, label: e }))}
                placeholder="请选择..."
              />
              {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
            </div>
          )
        }

        if (isLongText) {
          return (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                <span className="text-gray-400 font-normal ml-1">(支持 {'{{input}}'} 引用上游输入)</span>
              </label>
              <CustomTextarea
                size="sm"
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                rows={3}
                placeholder={propSchema.placeholder || propSchema.description || `输入${label}`}
              />
              {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
            </div>
          )
        }

        if (propSchema.type === 'boolean') {
          return (
            <div key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(key, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600"
              />
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
            </div>
          )
        }

        if (propSchema.type === 'number' || propSchema.type === 'integer') {
          return (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <CustomInput
                type="number"
                size="sm"
                value={String(value)}
                onChange={(e) => onChange(key, propSchema.type === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
                placeholder={propSchema.placeholder || `输入${label}`}
              />
              {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
            </div>
          )
        }

        // 默认 string / text input
        return (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              <span className="text-gray-400 font-normal ml-1">(支持 {'{{input}}'} 引用上游输入)</span>
            </label>
            <CustomInput
              type="text"
              size="sm"
              value={value}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={propSchema.placeholder || propSchema.description || '输入' + label}
            />
            {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
          </div>
        )
      })}
    </div>
  )
}

const McpConfig: React.FC<McpConfigProps> = ({ config, onConfigChange }) => {
  const [servers, setServers] = useState<McpServer[]>([])
  const [selectedServerTools, setSelectedServerTools] = useState<any[]>([])
  const [selectedToolSchema, setSelectedToolSchema] = useState<any>(null)

  // 加载服务器列表
  useEffect(() => {
    mcpApi.getAll().then(setServers).catch(() => {})
  }, [])

  const mcpConfig = config.mcpConfig || {}

  // 当服务器切换时，获取该服务器的工具列表
  const handleServerChange = async (serverId: string) => {
    onConfigChange({
      ...config,
      mcpConfig: { ...mcpConfig, serverId, serverName: '', toolName: '', params: {} },
    })
    setSelectedToolSchema(null)
    if (serverId) {
      try {
        const detail = await mcpApi.getById(serverId)
        setSelectedServerTools(detail.tools || [])
      } catch {
        setSelectedServerTools([])
      }
    } else {
      setSelectedServerTools([])
    }
  }

  // 当工具切换时，记录 schema
  const handleToolChange = (toolName: string) => {
    const tool = selectedServerTools.find((t: any) => t.name === toolName)
    setSelectedToolSchema(tool?.inputSchema || null)
    onConfigChange({
      ...config,
      mcpConfig: { ...mcpConfig, toolName, params: {} },
    })
  }

  // 更新参数
  const updateParam = (key: string, value: any) => {
    onConfigChange({
      ...config,
      mcpConfig: { ...mcpConfig, params: { ...(mcpConfig.params || {}), [key]: value } },
    })
  }

  // 只展示已连接的服务器
  const connectedServers = servers.filter(s => s.connectionStatus === 'connected')

  return (
    <div className="space-y-4">
      {/* 服务器选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          MCP 服务器 *
        </label>
        <CustomSelect
          size="sm"
          value={mcpConfig.serverId || ''}
          onChange={handleServerChange}
          options={[
            { value: '', label: '选择服务器' },
            ...connectedServers.map(s => ({
              value: s.id,
              label: `${s.name} (${s.toolsCount || 0} 工具)`,
            })),
          ]}
          placeholder={connectedServers.length === 0 ? '暂无已连接的 MCP 服务器' : '选择服务器'}
        />
        {connectedServers.length === 0 && (
          <p className="text-xs text-amber-500 mt-1">请先在 MCP 服务页面添加并连接服务器</p>
        )}
      </div>

      {/* 工具选择 */}
      {mcpConfig.serverId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            工具 *
          </label>
          <CustomSelect
            size="sm"
            value={mcpConfig.toolName || ''}
            onChange={handleToolChange}
            options={[
              { value: '', label: '选择工具' },
              ...selectedServerTools.map((t: any) => ({
                value: t.name,
                label: t.name,
              })),
            ]}
            placeholder="选择工具"
          />
        </div>
      )}

      {/* 动态参数表单 */}
      {mcpConfig.toolName && selectedToolSchema && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-purple-500 rounded-full" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">参数配置</h4>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-3">
            {renderParamFields(
              mcpConfig.params || {},
              selectedToolSchema,
              updateParam,
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            使用 {'{{input}}'} 引用工作流上游传入的输入内容
          </p>
        </div>
      )}

      {/* 工具描述 */}
      {mcpConfig.toolName && selectedToolSchema?.description && (
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {selectedToolSchema.description}
        </div>
      )}
    </div>
  );
};

export default McpConfig;
