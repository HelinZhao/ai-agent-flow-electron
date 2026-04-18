import React, { useRef } from 'react';

interface CustomFileUploadProps {
  accept?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

const CustomFileUpload: React.FC<CustomFileUploadProps> = ({
  accept,
  onChange,
  className = '',
  children = '选择文件',
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="
          w-full px-4 py-3 border border-gray-200/50 dark:border-gray-600/50
          rounded-xl shadow-sm transition-all duration-200
          bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm
          text-gray-700 dark:text-gray-300
          hover:bg-gray-50/50 dark:hover:bg-gray-600/50
          focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center space-x-2
        "
      >
        <span>📁</span>
        <span>{children}</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};

export default CustomFileUpload;