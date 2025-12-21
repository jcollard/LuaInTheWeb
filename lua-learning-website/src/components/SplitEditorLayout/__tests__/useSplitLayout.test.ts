import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSplitLayout } from '../useSplitLayout'
import type { SplitLayout, EditorGroupInfo } from '../types'
import type { TabInfo } from '../../TabBar/types'

// Helper to create a mock tab
function createMockTab(path: string): TabInfo {
  return {
    path,
    name: path.split('/').pop() ?? path,
    isDirty: false,
    type: 'file',
    isPreview: false,
    isPinned: false,
  }
}

describe('useSplitLayout', () => {
  describe('initial state', () => {
    it('should initialize with a single group', () => {
      const { result } = renderHook(() => useSplitLayout())

      expect(result.current.layout.groups).toHaveLength(1)
    })

    it('should initialize with horizontal direction by default', () => {
      const { result } = renderHook(() => useSplitLayout())

      expect(result.current.layout.direction).toBe('horizontal')
    })

    it('should have the first group as active by default', () => {
      const { result } = renderHook(() => useSplitLayout())

      const firstGroup = result.current.layout.groups[0]
      expect(result.current.layout.activeGroupId).toBe(firstGroup.id)
    })

    it('should initialize groups with empty tabs', () => {
      const { result } = renderHook(() => useSplitLayout())

      const firstGroup = result.current.layout.groups[0]
      expect(firstGroup.tabs).toEqual([])
      expect(firstGroup.activeTab).toBeNull()
    })

    it('should accept initial layout via options', () => {
      const initialGroup: EditorGroupInfo = {
        id: 'custom-group',
        tabs: [],
        activeTab: null,
      }
      const initialLayout: SplitLayout = {
        groups: [initialGroup],
        activeGroupId: 'custom-group',
        direction: 'vertical',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      expect(result.current.layout).toEqual(initialLayout)
    })
  })

  describe('getActiveGroup', () => {
    it('should return the active group', () => {
      const { result } = renderHook(() => useSplitLayout())

      const activeGroup = result.current.getActiveGroup()
      expect(activeGroup).toBeDefined()
      expect(activeGroup?.id).toBe(result.current.layout.activeGroupId)
    })

    it('should return undefined if activeGroupId does not match any group', () => {
      const initialLayout: SplitLayout = {
        groups: [{ id: 'group-1', tabs: [], activeTab: null }],
        activeGroupId: 'non-existent',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      expect(result.current.getActiveGroup()).toBeUndefined()
    })
  })

  describe('setActiveGroup', () => {
    it('should change the active group', () => {
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [], activeTab: null },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.setActiveGroup('group-2')
      })

      expect(result.current.layout.activeGroupId).toBe('group-2')
    })

    it('should not change state if group does not exist', () => {
      const { result } = renderHook(() => useSplitLayout())

      const originalActiveGroupId = result.current.layout.activeGroupId

      act(() => {
        result.current.setActiveGroup('non-existent')
      })

      expect(result.current.layout.activeGroupId).toBe(originalActiveGroupId)
    })
  })

  describe('splitGroup', () => {
    it('should create a new group when splitting', () => {
      const { result } = renderHook(() => useSplitLayout())

      const originalGroupId = result.current.layout.groups[0].id

      act(() => {
        result.current.splitGroup(originalGroupId, 'horizontal')
      })

      expect(result.current.layout.groups).toHaveLength(2)
    })

    it('should set the layout direction when splitting', () => {
      const { result } = renderHook(() => useSplitLayout())

      const groupId = result.current.layout.groups[0].id

      act(() => {
        result.current.splitGroup(groupId, 'vertical')
      })

      expect(result.current.layout.direction).toBe('vertical')
    })

    it('should set the new group as active after splitting', () => {
      const { result } = renderHook(() => useSplitLayout())

      const originalGroupId = result.current.layout.groups[0].id

      act(() => {
        result.current.splitGroup(originalGroupId, 'horizontal')
      })

      const newGroup = result.current.layout.groups.find(
        (g) => g.id !== originalGroupId
      )
      expect(result.current.layout.activeGroupId).toBe(newGroup?.id)
    })

    it('should insert new group after the split group', () => {
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [], activeTab: null },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.splitGroup('group-1', 'horizontal')
      })

      // New group should be at index 1, group-2 should be at index 2
      expect(result.current.layout.groups).toHaveLength(3)
      expect(result.current.layout.groups[0].id).toBe('group-1')
      expect(result.current.layout.groups[2].id).toBe('group-2')
    })

    it('should not split if group does not exist', () => {
      const { result } = renderHook(() => useSplitLayout())

      act(() => {
        result.current.splitGroup('non-existent', 'horizontal')
      })

      expect(result.current.layout.groups).toHaveLength(1)
    })

    it('should create new group with empty tabs', () => {
      const { result } = renderHook(() => useSplitLayout())

      const groupId = result.current.layout.groups[0].id

      act(() => {
        result.current.splitGroup(groupId, 'horizontal')
      })

      const newGroup = result.current.layout.groups.find(
        (g) => g.id !== groupId
      )
      expect(newGroup?.tabs).toEqual([])
      expect(newGroup?.activeTab).toBeNull()
    })
  })

  describe('closeGroup', () => {
    it('should remove the group from the layout', () => {
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [], activeTab: null },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.closeGroup('group-2')
      })

      expect(result.current.layout.groups).toHaveLength(1)
      expect(result.current.layout.groups[0].id).toBe('group-1')
    })

    it('should not close the last remaining group', () => {
      const { result } = renderHook(() => useSplitLayout())

      const groupId = result.current.layout.groups[0].id

      act(() => {
        result.current.closeGroup(groupId)
      })

      expect(result.current.layout.groups).toHaveLength(1)
    })

    it('should migrate tabs to the previous group when closing', () => {
      const tab1 = createMockTab('/file1.lua')
      const tab2 = createMockTab('/file2.lua')
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [tab1], activeTab: '/file1.lua' },
          { id: 'group-2', tabs: [tab2], activeTab: '/file2.lua' },
        ],
        activeGroupId: 'group-2',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.closeGroup('group-2')
      })

      expect(result.current.layout.groups).toHaveLength(1)
      expect(result.current.layout.groups[0].tabs).toHaveLength(2)
      expect(result.current.layout.groups[0].tabs).toContainEqual(tab1)
      expect(result.current.layout.groups[0].tabs).toContainEqual(tab2)
    })

    it('should set active group to the previous group when closing active group', () => {
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [], activeTab: null },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-2',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.closeGroup('group-2')
      })

      expect(result.current.layout.activeGroupId).toBe('group-1')
    })

    it('should set active group to the next group when closing first group', () => {
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [], activeTab: null },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.closeGroup('group-1')
      })

      expect(result.current.layout.activeGroupId).toBe('group-2')
    })

    it('should not change state if group does not exist', () => {
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [], activeTab: null },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.closeGroup('non-existent')
      })

      expect(result.current.layout.groups).toHaveLength(2)
    })
  })

  describe('moveTabToGroup', () => {
    it('should move a tab from one group to another', () => {
      const tab1 = createMockTab('/file1.lua')
      const tab2 = createMockTab('/file2.lua')
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [tab1, tab2], activeTab: '/file1.lua' },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.moveTabToGroup('/file1.lua', 'group-1', 'group-2')
      })

      expect(result.current.layout.groups[0].tabs).toHaveLength(1)
      expect(result.current.layout.groups[0].tabs[0].path).toBe('/file2.lua')
      expect(result.current.layout.groups[1].tabs).toHaveLength(1)
      expect(result.current.layout.groups[1].tabs[0].path).toBe('/file1.lua')
    })

    it('should update activeTab in source group when moving active tab', () => {
      const tab1 = createMockTab('/file1.lua')
      const tab2 = createMockTab('/file2.lua')
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [tab1, tab2], activeTab: '/file1.lua' },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.moveTabToGroup('/file1.lua', 'group-1', 'group-2')
      })

      // Active tab should now be the remaining tab in group-1
      expect(result.current.layout.groups[0].activeTab).toBe('/file2.lua')
    })

    it('should set activeTab in target group to the moved tab', () => {
      const tab1 = createMockTab('/file1.lua')
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [tab1], activeTab: '/file1.lua' },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.moveTabToGroup('/file1.lua', 'group-1', 'group-2')
      })

      expect(result.current.layout.groups[1].activeTab).toBe('/file1.lua')
    })

    it('should not move tab if source group does not exist', () => {
      const tab1 = createMockTab('/file1.lua')
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [tab1], activeTab: '/file1.lua' },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.moveTabToGroup('/file1.lua', 'non-existent', 'group-2')
      })

      expect(result.current.layout.groups[0].tabs).toHaveLength(1)
      expect(result.current.layout.groups[1].tabs).toHaveLength(0)
    })

    it('should not move tab if target group does not exist', () => {
      const tab1 = createMockTab('/file1.lua')
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [tab1], activeTab: '/file1.lua' },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.moveTabToGroup('/file1.lua', 'group-1', 'non-existent')
      })

      expect(result.current.layout.groups[0].tabs).toHaveLength(1)
    })

    it('should not move tab if tab does not exist in source group', () => {
      const tab1 = createMockTab('/file1.lua')
      const initialLayout: SplitLayout = {
        groups: [
          { id: 'group-1', tabs: [tab1], activeTab: '/file1.lua' },
          { id: 'group-2', tabs: [], activeTab: null },
        ],
        activeGroupId: 'group-1',
        direction: 'horizontal',
      }

      const { result } = renderHook(() =>
        useSplitLayout({ initialLayout })
      )

      act(() => {
        result.current.moveTabToGroup('/non-existent.lua', 'group-1', 'group-2')
      })

      expect(result.current.layout.groups[0].tabs).toHaveLength(1)
      expect(result.current.layout.groups[1].tabs).toHaveLength(0)
    })
  })
})
