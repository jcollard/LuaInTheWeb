import styles from './WelcomeScreen.module.css'
import type { WelcomeScreenProps } from './types'

/**
 * Welcome screen displayed when no files are open
 */
export function WelcomeScreen({
  onCreateFile,
  onOpenFile,
  onOpenShell,
  onClearRecentFiles,
  recentFiles,
  className,
}: WelcomeScreenProps) {
  const combinedClassName = className
    ? `${styles.welcomeScreen} ${className}`
    : styles.welcomeScreen

  const handleFileClick = (path: string) => {
    onOpenFile(path)
  }

  const handleKeyDown = (path: string, event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onOpenFile(path)
    }
  }

  return (
    <div className={combinedClassName} data-testid="welcome-screen">
      <h1 className={styles.title}>Welcome to Lua IDE</h1>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Start</h2>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={onCreateFile}
            >
              New File
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={onOpenShell}
            >
              Open Shell
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.recentHeader}>
            <h2 className={styles.sectionTitle}>Recent Files</h2>
            {recentFiles.length > 0 && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={onClearRecentFiles}
              >
                Clear
              </button>
            )}
          </div>

          {recentFiles.length === 0 ? (
            <p className={styles.emptyState}>No recent files</p>
          ) : (
            <div className={styles.recentFiles}>
              {recentFiles.map(file => (
                <button
                  key={file.path}
                  type="button"
                  className={styles.recentFileItem}
                  onClick={() => handleFileClick(file.path)}
                  onKeyDown={e => handleKeyDown(file.path, e)}
                >
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.filePath}>{file.path}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
