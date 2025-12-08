import styles from './SidebarPanel.module.css'
import type { SidebarPanelProps } from './types'

const panelTitles = {
  explorer: 'Explorer',
  search: 'Search',
  extensions: 'Extensions',
} as const

/**
 * Sidebar panel that shows content based on active panel type
 * Currently a placeholder until Phase 4 (Explorer)
 */
export function SidebarPanel({ activePanel, className }: SidebarPanelProps) {
  const combinedClassName = className
    ? `${styles.sidebarPanel} ${className}`
    : styles.sidebarPanel

  const title = panelTitles[activePanel]

  return (
    <aside
      role="complementary"
      aria-label="Sidebar"
      className={combinedClassName}
      data-testid="sidebar-panel"
    >
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <span className={styles.placeholderText}>
            {title} coming soon...
          </span>
        </div>
      </div>
    </aside>
  )
}
