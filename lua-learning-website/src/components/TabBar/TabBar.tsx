import { useCallback, useEffect, type MouseEvent } from 'react'
import styles from './TabBar.module.css'
import type { TabBarProps } from './types'
import { useTabBarScroll } from './useTabBarScroll'

// Close icon
const CloseIcon = () => (
  <svg className={styles.closeIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.708L8 8.707z"
    />
  </svg>
)

// Chevron left icon
const ChevronLeftIcon = () => (
  <svg className={styles.chevronIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M10.354 3.146a.5.5 0 010 .708L6.207 8l4.147 4.146a.5.5 0 01-.708.708l-4.5-4.5a.5.5 0 010-.708l4.5-4.5a.5.5 0 01.708 0z"
    />
  </svg>
)

// Chevron right icon
const ChevronRightIcon = () => (
  <svg className={styles.chevronIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M5.646 3.146a.5.5 0 01.708 0l4.5 4.5a.5.5 0 010 .708l-4.5 4.5a.5.5 0 01-.708-.708L9.793 8 5.646 3.854a.5.5 0 010-.708z"
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
  const {
    canScrollLeft,
    canScrollRight,
    hasOverflow,
    scrollLeft,
    scrollRight,
    handleScroll,
    checkOverflow,
    setContainerRef,
  } = useTabBarScroll()

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

  // Check overflow when tabs change
  useEffect(() => {
    checkOverflow()
  }, [tabs, checkOverflow])

  const combinedClassName = className
    ? `${styles.tabBar} ${className}`
    : styles.tabBar

  if (tabs.length === 0) {
    return <div role="tablist" className={combinedClassName} style={{ overflow: 'hidden' }} />
  }

  return (
    <div role="tablist" className={combinedClassName} style={{ overflow: 'hidden' }}>
      {hasOverflow && canScrollLeft && (
        <button
          type="button"
          className={styles.scrollButton}
          onClick={scrollLeft}
          aria-label="Scroll left"
        >
          <ChevronLeftIcon />
        </button>
      )}
      <div
        ref={setContainerRef}
        className={styles.tabsContainer}
        onScroll={handleScroll}
      >
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
      {hasOverflow && canScrollRight && (
        <button
          type="button"
          className={styles.scrollButton}
          onClick={scrollRight}
          aria-label="Scroll right"
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  )
}
