import { useState, useCallback } from 'react'
import type {
  SplitLayout,
  SplitDirection,
  EditorGroupInfo,
  UseSplitLayoutOptions,
  UseSplitLayoutReturn,
} from './types'

/**
 * Generate a unique ID for editor groups
 */
function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Create a default single-group layout
 */
function createDefaultLayout(): SplitLayout {
  const groupId = generateGroupId()
  return {
    groups: [
      {
        id: groupId,
        tabs: [],
        activeTab: null,
      },
    ],
    activeGroupId: groupId,
    direction: 'horizontal',
  }
}

/**
 * Hook for managing split editor layout state
 */
export function useSplitLayout(
  options: UseSplitLayoutOptions = {}
): UseSplitLayoutReturn {
  const { initialLayout } = options

  const [layout, setLayout] = useState<SplitLayout>(
    () => initialLayout ?? createDefaultLayout()
  )

  const getActiveGroup = useCallback((): EditorGroupInfo | undefined => {
    return layout.groups.find((group) => group.id === layout.activeGroupId)
  }, [layout.groups, layout.activeGroupId])

  const setActiveGroup = useCallback((groupId: string): void => {
    setLayout((prev) => {
      const groupExists = prev.groups.some((g) => g.id === groupId)
      if (!groupExists) {
        return prev
      }
      return {
        ...prev,
        activeGroupId: groupId,
      }
    })
  }, [])

  const splitGroup = useCallback(
    (groupId: string, direction: SplitDirection): void => {
      setLayout((prev) => {
        const groupIndex = prev.groups.findIndex((g) => g.id === groupId)
        if (groupIndex === -1) {
          return prev
        }

        const newGroup: EditorGroupInfo = {
          id: generateGroupId(),
          tabs: [],
          activeTab: null,
        }

        // Insert new group after the split group
        const newGroups = [...prev.groups]
        newGroups.splice(groupIndex + 1, 0, newGroup)

        return {
          groups: newGroups,
          activeGroupId: newGroup.id,
          direction,
        }
      })
    },
    []
  )

  const closeGroup = useCallback((groupId: string): void => {
    setLayout((prev) => {
      // Don't close the last group
      if (prev.groups.length <= 1) {
        return prev
      }

      const groupIndex = prev.groups.findIndex((g) => g.id === groupId)
      if (groupIndex === -1) {
        return prev
      }

      const closingGroup = prev.groups[groupIndex]
      const newGroups = prev.groups.filter((g) => g.id !== groupId)

      // Determine which group receives the tabs (prefer previous, fallback to next)
      const targetIndex = groupIndex > 0 ? groupIndex - 1 : 0
      const targetGroup = newGroups[targetIndex]

      // Migrate tabs from closing group to target group
      const updatedGroups = newGroups.map((g) => {
        if (g.id === targetGroup.id) {
          return {
            ...g,
            tabs: [...g.tabs, ...closingGroup.tabs],
          }
        }
        return g
      })

      // Determine new active group
      let newActiveGroupId = prev.activeGroupId
      if (prev.activeGroupId === groupId) {
        // If closing the active group, set active to target group
        newActiveGroupId = targetGroup.id
      }

      return {
        ...prev,
        groups: updatedGroups,
        activeGroupId: newActiveGroupId,
      }
    })
  }, [])

  const moveTabToGroup = useCallback(
    (tabPath: string, fromGroupId: string, toGroupId: string): void => {
      setLayout((prev) => {
        const fromGroup = prev.groups.find((g) => g.id === fromGroupId)
        const toGroup = prev.groups.find((g) => g.id === toGroupId)

        if (!fromGroup || !toGroup) {
          return prev
        }

        const tabIndex = fromGroup.tabs.findIndex((t) => t.path === tabPath)
        if (tabIndex === -1) {
          return prev
        }

        const tab = fromGroup.tabs[tabIndex]
        const newFromTabs = fromGroup.tabs.filter((t) => t.path !== tabPath)

        // Update activeTab in source group if we moved the active tab
        let newFromActiveTab = fromGroup.activeTab
        if (fromGroup.activeTab === tabPath) {
          // Set to next tab, or previous, or null
          newFromActiveTab = newFromTabs.length > 0 ? newFromTabs[0].path : null
        }

        const updatedGroups = prev.groups.map((g) => {
          if (g.id === fromGroupId) {
            return {
              ...g,
              tabs: newFromTabs,
              activeTab: newFromActiveTab,
            }
          }
          if (g.id === toGroupId) {
            return {
              ...g,
              tabs: [...g.tabs, tab],
              activeTab: tabPath, // Set moved tab as active in target
            }
          }
          return g
        })

        return {
          ...prev,
          groups: updatedGroups,
        }
      })
    },
    []
  )

  return {
    layout,
    splitGroup,
    closeGroup,
    setActiveGroup,
    moveTabToGroup,
    getActiveGroup,
  }
}
