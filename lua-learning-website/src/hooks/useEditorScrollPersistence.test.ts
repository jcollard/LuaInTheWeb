import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { editor } from 'monaco-editor'

// Mock Monaco editor - uses simplified types for testing
function createMockEditor(initialScrollTop = 0) {
  let scrollTop = initialScrollTop
  const contentChangeListeners: Array<() => void> = []
  const scrollChangeListeners: Array<() => void> = []
  const modelChangeListeners: Array<() => void> = []

  return {
    getScrollTop: vi.fn(() => scrollTop),
    setScrollTop: vi.fn((value: number) => { scrollTop = value }),
    onDidChangeModelContent: vi.fn((callback: () => void) => {
      contentChangeListeners.push(callback)
      return { dispose: vi.fn() }
    }),
    onDidScrollChange: vi.fn((callback: () => void) => {
      scrollChangeListeners.push(callback)
      return { dispose: vi.fn() }
    }),
    onDidChangeModel: vi.fn((callback: () => void) => {
      modelChangeListeners.push(callback)
      return { dispose: vi.fn() }
    }),
    // Helper to simulate content change
    _triggerContentChange: () => {
      contentChangeListeners.forEach(cb => cb())
    },
    // Helper to simulate model change
    _triggerModelChange: () => {
      modelChangeListeners.forEach(cb => cb())
    },
    // Helper to simulate scroll and trigger listeners
    _scrollTo: (position: number) => {
      scrollTop = position
      scrollChangeListeners.forEach(cb => cb())
    },
  }
}

// Helper to cast mock to editor type for setEditor calls
function asEditor(mock: ReturnType<typeof createMockEditor>): editor.IStandaloneCodeEditor {
  return mock as unknown as editor.IStandaloneCodeEditor
}

describe('useEditorScrollPersistence', () => {
  // Fresh import for each test to reset module-level state
  let useEditorScrollPersistence: typeof import('./useEditorScrollPersistence').useEditorScrollPersistence

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    // Re-import to get fresh module-level scrollPositions Map
    const module = await import('./useEditorScrollPersistence')
    useEditorScrollPersistence = module.useEditorScrollPersistence
  })

  describe('basic scroll persistence', () => {
    it('should save scroll position when switching tabs', async () => {
      const mockEditor = createMockEditor(0)

      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      // Set up editor
      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // Simulate scrolling to position 100 (this triggers the scroll listener)
      act(() => {
        mockEditor._scrollTo(100)
      })

      // Switch to another tab
      rerender({ activeTab: '/file2.lua' })

      // Should have saved the scroll position for file1 via onDidScrollChange
      expect(mockEditor.onDidScrollChange).toHaveBeenCalled()
    })

    it('should restore scroll position when switching back to a tab', async () => {
      const mockEditor = createMockEditor(0)

      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      // Set up editor
      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // Simulate scrolling to position 150 in file1
      act(() => {
        mockEditor._scrollTo(150)
      })

      // Switch to file2
      rerender({ activeTab: '/file2.lua' })

      // Simulate content change for file2
      act(() => {
        mockEditor._triggerContentChange()
      })

      // Now scroll file2 to position 300
      act(() => {
        mockEditor._scrollTo(300)
      })

      // Switch back to file1
      rerender({ activeTab: '/file1.lua' })

      // Simulate content change
      act(() => {
        mockEditor._triggerContentChange()
      })

      // Run requestAnimationFrame
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore scroll position for file1 (150)
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(150)
    })
  })

  describe('switching from markdown tab to editor tab', () => {
    it('should restore scroll position when editor mounts after being unmounted', async () => {
      // This test simulates:
      // 1. User is on file1.lua at scroll position 200
      // 2. User switches to a markdown tab (editor unmounts)
      // 3. User switches back to file1.lua (editor remounts)
      // 4. Scroll position should be restored to 200

      const mockEditor = createMockEditor(0)

      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      // Set up editor and scroll to position 200
      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })
      act(() => {
        mockEditor._scrollTo(200)
      })

      // Switch to markdown tab - editor will unmount
      // First, save the position by switching tabs
      rerender({ activeTab: '/readme.md' })

      // Simulate editor unmounting (set editor to null)
      act(() => {
        result.current.setEditor(null)
      })

      // Switch back to file1.lua
      rerender({ activeTab: '/file1.lua' })

      // Simulate editor remounting with fresh instance
      const newMockEditor = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(newMockEditor))
      })

      // Simulate content loading (triggers content change)
      act(() => {
        newMockEditor._triggerContentChange()
      })

      // Run requestAnimationFrame
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore scroll position for file1 (200)
      expect(newMockEditor.setScrollTop).toHaveBeenCalledWith(200)
    })

    it('should handle case where editor was never mounted for previous tab', async () => {
      // This test simulates:
      // 1. App starts with markdown tab active (editor never mounted)
      // 2. User had previously scrolled file1.lua to position 250
      // 3. User switches to file1.lua
      // 4. Editor mounts and should restore position 250

      // Start with markdown tab (no editor)
      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/readme.md' } }
      )

      // No editor is set (markdown preview is showing)

      // Now switch to file1.lua
      rerender({ activeTab: '/file1.lua' })

      // Editor mounts
      const mockEditor = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // Content loads
      act(() => {
        mockEditor._triggerContentChange()
      })

      // Run requestAnimationFrame
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Since file1 was never opened before, should scroll to top (0)
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(0)
    })

    it('should restore scroll when switching from markdown to previously-scrolled file', async () => {
      // This is the key bug scenario:
      // 1. Open file1.lua and scroll to position 300
      // 2. Switch to markdown preview (editor unmounts)
      // 3. Switch back to file1.lua (editor remounts)
      // 4. BUG: Scroll position should be 300, but it's 0

      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      // Editor mounts for file1.lua
      const mockEditor1 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor1))
      })

      // Initial content load
      act(() => {
        mockEditor1._triggerContentChange()
      })

      // User scrolls to position 300 (triggers scroll listener to save position)
      act(() => {
        mockEditor1._scrollTo(300)
      })

      // User clicks on markdown file - this saves scroll position and switches tab
      rerender({ activeTab: '/readme.md' })

      // Editor unmounts (markdown preview takes over)
      act(() => {
        result.current.setEditor(null)
      })

      // User clicks back on file1.lua
      rerender({ activeTab: '/file1.lua' })

      // Editor remounts with fresh instance
      const mockEditor2 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor2))
      })

      // Content loads in the new editor
      act(() => {
        mockEditor2._triggerContentChange()
      })

      // Run requestAnimationFrame
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore to 300 because scroll position was saved via onDidScrollChange
      expect(mockEditor2.setScrollTop).toHaveBeenCalledWith(300)
    })

    it('should save scroll position even when editor unmounts before useEffect runs', async () => {
      // This simulates the REAL bug scenario:
      // In React, useEffect runs AFTER DOM commits. By the time useEffect runs,
      // the EditorPanel has already unmounted. So we can't read scroll position
      // from a destroyed editor.
      //
      // The fix: track scroll position on every scroll event via onDidScrollChange

      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      // Editor mounts
      const mockEditor1 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor1))
      })

      // User scrolls to 400 (this triggers onDidScrollChange and saves position)
      act(() => {
        mockEditor1._scrollTo(400)
      })

      // SIMULATE REAL REACT BEHAVIOR:
      // When switching to markdown tab, the editor unmounts BEFORE useEffect runs
      // because conditional rendering (activeTabType !== 'markdown') is evaluated first

      // 1. Editor unmounts FIRST (simulating React's DOM commit before useEffect)
      act(() => {
        result.current.setEditor(null)
      })

      // 2. THEN useEffect runs with new activeTab
      rerender({ activeTab: '/readme.md' })

      // Now switch back to file1
      rerender({ activeTab: '/file1.lua' })

      // Editor remounts
      const mockEditor2 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor2))
      })

      // Content loads
      act(() => {
        mockEditor2._triggerContentChange()
      })

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // With the new implementation using onDidScrollChange, this should work
      // because scroll position was saved when user scrolled (before editor unmounted)
      expect(mockEditor2.setScrollTop).toHaveBeenCalledWith(400)
    })
  })

  // Canvas tab tests moved to useEditorScrollPersistence.canvas.test.ts

  describe('scroll to top for new files', () => {
    it('should scroll to top when opening a file for the first time', async () => {
      const mockEditor = createMockEditor(50) // Editor starts at some position

      const { result } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/newfile.lua' } }
      )

      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // Content loads
      act(() => {
        mockEditor._triggerContentChange()
      })

      // Run requestAnimationFrame
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should scroll to top for a new file
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(0)
    })
  })

  // Edge cases and error handling tests moved to useEditorScrollPersistence.canvas.test.ts
})
