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
