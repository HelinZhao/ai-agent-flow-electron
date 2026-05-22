import React, { useCallback } from 'react';
import { formClasses } from './form-colors';

interface CustomInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helper?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  /** 是否显示清除按钮（受控：需配合 value/onChange 使用） */
  clearable?: boolean;
  /** 清除按钮常显，不 hover 也可见 */
  clearablePersist?: boolean;
  onClear?: () => void;
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  helper,
  size = 'md',
  fullWidth = true,
  className = '',
  leftIcon,
  clearable,
  clearablePersist,
  onClear,
  value,
  onChange,
  ...props
}) => {
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs min-h-[24px] rounded',
    sm: 'px-3 py-1.5 text-sm min-h-[32px] rounded',
    md: 'px-4 py-2.5 text-base min-h-[44px] rounded-md',
    lg: 'px-5 py-3 text-lg min-h-[52px] rounded-xl'
  };

  const showClear = clearable && (clearablePersist || (value !== undefined && value !== null && String(value).length > 0));

  const baseClasses = `
    ${formClasses.input.base}
    ${formClasses.input.background} backdrop-blur-sm
    ${formClasses.input.text}
    ${formClasses.input.placeholder}
    ${formClasses.input.disabledOpacity}
    ${sizeClasses[size]}
    ${error ? `${formClasses.input.error} ${formClasses.input.errorFocus}` : `${formClasses.input.normal} ${formClasses.input.focus}`}
    ${fullWidth ? 'w-full' : ''}
    ${leftIcon ? 'pl-9' : ''}
    ${clearable ? 'pr-8' : ''}
    ${className}
  `.trim();

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange) {
      // 模拟空值变化
      const syntheticEvent = {
        target: { value: '' },
        currentTarget: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  }, [onClear, onChange]);

  return (
    <div className="space-y-1" hidden={props.hidden}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative group">
        {leftIcon && (
          <div className="absolute z-10 inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-gray-400 dark:text-gray-500">
            {leftIcon}
          </div>
        )}
        <input
          className={baseClasses}
          value={value}
          onChange={onChange}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute z-10 inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${clearablePersist ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {(error || helper) && (
        <p className={`text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-500'}`}>
          {error || helper}
        </p>
      )}
    </div>
  );
};

export default CustomInput;
