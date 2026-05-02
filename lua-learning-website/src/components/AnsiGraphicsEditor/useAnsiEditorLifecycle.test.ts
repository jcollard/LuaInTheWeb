import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnsiEditor } from './useAnsiEditor'

vi.mock('./pngImport', () => ({
  loadPngPixels: vi.fn(),
  rgbaToAnsiGrid: vi.fn(),
}))

describe('useAnsiEditor lifecycle', () => {
  describe('playback cleanup on unmount', () => {
    it('should clear playback timer when unmounted during playback', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
      const { result, unmount } = renderHook(() => useAnsiEditor())
      act(() => result.current.togglePlayback())
      expect(result.current.isPlaying).toBe(true)
      clearTimeoutSpy.mockClear()
      unmount()
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })
  })

  describe('document keydown listener cleanup on unmount', () => {
    it('should remove the document keydown listener when unmounted after onTerminalReady', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const { result, unmount } = renderHook(() => useAnsiEditor())

      // Simulate terminal becoming ready with a mock container
      const mockContainer = document.createElement('div')
      act(() => {
        result.current.onTerminalReady({
          write: vi.fn(),
          container: mockContainer, scrollContainer: mockContainer,
          dispose: vi.fn(),
          setCrt: vi.fn(),
        })
      })

      removeEventListenerSpy.mockClear()
      unmount()

      const keydownRemovals = removeEventListenerSpy.mock.calls
        .filter(([event]) => event === 'keydown')
      expect(keydownRemovals.length).toBeGreaterThanOrEqual(1)

      removeEventListenerSpy.mockRestore()
    })

    it('should not call preventDefault on spacebar after unmount', () => {
      const { result, unmount } = renderHook(() => useAnsiEditor())

      const mockContainer = document.createElement('div')
      act(() => {
        result.current.onTerminalReady({
          write: vi.fn(),
          container: mockContainer, scrollContainer: mockContainer,
          dispose: vi.fn(),
          setCrt: vi.fn(),
        })
      })

      unmount()

      const spaceEvent = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
      document.dispatchEvent(spaceEvent)

      expect(spaceEvent.defaultPrevented).toBe(false)
    })
  })

  describe('importPngAsLayer error handling', () => {
    it('should show toast when PNG import fails', async () => {
      const { loadPngPixels } = await import('./pngImport')
      vi.mocked(loadPngPixels).mockRejectedValueOnce(new Error('corrupt PNG'))
      const onShowToast = vi.fn()
      const { result } = renderHook(() => useAnsiEditor({ onShowToast }))
      await act(async () => {
        await result.current.importPngAsLayer(new File([], 'test.png'))
      })
      expect(onShowToast).toHaveBeenCalledWith('Failed to import image')
    })
  })
})
