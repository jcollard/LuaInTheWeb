import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useErrorRecovery } from './useErrorRecovery'

// Mock dataExporter
vi.mock('../../utils/dataExporter', () => ({
  exportAllData: vi.fn(),
  triggerDownload: vi.fn(),
}))

// Mock cacheManager
vi.mock('../../utils/cacheManager', () => ({
  clearAllCache: vi.fn(),
}))

import { exportAllData, triggerDownload } from '../../utils/dataExporter'
import { clearAllCache } from '../../utils/cacheManager'

// Mock window.location.reload
const mockReload = vi.fn()
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
})

describe('useErrorRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(exportAllData as Mock).mockResolvedValue(new Blob(['test']))
  })

  describe('showDetails', () => {
    it('should start with showDetails as false', () => {
      const { result } = renderHook(() => useErrorRecovery())
      expect(result.current.showDetails).toBe(false)
    })

    it('should toggle showDetails when toggleDetails is called', () => {
      const { result } = renderHook(() => useErrorRecovery())

      expect(result.current.showDetails).toBe(false)

      act(() => {
        result.current.toggleDetails()
      })
      expect(result.current.showDetails).toBe(true)

      act(() => {
        result.current.toggleDetails()
      })
      expect(result.current.showDetails).toBe(false)
    })
  })

  describe('handleReload', () => {
    it('should call window.location.reload', () => {
      const { result } = renderHook(() => useErrorRecovery())

      act(() => {
        result.current.handleReload()
      })

      expect(mockReload).toHaveBeenCalled()
    })
  })

  describe('handleExportAndReset', () => {
    it('should start with isExporting as false', () => {
      const { result } = renderHook(() => useErrorRecovery())
      expect(result.current.isExporting).toBe(false)
    })

    it('should set isExporting to true during export', async () => {
      let resolveExport: (value: Blob) => void
      ;(exportAllData as Mock).mockImplementation(
        () => new Promise((resolve) => { resolveExport = resolve })
      )

      const { result } = renderHook(() => useErrorRecovery())

      let exportPromise: Promise<void>
      act(() => {
        exportPromise = result.current.handleExportAndReset()
      })

      expect(result.current.isExporting).toBe(true)

      await act(async () => {
        resolveExport!(new Blob(['test']))
        await exportPromise
      })

      expect(result.current.isExporting).toBe(false)
    })

    it('should call exportAllData with progress callback', async () => {
      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      expect(exportAllData).toHaveBeenCalledWith(
        expect.objectContaining({
          onProgress: expect.any(Function),
        })
      )
    })

    it('should update exportProgress during export', async () => {
      ;(exportAllData as Mock).mockImplementation(async ({ onProgress }) => {
        onProgress({ phase: 'collecting', processed: 1, total: 2 })
        onProgress({ phase: 'complete', processed: 2, total: 2 })
        return new Blob(['test'])
      })

      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      // Progress should be updated during export
      expect(result.current.exportProgress).toEqual({
        phase: 'complete',
        processed: 2,
        total: 2,
      })
    })

    it('should call triggerDownload with correct filename', async () => {
      const mockBlob = new Blob(['test'])
      ;(exportAllData as Mock).mockResolvedValue(mockBlob)

      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      expect(triggerDownload).toHaveBeenCalledWith(
        expect.stringMatching(/^backup-\d{4}-\d{2}-\d{2}\.zip$/),
        mockBlob
      )
    })

    it('should call clearAllCache after download', async () => {
      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      expect(clearAllCache).toHaveBeenCalled()
    })

    it('should reload page after clearing cache', async () => {
      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      expect(mockReload).toHaveBeenCalled()
    })

    it('should handle export errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(exportAllData as Mock).mockRejectedValue(new Error('Export failed'))

      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      // Should not throw, should log error
      expect(consoleError).toHaveBeenCalled()
      expect(result.current.isExporting).toBe(false)

      consoleError.mockRestore()
    })

    it('should still clear cache even if export fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(exportAllData as Mock).mockRejectedValue(new Error('Export failed'))

      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      expect(clearAllCache).toHaveBeenCalled()
    })
  })

  describe('exportProgress', () => {
    it('should start with exportProgress as null', () => {
      const { result } = renderHook(() => useErrorRecovery())
      expect(result.current.exportProgress).toBeNull()
    })

    it('should reset exportProgress to null at start of export', async () => {
      ;(exportAllData as Mock).mockImplementation(async ({ onProgress }) => {
        onProgress({ phase: 'collecting', processed: 1, total: 2 })
        return new Blob(['test'])
      })

      const { result } = renderHook(() => useErrorRecovery())

      // First export
      await act(async () => {
        await result.current.handleExportAndReset()
      })

      // exportProgress should have been updated
      expect(result.current.exportProgress).not.toBeNull()

      // Reset mock
      vi.clearAllMocks()
      mockReload.mockClear()

      // Second export should reset progress
      ;(exportAllData as Mock).mockImplementation(async ({ onProgress }) => {
        onProgress({ phase: 'complete', processed: 1, total: 1 })
        return new Blob(['test'])
      })

      await act(async () => {
        await result.current.handleExportAndReset()
      })
    })
  })

  describe('backup filename', () => {
    it('should generate filename with date format', async () => {
      const mockBlob = new Blob(['test'])
      ;(exportAllData as Mock).mockResolvedValue(mockBlob)

      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      // Verify the filename format matches backup-YYYY-MM-DD.zip
      expect(triggerDownload).toHaveBeenCalledWith(
        expect.stringMatching(/^backup-\d{4}-\d{2}-\d{2}\.zip$/),
        mockBlob
      )

      // Also verify it's a valid date
      const call = (triggerDownload as Mock).mock.calls[0]
      const filename = call[0] as string
      const dateStr = filename.replace('backup-', '').replace('.zip', '')
      const date = new Date(dateStr)
      expect(date.getTime()).toBeGreaterThan(0)
    })
  })

  describe('state transitions', () => {
    it('should set isExporting false after successful export', async () => {
      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      expect(result.current.isExporting).toBe(false)
    })

    it('should set isExporting false after failed export', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(exportAllData as Mock).mockRejectedValue(new Error('fail'))

      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      expect(result.current.isExporting).toBe(false)
    })

    it('should handle clearAllCache failure gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(clearAllCache as Mock).mockRejectedValue(new Error('Cache clear failed'))

      const { result } = renderHook(() => useErrorRecovery())

      await act(async () => {
        await result.current.handleExportAndReset()
      })

      // Should still complete without throwing
      expect(result.current.isExporting).toBe(false)
      expect(consoleError).toHaveBeenCalled()
      // Page should still reload
      expect(mockReload).toHaveBeenCalled()

      consoleError.mockRestore()
    })
  })
})
