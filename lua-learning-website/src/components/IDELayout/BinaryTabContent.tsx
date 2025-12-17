import { BinaryFileViewer } from '../BinaryFileViewer'
import { TabBar } from '../TabBar'
import type { TabBarProps } from '../TabBar'
import type { IFileSystem } from '@lua-learning/shell-core'
import styles from './IDELayout.module.css'

interface BinaryTabContentProps {
  filePath: string
  fileSystem: IFileSystem
  tabBarProps?: TabBarProps
}

/**
 * Content displayed when a binary file tab is active.
 * Shows the TabBar and binary file viewer.
 */
export function BinaryTabContent({ filePath, fileSystem, tabBarProps }: BinaryTabContentProps) {
  return (
    <div className={styles.binaryContainer}>
      <div className={styles.toolbar}>
        {tabBarProps && <TabBar {...tabBarProps} />}
      </div>
      <BinaryFileViewer
        filePath={filePath}
        fileSystem={fileSystem}
        className={styles.binaryContent}
      />
    </div>
  )
}
