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

/**
 * Tests for scroll persistence when switching between file tabs and canvas tabs.
 * This test file covers Issue #371: Canvas tab scroll preservation.
 */
describe('useEditorScrollPersistence - canvas tab transitions', () => {
  // Fresh import for each test to reset module-level state
  let useEditorScrollPersistence: typeof import('./useEditorScrollPersistence').useEditorScrollPersistence

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    // Re-import to get fresh module-level scrollPositions Map
    const module = await import('./useEditorScrollPersistence')
    useEditorScrollPersistence = module.useEditorScrollPersistence
  })

  describe('switching from canvas tab to editor tab', () => {
    it('should restore scroll position when returning from canvas tab', async () => {
      // This test simulates the specific canvas tab scenario from issue #371:
      // 1. User is on file1.lua at scroll position 500
      // 2. User runs a game (opens canvas tab) - editor unmounts
      // 3. User exits the game (canvas closes) - editor remounts
      // 4. Scroll position should be restored to 500

      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/game.lua' } }
      )

      // Editor mounts for game.lua
      const mockEditor1 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor1))
      })

      // Initial content load
      act(() => {
        mockEditor1._triggerContentChange()
      })

      // User scrolls to position 500 (triggers scroll listener to save position)
      act(() => {
        mockEditor1._scrollTo(500)
      })

      // User runs the game - canvas tab opens
      // Canvas tabs have a special path format: canvas://id
      rerender({ activeTab: 'canvas://game' })

      // Editor unmounts (canvas takes over)
      act(() => {
        result.current.setEditor(null)
      })

      // User exits the game - canvas closes, returns to file
      rerender({ activeTab: '/game.lua' })

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

      // Should restore to 500
      expect(mockEditor2.setScrollTop).toHaveBeenCalledWith(500)
    })

    it('should preserve scroll for multiple files during canvas session', async () => {
      // This test simulates:
      // 1. User opens file1.lua and scrolls to 100
      // 2. User opens file2.lua and scrolls to 200
      // 3. User runs game (canvas tab)
      // 4. User returns to file1.lua - should be at 100
      // 5. User switches to file2.lua - should be at 200

      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      // Editor mounts for file1
      const mockEditor1 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor1))
      })
      act(() => {
        mockEditor1._triggerContentChange()
      })
      act(() => {
        mockEditor1._scrollTo(100)
      })

      // Switch to file2
      rerender({ activeTab: '/file2.lua' })
      act(() => {
        mockEditor1._triggerContentChange()
      })
      act(() => {
        mockEditor1._scrollTo(200)
      })

      // Open canvas tab
      rerender({ activeTab: 'canvas://game' })
      act(() => {
        result.current.setEditor(null)
      })

      // Return to file1
      rerender({ activeTab: '/file1.lua' })
      const mockEditor2 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor2))
      })
      act(() => {
        mockEditor2._triggerContentChange()
      })

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore to 100 for file1
      expect(mockEditor2.setScrollTop).toHaveBeenCalledWith(100)

      // Now switch to file2
      rerender({ activeTab: '/file2.lua' })
      act(() => {
        mockEditor2._triggerContentChange()
      })

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore to 200 for file2
      expect(mockEditor2.setScrollTop).toHaveBeenCalledWith(200)
    })

    it('should handle rapid canvas open/close without losing scroll position', async () => {
      // Edge case: User quickly opens and closes canvas

      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file.lua' } }
      )

      const mockEditor = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })
      act(() => {
        mockEditor._triggerContentChange()
      })
      act(() => {
        mockEditor._scrollTo(350)
      })

      // Rapid canvas open
      rerender({ activeTab: 'canvas://game' })
      act(() => {
        result.current.setEditor(null)
      })

      // Rapid canvas close
      rerender({ activeTab: '/file.lua' })

      const mockEditor2 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor2))
      })
      act(() => {
        mockEditor2._triggerContentChange()
      })

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should still restore to 350
      expect(mockEditor2.setScrollTop).toHaveBeenCalledWith(350)
    })

    it('should restore scroll even when Monaco does not fire content change event', async () => {
      // This test simulates the REAL bug scenario:
      // When @monaco-editor/react initializes, it sets the content BEFORE
      // calling onMount, so our onDidChangeModelContent listener misses
      // the initial content. We need to restore scroll in setEditor
      // after registering listeners.

      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file.lua' } }
      )

      const mockEditor1 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor1))
      })
      act(() => {
        mockEditor1._triggerContentChange()
      })
      act(() => {
        mockEditor1._scrollTo(600)
      })

      // Open canvas
      rerender({ activeTab: 'canvas://game' })
      act(() => {
        result.current.setEditor(null)
      })

      // Return to file
      rerender({ activeTab: '/file.lua' })

      // Editor remounts - but this time Monaco doesn't fire onDidChangeModelContent
      // because the content was set during initialization before our listener was added
      const mockEditor2 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor2))
      })

      // IMPORTANTLY: We do NOT call mockEditor2._triggerContentChange()
      // This simulates the real bug where Monaco doesn't fire the event

      // Run requestAnimationFrame callbacks - need to wait for:
      // 1. First RAF in setEditor (Monaco initialization)
      // 2. Second RAF in setEditor (Monaco auto-scroll complete)
      // 3. First RAF inside restoreScrollForTab
      // 4. Second RAF inside restoreScrollForTab (clear isRestoring)
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should still restore to 600 even without content change event
      expect(mockEditor2.setScrollTop).toHaveBeenCalledWith(600)
    })
  })

  describe('edge cases and error handling', () => {
    it('should not restore scroll when there is no pending scroll restore', async () => {
      const { result } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file.lua' } }
      )

      const mockEditor = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // Don't trigger any content change or scroll

      // Wait for any potential requestAnimationFrame
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should not have called setScrollTop since there's no pending restore
      // (on initial mount without previous scroll position)
      expect(mockEditor.setScrollTop).not.toHaveBeenCalled()
    })

    it('should not overwrite scroll position if event listener restores first', async () => {
      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file.lua' } }
      )

      const mockEditor1 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor1))
      })
      act(() => {
        mockEditor1._triggerContentChange()
      })
      act(() => {
        mockEditor1._scrollTo(700)
      })

      // Open canvas
      rerender({ activeTab: 'canvas://game' })
      act(() => {
        result.current.setEditor(null)
      })

      // Return to file
      rerender({ activeTab: '/file.lua' })

      const mockEditor2 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor2))
      })

      // Content change event fires immediately, restoring scroll
      act(() => {
        mockEditor2._triggerContentChange()
      })

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // The setTimeout fallback should not call setScrollTop again
      // because the event listener already restored and cleared pendingScrollRestoreRef
      // First call should be 700, no second call with same or different value
      expect(mockEditor2.setScrollTop).toHaveBeenCalledWith(700)
      expect(mockEditor2.setScrollTop).toHaveBeenCalledTimes(1)
    })

    it('should handle null activeTab gracefully', async () => {
      const { result, rerender } = renderHook(
        ({ activeTab }: { activeTab: string | null }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file.lua' as string | null } }
      )

      const mockEditor = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })
      act(() => {
        mockEditor._triggerContentChange()
      })
      act(() => {
        mockEditor._scrollTo(500)
      })

      // Set activeTab to null
      rerender({ activeTab: null })

      // Should not throw, scroll position for file.lua should be saved
      expect(mockEditor.onDidScrollChange).toHaveBeenCalled()

      // Switch back to file
      rerender({ activeTab: '/file.lua' })
      act(() => {
        mockEditor._triggerContentChange()
      })

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore the saved position
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(500)
    })

    it('should not save scroll during restoration phase', async () => {
      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      const mockEditor = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })
      act(() => {
        mockEditor._triggerContentChange()
      })
      act(() => {
        mockEditor._scrollTo(999)
      })

      // Switch to file2
      rerender({ activeTab: '/file2.lua' })

      // During restoration, if a scroll event happens (e.g., from Monaco adjusting),
      // it should NOT save over the previous file's position
      // The isRestoringRef should prevent saving
      act(() => {
        mockEditor._triggerContentChange()
      })

      // Simulate a scroll that happens during content load (Monaco auto-adjusts)
      // This happens before restoration completes
      act(() => {
        mockEditor._scrollTo(0) // Monaco might reset scroll during load
      })

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Now switch back to file1
      rerender({ activeTab: '/file1.lua' })
      act(() => {
        mockEditor._triggerContentChange()
      })

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore to 999, not 0
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(999)
    })

    it('should clear isRestoring flag after restoration completes', async () => {
      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file.lua' } }
      )

      const mockEditor1 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor1))
      })
      act(() => {
        mockEditor1._triggerContentChange()
      })
      act(() => {
        mockEditor1._scrollTo(800)
      })

      // Switch tabs to trigger restoration
      rerender({ activeTab: '/other.lua' })
      act(() => {
        mockEditor1._triggerContentChange()
      })

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Now scroll again - should save the new position
      act(() => {
        mockEditor1._scrollTo(100)
      })

      // Switch to canvas and back
      rerender({ activeTab: 'canvas://game' })
      act(() => {
        result.current.setEditor(null)
      })
      rerender({ activeTab: '/other.lua' })

      const mockEditor2 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor2))
      })
      act(() => {
        mockEditor2._triggerContentChange()
      })

      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore to 100 (the last saved position for /other.lua)
      expect(mockEditor2.setScrollTop).toHaveBeenCalledWith(100)
    })
  })
})
