import React, { useRef } from 'react';
import CustomButton from './CustomButton';

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
      <CustomButton
        type="button"
        variant="secondary"
        onClick={handleClick}
        disabled={disabled}
        className="w-full"
      >
        <span>📁</span>
        <span>{children}</span>
      </CustomButton>
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