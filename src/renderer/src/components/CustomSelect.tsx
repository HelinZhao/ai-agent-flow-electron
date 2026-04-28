import React, { useState, useRef, useEffect } from 'react';
import { formClasses } from '@renderer/styles/form-colors';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '请选择...',
  disabled = false,
  className = '',
  error = false,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[32px]',
    md: 'px-4 py-2.5 text-base min-h-[44px]',
    lg: 'px-5 py-3 text-lg min-h-[52px]'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setIsFocused(!isOpen);
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen) {
          // 如果选中了选项，选择它
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement.dataset.value) {
            handleOptionClick(activeElement.dataset.value);
          }
        } else {
          setIsOpen(true);
          setIsFocused(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setIsFocused(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setIsFocused(true);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setIsOpen(false);
          setIsFocused(false);
        }
        break;
    }
  };

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      <div
        className={`
          relative flex items-center justify-between w-full
          ${formClasses.select.base}
          ${formClasses.select.background}
          ${!disabled ? formClasses.select.normal : formClasses.select.disabled}
          ${disabled ? formClasses.select.disabledOpacity : ''}
          ${error ? formClasses.select.error : ''}
          ${error ? formClasses.select.errorFocus : formClasses.select.focus}
          ${sizeClasses[size]}
          ${isFocused && !error ? 'ring-2 ring-blue-500/50 border-blue-500/50' : ''}
          ${isOpen && !error ? 'ring-2 ring-blue-500/50 border-blue-500/50' : ''}
          cursor-pointer
        `}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <span className={`flex-1 text-left ${
          selectedOption
            ? formClasses.select.text
            : formClasses.select.placeholder
        }`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className={`${iconSizeClasses[size]} text-gray-400 dark:text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
 
      {/* 下拉选项列表 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          <div className="py-2" role="listbox">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                暂无选项
              </div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  data-value={option.value}
                  className={`
                    px-4 py-3 cursor-pointer transition-colors duration-150
                    flex items-center justify-between group
                    ${option.value === value
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50/50 dark:hover:bg-gray-700/50'
                    }
                    ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={() => !option.disabled && handleOptionClick(option.value)}
                  onMouseEnter={(e) => {
                    if (!option.disabled) {
                      e.currentTarget.classList.add('bg-gray-50/50', 'dark:bg-gray-700/50');
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!option.disabled && option.value !== value) {
                      e.currentTarget.classList.remove('bg-gray-50/50', 'dark:bg-gray-700/50');
                    }
                  }}
                  role="option"
                  aria-selected={option.value === value}
                  tabIndex={-1}
                >
                  <span className={`text-sm ${
                    option.value === value
                      ? 'font-medium text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {option.label}
                  </span>
                  {option.value === value && (
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 焦点状态指示器 */}
      {isFocused && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-blue-500/20 pointer-events-none"></div>
      )}
    </div>
  );
};

export default CustomSelect;