import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchBookContent, type BookManifest } from './bookFetcher'

describe('bookFetcher', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('fetchBookContent', () => {
    it('should fetch manifest and all book files', async () => {
      const manifest: BookManifest = {
        name: 'Test Book',
        files: ['chapter1.md', 'chapter2.md'],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('# Chapter 1\nContent here'),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('# Chapter 2\nMore content'),
        })

      const result = await fetchBookContent('/test-book')

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/test-book/manifest.json')
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/test-book/chapter1.md')
      expect(mockFetch).toHaveBeenNthCalledWith(3, '/test-book/chapter2.md')

      expect(result).toEqual({
        'chapter1.md': '# Chapter 1\nContent here',
        'chapter2.md': '# Chapter 2\nMore content',
      })
    })

    it('should return empty object if manifest fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await fetchBookContent('/missing-book')

      expect(result).toEqual({})
    })

    it('should skip files that fail to fetch', async () => {
      const manifest: BookManifest = {
        name: 'Test Book',
        files: ['good.md', 'bad.md', 'also-good.md'],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('Good content'),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('Also good content'),
        })

      const result = await fetchBookContent('/test-book')

      expect(result).toEqual({
        'good.md': 'Good content',
        'also-good.md': 'Also good content',
      })
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchBookContent('/test-book')

      expect(result).toEqual({})
    })

    it('should handle empty manifest files array', async () => {
      const manifest: BookManifest = {
        name: 'Empty Book',
        files: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      })

      const result = await fetchBookContent('/empty-book')

      expect(result).toEqual({})
    })

    it('should handle manifest with undefined files property', async () => {
      const manifest = {
        name: 'No Files Property',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      })

      const result = await fetchBookContent('/no-files')

      expect(result).toEqual({})
    })

    it('should not include file when response.ok is false', async () => {
      const manifest: BookManifest = {
        name: 'Test Book',
        files: ['only-file.md'],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifest),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

      const result = await fetchBookContent('/test-book')

      expect(result).toEqual({})
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should handle file fetch throwing error', async () => {
      const manifest: BookManifest = {
        name: 'Test Book',
        files: ['error-file.md'],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifest),
        })
        .mockRejectedValueOnce(new Error('File fetch error'))

      const result = await fetchBookContent('/test-book')

      expect(result).toEqual({})
    })

    it('should construct correct file URLs from basePath', async () => {
      const manifest: BookManifest = {
        name: 'Test Book',
        files: ['nested/path/file.md'],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('content'),
        })

      await fetchBookContent('/base/path')

      expect(mockFetch).toHaveBeenNthCalledWith(2, '/base/path/nested/path/file.md')
    })

    it('should only make manifest request when manifest.ok is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await fetchBookContent('/missing')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/missing/manifest.json')
    })

    it('should return files when manifest.ok is true', async () => {
      const manifest: BookManifest = {
        name: 'Test',
        files: ['a.md'],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('file content'),
        })

      const result = await fetchBookContent('/test')

      expect(Object.keys(result)).toHaveLength(1)
      expect(result['a.md']).toBe('file content')
    })

    it('should return empty object immediately when manifest response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      })

      const result = await fetchBookContent('/forbidden')

      expect(result).toEqual({})
      // No file fetches should have been attempted
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should not return files when manifest.files length is 0', async () => {
      const manifest: BookManifest = {
        name: 'Empty',
        files: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      })

      const result = await fetchBookContent('/empty')

      expect(Object.keys(result)).toHaveLength(0)
      // Should not attempt to fetch any files
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should exclude files when their response.ok is false', async () => {
      const manifest: BookManifest = {
        name: 'Test',
        files: ['good.md', 'bad.md'],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('good file'),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })

      const result = await fetchBookContent('/test')

      expect(Object.keys(result)).toHaveLength(1)
      expect(result['good.md']).toBe('good file')
      expect(result['bad.md']).toBeUndefined()
    })
  })
})
