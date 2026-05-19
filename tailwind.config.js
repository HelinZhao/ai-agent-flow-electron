// ---- 动态生成 safelist（字符串数组，比正则更可靠） ----

const NODE_COLORS = ['green', 'blue', 'yellow', 'indigo', 'purple', 'red', 'orange', 'gray', 'teal', "cyan"]

function buildSafelist() {
  const list = []

  const push = (prefix, shades, important) => {
    for (const c of NODE_COLORS) {
      for (const s of shades) {
        const cls = `${prefix}-${c}-${s}`
        list.push(cls)
        if (important) list.push(`!${cls}`)
      }
    }
  }

  // 主体背景 & Handle port（！覆盖 React Flow 默认样式）
  push('bg', [50, 100, 200, 400, 500, 600, 700], true)
  // 文字
  push('text', [200, 300, 400, 500, 600, 700, 800], false)
  // 渐变起止
  push('from', [400, 500, 600], false)
  push('to', [400, 500, 600, 700], false)
  // 边框（！覆盖）
  push('border', [300, 400, 500, 600, 700], true)
  // 选中环
  push('ring', [300, 400, 500], false)
  // hover 发光层
  push('via', [400], false)

  return list
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/src/**/*.{js,jsx,ts,tsx,mdx}', './index.html'],
  safelist: buildSafelist(),
  theme: {
    extend: {
      screens: {
        '3xl': '1800px',
        '4xl': '2100px',
        '5xl': '2560px'
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e'
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a'
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75'
        }
      },
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        full: '9999px'
      },
      boxShadow: {
        // 四周均匀阴影（灯光从正上方照下）
        'glow-sm': '0 0 12px 0px rgba(0, 0, 0, 0.15), 0 0 4px 0px rgba(0, 0, 0, 0.08)',
        'glow-md': '0 0 22px 0px rgba(0, 0, 0, 0.22), 0 0 8px 0px rgba(0, 0, 0, 0.12)',
        'glow-sm-w': '0 0 12px 0px rgba(255, 255, 255, 0.15), 0 0 4px 0px rgba(255, 255, 255, 0.08)',
        'glow-md-w': '0 0 22px 0px rgba(255, 255, 255, 0.22), 0 0 8px 0px rgba(255, 255, 255, 0.15)',
        'glow-lg': '0 0 32px 0px rgba(0, 0, 0, 0.32), 0 0 12px 0px rgba(0, 0, 0, 0.18)',
        'glow-lg-w': '0 0 32px 0px rgba(255, 255, 255, 0.30), 0 0 12px 0px rgba(255, 255, 255, 0.18)',
        soft: '0 2px 20px -5px rgba(0, 0, 0, 0.1), 0 1px 10px -5px rgba(0, 0, 0, 0.04)',
        glow: '0 0 20px -5px rgba(59, 130, 246, 0.3)',
        card: '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 2px 10px -6px rgba(0, 0, 0, 0.02)'
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)',
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-accent': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px'
      },
      transitionDuration: {
        250: '250ms',
        350: '350ms',
        400: '400ms'
      }
    }
  },
  plugins: []
}
