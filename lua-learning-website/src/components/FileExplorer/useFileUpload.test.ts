import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { useFileUpload } from './useFileUpload'

describe('useFileUpload', () => {
  it('should return fileInputRef', () => {
    const { result } = renderHook(() => useFileUpload({ onFilesSelected: vi.fn() }))
    expect(result.current.fileInputRef).toBeDefined()
    expect(result.current.fileInputRef.current).toBeNull()
  })

  it('should store target path when triggerUpload is called', () => {
    const { result } = renderHook(() => useFileUpload({ onFilesSelected: vi.fn() }))

    // Create a mock input element
    const mockInput = { click: vi.fn(), value: '' }
    // @ts-expect-error - assigning mock to ref
    result.current.fileInputRef.current = mockInput

    act(() => {
      result.current.triggerUpload('/workspace')
    })

    expect(mockInput.click).toHaveBeenCalled()
  })

  it('should call onFilesSelected when files are selected', () => {
    const onFilesSelected = vi.fn()
    const { result } = renderHook(() => useFileUpload({ onFilesSelected }))

    // Set target path first
    const mockInput = { click: vi.fn(), value: '' }
    // @ts-expect-error - assigning mock to ref
    result.current.fileInputRef.current = mockInput

    act(() => {
      result.current.triggerUpload('/workspace')
    })

    // Simulate file selection
    const mockFiles = [new File(['content'], 'test.txt')] as unknown as FileList
    const mockEvent = {
      target: { files: mockFiles, value: 'test.txt' },
    } as unknown as React.ChangeEvent<HTMLInputElement>

    act(() => {
      result.current.handleFileSelect(mockEvent)
    })

    expect(onFilesSelected).toHaveBeenCalledWith(mockFiles, '/workspace')
  })

  it('should reset input value after file selection', () => {
    const onFilesSelected = vi.fn()
    const { result } = renderHook(() => useFileUpload({ onFilesSelected }))

    const mockInput = { click: vi.fn(), value: 'test.txt' }
    // @ts-expect-error - assigning mock to ref
    result.current.fileInputRef.current = mockInput

    act(() => {
      result.current.triggerUpload('/workspace')
    })

    const mockFiles = [new File(['content'], 'test.txt')] as unknown as FileList
    const mockEventTarget = { files: mockFiles, value: 'test.txt' }
    const mockEvent = {
      target: mockEventTarget,
    } as unknown as React.ChangeEvent<HTMLInputElement>

    act(() => {
      result.current.handleFileSelect(mockEvent)
    })

    // Input value should be reset to allow selecting the same file again
    expect(mockEventTarget.value).toBe('')
  })

  it('should not call onFilesSelected if no files selected', () => {
    const onFilesSelected = vi.fn()
    const { result } = renderHook(() => useFileUpload({ onFilesSelected }))

    const mockInput = { click: vi.fn(), value: '' }
    // @ts-expect-error - assigning mock to ref
    result.current.fileInputRef.current = mockInput

    act(() => {
      result.current.triggerUpload('/workspace')
    })

    // Simulate canceling file picker (no files)
    const mockEvent = {
      target: { files: null, value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>

    act(() => {
      result.current.handleFileSelect(mockEvent)
    })

    expect(onFilesSelected).not.toHaveBeenCalled()
  })

  it('should not call onFilesSelected if empty file list', () => {
    const onFilesSelected = vi.fn()
    const { result } = renderHook(() => useFileUpload({ onFilesSelected }))

    const mockInput = { click: vi.fn(), value: '' }
    // @ts-expect-error - assigning mock to ref
    result.current.fileInputRef.current = mockInput

    act(() => {
      result.current.triggerUpload('/workspace')
    })

    // Simulate empty file list
    const mockFiles = { length: 0 } as FileList
    const mockEvent = {
      target: { files: mockFiles, value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>

    act(() => {
      result.current.handleFileSelect(mockEvent)
    })

    expect(onFilesSelected).not.toHaveBeenCalled()
  })

  describe('folder upload', () => {
    it('should return folderInputRef', () => {
      const { result } = renderHook(() =>
        useFileUpload({ onFilesSelected: vi.fn(), onFolderSelected: vi.fn() })
      )
      expect(result.current.folderInputRef).toBeDefined()
      expect(result.current.folderInputRef!.current).toBeNull()
    })

    it('should store target path when triggerFolderUpload is called', () => {
      const { result } = renderHook(() =>
        useFileUpload({ onFilesSelected: vi.fn(), onFolderSelected: vi.fn() })
      )

      const mockInput = { click: vi.fn(), value: '' }
      // @ts-expect-error - assigning mock to ref
      result.current.folderInputRef!.current = mockInput

      act(() => {
        result.current.triggerFolderUpload!('/workspace')
      })

      expect(mockInput.click).toHaveBeenCalled()
    })

    it('should call onFolderSelected when folder is selected', () => {
      const onFolderSelected = vi.fn()
      const { result } = renderHook(() =>
        useFileUpload({ onFilesSelected: vi.fn(), onFolderSelected })
      )

      const mockInput = { click: vi.fn(), value: '' }
      // @ts-expect-error - assigning mock to ref
      result.current.folderInputRef!.current = mockInput

      act(() => {
        result.current.triggerFolderUpload!('/workspace')
      })

      // Simulate folder selection with webkitRelativePath
      const mockFiles = [
        { name: 'file1.lua', webkitRelativePath: 'folder/file1.lua' },
        { name: 'file2.lua', webkitRelativePath: 'folder/file2.lua' },
      ] as unknown as FileList
      Object.defineProperty(mockFiles, 'length', { value: 2 })

      const mockEvent = {
        target: { files: mockFiles, value: 'C:\\fake\\folder' },
      } as unknown as React.ChangeEvent<HTMLInputElement>

      act(() => {
        result.current.handleFolderSelect!(mockEvent)
      })

      expect(onFolderSelected).toHaveBeenCalledWith(mockFiles, '/workspace')
    })

    it('should reset folder input value after selection', () => {
      const onFolderSelected = vi.fn()
      const { result } = renderHook(() =>
        useFileUpload({ onFilesSelected: vi.fn(), onFolderSelected })
      )

      const mockInput = { click: vi.fn(), value: '' }
      // @ts-expect-error - assigning mock to ref
      result.current.folderInputRef!.current = mockInput

      act(() => {
        result.current.triggerFolderUpload!('/workspace')
      })

      const mockFiles = [{ name: 'file.lua', webkitRelativePath: 'folder/file.lua' }]
      Object.defineProperty(mockFiles, 'length', { value: 1 })

      const mockEventTarget = { files: mockFiles, value: 'C:\\fake\\folder' }
      const mockEvent = {
        target: mockEventTarget,
      } as unknown as React.ChangeEvent<HTMLInputElement>

      act(() => {
        result.current.handleFolderSelect!(mockEvent)
      })

      expect(mockEventTarget.value).toBe('')
    })

    it('should not call onFolderSelected if no files selected', () => {
      const onFolderSelected = vi.fn()
      const { result } = renderHook(() =>
        useFileUpload({ onFilesSelected: vi.fn(), onFolderSelected })
      )

      const mockInput = { click: vi.fn(), value: '' }
      // @ts-expect-error - assigning mock to ref
      result.current.folderInputRef!.current = mockInput

      act(() => {
        result.current.triggerFolderUpload!('/workspace')
      })

      const mockEvent = {
        target: { files: null, value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>

      act(() => {
        result.current.handleFolderSelect!(mockEvent)
      })

      expect(onFolderSelected).not.toHaveBeenCalled()
    })

    it('should not expose folder methods when onFolderSelected is not provided', () => {
      const { result } = renderHook(() => useFileUpload({ onFilesSelected: vi.fn() }))

      // These should be undefined when onFolderSelected is not provided
      expect(result.current.folderInputRef).toBeUndefined()
      expect(result.current.triggerFolderUpload).toBeUndefined()
      expect(result.current.handleFolderSelect).toBeUndefined()
    })
  })
})
