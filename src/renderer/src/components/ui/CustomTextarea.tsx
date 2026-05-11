import React from 'react';
import { formClasses } from './form-colors';

interface CustomTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  helper?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const CustomTextarea: React.FC<CustomTextareaProps> = ({
  label,
  error,
  helper,
  size = 'md',
  fullWidth = true,
  className = '',
  rows = 3,
  ...props
}) => {
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs min-h-[40px] rounded',
    sm: 'px-3 py-1.5 text-sm min-h-[60px] rounded',
    md: 'px-4 py-2.5 text-base min-h-[80px] rounded-md',
    lg: 'px-5 py-3 text-lg min-h-[100px] rounded-xl'
  };

  const baseClasses = `
    ${formClasses.input.base}
    ${formClasses.input.background}
    ${formClasses.input.text}
    ${formClasses.input.placeholder}
    ${!props.disabled ? formClasses.input.normal : formClasses.input.disabled}
    ${props.disabled ? formClasses.input.disabledOpacity : ''}
    ${error ? formClasses.input.error : ''}
    ${error ? formClasses.input.errorFocus : formClasses.input.focus}
    resize-vertical
    ${sizeClasses[size]}
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
      <textarea
        className={baseClasses}
        rows={rows}
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

export default CustomTextarea;