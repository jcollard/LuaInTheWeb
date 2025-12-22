import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { editor } from 'monaco-editor'

// Mock Monaco editor - uses simplified types for testing
function createMockEditor(initialScrollTop = 0) {
  let scrollTop = initialScrollTop
  const scrollChangeListeners: Array<() => void> = []
  const modelChangeListeners: Array<() => void> = []

  return {
    getScrollTop: vi.fn(() => scrollTop),
    setScrollTop: vi.fn((value: number) => { scrollTop = value }),
    onDidScrollChange: vi.fn((callback: () => void) => {
      scrollChangeListeners.push(callback)
      return { dispose: vi.fn() }
    }),
    onDidChangeModel: vi.fn((callback: () => void) => {
      modelChangeListeners.push(callback)
      return { dispose: vi.fn() }
    }),
    // Helper to simulate scroll and trigger listeners
    _scrollTo: (position: number) => {
      scrollTop = position
      scrollChangeListeners.forEach(cb => cb())
    },
    // Helper to simulate model change (document loaded)
    _triggerModelChange: () => {
      modelChangeListeners.forEach(cb => cb())
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

  describe('saving scroll positions', () => {
    it('should save scroll position when user scrolls', async () => {
      const mockEditor = createMockEditor(0)

      const { result } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // Wait for restoration period to complete (setTimeout + 2x RAF)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // User scrolls to position 100
      act(() => {
        mockEditor._scrollTo(100)
      })

      // Verify onDidScrollChange was called
      expect(mockEditor.onDidScrollChange).toHaveBeenCalled()
    })

    it('should not save scroll position for canvas tabs', async () => {
      const mockEditor = createMockEditor(0)

      const { result } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: 'canvas://game' } }
      )

      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // User scrolls
      act(() => {
        mockEditor._scrollTo(100)
      })

      // Should have registered listener but position should not be saved for canvas
      expect(mockEditor.onDidScrollChange).toHaveBeenCalled()
    })
  })

  describe('restoring scroll positions', () => {
    it('should restore scroll position when model changes', async () => {
      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      // First editor instance - scroll to 200
      const mockEditor1 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor1))
      })

      // Wait for restoration period to complete before scrolling
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      act(() => {
        mockEditor1._scrollTo(200)
      })

      // Switch to another file
      rerender({ activeTab: '/file2.lua' })
      act(() => {
        mockEditor1._triggerModelChange()
      })

      // Switch back to file1
      rerender({ activeTab: '/file1.lua' })
      act(() => {
        mockEditor1._triggerModelChange()
      })

      // Wait for RAF
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore to 200
      expect(mockEditor1.setScrollTop).toHaveBeenCalledWith(200)
    })

    it('should restore scroll position when switching tabs without model change event', async () => {
      // This tests the case where Monaco reuses cached models and doesn't fire onDidChangeModel
      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      const mockEditor = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // Wait for initial restoration period to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Scroll file1 to 250
      act(() => {
        mockEditor._scrollTo(250)
      })

      // Switch to file2 (no model change event - simulating cached model)
      rerender({ activeTab: '/file2.lua' })

      // Wait for RAF-based restoration
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Scroll file2 to 400
      act(() => {
        mockEditor._scrollTo(400)
      })

      // Switch back to file1 (no model change event - simulating cached model)
      mockEditor.setScrollTop.mockClear() // Clear previous calls
      rerender({ activeTab: '/file1.lua' })

      // Wait for RAF-based restoration
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore to 250 (file1's saved position), not 400 (file2's position)
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(250)
    })

    it('should not call setScrollTop if no saved position exists', async () => {
      const mockEditor = createMockEditor(0)

      const { result } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/newfile.lua' } }
      )

      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // Trigger model change for a file that was never scrolled
      act(() => {
        mockEditor._triggerModelChange()
      })

      // Wait for RAF
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should NOT call setScrollTop since there's no saved position
      expect(mockEditor.setScrollTop).not.toHaveBeenCalled()
    })

    it('should restore scroll position on editor remount', async () => {
      const { result } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      // First editor instance - scroll to 300
      const mockEditor1 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor1))
      })

      // Wait for restoration period to complete before scrolling
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      act(() => {
        mockEditor1._scrollTo(300)
      })

      // Editor unmounts
      act(() => {
        result.current.setEditor(null)
      })

      // Editor remounts with new instance
      const mockEditor2 = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor2))
      })

      // Wait for setTimeout + RAF
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore to 300
      expect(mockEditor2.setScrollTop).toHaveBeenCalledWith(300)
    })
  })

  describe('canvas tab handling', () => {
    it('should not restore scroll for canvas tabs', async () => {
      const mockEditor = createMockEditor(0)

      const { result } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: 'canvas://game' } }
      )

      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      act(() => {
        mockEditor._triggerModelChange()
      })

      // Wait for RAF
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should not call setScrollTop for canvas
      expect(mockEditor.setScrollTop).not.toHaveBeenCalled()
    })

    it('should restore scroll when returning from canvas to file', async () => {
      const { result, rerender } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/game.lua' } }
      )

      // Scroll file to 500
      const mockEditor = createMockEditor(0)
      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // Wait for restoration period to complete before scrolling
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      act(() => {
        mockEditor._scrollTo(500)
      })

      // Switch to canvas
      rerender({ activeTab: 'canvas://game' })

      // Switch back to file
      rerender({ activeTab: '/game.lua' })
      act(() => {
        mockEditor._triggerModelChange()
      })

      // Wait for RAF
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve))
      })

      // Should restore to 500
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(500)
    })
  })

  describe('cleanup', () => {
    it('should dispose listeners when editor is set to null', async () => {
      const mockEditor = createMockEditor(0)
      const scrollDispose = vi.fn()
      const modelDispose = vi.fn()
      mockEditor.onDidScrollChange = vi.fn(() => ({ dispose: scrollDispose }))
      mockEditor.onDidChangeModel = vi.fn(() => ({ dispose: modelDispose }))

      const { result } = renderHook(
        ({ activeTab }) => useEditorScrollPersistence({ activeTab }),
        { initialProps: { activeTab: '/file1.lua' } }
      )

      act(() => {
        result.current.setEditor(asEditor(mockEditor))
      })

      // Set editor to null
      act(() => {
        result.current.setEditor(null)
      })

      expect(scrollDispose).toHaveBeenCalled()
      expect(modelDispose).toHaveBeenCalled()
    })
  })
})
