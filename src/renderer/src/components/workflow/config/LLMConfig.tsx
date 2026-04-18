import React, { useState } from 'react';
import { VariableConfig } from '@renderer/types';
import VariableConfigModal from '../VariableConfigModal';
import CustomTextarea from '../../CustomTextarea';
import CustomButton from '../../CustomButton';

interface LLMConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const LLMConfig: React.FC<LLMConfigProps> = ({ config, onConfigChange }) => {
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<VariableConfig | null>(null);
  const [variables, setVariables] = useState<VariableConfig[]>(config.variables || []);

  // 当外部config变化时同步更新本地状态
  React.useEffect(() => {
    setVariables(config.variables || []);
  }, [config.variables]);

  const handleAddVariable = () => {
    setEditingVariable(null);
    setShowVariableModal(true);
  };

  const handleEditVariable = (variable: VariableConfig) => {
    setEditingVariable(variable);
    setShowVariableModal(true);
  };

  const handleDeleteVariable = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index);
    setVariables(newVariables);
    onConfigChange({ ...config, variables: newVariables });
  };

  const handleSaveVariable = (variable: VariableConfig) => {
    let newVariables: VariableConfig[];

    if (editingVariable) {
      // 编辑现有变量 - 通过索引更新
      const editIndex = variables.findIndex(v => v.name === editingVariable.name);
      newVariables = [...variables];
      if (editIndex !== -1) {
        newVariables[editIndex] = variable;
      }
    } else {
      // 添加新变量
      newVariables = [...variables, variable];
    }

    setVariables(newVariables);
    onConfigChange({ ...config, variables: newVariables });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          提示词模板 *
        </label>
        <CustomTextarea
          value={config.prompt || ''}
          onChange={(e) => onConfigChange({ ...config, prompt: e.target.value })}
          rows={4}
          placeholder="输入提示词模板，可以使用 {{variableName}} 格式的变量"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            变量配置
          </label>
          <CustomButton
            onClick={handleAddVariable}
            variant="primary"
            size="sm"
          >
            + 添加变量
          </CustomButton>
        </div>

        {variables.length === 0 ? (
          <div className="text-gray-500 text-xs bg-gray-50 dark:bg-gray-700 p-3 rounded">
            暂无变量，点击&rdquo;添加变量&rdquo;按钮来配置变量
          </div>
        ) : (
          <div className="space-y-3">
            {variables.map((variable, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      {/* 第一行：显示名称和变量信息 */}
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {variable.displayName}
                        </h4>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                            {variable.name}
                          </span>
                          <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {variable.type}
                          </span>
                        </div>
                      </div>

                      {/* 第二行：必填和默认值（并排显示） */}
                      {(variable.required || variable.defaultValue) && (
                        <div className="flex items-center gap-x-3 mt-1">
                          {variable.required && (
                            <span className="text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 flex-shrink-0">
                              必填
                            </span>
                          )}
                          {variable.defaultValue && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                              默认值: <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-xs ml-1">
                                {String(variable.defaultValue)}
                              </code>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {variable.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">
                        {variable.description}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => handleEditVariable(variable)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      style={{ transform: "translate(0.5rem,-0.5rem)" }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteVariable(index)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      style={{ transform: "translate(0.5rem,-0.5rem)" }}
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
        <p className="font-medium mb-1">提示词模板说明：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>使用 {'{'}&#123;variableName&#125;{'}'} 格式插入变量</li>
          <li>用户输入会自动添加到提示词末尾</li>
          <li>变量会在执行时动态替换</li>
        </ul>
      </div>

      <VariableConfigModal
        isOpen={showVariableModal}
        onClose={() => {
          setShowVariableModal(false);
          setEditingVariable(null);
        }}
        onSave={handleSaveVariable}
        initialVariable={editingVariable || undefined}
        existingVariables={variables}
      />
    </div>
  );
};

export default LLMConfig;