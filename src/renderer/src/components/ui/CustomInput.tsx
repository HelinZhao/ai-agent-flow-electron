import React from 'react';
import { formClasses } from './form-colors';

interface CustomInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helper?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  helper,
  size = 'md',
  fullWidth = true,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[32px]',
    md: 'px-4 py-2.5 text-base min-h-[44px]',
    lg: 'px-5 py-3 text-lg min-h-[52px]'
  };

  const baseClasses = `
    ${formClasses.input.base}
    ${formClasses.input.background} backdrop-blur-sm
    ${formClasses.input.text}
    ${formClasses.input.placeholder}
    ${formClasses.input.disabledOpacity}
    ${sizeClasses[size]}
    ${error ? `${formClasses.input.error} ${formClasses.input.errorFocus}` : `${formClasses.input.normal} ${formClasses.input.focus}`}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        className={baseClasses}
        {...props}
      />
      {(error || helper) && (
        <p className={`text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {error || helper}
        </p>
      )}
    </div>
  );
};

export default CustomInput;