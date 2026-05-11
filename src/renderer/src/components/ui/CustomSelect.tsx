import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { formClasses } from './form-colors';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
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
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'borderless';
  dropdownWidth?: 'equal' | 'auto' | number;
}

const variantClasses = {
  default: '',
  borderless: 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 border-none text-blue-800 dark:text-blue-200'
};

const borderlessFocusClasses = 'ring-2 ring-blue-500/30';

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '请选择...',
  disabled = false,
  className = '',
  error = false,
  size = 'md',
  variant = 'default',
  dropdownWidth = 'equal'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find(option => option.value === value);

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs min-h-[24px] rounded',
    sm: 'px-3 py-1.5 text-sm min-h-[32px] rounded',
    md: 'px-4 py-2.5 text-base min-h-[44px] rounded-md',
    lg: 'px-5 py-3 text-lg min-h-[52px] rounded-xl'
  };

  const iconSizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const dropdownTextSize = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const isBorderless = variant === 'borderless';

  const updateDropdownPos = useCallback(() => {
    if (selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPos();
    }
  }, [isOpen, updateDropdownPos]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        selectRef.current && !selectRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    const handleScrollOrResize = () => updateDropdownPos();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateDropdownPos]);

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

  const triggerClasses = isBorderless
    ? `${variantClasses.borderless} ${sizeClasses[size]} rounded-md ${isOpen ? borderlessFocusClasses : ''}`
    : `
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
    `;

  const dropdownStyle: React.CSSProperties = {
    top: dropdownPos.top,
    left: dropdownPos.left,
    zIndex: 9999,
    ...(dropdownWidth === 'equal' ? { width: dropdownPos.width } : {}),
    ...(dropdownWidth === 'auto' ? { minWidth: dropdownPos.width } : {}),
    ...(typeof dropdownWidth === 'number' ? { width: dropdownWidth } : {})
  };

  const dropdown = isOpen && (
    <div
      ref={dropdownRef}
      className="fixed bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl max-h-60 overflow-y-auto"
      style={dropdownStyle}
    >
      <div role="listbox">
        {options.length === 0 ? (
          <div className={`px-4 py-3 ${dropdownTextSize[size]} text-gray-500 dark:text-gray-400 text-center`}>
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
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
            >
              <span className={`${dropdownTextSize[size]} ${
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
  );

  return (
    <>
        <div
          className={`${triggerClasses} cursor-pointer flex items-center justify-between w-full ${className}`}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-disabled={disabled}
          ref={selectRef}
        >
          <span className={`flex-1 text-left ${
            isBorderless
              ? selectedOption ? '' : 'text-blue-400 dark:text-blue-500'
              : selectedOption
                ? formClasses.select.text
                : formClasses.select.placeholder
          }`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <svg className={`${iconSizeClasses[size]} ${isBorderless ? 'text-blue-600 dark:text-blue-300' : 'text-gray-400 dark:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

      {createPortal(dropdown, document.body)}
    </>
  );
};

export default CustomSelect;