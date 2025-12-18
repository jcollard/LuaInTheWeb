/* eslint-disable max-lines */
import { renderHook, act } from '@testing-library/react'
import { useTabBar } from './useTabBar'

describe('useTabBar', () => {
  describe('initial state', () => {
    it('should start with empty tabs array', () => {
      // Arrange & Act
      const { result } = renderHook(() => useTabBar())

      // Assert
      expect(result.current.tabs).toEqual([])
    })

    it('should start with null activeTab', () => {
      // Arrange & Act
      const { result } = renderHook(() => useTabBar())

      // Assert
      expect(result.current.activeTab).toBeNull()
    })
  })

  describe('openTab', () => {
    it('should add a new tab when opening a file', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0]).toEqual({
        path: '/test/file.lua',
        name: 'file.lua',
        isDirty: false,
        type: 'file',
        isPreview: false,
        isPinned: false,
      })
    })

    it('should set the opened tab as active', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/test/file.lua')
    })

    it('should not duplicate tab when opening same file twice', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
        result.current.openTab('/test/file.lua', 'file.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
    })

    it('should activate existing tab when opening same file', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
      })

      expect(result.current.activeTab).toBe('/test/file2.lua')

      // Act
      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/test/file1.lua')
      expect(result.current.tabs).toHaveLength(2)
    })

    it('should add multiple tabs when opening different files', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(3)
      expect(result.current.tabs.map((t) => t.name)).toEqual([
        'file1.lua',
        'file2.lua',
        'file3.lua',
      ])
    })
  })

  describe('closeTab', () => {
    it('should remove the specified tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/test/file1.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/test/file2.lua')
    })

    it('should select next tab when closing active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
        result.current.selectTab('/test/file2.lua')
      })

      expect(result.current.activeTab).toBe('/test/file2.lua')

      // Act - close the middle (active) tab
      act(() => {
        result.current.closeTab('/test/file2.lua')
      })

      // Assert - should select the tab that was after (file3)
      expect(result.current.activeTab).toBe('/test/file3.lua')
    })

    it('should select last tab when closing the last active tab in list', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
      })

      expect(result.current.activeTab).toBe('/test/file2.lua')

      // Act - close the last tab (which is active)
      act(() => {
        result.current.closeTab('/test/file2.lua')
      })

      // Assert - should select the previous (now last) tab
      expect(result.current.activeTab).toBe('/test/file1.lua')
    })

    it('should set activeTab to null when closing the only tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/test/file.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(0)
      expect(result.current.activeTab).toBeNull()
    })

    it('should not change activeTab when closing non-active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
      })

      expect(result.current.activeTab).toBe('/test/file2.lua')

      // Act - close a non-active tab
      act(() => {
        result.current.closeTab('/test/file1.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/test/file2.lua')
    })

    it('should do nothing when closing non-existent tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/test/nonexistent.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.activeTab).toBe('/test/file.lua')
    })
  })

  describe('selectTab', () => {
    it('should change the active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
      })

      // Act
      act(() => {
        result.current.selectTab('/test/file1.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/test/file1.lua')
    })
  })

  describe('setDirty', () => {
    it('should mark tab as dirty', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
      })

      expect(result.current.tabs[0].isDirty).toBe(false)

      // Act
      act(() => {
        result.current.setDirty('/test/file.lua', true)
      })

      // Assert
      expect(result.current.tabs[0].isDirty).toBe(true)
    })

    it('should mark tab as clean', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
        result.current.setDirty('/test/file.lua', true)
      })

      expect(result.current.tabs[0].isDirty).toBe(true)

      // Act
      act(() => {
        result.current.setDirty('/test/file.lua', false)
      })

      // Assert
      expect(result.current.tabs[0].isDirty).toBe(false)
    })

    it('should only affect the specified tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
      })

      // Act
      act(() => {
        result.current.setDirty('/test/file1.lua', true)
      })

      // Assert
      expect(result.current.tabs[0].isDirty).toBe(true)
      expect(result.current.tabs[1].isDirty).toBe(false)
    })
  })

  describe('renameTab', () => {
    it('should update path and name of the tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/old.lua', 'old.lua')
      })

      // Act
      act(() => {
        result.current.renameTab('/test/old.lua', '/test/new.lua', 'new.lua')
      })

      // Assert
      expect(result.current.tabs[0].path).toBe('/test/new.lua')
      expect(result.current.tabs[0].name).toBe('new.lua')
    })

    it('should update activeTab when renaming the active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/old.lua', 'old.lua')
      })

      expect(result.current.activeTab).toBe('/test/old.lua')

      // Act
      act(() => {
        result.current.renameTab('/test/old.lua', '/test/new.lua', 'new.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/test/new.lua')
    })

    it('should not change activeTab when renaming non-active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
      })

      expect(result.current.activeTab).toBe('/test/file2.lua')

      // Act
      act(() => {
        result.current.renameTab('/test/file1.lua', '/test/renamed.lua', 'renamed.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/test/file2.lua')
    })

    it('should preserve isDirty state when renaming', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/old.lua', 'old.lua')
        result.current.setDirty('/test/old.lua', true)
      })

      expect(result.current.tabs[0].isDirty).toBe(true)

      // Act
      act(() => {
        result.current.renameTab('/test/old.lua', '/test/new.lua', 'new.lua')
      })

      // Assert - isDirty should still be true (not reset)
      expect(result.current.tabs[0].isDirty).toBe(true)
    })
  })

  describe('markdown tabs', () => {
    it('should open a markdown file as preview with type markdown', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openMarkdownPreviewTab('/test/readme.md', 'readme.md')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0]).toEqual({
        path: '/test/readme.md',
        name: 'readme.md',
        isDirty: false,
        type: 'markdown',
        isPreview: true,
        isPinned: false,
      })
    })

    it('should replace existing markdown preview when opening new markdown preview', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openMarkdownPreviewTab('/test/file1.md', 'file1.md')
      })

      expect(result.current.tabs).toHaveLength(1)

      // Act
      act(() => {
        result.current.openMarkdownPreviewTab('/test/file2.md', 'file2.md')
      })

      // Assert - should replace the preview
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/test/file2.md')
      expect(result.current.tabs[0].type).toBe('markdown')
    })

    it('should not replace existing permanent markdown tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openMarkdownPreviewTab('/test/file1.md', 'file1.md')
        result.current.makeTabPermanent('/test/file1.md')
      })

      expect(result.current.tabs[0].isPreview).toBe(false)

      // Act
      act(() => {
        result.current.openMarkdownPreviewTab('/test/file2.md', 'file2.md')
      })

      // Assert - should add new tab, not replace
      expect(result.current.tabs).toHaveLength(2)
    })

    it('should return markdown type from getActiveTabType for markdown tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openMarkdownPreviewTab('/test/readme.md', 'readme.md')
      })

      // Assert
      expect(result.current.getActiveTabType()).toBe('markdown')
    })
  })

  describe('function reference stability', () => {
    it('should maintain stable function references across renders', () => {
      // Arrange
      const { result, rerender } = renderHook(() => useTabBar())
      const initialOpenTab = result.current.openTab
      const initialSelectTab = result.current.selectTab
      const initialSetDirty = result.current.setDirty
      const initialRenameTab = result.current.renameTab

      // Act
      rerender()

      // Assert - all functions should be memoized
      expect(result.current.openTab).toBe(initialOpenTab)
      expect(result.current.selectTab).toBe(initialSelectTab)
      expect(result.current.setDirty).toBe(initialSetDirty)
      expect(result.current.renameTab).toBe(initialRenameTab)
      // Note: closeTab depends on activeTab, so it may change between renders
    })
  })

  describe('pinned tabs', () => {
    it('should create tabs with isPinned set to false by default', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
      })

      // Assert
      expect(result.current.tabs[0].isPinned).toBe(false)
    })

    it('should pin a tab when pinTab is called', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
      })

      // Act
      act(() => {
        result.current.pinTab('/test/file.lua')
      })

      // Assert
      expect(result.current.tabs[0].isPinned).toBe(true)
    })

    it('should unpin a tab when unpinTab is called', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
        result.current.pinTab('/test/file.lua')
      })

      expect(result.current.tabs[0].isPinned).toBe(true)

      // Act
      act(() => {
        result.current.unpinTab('/test/file.lua')
      })

      // Assert
      expect(result.current.tabs[0].isPinned).toBe(false)
    })

    it('should move pinned tab to the beginning of the tabs array', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
      })

      // Act - pin the last tab
      act(() => {
        result.current.pinTab('/test/file3.lua')
      })

      // Assert - pinned tab should be first
      expect(result.current.tabs[0].path).toBe('/test/file3.lua')
      expect(result.current.tabs[0].isPinned).toBe(true)
    })

    it('should keep pinned tabs sorted at the beginning when pinning multiple', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
      })

      // Act - pin file2, then file3
      act(() => {
        result.current.pinTab('/test/file2.lua')
      })
      act(() => {
        result.current.pinTab('/test/file3.lua')
      })

      // Assert - pinned tabs should be first, in order they were pinned
      expect(result.current.tabs[0].path).toBe('/test/file2.lua')
      expect(result.current.tabs[1].path).toBe('/test/file3.lua')
      expect(result.current.tabs[2].path).toBe('/test/file1.lua')
    })

    it('should move unpinned tab to after all pinned tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
        result.current.pinTab('/test/file1.lua')
        result.current.pinTab('/test/file2.lua')
      })

      // Verify initial order: file1 (pinned), file2 (pinned), file3 (unpinned)
      expect(result.current.tabs.map((t) => t.path)).toEqual([
        '/test/file1.lua',
        '/test/file2.lua',
        '/test/file3.lua',
      ])

      // Act - unpin file1
      act(() => {
        result.current.unpinTab('/test/file1.lua')
      })

      // Assert - file1 should move after all pinned tabs (after file2)
      expect(result.current.tabs[0].path).toBe('/test/file2.lua')
      expect(result.current.tabs[0].isPinned).toBe(true)
      expect(result.current.tabs[1].path).toBe('/test/file1.lua')
      expect(result.current.tabs[1].isPinned).toBe(false)
    })

    it('should not close a pinned tab when closeTab is called', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
        result.current.pinTab('/test/file.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/test/file.lua')
      })

      // Assert - tab should still exist
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/test/file.lua')
    })

    it('should preserve isPinned state when using setDirty', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
        result.current.pinTab('/test/file.lua')
      })

      // Act
      act(() => {
        result.current.setDirty('/test/file.lua', true)
      })

      // Assert
      expect(result.current.tabs[0].isPinned).toBe(true)
      expect(result.current.tabs[0].isDirty).toBe(true)
    })

    it('should preserve isPinned state when renaming tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/old.lua', 'old.lua')
        result.current.pinTab('/test/old.lua')
      })

      // Act
      act(() => {
        result.current.renameTab('/test/old.lua', '/test/new.lua', 'new.lua')
      })

      // Assert
      expect(result.current.tabs[0].isPinned).toBe(true)
      expect(result.current.tabs[0].path).toBe('/test/new.lua')
    })
  })

  describe('reorderTab', () => {
    it('should move an unpinned tab to a new position among unpinned tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
      })

      // Act - move file1 to position after file2
      act(() => {
        result.current.reorderTab('/test/file1.lua', 1)
      })

      // Assert
      expect(result.current.tabs.map((t) => t.path)).toEqual([
        '/test/file2.lua',
        '/test/file1.lua',
        '/test/file3.lua',
      ])
    })

    it('should move an unpinned tab to the end', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
      })

      // Act - move file1 to the end
      act(() => {
        result.current.reorderTab('/test/file1.lua', 2)
      })

      // Assert
      expect(result.current.tabs.map((t) => t.path)).toEqual([
        '/test/file2.lua',
        '/test/file3.lua',
        '/test/file1.lua',
      ])
    })

    it('should not allow moving an unpinned tab before pinned tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
        result.current.pinTab('/test/file1.lua')
      })

      // Now order is: file1 (pinned), file2, file3
      expect(result.current.tabs[0].path).toBe('/test/file1.lua')

      // Act - try to move file3 to position 0 (before pinned)
      act(() => {
        result.current.reorderTab('/test/file3.lua', 0)
      })

      // Assert - file3 should be at position 1 (first unpinned position), not 0
      expect(result.current.tabs[0].path).toBe('/test/file1.lua')
      expect(result.current.tabs[0].isPinned).toBe(true)
      expect(result.current.tabs[1].path).toBe('/test/file3.lua')
    })

    it('should allow reordering pinned tabs among themselves', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
        result.current.pinTab('/test/file1.lua')
        result.current.pinTab('/test/file2.lua')
      })

      // Now order is: file1 (pinned), file2 (pinned), file3
      // Act - swap pinned tabs
      act(() => {
        result.current.reorderTab('/test/file2.lua', 0)
      })

      // Assert - pinned tabs swapped, unpinned stays at end
      expect(result.current.tabs.map((t) => t.path)).toEqual([
        '/test/file2.lua',
        '/test/file1.lua',
        '/test/file3.lua',
      ])
      expect(result.current.tabs[0].isPinned).toBe(true)
      expect(result.current.tabs[1].isPinned).toBe(true)
      expect(result.current.tabs[2].isPinned).toBe(false)
    })

    it('should not allow moving a pinned tab after unpinned tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
        result.current.pinTab('/test/file1.lua')
      })

      // Now order is: file1 (pinned), file2, file3
      // Act - try to move pinned file1 to the end (among unpinned)
      act(() => {
        result.current.reorderTab('/test/file1.lua', 2)
      })

      // Assert - pinned tab stays in the pinned section (position 0)
      expect(result.current.tabs[0].path).toBe('/test/file1.lua')
      expect(result.current.tabs[0].isPinned).toBe(true)
    })

    it('should do nothing when reordering to the same position', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
      })

      const initialOrder = result.current.tabs.map((t) => t.path)

      // Act - move file1 to position 0 (same position)
      act(() => {
        result.current.reorderTab('/test/file1.lua', 0)
      })

      // Assert - order unchanged
      expect(result.current.tabs.map((t) => t.path)).toEqual(initialOrder)
    })

    it('should do nothing when reordering non-existent tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
      })

      const initialOrder = result.current.tabs.map((t) => t.path)

      // Act - try to reorder non-existent tab
      act(() => {
        result.current.reorderTab('/test/nonexistent.lua', 0)
      })

      // Assert - order unchanged
      expect(result.current.tabs.map((t) => t.path)).toEqual(initialOrder)
    })
  })

  describe('closeToRight', () => {
    it('should close all tabs to the right of the specified tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
        result.current.openTab('/test/file4.lua', 'file4.lua')
      })

      // Act - close all tabs to the right of file2
      act(() => {
        result.current.closeToRight('/test/file2.lua')
      })

      // Assert
      expect(result.current.tabs.map((t) => t.path)).toEqual([
        '/test/file1.lua',
        '/test/file2.lua',
      ])
    })

    it('should not close pinned tabs to the right', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
        result.current.openTab('/test/file4.lua', 'file4.lua')
        result.current.pinTab('/test/file3.lua')
      })

      // Now order: file3 (pinned), file1, file2, file4
      // Act - close all to the right of file1
      act(() => {
        result.current.closeToRight('/test/file1.lua')
      })

      // Assert - file3 (pinned) should remain, file2 and file4 closed
      expect(result.current.tabs.map((t) => t.path)).toEqual([
        '/test/file3.lua',
        '/test/file1.lua',
      ])
    })

    it('should do nothing when there are no tabs to the right', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
      })

      // Act - close all to the right of file2 (last tab)
      act(() => {
        result.current.closeToRight('/test/file2.lua')
      })

      // Assert - nothing closed
      expect(result.current.tabs.map((t) => t.path)).toEqual([
        '/test/file1.lua',
        '/test/file2.lua',
      ])
    })

    it('should update activeTab if it was closed', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
      })

      // file3 is now active (last opened)
      expect(result.current.activeTab).toBe('/test/file3.lua')

      // Act - close all to the right of file1 (closes file2 and file3)
      act(() => {
        result.current.closeToRight('/test/file1.lua')
      })

      // Assert - activeTab should be updated to file1
      expect(result.current.activeTab).toBe('/test/file1.lua')
    })
  })

  describe('closeOthers', () => {
    it('should close all tabs except the specified tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
      })

      // Act
      act(() => {
        result.current.closeOthers('/test/file2.lua')
      })

      // Assert
      expect(result.current.tabs.map((t) => t.path)).toEqual([
        '/test/file2.lua',
      ])
    })

    it('should not close pinned tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
        result.current.pinTab('/test/file1.lua')
      })

      // Act - close others except file2
      act(() => {
        result.current.closeOthers('/test/file2.lua')
      })

      // Assert - file1 (pinned) should remain
      expect(result.current.tabs.map((t) => t.path)).toEqual([
        '/test/file1.lua',
        '/test/file2.lua',
      ])
    })

    it('should keep the specified tab and all pinned tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
        result.current.openTab('/test/file4.lua', 'file4.lua')
        result.current.pinTab('/test/file1.lua')
        result.current.pinTab('/test/file3.lua')
      })

      // Act - close others except file2
      act(() => {
        result.current.closeOthers('/test/file2.lua')
      })

      // Assert - pinned tabs and file2 remain
      expect(result.current.tabs.map((t) => t.path)).toEqual([
        '/test/file1.lua',
        '/test/file3.lua',
        '/test/file2.lua',
      ])
    })

    it('should set activeTab to the kept tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file1.lua', 'file1.lua')
        result.current.openTab('/test/file2.lua', 'file2.lua')
        result.current.openTab('/test/file3.lua', 'file3.lua')
      })

      // Act
      act(() => {
        result.current.closeOthers('/test/file1.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/test/file1.lua')
    })
  })
})
