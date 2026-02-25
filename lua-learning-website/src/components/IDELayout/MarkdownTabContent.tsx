import { useCallback } from 'react'
import { MarkdownViewer } from '../MarkdownViewer'
import { TabBar } from '../TabBar'
import type { TabBarProps } from '../TabBar'
import styles from './IDELayout.module.css'

interface MarkdownTabContentProps {
  code: string
  tabBarProps?: TabBarProps
  /** Current file path for resolving relative links */
  currentFilePath?: string | null
  /** Callback to open a markdown file */
  onOpenMarkdown?: (path: string) => void
}

/**
 * Gets the directory path from a file path
 */
function getDirectoryPath(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/')
  return lastSlash > 0 ? filePath.slice(0, lastSlash) : '/'
}

/**
 * Content displayed when a markdown tab is active.
 * Shows the TabBar and rendered markdown content.
 */
export function MarkdownTabContent({ code, tabBarProps, currentFilePath, onOpenMarkdown }: MarkdownTabContentProps) {
  const basePath = currentFilePath ? getDirectoryPath(currentFilePath) : undefined

  const handleLinkClick = useCallback((path: string) => {
    if (onOpenMarkdown) {
      onOpenMarkdown(path)
    }
  }, [onOpenMarkdown])

  return (
    <div className={styles.previewContainer}>
      <div className={styles.toolbar}>
        {tabBarProps && <TabBar {...tabBarProps} />}
      </div>
      <MarkdownViewer
        content={code}
        className={styles.previewContent}
        basePath={basePath}
        onLinkClick={handleLinkClick}
        filePath={currentFilePath ?? undefined}
      />
    </div>
  )
}
