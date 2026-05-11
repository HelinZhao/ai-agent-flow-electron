import React from 'react';
import { formClasses } from './form-colors';

interface CustomInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helper?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  helper,
  size = 'md',
  fullWidth = true,
  className = '',
  leftIcon,
  ...props
}) => {
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs min-h-[24px] rounded',
    sm: 'px-3 py-1.5 text-sm min-h-[32px] rounded-md',
    md: 'px-4 py-2.5 text-base min-h-[44px] rounded-md',
    lg: 'px-5 py-3 text-lg min-h-[52px] rounded-xl'
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
    ${leftIcon ? 'pl-9' : ''}
    ${className}
  `.trim();

  return (
    <div className="space-y-1" hidden={props.hidden}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute z-10 inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-gray-400 dark:text-gray-500">
            {leftIcon}
          </div>
        )}
        <input
          className={baseClasses}
          {...props}
        />
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