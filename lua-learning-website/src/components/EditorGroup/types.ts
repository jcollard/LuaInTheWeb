import type { TabInfo } from '../TabBar/types'
import type { SplitDirection } from '../SplitEditorLayout/types'

/**
 * Props for the EditorGroup component
 */
export interface EditorGroupProps {
  /** Unique identifier for this group */
  groupId: string
  /** Tabs open in this group */
  tabs: TabInfo[]
  /** Path of the currently active tab, or null if no tab is active */
  activeTab: string | null
  /** Whether this group is the focused/active group */
  isActive: boolean
  /** Called when a tab is selected */
  onTabSelect: (path: string) => void
  /** Called when a tab is closed */
  onTabClose: (path: string) => void
  /** Called when user requests to split this group */
  onSplitRequest?: (direction: SplitDirection) => void
  /** Called when this group receives focus */
  onFocus: () => void
  /** Called when tabs are reordered */
  onTabReorder?: (path: string, newIndex: number) => void
  /** Called when a tab is pinned */
  onTabPin?: (path: string) => void
  /** Called when a tab is unpinned */
  onTabUnpin?: (path: string) => void
  /** Called when close tabs to right is requested */
  onCloseToRight?: (path: string) => void
  /** Called when close other tabs is requested */
  onCloseOthers?: (path: string) => void
  /** Content to render in the editor area (for now, placeholder) */
  children?: React.ReactNode
}
