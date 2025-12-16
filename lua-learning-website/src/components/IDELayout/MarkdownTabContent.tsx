import { MarkdownViewer } from '../MarkdownViewer'
import { TabBar } from '../TabBar'
import type { TabBarProps } from '../TabBar'
import styles from './IDELayout.module.css'

interface MarkdownTabContentProps {
  code: string
  tabBarProps?: TabBarProps
}

/**
 * Content displayed when a markdown tab is active.
 * Shows the TabBar and rendered markdown content.
 */
export function MarkdownTabContent({ code, tabBarProps }: MarkdownTabContentProps) {
  return (
    <div className={styles.markdownContainer}>
      <div className={styles.toolbar}>
        {tabBarProps && <TabBar {...tabBarProps} />}
      </div>
      <MarkdownViewer content={code} className={styles.markdownContent} />
    </div>
  )
}
