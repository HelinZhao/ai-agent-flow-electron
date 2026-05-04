import React, { useRef } from 'react';
import CustomButton, { CustomButtonProps } from './CustomButton';

interface CustomFileUploadProps {
  accept?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  multiple?: boolean;
  size?: CustomButtonProps['size'];
  variant?: CustomButtonProps['variant'];
}

const CustomFileUpload: React.FC<CustomFileUploadProps> = ({
  accept,
  onChange,
  className = '',
  children = '选择文件',
  disabled = false,
  multiple = false,
  size,
  variant = 'secondary'
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
        variant={variant}
        onClick={handleClick}
        disabled={disabled}
        className="w-full"
        size={size}
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
        multiple={multiple}
      />
    </div>
  );
};

export default CustomFileUpload;