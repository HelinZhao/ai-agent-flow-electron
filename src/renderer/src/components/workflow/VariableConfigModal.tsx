import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VariableConfig } from '@renderer/types';
import CustomSelect from '../ui/CustomSelect';
import CustomInput from '../ui/CustomInput';
import CustomButton from '../ui/CustomButton';
import TemplateEditor from '../ui/TemplateEditor';
import CustomTextarea from '../ui/CustomTextarea';

interface VariableConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (variable: VariableConfig) => void;
  initialVariable?: VariableConfig;
  existingVariables?: VariableConfig[];
  defaultLabel?: string;
}

const VariableConfigModal: React.FC<VariableConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialVariable,
  existingVariables,
  defaultLabel = '默认值'
}) => {
  const [formData, setFormData] = useState<VariableConfig>(() => ({
    name: initialVariable?.name || '',
    displayName: initialVariable?.displayName || '',
    type: initialVariable?.type || 'string',
    defaultValue: initialVariable?.defaultValue || '',
    required: initialVariable?.required || false,
    description: initialVariable?.description || ''
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 当initialVariable变化时更新表单数据
  useEffect(() => {
    if (initialVariable) {
      setFormData({
        name: initialVariable.name || '',
        displayName: initialVariable.displayName || '',
        type: initialVariable.type || 'string',
        defaultValue: initialVariable.defaultValue || '',
        required: initialVariable.required || false,
        description: initialVariable.description || ''
      });
    } else {
      // 新建模式，重置表单
      setFormData({
        name: '',
        displayName: '',
        type: 'string',
        defaultValue: '',
        required: false,
        description: ''
      });
    }
  }, [initialVariable]);

  // 验证变量名是否符合代码变量名规范
  const validateVariableName = (name: string): boolean => {
    const regex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return regex.test(name);
  };

  const handleInputChange = (field: keyof VariableConfig, value: any) => {
    setFormData({ ...formData, [field]: value });
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    // 验证变量名
    if (!formData.name.trim()) {
      newErrors.name = '变量名称不能为空';
    } else if (!validateVariableName(formData.name)) {
      newErrors.name = '变量名称不符合规范（只能包含字母、数字、下划线和美元符号，且不能以数字开头）';
    }

    // 验证显示名称
    if (!formData.displayName.trim()) {
      newErrors.displayName = '显示名称不能为空';
    }

    // 检查变量名是否重复
    if (existingVariables) {
      const isDuplicate = existingVariables.some((variable: VariableConfig) =>
        variable.name === formData.name &&
        (!initialVariable || variable.name !== initialVariable.name)
      );

      if (isDuplicate) {
        newErrors.name = '变量名称已存在，请使用其他名称';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSave(formData);
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      name: initialVariable?.name || '',
      displayName: initialVariable?.displayName || '',
      type: initialVariable?.type || 'string',
      defaultValue: initialVariable?.defaultValue || '',
      required: initialVariable?.required || false,
      description: initialVariable?.description || ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-96 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {initialVariable ? '编辑变量' : '添加变量'}
          </h3>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              变量名称 *
            </label>
            <CustomInput
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="variableName"
              error={errors.name}
              size="sm"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            <p className="text-xs text-gray-500 mt-1">
              只能包含字母、数字、下划线和美元符号，且不能以数字开头
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              显示名称 *
            </label>
            <CustomInput
              type="text"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              placeholder="变量显示名称"
              error={errors.displayName}
              size="sm"
            />
            {errors.displayName && <p className="text-red-500 text-xs mt-1">{errors.displayName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              变量类型
            </label>
            <CustomSelect
              value={formData.type}
              onChange={(value) => handleInputChange('type', value)}
              options={[
                { value: 'string', label: '字符串' },
                { value: 'number', label: '数字' },
                { value: 'boolean', label: '布尔值' },
                { value: 'array', label: '数组' }
              ]}
              placeholder="选择变量类型"
              size="sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {defaultLabel}
            </label>
            {formData.type === 'number' ? (
              <CustomInput
                type="number"
                value={String(formData.defaultValue ?? '')}
                onChange={(e) => handleInputChange('defaultValue', e.target.value)}
                placeholder={defaultLabel}
                size="sm"
              />
            ) : (
              <TemplateEditor
                value={formData.defaultValue ?? ''}
                onChange={(v) => handleInputChange('defaultValue', v)}
                placeholder={defaultLabel}
                minHeight="60px"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              描述
            </label>
            <CustomTextarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
              placeholder="变量描述"
              size="sm"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={formData.required || false}
              onChange={(e) => handleInputChange('required', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="required" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              必填项
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30">
          <CustomButton
            onClick={handleClose}
            variant="secondary"
            size="sm"
          >
            取消
          </CustomButton>
          <CustomButton
            onClick={handleSubmit}
            variant="primary"
            size="sm"
          >
            保存
          </CustomButton>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VariableConfigModal;