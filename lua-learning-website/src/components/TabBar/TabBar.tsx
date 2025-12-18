import { useCallback, useEffect, useState, type MouseEvent, type DragEvent } from 'react'
import styles from './TabBar.module.css'
import type { TabBarProps, TabInfo } from './types'
import { useTabBarScroll } from './useTabBarScroll'
import { ContextMenu } from '../ContextMenu/ContextMenu'
import { useContextMenu } from '../ContextMenu/useContextMenu'
import type { ContextMenuItem } from '../ContextMenu/types'

// Close icon
const CloseIcon = () => (
  <svg className={styles.closeIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.708L8 8.707z"
    />
  </svg>
)

// Pin icon
const PinIcon = () => (
  <svg data-testid="pin-icon" className={styles.pinIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182a.5.5 0 0 1-.707-.707l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"
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
  onReorder,
  onPinTab,
  onUnpinTab,
  onCloseToRight,
  onCloseOthers,
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

  const contextMenu = useContextMenu()
  const [contextMenuTab, setContextMenuTab] = useState<TabInfo | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, path: string) => {
      event.dataTransfer.setData('text/plain', path)
      event.dataTransfer.effectAllowed = 'move'
    },
    []
  )

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    },
    []
  )

  const handleDragEnter = useCallback(
    (index: number) => {
      setDragOverIndex(index)
    },
    []
  )

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
      event.preventDefault()
      setDragOverIndex(null)
      const sourcePath = event.dataTransfer.getData('text/plain')
      const sourceIndex = tabs.findIndex((tab) => tab.path === sourcePath)

      if (sourceIndex !== -1 && sourceIndex !== targetIndex && onReorder) {
        onReorder(sourcePath, targetIndex)
      }
    },
    [tabs, onReorder]
  )

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleContextMenu = useCallback(
    (event: MouseEvent, tab: TabInfo) => {
      event.preventDefault()
      setContextMenuTab(tab)
      contextMenu.show(event.clientX, event.clientY)
    },
    [contextMenu]
  )

  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenuTab) return []

    const items: ContextMenuItem[] = []

    // Pin/Unpin option
    if (contextMenuTab.isPinned) {
      items.push({ id: 'unpin', label: 'Unpin' })
    } else {
      items.push({ id: 'pin', label: 'Pin' })
    }

    items.push({ id: 'divider-1', type: 'divider' })

    // Close option (disabled for pinned tabs)
    items.push({ id: 'close', label: 'Close', disabled: contextMenuTab.isPinned })
    items.push({ id: 'close-to-right', label: 'Close to Right' })
    items.push({ id: 'close-others', label: 'Close Others' })

    return items
  }, [contextMenuTab])

  const handleContextMenuSelect = useCallback(
    (id: string) => {
      if (!contextMenuTab) return

      switch (id) {
        case 'pin':
          onPinTab?.(contextMenuTab.path)
          break
        case 'unpin':
          onUnpinTab?.(contextMenuTab.path)
          break
        case 'close':
          if (!contextMenuTab.isPinned) {
            onClose(contextMenuTab.path)
          }
          break
        case 'close-to-right':
          onCloseToRight?.(contextMenuTab.path)
          break
        case 'close-others':
          onCloseOthers?.(contextMenuTab.path)
          break
      }
    },
    [contextMenuTab, onPinTab, onUnpinTab, onClose, onCloseToRight, onCloseOthers]
  )

  const handleContextMenuClose = useCallback(() => {
    contextMenu.hide()
    setContextMenuTab(null)
  }, [contextMenu])

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
        {tabs.map((tab, index) => {
          const isActive = tab.path === activeTab
          const isDragOver = dragOverIndex === index
          const tabClassNames = [
            styles.tab,
            isActive && styles.active,
            tab.isPreview && styles.preview,
            tab.isPinned && styles.pinned,
            isDragOver && styles.dragOver,
          ].filter(Boolean).join(' ')

          return (
            <div
              key={tab.path}
              role="tab"
              aria-selected={isActive}
              className={tabClassNames}
              onClick={() => handleTabClick(tab.path)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, tab.path)}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {tab.isPinned && <PinIcon />}
              <span className={styles.tabName}>{tab.name}</span>
              {tab.isDirty && <span className={styles.dirtyIndicator}>*</span>}
              {!tab.isPinned && (
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={(e) => handleCloseClick(e, tab.path)}
                  aria-label={`Close ${tab.name}`}
                >
                  <CloseIcon />
                </button>
              )}
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
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={getContextMenuItems()}
        onSelect={handleContextMenuSelect}
        onClose={handleContextMenuClose}
      />
    </div>
  )
}
