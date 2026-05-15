import React from 'react'

interface CustomSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const sizeClasses = {
  sm: { track: 'w-7 h-4', knob: 'w-3 h-3', on: 'translate-x-3', off: 'translate-x-0.5' },
  md: { track: 'w-11 h-6', knob: 'w-5 h-5', on: 'translate-x-5', off: 'translate-x-0' }
}

const CustomSwitch: React.FC<CustomSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = ''
}) => {
  const s = sizeClasses[size]

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative ${s.track} rounded-full transition-colors flex-shrink-0 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
      } ${className}`.trim()}
    >
      <span
        className={`absolute top-0.5 left-0.5 ${s.knob} rounded-full bg-white shadow transition-transform ${
          checked ? s.on : s.off
        }`}
      />
    </button>
  )
}

export default CustomSwitch
