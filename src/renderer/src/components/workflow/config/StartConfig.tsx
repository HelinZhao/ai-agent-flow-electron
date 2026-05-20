import React, { useState } from 'react';
import { VariableConfig } from '@renderer/types';
import VariableConfigModal from '../VariableConfigModal';
import CustomButton from '../../ui/CustomButton';

interface StartConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const StartConfig: React.FC<StartConfigProps> = ({ config, onConfigChange }) => {
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<VariableConfig | null>(null);
  const [params, setParams] = useState<VariableConfig[]>(config.params || []);

  React.useEffect(() => {
    setParams(config.params || []);
  }, [config.params]);

  const handleAdd = () => {
    setEditingVariable(null);
    setShowVariableModal(true);
  };

  const handleEdit = (variable: VariableConfig) => {
    setEditingVariable(variable);
    setShowVariableModal(true);
  };

  const handleDelete = (index: number) => {
    const next = params.filter((_, i) => i !== index);
    setParams(next);
    onConfigChange({ ...config, params: next });
  };

  const handleSave = (variable: VariableConfig) => {
    let next: VariableConfig[];
    if (editingVariable) {
      const idx = params.findIndex(v => v.name === editingVariable.name);
      next = [...params];
      if (idx !== -1) next[idx] = variable;
    } else {
      next = [...params, variable];
    }
    setParams(next);
    onConfigChange({ ...config, params: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            参数定义
          </label>
          <CustomButton onClick={handleAdd} variant="primary" size="xs">
            + 添加参数
          </CustomButton>
        </div>

        {params.length === 0 ? (
          <div className="text-gray-500 text-xs bg-gray-50 dark:bg-gray-700 p-3 rounded">
            暂无参数，运行工作流时将使用纯文本输入框
          </div>
        ) : (
          <div className="space-y-3">
            {params.map((param, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {param.displayName}
                        </h4>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                            {param.name}
                          </span>
                          <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {param.type}
                          </span>
                        </div>
                      </div>

                      {(param.required || param.defaultValue) && (
                        <div className="flex items-center gap-x-3 mt-1">
                          {param.required && (
                            <span className="text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-200 dark:border-red-800">
                              必填
                            </span>
                          )}
                          {param.defaultValue !== undefined && param.defaultValue !== '' && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              默认值: <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-xs ml-1">
                                {String(param.defaultValue)}
                              </code>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {param.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
                        {param.description}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(param)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 p-3 rounded">
        <p className="font-medium mb-1">参数说明：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>参数会在运行工作流时以表单形式展示</li>
          <li>下游节点可通过 {'{{paramName}}'} 引用参数值</li>
          <li>参数也支持 {'{{input}}'} 引用附加的文本输入</li>
        </ul>
      </div>

      <VariableConfigModal
        isOpen={showVariableModal}
        onClose={() => { setShowVariableModal(false); setEditingVariable(null); }}
        onSave={handleSave}
        initialVariable={editingVariable || undefined}
        existingVariables={params}
      />
    </div>
  );
};

export default StartConfig;
