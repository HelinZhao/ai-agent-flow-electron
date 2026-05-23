import React, { useState, useCallback } from 'react';
import TemplateEditor from '../../ui/TemplateEditor';
import TemplatePickerModal from '../TemplatePickerModal';

interface CodeConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const VARIABLE_HELPERS = [
  { name: '$input', description: '上游节点输入' },
  { name: '$params', description: 'Start 节点参数' },
  { name: '$nodes', description: '所有已完成节点的输出 {{$nodes["nodeId"].output}}' },
]

const CodeConfig: React.FC<CodeConfigProps> = ({ config, onConfigChange }) => {
  const [showPicker, setShowPicker] = useState(false)
  const handleCodeChange = useCallback((code: string) => {
    onConfigChange({ ...config, code })
  }, [config, onConfigChange])

  const insertHelper = useCallback((name: string) => {
    const currentCode = config.code || ''
    const newCode = currentCode + (currentCode ? '\n' : '') + `// 使用 ${name} 变量`
    onConfigChange({ ...config, code: newCode })
  }, [config, onConfigChange])

  return (
    <div className="space-y-4">
      {/* 语言选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          语言
        </label>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">JavaScript</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">(仅支持 JS，需 return 返回值)</span>
        </div>
      </div>

      {/* 可用变量参考 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          可用变量
        </label>
        <div className="space-y-1">
          {VARIABLE_HELPERS.map(v => (
            <div
              key={v.name}
              onClick={() => insertHelper(v.name)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
            >
              <code className="text-sm font-mono font-semibold text-purple-600 dark:text-purple-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {v.name}
              </code>
              <span className="text-xs text-gray-500 dark:text-gray-400">{v.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 代码编辑器 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          代码 *
        </label>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2">
          ⚠️ 代码运行在 Node.js 环境。需使用 <code className="font-mono text-amber-700 dark:text-amber-300">return</code> 返回输出值。
          支持 <code className="font-mono text-amber-700 dark:text-amber-300">async/await</code>。可访问 JS 标准内置对象（Array、Object、Math 等）。
        </div>
        <TemplateEditor
          value={config.code || ''}
          onChange={handleCodeChange}
          placeholder={`// 示例: 将输入转为大写\nreturn $input.toUpperCase()\n\n// 示例: 处理 JSON\nconst data = JSON.parse($input)\nreturn { name: data.name, count: data.items?.length }`}
          rows={8}
          minHeight="200px"
          size="sm"
        />
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded space-y-1">
        <p className="font-medium text-gray-700 dark:text-gray-300">代码节点说明：</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>使用 <code className="font-mono text-purple-600">$input</code> 获取上游输入</li>
          <li>使用 <code className="font-mono text-purple-600">$params</code> 获取 Start 节点参数</li>
          <li>使用 <code className="font-mono text-purple-600">$nodes["nodeId"].output</code> 引用任意节点的输出</li>
          <li>代码必须用 <code className="font-mono">return</code> 返回输出值</li>
          <li>支持 <code className="font-mono">async/await</code> 异步操作</li>
        </ul>
      </div>

      <div className="pt-2">
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          + 从模板导入
        </button>
      </div>

      <TemplatePickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        type="code"
        onSelect={(t) => {
          const content = JSON.parse(t.content)
          onConfigChange({
            ...config,
            code: content.code || '',
            language: content.language || 'javascript',
          })
        }}
      />
    </div>
  );
};

export default CodeConfig;
