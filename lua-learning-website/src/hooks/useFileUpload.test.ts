import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useFileUpload } from './useFileUpload'

describe('useFileUpload', () => {
  describe('triggerFileUpload', () => {
    it('should create a file input element and trigger click', () => {
      // Arrange
      const { result } = renderHook(() => useFileUpload())
      const clickSpy = vi.fn()
      const mockInput = document.createElement('input')
      mockInput.click = clickSpy

      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockInput)

      // Act
      act(() => {
        result.current.triggerFileUpload('/target/folder', vi.fn())
      })

      // Assert
      expect(mockInput.type).toBe('file')
      expect(mockInput.multiple).toBe(true)
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should register change event listener on input', () => {
      // Arrange
      const { result } = renderHook(() => useFileUpload())
      const mockInput = document.createElement('input')
      const addEventListenerSpy = vi.spyOn(mockInput, 'addEventListener')

      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockInput)

      // Act
      act(() => {
        result.current.triggerFileUpload('/target/folder', vi.fn())
      })

      // Assert
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
    })
  })

  describe('file reading', () => {
    it('should call onFilesUploaded with file data when files are selected', async () => {
      // Arrange
      const onFilesUploaded = vi.fn()
      const { result } = renderHook(() => useFileUpload())
      const mockInput = document.createElement('input')

      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockInput)

      // Create mock file
      const mockFile = new File(['file content'], 'test.lua', { type: 'text/plain' })

      // Act - trigger the upload
      act(() => {
        result.current.triggerFileUpload('/target/folder', onFilesUploaded)
      })

      // Simulate file selection by dispatching change event
      await act(async () => {
        // Use Object.defineProperty to set files
        Object.defineProperty(mockInput, 'files', {
          value: [mockFile],
          writable: false,
        })

        // Dispatch change event
        mockInput.dispatchEvent(new Event('change'))

        // Wait for FileReader to complete
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      // Assert
      expect(onFilesUploaded).toHaveBeenCalledWith('/target/folder', [
        { name: 'test.lua', content: 'file content' },
      ])
    })

    it('should handle multiple file selection', async () => {
      // Arrange
      const onFilesUploaded = vi.fn()
      const { result } = renderHook(() => useFileUpload())
      const mockInput = document.createElement('input')

      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockInput)

      // Create mock files
      const mockFile1 = new File(['content1'], 'file1.lua', { type: 'text/plain' })
      const mockFile2 = new File(['content2'], 'file2.lua', { type: 'text/plain' })

      // Act
      act(() => {
        result.current.triggerFileUpload('/target/folder', onFilesUploaded)
      })

      await act(async () => {
        Object.defineProperty(mockInput, 'files', {
          value: [mockFile1, mockFile2],
          writable: false,
        })
        mockInput.dispatchEvent(new Event('change'))
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      // Assert - files may be in any order due to async reading
      expect(onFilesUploaded).toHaveBeenCalledTimes(1)
      const [targetPath, files] = onFilesUploaded.mock.calls[0]
      expect(targetPath).toBe('/target/folder')
      expect(files).toHaveLength(2)
      expect(files.map((f: { name: string }) => f.name).sort()).toEqual(['file1.lua', 'file2.lua'])
    })

    it('should handle empty file selection', async () => {
      // Arrange
      const onFilesUploaded = vi.fn()
      const { result } = renderHook(() => useFileUpload())
      const mockInput = document.createElement('input')

      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockInput)

      // Act
      act(() => {
        result.current.triggerFileUpload('/target/folder', onFilesUploaded)
      })

      await act(async () => {
        Object.defineProperty(mockInput, 'files', {
          value: [],
          writable: false,
        })
        mockInput.dispatchEvent(new Event('change'))
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      // Assert - should not call callback with empty files
      expect(onFilesUploaded).not.toHaveBeenCalled()
    })

    it('should handle null files property', async () => {
      // Arrange
      const onFilesUploaded = vi.fn()
      const { result } = renderHook(() => useFileUpload())
      const mockInput = document.createElement('input')

      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockInput)

      // Act
      act(() => {
        result.current.triggerFileUpload('/target/folder', onFilesUploaded)
      })

      await act(async () => {
        // files is null by default
        mockInput.dispatchEvent(new Event('change'))
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      // Assert - should not call callback
      expect(onFilesUploaded).not.toHaveBeenCalled()
    })
  })
})
