import styles from './SidebarPanel.module.css'
import type { SidebarPanelProps } from './types'
import { FileExplorer } from '../FileExplorer'

const panelTitles = {
  explorer: 'Explorer',
  search: 'Search',
  extensions: 'Extensions',
} as const

/**
 * Sidebar panel that shows content based on active panel type
 * Renders FileExplorer when explorer panel is active
 */
export function SidebarPanel({ activePanel, className, explorerProps }: SidebarPanelProps) {
  const combinedClassName = className
    ? `${styles.sidebarPanel} ${className}`
    : styles.sidebarPanel

  const title = panelTitles[activePanel]

  const renderContent = () => {
    if (activePanel === 'explorer' && explorerProps) {
      return <FileExplorer {...explorerProps} />
    }

    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderText}>
          {title} coming soon...
        </span>
      </div>
    )
  }

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
        {renderContent()}
      </div>
    </aside>
  )
}
