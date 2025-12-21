import { Fragment, type ReactNode } from 'react'
import type { SplitLayout, EditorGroupInfo } from './types'
import { EditorGroup } from '../EditorGroup'
import { IDEPanelGroup } from '../IDEPanelGroup'
import { IDEPanel } from '../IDEPanel'
import { IDEResizeHandle } from '../IDEResizeHandle'
import styles from './SplitEditorLayout.module.css'

/**
 * Props for the SplitEditorLayout component
 */
export interface SplitEditorLayoutProps {
  /** Split layout state from useSplitLayout */
  layout: SplitLayout
  /** Called when a group becomes active (focused) */
  onSetActiveGroup: (groupId: string) => void
  /** Called when a tab is selected */
  onTabSelect: (path: string) => void
  /** Called when a tab is closed */
  onTabClose: (path: string) => void
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
  /** Render function for group content */
  children: (group: EditorGroupInfo, isActive: boolean) => ReactNode
}

/**
 * SplitEditorLayout renders multiple EditorGroups in a resizable layout.
 *
 * For a single group, renders EditorGroup directly without panel wrapper.
 * For multiple groups, uses IDEPanelGroup with resize handles between groups.
 */
export function SplitEditorLayout({
  layout,
  onSetActiveGroup,
  onTabSelect,
  onTabClose,
  onTabReorder,
  onTabPin,
  onTabUnpin,
  onCloseToRight,
  onCloseOthers,
  children,
}: SplitEditorLayoutProps) {
  const { groups, activeGroupId, direction } = layout

  // Handle empty groups array
  if (groups.length === 0) {
    return (
      <div
        data-testid="split-editor-layout"
        className={styles.splitEditorLayout}
      />
    )
  }

  // Single group optimization - no panel group needed
  if (groups.length === 1) {
    const group = groups[0]
    const isActive = group.id === activeGroupId

    return (
      <div
        data-testid="editor-panel"
        className={styles.splitEditorLayout}
      >
        <EditorGroup
          groupId={group.id}
          tabs={group.tabs}
          activeTab={group.activeTab}
          isActive={isActive}
          onFocus={() => onSetActiveGroup(group.id)}
          onTabSelect={onTabSelect}
          onTabClose={onTabClose}
          onTabReorder={onTabReorder}
          onTabPin={onTabPin}
          onTabUnpin={onTabUnpin}
          onCloseToRight={onCloseToRight}
          onCloseOthers={onCloseOthers}
        >
          {children(group, isActive)}
        </EditorGroup>
      </div>
    )
  }

  // Multiple groups - use panel group with resize handles
  const panelSize = 100 / groups.length

  return (
    <div
      data-testid="editor-panel"
      className={styles.splitEditorLayout}
    >
      <IDEPanelGroup direction={direction} persistId="split-editor-layout">
        {groups.map((group, index) => {
          const isActive = group.id === activeGroupId

          return (
            <Fragment key={group.id}>
              <IDEPanel defaultSize={panelSize} minSize={20}>
                <EditorGroup
                  groupId={group.id}
                  tabs={group.tabs}
                  activeTab={group.activeTab}
                  isActive={isActive}
                  onFocus={() => onSetActiveGroup(group.id)}
                  onTabSelect={onTabSelect}
                  onTabClose={onTabClose}
                  onTabReorder={onTabReorder}
                  onTabPin={onTabPin}
                  onTabUnpin={onTabUnpin}
                  onCloseToRight={onCloseToRight}
                  onCloseOthers={onCloseOthers}
                >
                  {children(group, isActive)}
                </EditorGroup>
              </IDEPanel>
              {index < groups.length - 1 && <IDEResizeHandle />}
            </Fragment>
          )
        })}
      </IDEPanelGroup>
    </div>
  )
}
