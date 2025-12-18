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

    it('should not include text file when response.ok is false', async () => {
      const manifest: WorkspaceManifest = {
        name: 'Test Workspace',
        files: ['only-file.lua'],
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

      const result = await fetchWorkspaceContent('/test-workspace')

      expect(result.text).toEqual({})
      expect(Object.keys(result.text)).toHaveLength(0)
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

    it('should construct correct file URLs from basePath', async () => {
      const manifest: WorkspaceManifest = {
        name: 'Test Workspace',
        files: ['nested/path/file.lua'],
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

      await fetchWorkspaceContent('/base/path')

      expect(mockFetch).toHaveBeenNthCalledWith(2, '/base/path/nested/path/file.lua')
    })

    describe('binary file support', () => {
      it('should fetch PNG files as binary Uint8Array', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['image.png'],
        }
        const mockArrayBuffer = new ArrayBuffer(4)
        const view = new Uint8Array(mockArrayBuffer)
        view.set([0x89, 0x50, 0x4e, 0x47]) // PNG magic bytes

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

        expect(result.binary['image.png']).toBeInstanceOf(Uint8Array)
        expect(result.binary['image.png']).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))
        expect(result.text).toEqual({})
      })

      it('should fetch JPG files as binary', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['photo.jpg'],
        }
        const mockArrayBuffer = new ArrayBuffer(2)
        const view = new Uint8Array(mockArrayBuffer)
        view.set([0xff, 0xd8]) // JPG magic bytes

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

        expect(result.binary['photo.jpg']).toBeInstanceOf(Uint8Array)
      })

      it('should fetch JPEG files as binary', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['photo.jpeg'],
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

        const result = await fetchWorkspaceContent('/test-workspace')

        expect(result.binary['photo.jpeg']).toBeInstanceOf(Uint8Array)
      })

      it('should fetch GIF files as binary', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['animation.gif'],
        }
        const mockArrayBuffer = new ArrayBuffer(3)

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

        expect(result.binary['animation.gif']).toBeInstanceOf(Uint8Array)
      })

      it('should fetch BMP files as binary', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['image.bmp'],
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

        const result = await fetchWorkspaceContent('/test-workspace')

        expect(result.binary['image.bmp']).toBeInstanceOf(Uint8Array)
        expect(result.text['image.bmp']).toBeUndefined()
      })

      it('should fetch WEBP files as binary', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['photo.webp'],
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

        expect(result.binary['photo.webp']).toBeInstanceOf(Uint8Array)
        expect(result.text['photo.webp']).toBeUndefined()
      })

      it('should fetch ICO files as binary', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['favicon.ico'],
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

        const result = await fetchWorkspaceContent('/test-workspace')

        expect(result.binary['favicon.ico']).toBeInstanceOf(Uint8Array)
        expect(result.text['favicon.ico']).toBeUndefined()
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

      it('should handle nested binary file paths', async () => {
        const manifest: WorkspaceManifest = {
          name: 'Test Workspace',
          files: ['assets/images/logo.png'],
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

        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          '/test-workspace/assets/images/logo.png'
        )
        expect(result.binary['assets/images/logo.png']).toBeInstanceOf(Uint8Array)
      })
    })
  })
})
