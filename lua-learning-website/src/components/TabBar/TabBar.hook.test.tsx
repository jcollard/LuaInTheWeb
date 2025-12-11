import { vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTabBar } from './useTabBar'

describe('useTabBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('tab management', () => {
    it('should initialize with empty tabs', () => {
      // Arrange & Act
      const { result } = renderHook(() => useTabBar())

      // Assert
      expect(result.current.tabs).toEqual([])
      expect(result.current.activeTab).toBeNull()
    })

    it('should open new tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0]).toMatchObject({
        path: '/main.lua',
        name: 'main.lua',
      })
    })

    it('should set active tab when opening', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/main.lua')
    })

    it('should not duplicate tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
        result.current.openTab('/main.lua', 'main.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
    })

    it('should close tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
        result.current.openTab('/config.lua', 'config.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/main.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/config.lua')
    })

    it('should select next tab when closing active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
        result.current.openTab('/c.lua', 'c.lua')
        result.current.selectTab('/b.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/b.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/c.lua')
    })

    it('should not change tabs when closing non-existent tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/nonexistent.lua')
      })

      // Assert - tabs unchanged
      expect(result.current.tabs).toHaveLength(2)
      expect(result.current.activeTab).toBe('/b.lua')
    })

    it('should not change activeTab when closing non-active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
        result.current.openTab('/c.lua', 'c.lua')
        result.current.selectTab('/a.lua')
      })

      // Act - close non-active tab
      act(() => {
        result.current.closeTab('/b.lua')
      })

      // Assert - activeTab unchanged
      expect(result.current.tabs).toHaveLength(2)
      expect(result.current.activeTab).toBe('/a.lua')
    })

    it('should set activeTab to null when closing the only tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/only.lua', 'only.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/only.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(0)
      expect(result.current.activeTab).toBeNull()
    })

    it('should select last tab when closing last tab in list', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
        result.current.openTab('/c.lua', 'c.lua')
        // c.lua is active (last opened)
      })

      // Act - close the last tab (c.lua which is also active)
      act(() => {
        result.current.closeTab('/c.lua')
      })

      // Assert - should select b.lua (the new last tab)
      expect(result.current.activeTab).toBe('/b.lua')
    })
  })

  describe('dirty state', () => {
    it('should track dirty state per tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
      })

      // Act
      act(() => {
        result.current.setDirty('/main.lua', true)
      })

      // Assert
      expect(result.current.tabs[0].isDirty).toBe(true)
    })

    it('should clear dirty state', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
        result.current.setDirty('/main.lua', true)
      })

      // Act
      act(() => {
        result.current.setDirty('/main.lua', false)
      })

      // Assert
      expect(result.current.tabs[0].isDirty).toBe(false)
    })

    it('should only update dirty state for matching path', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
        result.current.setDirty('/a.lua', true)
      })

      // Act - set dirty on b.lua only
      act(() => {
        result.current.setDirty('/b.lua', true)
      })

      // Assert - both should be dirty, showing path matching works
      expect(result.current.tabs[0].isDirty).toBe(true) // a.lua
      expect(result.current.tabs[1].isDirty).toBe(true) // b.lua
    })

    it('should not affect other tabs when setting dirty state', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
      })

      // Act - set dirty on b.lua only
      act(() => {
        result.current.setDirty('/b.lua', true)
      })

      // Assert - a.lua should still be clean
      expect(result.current.tabs[0].isDirty).toBe(false) // a.lua unchanged
      expect(result.current.tabs[1].isDirty).toBe(true) // b.lua dirty
    })
  })

  describe('renameTab', () => {
    it('should rename tab path and name', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/old.lua', 'old.lua')
      })

      // Act
      act(() => {
        result.current.renameTab('/old.lua', '/new.lua', 'new.lua')
      })

      // Assert
      expect(result.current.tabs[0].path).toBe('/new.lua')
      expect(result.current.tabs[0].name).toBe('new.lua')
    })

    it('should update activeTab when renaming active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/old.lua', 'old.lua')
      })
      expect(result.current.activeTab).toBe('/old.lua')

      // Act
      act(() => {
        result.current.renameTab('/old.lua', '/new.lua', 'new.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/new.lua')
    })

    it('should not change activeTab when renaming inactive tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
        result.current.selectTab('/a.lua')
      })
      expect(result.current.activeTab).toBe('/a.lua')

      // Act - rename inactive tab b.lua
      act(() => {
        result.current.renameTab('/b.lua', '/c.lua', 'c.lua')
      })

      // Assert - activeTab should still be a.lua
      expect(result.current.activeTab).toBe('/a.lua')
      expect(result.current.tabs[1].path).toBe('/c.lua')
    })

    it('should only rename matching tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
      })

      // Act - rename b.lua
      act(() => {
        result.current.renameTab('/b.lua', '/c.lua', 'c.lua')
      })

      // Assert - a.lua should be unchanged
      expect(result.current.tabs[0].path).toBe('/a.lua')
      expect(result.current.tabs[0].name).toBe('a.lua')
      expect(result.current.tabs[1].path).toBe('/c.lua')
      expect(result.current.tabs[1].name).toBe('c.lua')
    })
  })
})
