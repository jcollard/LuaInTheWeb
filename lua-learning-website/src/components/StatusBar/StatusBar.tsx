import styles from './StatusBar.module.css'
import type { StatusBarProps } from './types'

/**
 * VS Code-style status bar showing editor state
 */
export function StatusBar({
  line,
  column,
  language,
  encoding,
  indentation,
  className,
}: StatusBarProps) {
  const combinedClassName = className
    ? `${styles.statusBar} ${className}`
    : styles.statusBar

  return (
    <div role="status" className={combinedClassName}>
      <div className={styles.left}>
        <span
          className={styles.item}
          aria-label="Cursor position"
        >
          Ln {line}, Col {column}
        </span>
      </div>
      <div className={styles.right}>
        <span
          className={styles.item}
          aria-label="Indentation settings"
        >
          {indentation}
        </span>
        <span
          className={styles.item}
          aria-label="File encoding"
        >
          {encoding}
        </span>
        <span
          className={styles.item}
          aria-label="Language mode"
        >
          {language}
        </span>
      </div>
    </div>
  )
}
