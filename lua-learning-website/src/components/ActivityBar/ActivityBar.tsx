import { useCallback } from 'react'
import styles from './ActivityBar.module.css'
import type { ActivityBarProps } from './types'
import type { ActivityPanelType } from '../IDEContext/types'

// SVG icons for the activity bar
const ExplorerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.5 0h-9L7 1.5V6H2.5L1 7.5v15.07L2.5 24h12.07L16 22.57V18h4.5l1.5-1.5V3.5L17.5 0zm-7.04 22H3V8h7v6h2v-6h1v14zM14 13h-2V8h2v5zm7 3h-5V9.5L14.5 8H7V2h9.5L19 4.5V16z" />
  </svg>
)

const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.25 0a8.25 8.25 0 0 0-6.18 13.72L1 22.88l1.12 1.12 8.05-9.12A8.251 8.251 0 1 0 15.25.01V0zm0 15a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5z" />
  </svg>
)

const ExtensionsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zm1.5 0V9h7.5V1.5H15zM0 15l1.5-1.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm1.5 0v7.5H9V15H1.5zM13.5 15l1.5-1.5h7.5L24 15v7.5L22.5 24H15l-1.5-1.5V15zm1.5 0v7.5h7.5V15H15zM0 1.5L1.5 0H9l1.5 1.5V9L9 10.5H1.5L0 9V1.5zm1.5 0V9H9V1.5H1.5z" />
  </svg>
)

interface ActivityItemConfig {
  id: ActivityPanelType
  icon: React.ReactNode
  label: string
}

const activityItems: ActivityItemConfig[] = [
  { id: 'explorer', icon: <ExplorerIcon />, label: 'Explorer' },
  { id: 'search', icon: <SearchIcon />, label: 'Search' },
  { id: 'extensions', icon: <ExtensionsIcon />, label: 'Extensions' },
]

/**
 * VS Code-style activity bar with icon buttons
 */
export function ActivityBar({
  activeItem,
  onItemClick,
  className,
}: ActivityBarProps) {
  const combinedClassName = className
    ? `${styles.activityBar} ${className}`
    : styles.activityBar

  const handleKeyDown = useCallback(
    (item: ActivityPanelType) => (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onItemClick(item)
      }
    },
    [onItemClick]
  )

  return (
    <nav
      role="navigation"
      aria-label="Activity Bar"
      className={combinedClassName}
    >
      <div className={styles.items}>
        {activityItems.map(item => {
          const isActive = activeItem === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.item} ${isActive ? styles.active : ''}`}
              onClick={() => onItemClick(item.id)}
              onKeyDown={handleKeyDown(item.id)}
              aria-label={item.label}
              aria-pressed={isActive}
              title={item.label}
            >
              {item.icon}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
