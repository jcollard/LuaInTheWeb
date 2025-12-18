import { renderHook, act } from '@testing-library/react'
import { useTabBar } from './useTabBar'

describe('useTabBar - pinned tabs', () => {
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
