import { useCallback, type MouseEvent } from 'react'
import type { WorkspaceTabsProps } from './types'
import styles from './WorkspaceTabs.module.css'

// Stryker disable all: Icon components are visual-only, no logic to test
const AddIcon = () => (
  <svg className={styles.icon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path fill="currentColor" d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

const CloseIcon = () => (
  <svg className={styles.closeIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M8 8.707l3.646 3.647.708-.708L8.707 8l3.647-3.646-.708-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.708L8 8.707z"
    />
  </svg>
)
// Stryker restore all

export function WorkspaceTabs({
  workspaces,
  onAddClick,
  onClose,
  onContextMenu,
  className,
}: WorkspaceTabsProps) {
  const canClose = workspaces.length > 1

  const handleContextMenu = useCallback(
    (workspaceId: string, event: MouseEvent) => {
      event.preventDefault()
      onContextMenu?.(workspaceId, event)
    },
    [onContextMenu]
  )

  const handleCloseClick = useCallback(
    (workspaceId: string, event: MouseEvent) => {
      event.stopPropagation()
      onClose(workspaceId)
    },
    [onClose]
  )

  const containerClassName = className
    ? `${styles.container} ${className}`
    : styles.container

  return (
    <div
      className={containerClassName}
      data-testid="workspace-tabs"
      role="tablist"
      aria-label="Workspaces"
    >
      <div className={styles.tabsScroll}>
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            role="tab"
            className={styles.tab}
            data-testid={`workspace-tab-${workspace.id}`}
            data-type={workspace.type}
            data-status={workspace.status}
            onContextMenu={(e) => handleContextMenu(workspace.id, e)}
            aria-label={workspace.name}
          >
            <span className={styles.tabName}>{workspace.name}</span>
            {canClose && (
              <button
                type="button"
                className={styles.closeButton}
                onClick={(e) => handleCloseClick(workspace.id, e)}
                aria-label={`Close ${workspace.name}`}
              >
                <CloseIcon />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.addButton}
        onClick={onAddClick}
        aria-label="Add Workspace"
        title="Add Workspace"
      >
        <AddIcon />
      </button>
    </div>
  )
}
