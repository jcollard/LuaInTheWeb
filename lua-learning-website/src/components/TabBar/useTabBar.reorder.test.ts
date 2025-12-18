import { renderHook, act } from '@testing-library/react'
import { useTabBar } from './useTabBar'

describe('useTabBar - reorderTab', () => {
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

describe('useTabBar - closeToRight', () => {
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

describe('useTabBar - closeOthers', () => {
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
