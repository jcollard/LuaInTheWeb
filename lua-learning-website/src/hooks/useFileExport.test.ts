import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFileExport } from './useFileExport'

describe('useFileExport', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>
  let createdAnchors: HTMLAnchorElement[] = []
  let originalCreateElement: typeof document.createElement

  beforeEach(() => {
    createdAnchors = []

    // Mock URL.createObjectURL and revokeObjectURL
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    mockRevokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })

    // Save original and create spy for createElement
    originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'a') {
        vi.spyOn(element as HTMLAnchorElement, 'click').mockImplementation(() => {})
        createdAnchors.push(element as HTMLAnchorElement)
      }
      return element
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    createdAnchors = []
  })

  describe('exportFile', () => {
    it('should create a blob with the file content', () => {
      const { result } = renderHook(() => useFileExport())

      act(() => {
        result.current.exportFile('print("hello")', 'test.lua')
      })

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
      const blob = mockCreateObjectURL.mock.calls[0][0] as Blob
      expect(blob.type).toBe('text/plain')
    })

    it('should set the download filename', () => {
      const { result } = renderHook(() => useFileExport())

      act(() => {
        result.current.exportFile('print("hello")', 'my-script.lua')
      })

      expect(createdAnchors).toHaveLength(1)
      expect(createdAnchors[0].download).toBe('my-script.lua')
    })

    it('should trigger a click on the anchor element', () => {
      const { result } = renderHook(() => useFileExport())

      act(() => {
        result.current.exportFile('print("hello")', 'test.lua')
      })

      expect(createdAnchors).toHaveLength(1)
      expect(createdAnchors[0].click).toHaveBeenCalled()
    })

    it('should clean up after download', () => {
      const { result } = renderHook(() => useFileExport())

      act(() => {
        result.current.exportFile('print("hello")', 'test.lua')
      })

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should use .lua extension by default if no extension provided', () => {
      const { result } = renderHook(() => useFileExport())

      act(() => {
        result.current.exportFile('print("hello")', 'my-script')
      })

      expect(createdAnchors).toHaveLength(1)
      expect(createdAnchors[0].download).toBe('my-script.lua')
    })

    it('should handle filenames with path separators', () => {
      const { result } = renderHook(() => useFileExport())

      act(() => {
        result.current.exportFile('print("hello")', '/src/scripts/test.lua')
      })

      // Should extract just the filename
      expect(createdAnchors).toHaveLength(1)
      expect(createdAnchors[0].download).toBe('test.lua')
    })

    it('should sanitize filenames with invalid characters', () => {
      const { result } = renderHook(() => useFileExport())

      act(() => {
        result.current.exportFile('print("hello")', 'my<script>:test?.lua')
      })

      // Should remove invalid filename characters
      expect(createdAnchors).toHaveLength(1)
      expect(createdAnchors[0].download).toBe('myscripttest.lua')
    })

    it('should set the href to the blob URL', () => {
      const { result } = renderHook(() => useFileExport())

      act(() => {
        result.current.exportFile('print("hello")', 'test.lua')
      })

      expect(createdAnchors).toHaveLength(1)
      expect(createdAnchors[0].href).toContain('blob:mock-url')
    })
  })

  describe('canExport', () => {
    it('should return true when content is provided', () => {
      const { result } = renderHook(() => useFileExport())

      expect(result.current.canExport('print("hello")')).toBe(true)
    })

    it('should return false when content is empty', () => {
      const { result } = renderHook(() => useFileExport())

      expect(result.current.canExport('')).toBe(false)
    })

    it('should return false when content is undefined', () => {
      const { result } = renderHook(() => useFileExport())

      expect(result.current.canExport(undefined)).toBe(false)
    })

    it('should return false when content is whitespace only', () => {
      const { result } = renderHook(() => useFileExport())

      expect(result.current.canExport('   \n\t  ')).toBe(false)
    })
  })
})
