import { ShellTerminal } from '../ShellTerminal'
import styles from './BottomPanel.module.css'
import type { BottomPanelProps } from './types'

/**
 * Bottom panel with Shell terminal
 */
export function BottomPanel({
  fileSystem,
  className,
  onFileSystemChange,
  canvasCallbacks,
}: BottomPanelProps) {
  const combinedClassName = className
    ? `${styles.bottomPanel} ${className}`
    : styles.bottomPanel

  return (
    <div className={combinedClassName} data-testid="bottom-panel">
      <div className={styles.tabBar} role="tablist">
        <button
          type="button"
          role="tab"
          className={`${styles.tab} ${styles.active}`}
          aria-selected={true}
          aria-controls="shell-tabpanel"
        >
          Shell
        </button>
      </div>
      <div className={styles.content} role="tabpanel" id="shell-tabpanel">
        <div className={styles.shellContent}>
          <ShellTerminal
            fileSystem={fileSystem}
            embedded
            onFileSystemChange={onFileSystemChange}
            canvasCallbacks={canvasCallbacks}
          />
        </div>
      </div>
    </div>
  )
}
