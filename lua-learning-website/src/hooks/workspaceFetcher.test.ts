import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWorkspaceContent, type WorkspaceManifest } from './workspaceFetcher'

describe('workspaceFetcher', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('fetchWorkspaceContent', () => {
    it('should fetch manifest and all text files', async () => {
      const manifest: WorkspaceManifest = {
        name: 'Test Workspace',
        files: ['file1.lua', 'file2.lua'],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifest),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('-- File 1 content'),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('-- File 2 content'),
        })

      const result = await fetchWorkspaceContent('/test-workspace')

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/test-workspace/manifest.json')
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/test-workspace/file1.lua')
      expect(mockFetch).toHaveBeenNthCalledWith(3, '/test-workspace/file2.lua')

      expect(result.text).toEqual({
        'file1.lua': '-- File 1 content',
        'file2.lua': '-- File 2 content',
      })
      expect(result.binary).toEqual({})
    })

    it('should return empty content if manifest fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await fetchWorkspaceContent('/missing-workspace')

      expect(result.text).toEqual({})
      expect(result.binary).toEqual({})
      // Should only call fetch once (for manifest) and not attempt file fetches
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should skip text files that fail to fetch', async () => {
      const manifest: WorkspaceManifest = {
        name: 'Test Workspace',
        files: ['good.lua', 'bad.lua', 'also-good.lua'],
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

      const result = await fetchWorkspaceContent('/test-workspace')

      expect(result.text).toEqual({
        'good.lua': 'Good content',
        'also-good.lua': 'Also good content',
      })
      // Verify bad.lua is not in the result
      expect(result.text['bad.lua']).toBeUndefined()
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchWorkspaceContent('/test-workspace')

      expect(result.text).toEqual({})
      expect(result.binary).toEqual({})
    })

    it('should handle empty manifest files array', async () => {
      const manifest: WorkspaceManifest = {
        name: 'Empty Workspace',
        files: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      })

      const result = await fetchWorkspaceContent('/empty-workspace')

      expect(result.text).toEqual({})
      expect(result.binary).toEqual({})
      // Should only call fetch once (for manifest) and not attempt file fetches
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle manifest with undefined files property', async () => {
      const manifest = {
        name: 'No Files Property',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      })

      const result = await fetchWorkspaceContent('/no-files')

      expect(result.text).toEqual({})
      expect(result.binary).toEqual({})
      // Should only call fetch once (for manifest) and not attempt file fetches
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle file fetch throwing error', async () => {
      const manifest: WorkspaceManifest = {
        name: 'Test Workspace',
        files: ['error-file.lua'],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifest),
        })
        .mockRejectedValueOnce(new Error('File fetch error'))

      const result = await fetchWorkspaceContent('/test-workspace')

      expect(result.text).toEqual({})
    })

    describe('binary file support', () => {
      it.each([
        ['image.png'],
        ['photo.jpg'],
        ['photo.jpeg'],
        ['animation.gif'],
        ['image.bmp'],
        ['photo.webp'],
        ['favicon.ico'],
      ])('should fetch %s as binary', async (filename) => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: [filename],
        }
        const mockArrayBuffer = new ArrayBuffer(4)

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(manifest),
          })
          .mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(mockArrayBuffer),
          })

        const result = await fetchWorkspaceContent('/test-workspace')

        expect(result.binary[filename]).toBeInstanceOf(Uint8Array)
        expect(result.text[filename]).toBeUndefined()
      })

      it('should treat unknown extensions as text files', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['data.json', 'script.lua', 'readme.txt'],
        }

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(manifest),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('{"key": "value"}'),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('print("hello")'),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('Read me!'),
          })

        const result = await fetchWorkspaceContent('/test-workspace')

        expect(result.text['data.json']).toBe('{"key": "value"}')
        expect(result.text['script.lua']).toBe('print("hello")')
        expect(result.text['readme.txt']).toBe('Read me!')
        expect(result.binary['data.json']).toBeUndefined()
        expect(result.binary['script.lua']).toBeUndefined()
        expect(result.binary['readme.txt']).toBeUndefined()
      })

      it('should treat files without extensions as text', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['Makefile', 'LICENSE', 'README'],
        }

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(manifest),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('all: build'),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('MIT License'),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('Project readme'),
          })

        const result = await fetchWorkspaceContent('/test-workspace')

        expect(result.text['Makefile']).toBe('all: build')
        expect(result.text['LICENSE']).toBe('MIT License')
        expect(result.text['README']).toBe('Project readme')
        expect(Object.keys(result.binary)).toHaveLength(0)
      })

      it('should handle mixed text and binary files', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Mixed Workspace',
          files: ['script.lua', 'image.png', 'readme.md'],
        }
        const mockArrayBuffer = new ArrayBuffer(4)

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(manifest),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('-- Lua code'),
          })
          .mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(mockArrayBuffer),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('# Readme'),
          })

        const result = await fetchWorkspaceContent('/test-workspace')

        expect(result.text).toEqual({
          'script.lua': '-- Lua code',
          'readme.md': '# Readme',
        })
        expect(result.binary['image.png']).toBeInstanceOf(Uint8Array)
      })

      it('should skip binary files that fail to fetch', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['good.png', 'bad.png'],
        }
        const mockArrayBuffer = new ArrayBuffer(4)

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(manifest),
          })
          .mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(mockArrayBuffer),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
          })

        const result = await fetchWorkspaceContent('/test-workspace')

        expect(result.binary['good.png']).toBeInstanceOf(Uint8Array)
        expect(result.binary['bad.png']).toBeUndefined()
      })

      it('should handle binary file fetch throwing error', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['error.png'],
        }

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(manifest),
          })
          .mockRejectedValueOnce(new Error('Network error'))

        const result = await fetchWorkspaceContent('/test-workspace')

        expect(result.binary).toEqual({})
      })

      it('should handle case-insensitive image extensions', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['IMAGE.PNG', 'Photo.JPG'],
        }
        const mockArrayBuffer = new ArrayBuffer(2)

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(manifest),
          })
          .mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(mockArrayBuffer),
          })
          .mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(mockArrayBuffer),
          })

        const result = await fetchWorkspaceContent('/test-workspace')

        expect(result.binary['IMAGE.PNG']).toBeInstanceOf(Uint8Array)
        expect(result.binary['Photo.JPG']).toBeInstanceOf(Uint8Array)
      })
    })
  })
})
