import type { ReactNode } from 'react'

interface SectionHeaderProps {
  icon: ReactNode
  label: string
  /** Tailwind text color class, e.g. 'text-emerald-600 dark:text-emerald-400' */
  color?: string
}

const DEFAULT_COLOR = 'text-gray-500 dark:text-gray-400'

export default function SectionHeader({ icon, label, color }: SectionHeaderProps) {
  return (
    <h4
      className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${color || DEFAULT_COLOR}`}
    >
      <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">{icon}</span>
      {label}
    </h4>
  )
}
