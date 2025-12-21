import type { TabInfo } from '../TabBar/types'

/**
 * Direction of a split - horizontal creates side-by-side panes,
 * vertical creates top-bottom panes
 */
export type SplitDirection = 'horizontal' | 'vertical'

/**
 * Information about an editor group (a pane that can contain tabs)
 */
export interface EditorGroupInfo {
  /** Unique identifier for this group */
  id: string
  /** Tabs open in this group */
  tabs: TabInfo[]
  /** Path of the currently active tab, or null if no tab is active */
  activeTab: string | null
}

/**
 * The complete split layout state
 */
export interface SplitLayout {
  /** All editor groups in the layout */
  groups: EditorGroupInfo[]
  /** ID of the currently focused group */
  activeGroupId: string
  /** Direction of the split (only applies when there are 2+ groups) */
  direction: SplitDirection
}

/**
 * Options for the useSplitLayout hook
 */
export interface UseSplitLayoutOptions {
  /** Initial layout state (optional) */
  initialLayout?: SplitLayout
}

/**
 * Return type for the useSplitLayout hook
 */
export interface UseSplitLayoutReturn {
  /** Current layout state */
  layout: SplitLayout
  /** Split a group into two groups */
  splitGroup: (groupId: string, direction: SplitDirection) => void
  /** Close a group and migrate its tabs to the previous group */
  closeGroup: (groupId: string) => void
  /** Set the active (focused) group */
  setActiveGroup: (groupId: string) => void
  /** Move a tab from one group to another */
  moveTabToGroup: (tabPath: string, fromGroupId: string, toGroupId: string) => void
  /** Get the currently active group */
  getActiveGroup: () => EditorGroupInfo | undefined
}
