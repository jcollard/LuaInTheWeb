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

  describe('initial state with options', () => {
    it('should accept initial tabs', () => {
      // Arrange
      const initialTabs = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file' as const, isPinned: false, isPreview: false, isDirty: false },
        { path: '/file2.lua', name: 'file2.lua', type: 'file' as const, isPinned: true, isPreview: false, isDirty: false },
      ]

      // Act
      const { result } = renderHook(() => useTabBar({ initialTabs }))

      // Assert
      expect(result.current.tabs).toHaveLength(2)
      expect(result.current.tabs[0].path).toBe('/file1.lua')
      expect(result.current.tabs[1].path).toBe('/file2.lua')
    })

    it('should accept initial activeTab', () => {
      // Arrange
      const initialTabs = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file' as const, isPinned: false, isPreview: false, isDirty: false },
        { path: '/file2.lua', name: 'file2.lua', type: 'file' as const, isPinned: false, isPreview: false, isDirty: false },
      ]

      // Act
      const { result } = renderHook(() => useTabBar({ initialTabs, initialActiveTab: '/file2.lua' }))

      // Assert
      expect(result.current.activeTab).toBe('/file2.lua')
    })

    it('should preserve pinned state from initial tabs', () => {
      // Arrange
      const initialTabs = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file' as const, isPinned: true, isPreview: false, isDirty: false },
        { path: '/file2.lua', name: 'file2.lua', type: 'file' as const, isPinned: false, isPreview: false, isDirty: false },
      ]

      // Act
      const { result } = renderHook(() => useTabBar({ initialTabs }))

      // Assert
      expect(result.current.tabs[0].isPinned).toBe(true)
      expect(result.current.tabs[1].isPinned).toBe(false)
    })

    it('should preserve tab type from initial tabs', () => {
      // Arrange
      const initialTabs = [
        { path: '/file.lua', name: 'file.lua', type: 'file' as const, isPinned: false, isPreview: false, isDirty: false },
        { path: '/readme.md', name: 'readme.md', type: 'markdown' as const, isPinned: false, isPreview: false, isDirty: false },
      ]

      // Act
      const { result } = renderHook(() => useTabBar({ initialTabs }))

      // Assert
      expect(result.current.tabs[0].type).toBe('file')
      expect(result.current.tabs[1].type).toBe('markdown')
    })

    it('should preserve isPreview state from initial tabs', () => {
      // Arrange
      const initialTabs = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file' as const, isPinned: false, isPreview: true, isDirty: false },
        { path: '/file2.lua', name: 'file2.lua', type: 'file' as const, isPinned: false, isPreview: false, isDirty: false },
      ]

      // Act
      const { result } = renderHook(() => useTabBar({ initialTabs }))

      // Assert
      expect(result.current.tabs[0].isPreview).toBe(true)
      expect(result.current.tabs[1].isPreview).toBe(false)
    })

    it('should default to empty tabs when no initial state provided', () => {
      // Act
      const { result } = renderHook(() => useTabBar())

      // Assert
      expect(result.current.tabs).toEqual([])
    })

    it('should default to null activeTab when no initial state provided', () => {
      // Act
      const { result } = renderHook(() => useTabBar())

      // Assert
      expect(result.current.activeTab).toBeNull()
    })

    it('should allow opening new tabs after initialization with initial state', () => {
      // Arrange
      const initialTabs = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file' as const, isPinned: false, isPreview: false, isDirty: false },
      ]
      const { result } = renderHook(() => useTabBar({ initialTabs, initialActiveTab: '/file1.lua' }))

      // Act
      act(() => {
        result.current.openTab('/file2.lua', 'file2.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(2)
      expect(result.current.activeTab).toBe('/file2.lua')
    })

    it('should allow closing initial tabs', () => {
      // Arrange
      const initialTabs = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file' as const, isPinned: false, isPreview: false, isDirty: false },
        { path: '/file2.lua', name: 'file2.lua', type: 'file' as const, isPinned: false, isPreview: false, isDirty: false },
      ]
      const { result } = renderHook(() => useTabBar({ initialTabs, initialActiveTab: '/file1.lua' }))

      // Act
      act(() => {
        result.current.closeTab('/file1.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/file2.lua')
    })

    it('should default activeTab to null when initial tabs are empty', () => {
      // Act
      const { result } = renderHook(() => useTabBar({ initialTabs: [] }))

      // Assert
      expect(result.current.activeTab).toBeNull()
    })
  })

  describe('html tabs', () => {
    it('should open an html file as preview with type html', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openHtmlPreviewTab('/test/guide.html', 'guide.html')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0]).toEqual({
        path: '/test/guide.html',
        name: 'guide.html',
        isDirty: false,
        type: 'html',
        isPreview: true,
        isPinned: false,
      })
    })

    it('should replace existing html preview when opening new html preview', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openHtmlPreviewTab('/test/file1.html', 'file1.html')
      })

      expect(result.current.tabs).toHaveLength(1)

      // Act
      act(() => {
        result.current.openHtmlPreviewTab('/test/file2.html', 'file2.html')
      })

      // Assert - should replace the preview
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/test/file2.html')
      expect(result.current.tabs[0].type).toBe('html')
    })

    it('should not replace existing permanent html tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openHtmlPreviewTab('/test/file1.html', 'file1.html')
        result.current.makeTabPermanent('/test/file1.html')
      })

      expect(result.current.tabs[0].isPreview).toBe(false)

      // Act
      act(() => {
        result.current.openHtmlPreviewTab('/test/file2.html', 'file2.html')
      })

      // Assert - should add new tab, not replace
      expect(result.current.tabs).toHaveLength(2)
    })

    it('should return html type from getActiveTabType for html tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openHtmlPreviewTab('/test/guide.html', 'guide.html')
      })

      // Assert
      expect(result.current.getActiveTabType()).toBe('html')
    })

    it('should convert file tab to html tab with convertToHtmlTab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/guide.html', 'guide.html')
      })

      expect(result.current.tabs[0].type).toBe('file')

      // Act
      act(() => {
        result.current.convertToHtmlTab('/test/guide.html')
      })

      // Assert
      expect(result.current.tabs[0].type).toBe('html')
      expect(result.current.tabs[0].isPreview).toBe(false)
    })
  })
})
