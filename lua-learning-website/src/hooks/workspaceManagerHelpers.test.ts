/**
 * Tests for workspaceManagerHelpers - docs, library, book, and examples workspace functionality.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the lua-runtime module
vi.mock('@lua-learning/lua-runtime', () => ({
  LUA_SHELL_CODE: '-- mock shell code',
  LUA_CANVAS_CODE: '-- mock canvas code\nlocal canvas = {}\nfunction canvas.tick(callback) end\nfunction canvas.clear() end\nfunction canvas.set_color(r, g, b, a) end\nfunction canvas.rect(x, y, w, h) end\nfunction canvas.fill_rect(x, y, w, h) end\nfunction canvas.circle(x, y, r) end\nfunction canvas.fill_circle(x, y, r) end\nfunction canvas.line(x1, y1, x2, y2) end\nfunction canvas.text(x, y, text) end\nfunction canvas.get_delta() end\nfunction canvas.get_time() end\nfunction canvas.is_key_down(key) end\nfunction canvas.is_key_pressed(key) end\nfunction canvas.get_mouse_x() end\nfunction canvas.get_mouse_y() end\nfunction canvas.is_mouse_down(button) end\nreturn canvas',
}))

import {
  createDocsWorkspace,
  fetchAndCreateDocsWorkspace,
  createLibraryWorkspace,
  createBookWorkspace,
  fetchAndCreateBookWorkspace,
  createExamplesWorkspace,
  fetchAndCreateExamplesWorkspace,
  DOCS_WORKSPACE_ID,
  DOCS_MOUNT_PATH,
  LIBRARY_WORKSPACE_ID,
  LIBRARY_MOUNT_PATH,
  BOOK_WORKSPACE_ID,
  BOOK_MOUNT_PATH,
  BOOK_PUBLIC_PATH,
  EXAMPLES_WORKSPACE_ID,
  EXAMPLES_MOUNT_PATH,
  EXAMPLES_PUBLIC_PATH,
} from './workspaceManagerHelpers'

describe('workspaceManagerHelpers', () => {
  describe('createDocsWorkspace', () => {
    // Minimal mock files for testing workspace structure
    const mockDocsFiles: Record<string, string> = {
      'shell.md': '# Shell Library',
      'canvas.md': '# Canvas Library',
      'lua/basics.md': '# Lua Basics',
      'lua/string.md': '# String Library',
      'lua/table.md': '# Table Library',
      'lua/math.md': '# Math Library',
      'lua/io.md': '# IO Library',
    }

    it('creates a read-only docs workspace with correct properties and filesystem', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(workspace.id).toBe(DOCS_WORKSPACE_ID)
      expect(workspace.name).toBe('docs')
      expect(workspace.type).toBe('docs')
      expect(workspace.mountPath).toBe(DOCS_MOUNT_PATH)
      expect(workspace.status).toBe('connected')
      expect(workspace.isReadOnly).toBe(true)
      expect(workspace.filesystem).toBeDefined()
      expect(typeof workspace.filesystem.readFile).toBe('function')
    })

    it('filesystem is read-only (cannot write)', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(() => {
        workspace.filesystem.writeFile('test.md', 'content')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot create directory)', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(() => {
        workspace.filesystem.createDirectory('test')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot delete)', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(() => {
        workspace.filesystem.delete('shell.md')
      }).toThrow('read-only')
    })

    it('filesystem lists canvas.md, lua/, and shell.md in root directory', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const entries = workspace.filesystem.listDirectory('/')
      expect(entries).toHaveLength(3)
      // Directories come first, then files (sorted alphabetically)
      expect(entries[0].name).toBe('lua')
      expect(entries[0].type).toBe('directory')
      expect(entries[1].name).toBe('canvas.md')
      expect(entries[1].type).toBe('file')
      expect(entries[2].name).toBe('shell.md')
      expect(entries[2].type).toBe('file')
    })

    it('filesystem lists lua stdlib docs in lua/ directory', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const entries = workspace.filesystem.listDirectory('/lua')
      expect(entries.length).toBeGreaterThanOrEqual(5)
      const names = entries.map((e) => e.name)
      expect(names).toContain('basics.md')
      expect(names).toContain('string.md')
      expect(names).toContain('table.md')
      expect(names).toContain('math.md')
      expect(names).toContain('io.md')
    })
  })

  describe('fetchAndCreateDocsWorkspace', () => {
    const mockFetch = vi.fn()

    beforeEach(() => {
      vi.stubGlobal('fetch', mockFetch)
      mockFetch.mockReset()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns a workspace when fetch succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'Docs', files: ['shell.md'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('# Shell Library'),
        })

      const workspace = await fetchAndCreateDocsWorkspace()

      expect(workspace).not.toBeNull()
      expect(workspace?.id).toBe(DOCS_WORKSPACE_ID)
      expect(workspace?.type).toBe('docs')
    })

    it('returns null when manifest fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const workspace = await fetchAndCreateDocsWorkspace()

      expect(workspace).toBeNull()
    })

    it('returns null when no files are fetched', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'Empty', files: [] }),
      })

      const workspace = await fetchAndCreateDocsWorkspace()

      expect(workspace).toBeNull()
    })

    it('fetches from /docs manifest', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'Docs', files: ['shell.md'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('# Shell'),
        })

      await fetchAndCreateDocsWorkspace()

      expect(mockFetch).toHaveBeenNthCalledWith(1, '/docs/manifest.json')
    })

    it('creates workspace with fetched markdown files', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              name: 'Docs',
              files: ['shell.md', 'canvas.md'],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('# Shell Library'),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('# Canvas Library'),
        })

      const workspace = await fetchAndCreateDocsWorkspace()

      expect(workspace).not.toBeNull()
      expect(workspace?.filesystem.exists('shell.md')).toBe(true)
      expect(workspace?.filesystem.exists('canvas.md')).toBe(true)
    })
  })

  describe('createLibraryWorkspace', () => {
    // Minimal mock files for testing workspace structure
    const mockLibsFiles: Record<string, string> = {
      'shell.lua': '-- shell library',
      'canvas.lua': '-- canvas library',
    }

    it('creates a read-only library workspace with correct properties', () => {
      const workspace = createLibraryWorkspace(mockLibsFiles)
      expect(workspace.id).toBe(LIBRARY_WORKSPACE_ID)
      expect(workspace.name).toBe('libs')
      expect(workspace.type).toBe('library')
      expect(workspace.mountPath).toBe(LIBRARY_MOUNT_PATH)
      expect(workspace.status).toBe('connected')
      expect(workspace.isReadOnly).toBe(true)
    })

    it('filesystem lists shell.lua and canvas.lua in root directory', () => {
      const workspace = createLibraryWorkspace(mockLibsFiles)
      const entries = workspace.filesystem.listDirectory('/')
      expect(entries).toHaveLength(2)
      const names = entries.map((e) => e.name)
      expect(names).toContain('shell.lua')
      expect(names).toContain('canvas.lua')
    })

    it('filesystem is read-only (cannot write)', () => {
      const workspace = createLibraryWorkspace(mockLibsFiles)
      expect(() => {
        workspace.filesystem.writeFile('test.lua', 'content')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot delete)', () => {
      const workspace = createLibraryWorkspace(mockLibsFiles)
      expect(() => {
        workspace.filesystem.delete('canvas.lua')
      }).toThrow('read-only')
    })
  })

  describe('createBookWorkspace', () => {
    const mockFiles = {
      'chapter1.md': '# Chapter 1\nHello',
      'chapter2.md': '# Chapter 2\nWorld',
    }

    it('creates a read-only book workspace with correct properties and filesystem', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(workspace.id).toBe(BOOK_WORKSPACE_ID)
      expect(workspace.name).toBe('Adventures')
      expect(workspace.type).toBe('book')
      expect(workspace.mountPath).toBe(BOOK_MOUNT_PATH)
      expect(workspace.status).toBe('connected')
      expect(workspace.isReadOnly).toBe(true)
      expect(workspace.filesystem).toBeDefined()
      expect(typeof workspace.filesystem.readFile).toBe('function')
    })

    it('filesystem contains the provided files', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(workspace.filesystem.exists('chapter1.md')).toBe(true)
      expect(workspace.filesystem.exists('chapter2.md')).toBe(true)
    })

    it('filesystem can read file content', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(workspace.filesystem.readFile('chapter1.md')).toBe('# Chapter 1\nHello')
      expect(workspace.filesystem.readFile('chapter2.md')).toBe('# Chapter 2\nWorld')
    })

    it('filesystem is read-only (cannot write)', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(() => {
        workspace.filesystem.writeFile('test.md', 'content')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot create directory)', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(() => {
        workspace.filesystem.createDirectory('test')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot delete)', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(() => {
        workspace.filesystem.delete('chapter1.md')
      }).toThrow('read-only')
    })

    it('filesystem lists all files in root directory', () => {
      const workspace = createBookWorkspace(mockFiles)
      const entries = workspace.filesystem.listDirectory('/')
      expect(entries).toHaveLength(2)
      const names = entries.map((e) => e.name)
      expect(names).toContain('chapter1.md')
      expect(names).toContain('chapter2.md')
    })
  })

  describe('fetchAndCreateBookWorkspace', () => {
    const mockFetch = vi.fn()

    beforeEach(() => {
      vi.stubGlobal('fetch', mockFetch)
      mockFetch.mockReset()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns a workspace when fetch succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'Test', files: ['ch1.md'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('# Chapter 1'),
        })

      const workspace = await fetchAndCreateBookWorkspace()

      expect(workspace).not.toBeNull()
      expect(workspace?.id).toBe(BOOK_WORKSPACE_ID)
      expect(workspace?.type).toBe('book')
    })

    it('returns null when manifest fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const workspace = await fetchAndCreateBookWorkspace()

      expect(workspace).toBeNull()
    })

    it('returns null when no files are fetched', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'Empty', files: [] }),
      })

      const workspace = await fetchAndCreateBookWorkspace()

      expect(workspace).toBeNull()
    })

    it('fetches from BOOK_PUBLIC_PATH', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'Test', files: ['ch1.md'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('content'),
        })

      await fetchAndCreateBookWorkspace()

      expect(mockFetch).toHaveBeenNthCalledWith(1, `${BOOK_PUBLIC_PATH}/manifest.json`)
    })
  })

  describe('createExamplesWorkspace', () => {
    const mockTextFiles = {
      'hello.lua': 'print("Hello, World!")',
      'colors.lua': 'local shell = require("shell")\nshell.foreground(shell.RED)',
      'canvas/shapes.lua': 'local canvas = require("canvas")\ncanvas.fill_rect(0, 0, 100, 100)',
      'canvas/images/CREDITS.txt': 'Created by Kenney - CC0 License',
    }

    const mockBinaryFiles = {
      // PNG magic bytes + minimal data
      'canvas/images/ship.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    }

    it('creates a read-only examples workspace with correct properties and filesystem', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.id).toBe(EXAMPLES_WORKSPACE_ID)
      expect(workspace.name).toBe('examples')
      expect(workspace.type).toBe('examples')
      expect(workspace.mountPath).toBe(EXAMPLES_MOUNT_PATH)
      expect(workspace.status).toBe('connected')
      expect(workspace.isReadOnly).toBe(true)
      expect(workspace.filesystem).toBeDefined()
      expect(typeof workspace.filesystem.readFile).toBe('function')
    })

    it('filesystem contains the provided text files', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.filesystem.exists('hello.lua')).toBe(true)
      expect(workspace.filesystem.isFile('hello.lua')).toBe(true)
      expect(workspace.filesystem.exists('colors.lua')).toBe(true)
      expect(workspace.filesystem.isFile('colors.lua')).toBe(true)
    })

    it('filesystem can read text file content', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.filesystem.readFile('hello.lua')).toBe('print("Hello, World!")')
      expect(workspace.filesystem.readFile('colors.lua')).toContain('shell')
    })

    it('filesystem handles subdirectories', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.filesystem.exists('canvas')).toBe(true)
      expect(workspace.filesystem.isDirectory('canvas')).toBe(true)
      expect(workspace.filesystem.exists('canvas/shapes.lua')).toBe(true)
    })

    it('filesystem handles nested subdirectories', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.filesystem.exists('canvas/images')).toBe(true)
      expect(workspace.filesystem.isDirectory('canvas/images')).toBe(true)
      expect(workspace.filesystem.exists('canvas/images/CREDITS.txt')).toBe(true)
    })

    it('filesystem supports binary files when provided', () => {
      const workspace = createExamplesWorkspace(mockTextFiles, mockBinaryFiles)
      expect(workspace.filesystem.exists('canvas/images/ship.png')).toBe(true)
      expect(workspace.filesystem.isBinaryFile?.('canvas/images/ship.png')).toBe(true)
    })

    it('binary files can be read as Uint8Array', () => {
      const workspace = createExamplesWorkspace(mockTextFiles, mockBinaryFiles)
      const data = workspace.filesystem.readBinaryFile!('canvas/images/ship.png')
      expect(data).toBeInstanceOf(Uint8Array)
      // PNG magic bytes
      expect(data[0]).toBe(0x89)
      expect(data[1]).toBe(0x50)
      expect(data[2]).toBe(0x4e)
      expect(data[3]).toBe(0x47)
    })

    it('filesystem lists files and directories correctly', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      const rootEntries = workspace.filesystem.listDirectory('/')
      const names = rootEntries.map((e) => e.name)
      expect(names).toContain('hello.lua')
      expect(names).toContain('colors.lua')
      expect(names).toContain('canvas')
    })

    it('filesystem is read-only (cannot write)', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(() => {
        workspace.filesystem.writeFile('test.lua', 'content')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot create directory)', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(() => {
        workspace.filesystem.createDirectory('test')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot delete)', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(() => {
        workspace.filesystem.delete('hello.lua')
      }).toThrow('read-only')
    })
  })

  describe('fetchAndCreateExamplesWorkspace', () => {
    const mockFetch = vi.fn()

    beforeEach(() => {
      vi.stubGlobal('fetch', mockFetch)
      mockFetch.mockReset()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns a workspace when fetch succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'Examples', files: ['hello.lua'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('print("Hello")'),
        })

      const workspace = await fetchAndCreateExamplesWorkspace()

      expect(workspace).not.toBeNull()
      expect(workspace?.id).toBe(EXAMPLES_WORKSPACE_ID)
      expect(workspace?.type).toBe('examples')
    })

    it('returns null when manifest fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const workspace = await fetchAndCreateExamplesWorkspace()

      expect(workspace).toBeNull()
    })

    it('returns null when no files are fetched', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'Empty', files: [] }),
      })

      const workspace = await fetchAndCreateExamplesWorkspace()

      expect(workspace).toBeNull()
    })

    it('fetches from EXAMPLES_PUBLIC_PATH', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'Examples', files: ['hello.lua'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('print("Hello")'),
        })

      await fetchAndCreateExamplesWorkspace()

      expect(mockFetch).toHaveBeenNthCalledWith(1, `${EXAMPLES_PUBLIC_PATH}/manifest.json`)
    })

    it('creates workspace with fetched text and binary files', async () => {
      const mockBinaryData = new ArrayBuffer(8)
      const binaryView = new Uint8Array(mockBinaryData)
      binaryView.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              name: 'Examples',
              files: ['hello.lua', 'image.png'],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('print("Hello")'),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockBinaryData),
        })

      const workspace = await fetchAndCreateExamplesWorkspace()

      expect(workspace).not.toBeNull()
      expect(workspace?.filesystem.exists('hello.lua')).toBe(true)
      expect(workspace?.filesystem.exists('image.png')).toBe(true)
      expect(workspace?.filesystem.isBinaryFile?.('image.png')).toBe(true)
    })
  })
})
