import React from 'react'

interface IconProps {
  className?: string
}

const IconWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export const ChatIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="9" y1="9" x2="15" y2="9" />
    <line x1="9" y1="13" x2="13" y2="13" />
  </IconWrapper>
)

export const WorkflowIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="7" cy="13" r="2.5" />
    <circle cx="17" cy="13" r="2.5" />
    <circle cx="12" cy="19" r="2.5" />
    <polyline points="12,7.5 7,10.5" />
    <polyline points="12,7.5 17,10.5" />
    <polyline points="7,15.5 12,16.5" />
    <polyline points="17,15.5 12,16.5" />
  </IconWrapper>
)

export const AgentIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <rect x="5" y="8" width="14" height="11" rx="3" />
    <circle cx="9" cy="13" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none" />
    <line x1="9" y1="17" x2="15" y2="17" />
    <path d="M9 5v4" />
    <path d="M15 5v4" />
    <line x1="7" y1="5" x2="17" y2="5" />
  </IconWrapper>
)

export const SkillsIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M13 2L3 14h7l-2 9 11-12h-7l2-9z" />
  </IconWrapper>
)

export const KnowledgeIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
    <path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />
    <line x1="8" y1="9" x2="16" y2="9" />
    <line x1="8" y1="13" x2="13" y2="13" />
  </IconWrapper>
)

export const TriggersIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </IconWrapper>
)

export const McpIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M12 14v4" />
    <circle cx="12" cy="18" r="2" />
    <rect x="7" y="7" width="10" height="7" rx="1.5" />
    <path d="M10 7V3" />
    <path d="M14 7V3" />
  </IconWrapper>
)

export const MarketplaceIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </IconWrapper>
)

export const MonitorIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </IconWrapper>
)

export const SettingsIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </IconWrapper>
)

export const TeamIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </IconWrapper>
)

export const LogsIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </IconWrapper>
)

export const TicketIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="m9 12 2 2 4-4" />
  </IconWrapper>
)

export const FolderIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </IconWrapper>
)

// eslint-disable-next-line react-refresh/only-export-components
export const navIconMap = {
  chat: ChatIcon,
  workflow: WorkflowIcon,
  agent: AgentIcon,
  team: TeamIcon,
  project: FolderIcon,
  skills: SkillsIcon,
  knowledge: KnowledgeIcon,
  triggers: TriggersIcon,
  mcp: McpIcon,
  marketplace: MarketplaceIcon,
  monitor: MonitorIcon,
  settings: SettingsIcon,
  logs: LogsIcon,
} as const

export type NavIconName = keyof typeof navIconMap
