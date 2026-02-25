import { HtmlViewer } from '../HtmlViewer'
import { TabBar } from '../TabBar'
import type { TabBarProps } from '../TabBar'
import styles from './IDELayout.module.css'

interface HtmlTabContentProps {
  content: string
  tabBarProps?: TabBarProps
}

/**
 * Content displayed when an HTML preview tab is active.
 * Shows the TabBar and a sandboxed iframe with the HTML content.
 */
export function HtmlTabContent({ content, tabBarProps }: HtmlTabContentProps) {
  return (
    <div className={styles.markdownContainer}>
      <div className={styles.toolbar}>
        {tabBarProps && <TabBar {...tabBarProps} />}
      </div>
      <HtmlViewer content={content} className={styles.markdownContent} />
    </div>
  )
}
