import { Panel } from 'react-resizable-panels'
import type { IDEPanelProps } from './types'
import styles from './IDEPanel.module.css'

export function IDEPanel({
  defaultSize,
  minSize,
  maxSize,
  collapsible,
  collapsed,
  onCollapse,
  header,
  children,
  className,
}: IDEPanelProps) {
  const combinedClassName = className
    ? `${styles.panel} ${className}`
    : styles.panel

  const handleCollapseToggle = () => {
    onCollapse?.(!collapsed)
  }

  // Wrap our callback to match react-resizable-panels signature
  const handlePanelCollapse = () => {
    onCollapse?.(true)
  }

  const handlePanelExpand = () => {
    onCollapse?.(false)
  }

  // Calculate collapsed size (just enough for header)
  const collapsedSize = collapsible ? 0 : undefined

  return (
    <Panel
      defaultSize={defaultSize}
      minSize={collapsed ? collapsedSize : minSize}
      maxSize={maxSize}
      collapsible={collapsible}
      collapsedSize={collapsedSize}
      onCollapse={handlePanelCollapse}
      onExpand={handlePanelExpand}
      className={combinedClassName}
    >
      {header && (
        <div data-testid="panel-header" className={styles.header}>
          <span className={styles.headerText}>{header}</span>
          {collapsible && (
            <button
              type="button"
              className={styles.collapseButton}
              onClick={handleCollapseToggle}
              aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {collapsed ? '▶' : '◀'}
            </button>
          )}
        </div>
      )}
      <div
        className={styles.content}
        style={{ display: collapsed ? 'none' : undefined }}
      >
        {children}
      </div>
    </Panel>
  )
}
