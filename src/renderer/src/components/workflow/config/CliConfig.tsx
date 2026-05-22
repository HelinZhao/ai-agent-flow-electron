import React from 'react';
import CustomSelect from '../../ui/CustomSelect';
import CustomInput from '../../ui/CustomInput';
import TemplateEditor from '../../ui/TemplateEditor';
import { CLI_DEFAULTS } from '@renderer/config';

interface TemplateVariable {
  name: string
  displayName: string
  required?: boolean
}

interface CliTemplate {
  id: string
  label: string
  variables: TemplateVariable[]
}

const CLI_PRESET_TEMPLATES: CliTemplate[] = [
  { id: 'npm_install', label: '安装npm包', variables: [{ name: 'packageName', displayName: '包名', required: true }] },
  { id: 'pip_install', label: '安装pip包', variables: [{ name: 'packageName', displayName: '包名', required: true }] },
  { id: 'read_file', label: '读取文件', variables: [{ name: 'filePath', displayName: '文件路径', required: true }] },
  { id: 'write_file', label: '写入文件', variables: [{ name: 'filePath', displayName: '文件路径', required: true }, { name: 'content', displayName: '内容', required: true }] },
  { id: 'list_dir', label: '列出目录', variables: [{ name: 'dirPath', displayName: '目录路径', required: true }] },
  { id: 'run_node', label: '运行Node脚本', variables: [{ name: 'scriptPath', displayName: '脚本路径', required: true }] },
  { id: 'run_python', label: '运行Python脚本', variables: [{ name: 'scriptPath', displayName: '脚本路径', required: true }] },
  { id: 'custom', label: '自定义命令', variables: [] },
]

interface CliConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const CliConfig: React.FC<CliConfigProps> = ({ config, onConfigChange }) => {
  const cliConfig = config.cliConfig || {
    command: '',
    templateId: 'custom',
    templateVariables: {},
    workingDirectory: '',
    timeout: CLI_DEFAULTS.timeout,
    outputMode: CLI_DEFAULTS.outputMode,
    llmProcessPrompt: '',
  }

  const updateCliConfig = (field: string, value: any) => {
    onConfigChange({
      ...config,
      cliConfig: { ...cliConfig, [field]: value }
    })
  }

  const selectedTemplate = CLI_PRESET_TEMPLATES.find(t => t.id === cliConfig.templateId) || CLI_PRESET_TEMPLATES[CLI_PRESET_TEMPLATES.length - 1]
  const isCustom = cliConfig.templateId === 'custom'

  const handleTemplateChange = (templateId: string) => {
    const template = CLI_PRESET_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    const newVariables: Record<string, string> = {}
    template.variables.forEach(v => {
      newVariables[v.name] = cliConfig.templateVariables?.[v.name] || ''
    })

    onConfigChange({
      ...config,
      cliConfig: {
        ...cliConfig,
        templateId,
        templateVariables: newVariables,
        command: templateId === 'custom' ? cliConfig.command : '',
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          命令模板
        </label>
        <CustomSelect
          value={cliConfig.templateId || 'custom'}
          onChange={handleTemplateChange}
          options={CLI_PRESET_TEMPLATES.map(t => ({ value: t.id, label: t.label }))}
          placeholder="选择命令模板"
          size="sm"
        />
      </div>

      {!isCustom && selectedTemplate.variables.length > 0 && (
        <div className="space-y-3">
          {selectedTemplate.variables.map(variable => (
            <div key={variable.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {variable.displayName} {variable.required && '*'}
              </label>
              <CustomInput
                value={cliConfig.templateVariables?.[variable.name] || ''}
                onChange={(e) => {
                  const newVars = { ...cliConfig.templateVariables, [variable.name]: e.target.value }
                  updateCliConfig('templateVariables', newVars)
                }}
                placeholder={`输入${variable.displayName}`}
                size="sm"
              />
            </div>
          ))}
        </div>
      )}

      {isCustom && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            命令
          </label>
          <TemplateEditor
            value={cliConfig.command || ''}
            onChange={(v) => updateCliConfig('command', v)}
            placeholder="输入要执行的shell命令"
            minHeight="60px"
            size="sm"
          />
        </div>
      )}

      {!isCustom && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          该模板将由内置函数执行，无需输入命令
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          工作目录 (可选)
        </label>
        <TemplateEditor
          value={cliConfig.workingDirectory || ''}
          onChange={(v) => updateCliConfig('workingDirectory', v)}
          placeholder="留空使用默认目录"
          minHeight="36px"
          size="sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          超时时间 (秒)
        </label>
        <CustomInput
          type="number"
          value={cliConfig.timeout || CLI_DEFAULTS.timeout}
          onChange={(e) => updateCliConfig('timeout', parseInt(e.target.value) || CLI_DEFAULTS.timeout)}
          placeholder="30"
          size="sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          输出模式
        </label>
        <CustomSelect
          value={cliConfig.outputMode || CLI_DEFAULTS.outputMode}
          onChange={(value) => updateCliConfig('outputMode', value)}
          options={[
            { value: 'raw', label: '原始输出' },
            { value: 'llm_process', label: 'LLM处理' }
          ]}
          placeholder="选择输出模式"
          size="sm"
        />
      </div>

      {cliConfig.outputMode === 'llm_process' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            LLM处理提示词
          </label>
          <TemplateEditor
            value={cliConfig.llmProcessPrompt || ''}
            onChange={(v) => updateCliConfig('llmProcessPrompt', v)}
            placeholder="请分析以下命令输出并提取关键信息:\n\n{{output}}"
            minHeight="60px"
            size="sm"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            使用 {'{{output}'} 代替命令输出内容
          </p>
        </div>
      )}
    </div>
  )
}

export default CliConfig