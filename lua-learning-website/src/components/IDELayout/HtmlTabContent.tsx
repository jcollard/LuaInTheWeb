import { useMemo } from 'react'
import { HtmlViewer } from '../HtmlViewer'
import { TabBar } from '../TabBar'
import type { TabBarProps } from '../TabBar'
import type { IFileSystem } from '@lua-learning/shell-core'
import styles from './IDELayout.module.css'

interface HtmlTabContentProps {
  tabBarProps?: TabBarProps
  fileSystem: IFileSystem
  activeTab: string | null
}

/**
 * Off-screen style used to preserve iframe browsing context when an HTML tab is
 * not actively visible. Using position:absolute with zero dimensions is preferred
 * over display:none because display:none would destroy the iframe's browsing
 * context, losing any navigation state the user had.
 */
const offScreenStyle: React.CSSProperties = {
  position: 'absolute',
  width: 0,
  height: 0,
  overflow: 'hidden',
  opacity: 0,
  pointerEvents: 'none',
}

/**
 * Content displayed when HTML preview tabs exist.
 * Renders one HtmlViewer per HTML tab, applying the off-screen preservation
 * pattern to inactive tabs so switching between them maintains iframe state.
 */
export function HtmlTabContent({ tabBarProps, fileSystem, activeTab }: HtmlTabContentProps) {
  const htmlTabs = useMemo(
    () => tabBarProps?.tabs.filter(t => t.type === 'html') ?? [],
    [tabBarProps?.tabs],
  )

  return (
    <div className={styles.previewContainer}>
      <div className={styles.toolbar}>
        {tabBarProps && <TabBar {...tabBarProps} />}
      </div>
      {htmlTabs.map(tab => {
        const isActive = tab.path === activeTab
        const content = fileSystem.exists(tab.path)
          ? fileSystem.readFile(tab.path)
          : ''
        return (
          <div
            key={tab.path}
            data-html-tab-path={tab.path}
            style={isActive ? { display: 'contents' } : offScreenStyle}
          >
            <HtmlViewer content={content} className={styles.previewContent} />
          </div>
        )
      })}
    </div>
  )
}
