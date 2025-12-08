import { useCallback, type MouseEvent } from 'react'
import styles from './TabBar.module.css'
import type { TabBarProps } from './types'

// Close icon
const CloseIcon = () => (
  <svg className={styles.closeIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.708L8 8.707z"
    />
  </svg>
)

export function TabBar({
  tabs,
  activeTab,
  onSelect,
  onClose,
  className,
}: TabBarProps) {
  const handleTabClick = useCallback(
    (path: string) => {
      onSelect(path)
    },
    [onSelect]
  )

  const handleCloseClick = useCallback(
    (event: MouseEvent, path: string) => {
      event.stopPropagation()
      onClose(path)
    },
    [onClose]
  )

  const combinedClassName = className
    ? `${styles.tabBar} ${className}`
    : styles.tabBar

  if (tabs.length === 0) {
    return <div role="tablist" className={combinedClassName} style={{ overflowX: 'auto' }} />
  }

  return (
    <div role="tablist" className={combinedClassName} style={{ overflowX: 'auto' }}>
      {tabs.map((tab) => {
        const isActive = tab.path === activeTab
        const tabClassName = `${styles.tab} ${isActive ? styles.active : ''}`

        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={isActive}
            className={tabClassName}
            onClick={() => handleTabClick(tab.path)}
          >
            <span className={styles.tabName}>{tab.name}</span>
            {tab.isDirty && <span className={styles.dirtyIndicator}>*</span>}
            <button
              type="button"
              className={styles.closeButton}
              onClick={(e) => handleCloseClick(e, tab.path)}
              aria-label={`Close ${tab.name}`}
            >
              <CloseIcon />
            </button>
          </div>
        )
      })}
    </div>
  )
}
