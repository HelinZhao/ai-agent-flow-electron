// 统一的表单元素边框颜色配置
export const formColors = {
  // 边框颜色
  border: {
    default: 'border-gray-200/50 dark:border-gray-600/50',
    hover: 'hover:border-gray-300/50 dark:hover:border-gray-500/50',
    focus: 'focus:border-blue-500/50',
    error: 'border-red-300 dark:border-red-600',
    errorFocus: 'focus:border-red-500/50',
    disabled: 'border-gray-300 dark:border-gray-600'
  },

  // 背景颜色
  background: {
    default: 'bg-white/70 dark:bg-gray-700/70',
    disabled: 'bg-gray-50 dark:bg-gray-800'
  },

  // 文字颜色
  text: {
    default: 'text-gray-900 dark:text-white',
    placeholder: 'placeholder-gray-400 dark:placeholder-gray-500',
    disabled: 'text-gray-500 dark:text-gray-400'
  },

  // 焦点环颜色
  ring: {
    focus: 'focus:ring-2 focus:ring-blue-500/50',
    error: 'focus:ring-2 focus:ring-red-500/50'
  },

  // 下拉菜单边框
  dropdown: {
    border: 'border-gray-200/50 dark:border-gray-700/50'
  }
};

// 预构建的常用类组合
export const formClasses = {
  input: {
    base: 'border rounded-xl transition-all duration-200 backdrop-blur-sm',
    normal: 'border-gray-200/50 dark:border-gray-600/50 hover:border-gray-300/50 dark:hover:border-gray-500/50 focus:border-blue-500/50',
    error: 'border-red-300 dark:border-red-600 focus:border-red-500/50',
    disabled: 'border-gray-300 dark:border-gray-600',
    background: 'bg-white/70 dark:bg-gray-700/70',
    text: 'text-gray-900 dark:text-white',
    placeholder: 'placeholder-gray-400 dark:placeholder-gray-500',
    focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
    errorFocus: 'focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50',
    disabledOpacity: 'disabled:opacity-60 disabled:cursor-not-allowed'
  },

  select: {
    base: 'border rounded-xl transition-all duration-200 backdrop-blur-sm',
    normal: 'border-gray-200/50 dark:border-gray-600/50 hover:border-gray-300/50 dark:hover:border-gray-500/50 focus:border-blue-500/50',
    error: 'border-red-300 dark:border-red-600 focus:border-red-500/50',
    disabled: 'border-gray-300 dark:border-gray-600',
    background: 'bg-white/70 dark:bg-gray-700/70',
    text: 'text-gray-900 dark:text-white',
    placeholder: 'text-gray-400 dark:text-gray-500',
    focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
    errorFocus: 'focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50',
    disabledOpacity: 'disabled:opacity-60 disabled:cursor-not-allowed'
  }
};