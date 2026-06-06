import React from 'react'
import { SERVER_BASE_URL } from '@renderer/config'

/** 根据名称生成稳定的渐变色 */
const AVATAR_COLORS: { bg: string; muted: string }[] = [
  { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', muted: '#3b82f6' },
  { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', muted: '#8b5cf6' },
  { bg: 'linear-gradient(135deg, #10b981, #059669)', muted: '#10b981' },
  { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', muted: '#f59e0b' },
  { bg: 'linear-gradient(135deg, #f43f5e, #e11d48)', muted: '#f43f5e' },
  { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', muted: '#06b6d4' },
  { bg: 'linear-gradient(135deg, #f97316, #ea580c)', muted: '#f97316' },
  { bg: 'linear-gradient(135deg, #ec4899, #db2777)', muted: '#ec4899' },
]

function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const SIZE_MAP: Record<string, { size: string; icon: string; initial: string; round: string }> = {
  xs: { size: 'w-6 h-6', icon: 'text-xs', initial: 'text-xs', round: 'rounded-lg' },
  sm: { size: 'w-7 h-7', icon: 'text-sm', initial: 'text-sm', round: 'rounded-xl' },
  md: { size: 'w-9 h-9', icon: 'text-base', initial: 'text-base', round: 'rounded-lg' },
  lg: { size: 'w-14 h-14', icon: 'text-2xl', initial: 'text-xl', round: 'rounded-xl' },
  xl: { size: 'w-16 h-16', icon: 'text-3xl', initial: 'text-2xl', round: 'rounded-xxl' },
}

export interface AvatarProps {
  /** 头像 URL（相对路径 /api/avatars/xxx 或完整 URL / data: URL） */
  src?: string | null
  /** Agent 名称（用于生成默认首字母和颜色） */
  name: string
  /** 尺寸预设，默认 sm */
  size?: keyof typeof SIZE_MAP
  /** 形状：circle 圆形 / square 方角，默认方角 */
  shape?: 'circle' | 'square'
  /** 是否为系统 Agent（影响默认背景色和图标） */
  isSystem?: boolean
  /** 自定义兜底图标（emoji 或 SVG），默认显示首字母 */
  fallbackIcon?: React.ReactNode
  /** 是否高亮激活态（仅对 initial 模式生效） */
  active?: boolean
  /** 额外 class */
  className?: string
}

/**
 * 通用 Agent 头像组件
 * - 有 src 时显示图片（自动补全 SERVER_BASE_URL）
 * - 无 src 时显示彩色首字母或自定义图标
 */
export default function Avatar({
  src,
  name,
  size = 'sm',
  shape = 'square',
  isSystem,
  fallbackIcon,
  active,
  className = '',
}: AvatarProps) {
  const dim = SIZE_MAP[size]
  const color = getColor(name)
  const initial = name.charAt(0).toUpperCase()
  const roundClass = shape === 'circle' ? 'rounded-full' : 'rounded'

  // 补全服务端路径
  const imgSrc = src
    ? (src.startsWith('/api/') ? `${SERVER_BASE_URL}${src}` : src)
    : null

  const commonClass = `${dim.size} ${roundClass} flex items-center justify-center flex-shrink-0 overflow-hidden`

  if (imgSrc) {
    return (
      <span className={`${commonClass} ${className}`}>
        <img src={imgSrc} alt="" className="w-full h-full object-cover" />
      </span>
    )
  }

  // 无图片：兜底显示
  if (fallbackIcon) {
    return (
      <span
        className={`${commonClass} ${
          isSystem
            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
            : 'bg-gradient-to-br from-blue-500 to-purple-600'
        } ${className}`}
      >
        <span className={`text-white ${dim.icon}`}>{fallbackIcon}</span>
      </span>
    )
  }

  // 默认兜底：彩色首字母
  return (
    <span
      className={`${commonClass} font-bold transition-all ${className}`}
      style={{ background: active ? color.bg : `${color.muted}33` }}
    >
      <span className={`${active ? 'text-white' : 'text-gray-600 dark:text-gray-300'} ${dim.initial}`}>
        {initial}
      </span>
    </span>
  )
}
