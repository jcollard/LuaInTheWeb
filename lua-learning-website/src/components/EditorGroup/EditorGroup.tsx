import type { EditorGroupProps } from './types'
import { TabBar } from '../TabBar'
import styles from './EditorGroup.module.css'

/**
 * EditorGroup wraps a TabBar and content area into a self-contained unit
 * that can be rendered multiple times for split layouts.
 */
export function EditorGroup({
  groupId,
  tabs,
  activeTab,
  isActive,
  onTabSelect,
  onTabClose,
  onFocus,
  onTabReorder,
  onTabPin,
  onTabUnpin,
  onCloseToRight,
  onCloseOthers,
  children,
}: EditorGroupProps) {
  const containerClassName = isActive
    ? `${styles.editorGroup} ${styles.active}`
    : styles.editorGroup

  const handleClick = () => {
    onFocus()
  }

  return (
    <div
      data-testid="editor-group"
      data-group-id={groupId}
      className={containerClassName}
      onClick={handleClick}
    >
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onSelect={onTabSelect}
        onClose={onTabClose}
        onReorder={onTabReorder}
        onPinTab={onTabPin}
        onUnpinTab={onTabUnpin}
        onCloseToRight={onCloseToRight}
        onCloseOthers={onCloseOthers}
      />
      <div className={styles.content}>
        {tabs.length === 0 && !children ? (
          <div data-testid="editor-group-empty" className={styles.emptyState}>
            No files open
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
