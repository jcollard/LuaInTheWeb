/* eslint-disable max-lines */
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
  createLibraryWorkspace,
  createBookWorkspace,
  fetchAndCreateBookWorkspace,
  createExamplesWorkspace,
  DOCS_WORKSPACE_ID,
  DOCS_WORKSPACE_NAME,
  DOCS_MOUNT_PATH,
  LIBRARY_WORKSPACE_ID,
  LIBRARY_WORKSPACE_NAME,
  LIBRARY_MOUNT_PATH,
  BOOK_WORKSPACE_ID,
  BOOK_WORKSPACE_NAME,
  BOOK_MOUNT_PATH,
  BOOK_PUBLIC_PATH,
  EXAMPLES_WORKSPACE_ID,
  EXAMPLES_WORKSPACE_NAME,
  EXAMPLES_MOUNT_PATH,
} from './workspaceManagerHelpers'

describe('workspaceManagerHelpers', () => {
  describe('docs workspace constants', () => {
    it('has DOCS_WORKSPACE_ID set to "docs"', () => {
      expect(DOCS_WORKSPACE_ID).toBe('docs')
    })

    it('has DOCS_WORKSPACE_NAME set to "docs"', () => {
      expect(DOCS_WORKSPACE_NAME).toBe('docs')
    })

    it('has DOCS_MOUNT_PATH set to "/docs"', () => {
      expect(DOCS_MOUNT_PATH).toBe('/docs')
    })
  })

  describe('createDocsWorkspace', () => {
    it('creates a workspace with id DOCS_WORKSPACE_ID', () => {
      const workspace = createDocsWorkspace()
      expect(workspace.id).toBe(DOCS_WORKSPACE_ID)
    })

    it('creates a workspace with name DOCS_WORKSPACE_NAME', () => {
      const workspace = createDocsWorkspace()
      expect(workspace.name).toBe(DOCS_WORKSPACE_NAME)
    })

    it('creates a workspace with type "docs"', () => {
      const workspace = createDocsWorkspace()
      expect(workspace.type).toBe('docs')
    })

    it('creates a workspace with mountPath DOCS_MOUNT_PATH', () => {
      const workspace = createDocsWorkspace()
      expect(workspace.mountPath).toBe(DOCS_MOUNT_PATH)
    })

    it('creates a workspace with status "connected"', () => {
      const workspace = createDocsWorkspace()
      expect(workspace.status).toBe('connected')
    })

    it('creates a workspace with isReadOnly set to true', () => {
      const workspace = createDocsWorkspace()
      expect(workspace.isReadOnly).toBe(true)
    })

    it('creates a workspace with a filesystem', () => {
      const workspace = createDocsWorkspace()
      expect(workspace.filesystem).toBeDefined()
      expect(typeof workspace.filesystem.readFile).toBe('function')
    })

    it('filesystem contains shell.md file', () => {
      const workspace = createDocsWorkspace()
      expect(workspace.filesystem.exists('shell.md')).toBe(true)
      expect(workspace.filesystem.isFile('shell.md')).toBe(true)
    })

    it('shell.md contains shell library documentation', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('# Shell Library')
      expect(content).toContain('require')
      expect(content).toContain('shell')
    })

    it('shell.md documents color constants', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('shell.BLACK')
      expect(content).toContain('shell.RED')
      expect(content).toContain('shell.GREEN')
    })

    it('shell.md documents screen control functions', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('shell.clear()')
    })

    it('shell.md documents color control functions', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('shell.foreground')
      expect(content).toContain('shell.background')
      expect(content).toContain('shell.reset')
    })

    it('shell.md documents cursor control functions', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('shell.set_cursor')
      expect(content).toContain('shell.cursor_up')
      expect(content).toContain('shell.cursor_down')
      expect(content).toContain('shell.cursor_left')
      expect(content).toContain('shell.cursor_right')
      expect(content).toContain('shell.save_cursor')
      expect(content).toContain('shell.restore_cursor')
      expect(content).toContain('shell.hide_cursor')
      expect(content).toContain('shell.show_cursor')
    })

    it('shell.md documents terminal dimension functions', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('shell.width')
      expect(content).toContain('shell.height')
    })

    it('shell.md contains usage examples', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('shell.md')
      // Check for code examples (lua code blocks)
      expect(content).toContain('```lua')
    })

    it('filesystem is read-only (cannot write)', () => {
      const workspace = createDocsWorkspace()
      expect(() => {
        workspace.filesystem.writeFile('test.md', 'content')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot create directory)', () => {
      const workspace = createDocsWorkspace()
      expect(() => {
        workspace.filesystem.createDirectory('test')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot delete)', () => {
      const workspace = createDocsWorkspace()
      expect(() => {
        workspace.filesystem.delete('shell.md')
      }).toThrow('read-only')
    })

    it('filesystem lists canvas.md, lua/, and shell.md in root directory', () => {
      const workspace = createDocsWorkspace()
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
      const workspace = createDocsWorkspace()
      const entries = workspace.filesystem.listDirectory('/lua')
      expect(entries.length).toBeGreaterThanOrEqual(5)
      const names = entries.map((e) => e.name)
      expect(names).toContain('basics.md')
      expect(names).toContain('string.md')
      expect(names).toContain('table.md')
      expect(names).toContain('math.md')
      expect(names).toContain('io.md')
    })

    it('filesystem contains canvas.md file', () => {
      const workspace = createDocsWorkspace()
      expect(workspace.filesystem.exists('canvas.md')).toBe(true)
      expect(workspace.filesystem.isFile('canvas.md')).toBe(true)
    })

    it('canvas.md contains canvas library documentation', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('# Canvas Library')
      expect(content).toContain('require')
      expect(content).toContain('canvas')
    })

    it('canvas.md documents drawing functions', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('canvas.clear')
      expect(content).toContain('canvas.set_color')
      expect(content).toContain('canvas.draw_rect')
      expect(content).toContain('canvas.fill_rect')
      expect(content).toContain('canvas.draw_circle')
      expect(content).toContain('canvas.fill_circle')
      expect(content).toContain('canvas.draw_line')
      expect(content).toContain('canvas.draw_text')
    })

    it('canvas.md documents timing functions', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('canvas.get_delta')
      expect(content).toContain('canvas.get_time')
    })

    it('canvas.md documents keyboard input functions', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('canvas.is_key_down')
      expect(content).toContain('canvas.is_key_pressed')
    })

    it('canvas.md documents mouse input functions', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('canvas.get_mouse_x')
      expect(content).toContain('canvas.get_mouse_y')
      expect(content).toContain('canvas.is_mouse_down')
    })

    it('canvas.md documents game loop', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('canvas.tick')
    })

    it('canvas.md contains usage examples', () => {
      const workspace = createDocsWorkspace()
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('```lua')
    })
  })

  describe('createLibraryWorkspace', () => {
    it('creates a workspace with id LIBRARY_WORKSPACE_ID', () => {
      const workspace = createLibraryWorkspace()
      expect(workspace.id).toBe(LIBRARY_WORKSPACE_ID)
    })

    it('creates a workspace with name LIBRARY_WORKSPACE_NAME', () => {
      const workspace = createLibraryWorkspace()
      expect(workspace.name).toBe(LIBRARY_WORKSPACE_NAME)
    })

    it('creates a workspace with type "library"', () => {
      const workspace = createLibraryWorkspace()
      expect(workspace.type).toBe('library')
    })

    it('creates a workspace with mountPath LIBRARY_MOUNT_PATH', () => {
      const workspace = createLibraryWorkspace()
      expect(workspace.mountPath).toBe(LIBRARY_MOUNT_PATH)
    })

    it('creates a workspace with status "connected"', () => {
      const workspace = createLibraryWorkspace()
      expect(workspace.status).toBe('connected')
    })

    it('creates a workspace with isReadOnly set to true', () => {
      const workspace = createLibraryWorkspace()
      expect(workspace.isReadOnly).toBe(true)
    })

    it('filesystem contains shell.lua file', () => {
      const workspace = createLibraryWorkspace()
      expect(workspace.filesystem.exists('shell.lua')).toBe(true)
      expect(workspace.filesystem.isFile('shell.lua')).toBe(true)
    })

    it('filesystem contains canvas.lua file', () => {
      const workspace = createLibraryWorkspace()
      expect(workspace.filesystem.exists('canvas.lua')).toBe(true)
      expect(workspace.filesystem.isFile('canvas.lua')).toBe(true)
    })

    it('canvas.lua contains canvas library code', () => {
      const workspace = createLibraryWorkspace()
      const content = workspace.filesystem.readFile('canvas.lua')
      expect(content).toContain('canvas')
      expect(content).toContain('canvas.tick')
    })

    it('canvas.lua documents drawing functions', () => {
      const workspace = createLibraryWorkspace()
      const content = workspace.filesystem.readFile('canvas.lua')
      expect(content).toContain('canvas.clear')
      expect(content).toContain('canvas.set_color')
      expect(content).toContain('canvas.rect')
      expect(content).toContain('canvas.fill_rect')
    })

    it('canvas.lua documents timing functions', () => {
      const workspace = createLibraryWorkspace()
      const content = workspace.filesystem.readFile('canvas.lua')
      expect(content).toContain('canvas.get_delta')
      expect(content).toContain('canvas.get_time')
    })

    it('canvas.lua documents input functions', () => {
      const workspace = createLibraryWorkspace()
      const content = workspace.filesystem.readFile('canvas.lua')
      expect(content).toContain('canvas.is_key_down')
      expect(content).toContain('canvas.is_key_pressed')
      expect(content).toContain('canvas.get_mouse_x')
      expect(content).toContain('canvas.get_mouse_y')
      expect(content).toContain('canvas.is_mouse_down')
    })

    it('filesystem lists shell.lua and canvas.lua in root directory', () => {
      const workspace = createLibraryWorkspace()
      const entries = workspace.filesystem.listDirectory('/')
      expect(entries).toHaveLength(2)
      const names = entries.map((e) => e.name)
      expect(names).toContain('shell.lua')
      expect(names).toContain('canvas.lua')
    })

    it('filesystem is read-only (cannot write)', () => {
      const workspace = createLibraryWorkspace()
      expect(() => {
        workspace.filesystem.writeFile('test.lua', 'content')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot delete)', () => {
      const workspace = createLibraryWorkspace()
      expect(() => {
        workspace.filesystem.delete('canvas.lua')
      }).toThrow('read-only')
    })
  })

  describe('book workspace constants', () => {
    it('has BOOK_WORKSPACE_ID set to "adventures"', () => {
      expect(BOOK_WORKSPACE_ID).toBe('adventures')
    })

    it('has BOOK_WORKSPACE_NAME set to "Adventures"', () => {
      expect(BOOK_WORKSPACE_NAME).toBe('Adventures')
    })

    it('has BOOK_MOUNT_PATH set to "/adventures"', () => {
      expect(BOOK_MOUNT_PATH).toBe('/adventures')
    })

    it('has BOOK_PUBLIC_PATH set to "/adventures-in-lua-book"', () => {
      expect(BOOK_PUBLIC_PATH).toBe('/adventures-in-lua-book')
    })
  })

  describe('createBookWorkspace', () => {
    const mockFiles = {
      'chapter1.md': '# Chapter 1\nHello',
      'chapter2.md': '# Chapter 2\nWorld',
    }

    it('creates a workspace with id BOOK_WORKSPACE_ID', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(workspace.id).toBe(BOOK_WORKSPACE_ID)
    })

    it('creates a workspace with name BOOK_WORKSPACE_NAME', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(workspace.name).toBe(BOOK_WORKSPACE_NAME)
    })

    it('creates a workspace with type "book"', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(workspace.type).toBe('book')
    })

    it('creates a workspace with mountPath BOOK_MOUNT_PATH', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(workspace.mountPath).toBe(BOOK_MOUNT_PATH)
    })

    it('creates a workspace with status "connected"', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(workspace.status).toBe('connected')
    })

    it('creates a workspace with isReadOnly set to true', () => {
      const workspace = createBookWorkspace(mockFiles)
      expect(workspace.isReadOnly).toBe(true)
    })

    it('creates a workspace with a filesystem', () => {
      const workspace = createBookWorkspace(mockFiles)
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

  describe('examples workspace constants', () => {
    it('has EXAMPLES_WORKSPACE_ID set to "examples"', () => {
      expect(EXAMPLES_WORKSPACE_ID).toBe('examples')
    })

    it('has EXAMPLES_WORKSPACE_NAME set to "examples"', () => {
      expect(EXAMPLES_WORKSPACE_NAME).toBe('examples')
    })

    it('has EXAMPLES_MOUNT_PATH set to "/examples"', () => {
      expect(EXAMPLES_MOUNT_PATH).toBe('/examples')
    })
  })

  describe('createExamplesWorkspace', () => {
    it('creates a workspace with id EXAMPLES_WORKSPACE_ID', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.id).toBe(EXAMPLES_WORKSPACE_ID)
    })

    it('creates a workspace with name EXAMPLES_WORKSPACE_NAME', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.name).toBe(EXAMPLES_WORKSPACE_NAME)
    })

    it('creates a workspace with type "examples"', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.type).toBe('examples')
    })

    it('creates a workspace with mountPath EXAMPLES_MOUNT_PATH', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.mountPath).toBe(EXAMPLES_MOUNT_PATH)
    })

    it('creates a workspace with status "connected"', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.status).toBe('connected')
    })

    it('creates a workspace with isReadOnly set to true', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.isReadOnly).toBe(true)
    })

    it('creates a workspace with a filesystem', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.filesystem).toBeDefined()
      expect(typeof workspace.filesystem.readFile).toBe('function')
    })

    it('filesystem contains hello.lua file', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.filesystem.exists('hello.lua')).toBe(true)
      expect(workspace.filesystem.isFile('hello.lua')).toBe(true)
    })

    it('filesystem contains colors.lua file', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.filesystem.exists('colors.lua')).toBe(true)
      expect(workspace.filesystem.isFile('colors.lua')).toBe(true)
    })

    it('filesystem contains mad_takes.lua file', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.filesystem.exists('mad_takes.lua')).toBe(true)
      expect(workspace.filesystem.isFile('mad_takes.lua')).toBe(true)
    })

    it('filesystem contains adventure.lua file', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.filesystem.exists('adventure.lua')).toBe(true)
      expect(workspace.filesystem.isFile('adventure.lua')).toBe(true)
    })

    it('filesystem contains ascii_world.lua file', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.filesystem.exists('ascii_world.lua')).toBe(true)
      expect(workspace.filesystem.isFile('ascii_world.lua')).toBe(true)
    })

    it('filesystem contains shapes.lua file', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.filesystem.exists('shapes.lua')).toBe(true)
      expect(workspace.filesystem.isFile('shapes.lua')).toBe(true)
    })

    it('filesystem contains canvas_demo.lua file', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.filesystem.exists('canvas_demo.lua')).toBe(true)
      expect(workspace.filesystem.isFile('canvas_demo.lua')).toBe(true)
    })

    it('filesystem lists 7 example files and 1 subdirectory in root', () => {
      const workspace = createExamplesWorkspace()
      const entries = workspace.filesystem.listDirectory('/')
      expect(entries).toHaveLength(8)
      const names = entries.map((e) => e.name)
      // Files
      expect(names).toContain('hello.lua')
      expect(names).toContain('colors.lua')
      expect(names).toContain('mad_takes.lua')
      expect(names).toContain('adventure.lua')
      expect(names).toContain('ascii_world.lua')
      expect(names).toContain('shapes.lua')
      expect(names).toContain('canvas_demo.lua')
      // Subdirectory
      expect(names).toContain('ascii_world')
    })

    it('ascii_world directory exists', () => {
      const workspace = createExamplesWorkspace()
      expect(workspace.filesystem.exists('ascii_world')).toBe(true)
      expect(workspace.filesystem.isDirectory('ascii_world')).toBe(true)
    })

    it('ascii_world directory contains 9 files', () => {
      const workspace = createExamplesWorkspace()
      const entries = workspace.filesystem.listDirectory('/ascii_world')
      expect(entries).toHaveLength(9)
      const names = entries.map((e) => e.name)
      expect(names).toContain('config.lua')
      expect(names).toContain('ui.lua')
      expect(names).toContain('player.lua')
      expect(names).toContain('items.lua')
      expect(names).toContain('maps.lua')
      expect(names).toContain('monsters.lua')
      expect(names).toContain('combat.lua')
      expect(names).toContain('game.lua')
      expect(names).toContain('EXTENSIONS.md')
    })

    it('ascii_world/config.lua contains game configuration', () => {
      const workspace = createExamplesWorkspace()
      const content = workspace.filesystem.readFile('ascii_world/config.lua')
      expect(content).toContain('config')
      expect(content).toContain('colors')
    })

    it('ascii_world/game.lua contains game loop', () => {
      const workspace = createExamplesWorkspace()
      const content = workspace.filesystem.readFile('ascii_world/game.lua')
      expect(content).toContain('game')
      expect(content).toContain('function')
    })

    it('hello.lua contains a simple Hello World program', () => {
      const workspace = createExamplesWorkspace()
      const content = workspace.filesystem.readFile('hello.lua')
      expect(content).toContain('print')
      expect(content.toLowerCase()).toContain('hello')
    })

    it('colors.lua demonstrates shell library colors', () => {
      const workspace = createExamplesWorkspace()
      const content = workspace.filesystem.readFile('colors.lua')
      expect(content).toContain('require')
      expect(content).toContain('shell')
    })

    it('mad_takes.lua demonstrates user input with shell colors', () => {
      const workspace = createExamplesWorkspace()
      const content = workspace.filesystem.readFile('mad_takes.lua')
      expect(content).toContain('io.read')
    })

    it('adventure.lua demonstrates text adventure with functions', () => {
      const workspace = createExamplesWorkspace()
      const content = workspace.filesystem.readFile('adventure.lua')
      expect(content).toContain('function')
    })

    it('ascii_world.lua is entry point that requires game module', () => {
      const workspace = createExamplesWorkspace()
      const content = workspace.filesystem.readFile('ascii_world.lua')
      expect(content).toContain('require')
      expect(content).toContain('ascii_world/game')
    })

    it('shapes.lua demonstrates canvas drawing', () => {
      const workspace = createExamplesWorkspace()
      const content = workspace.filesystem.readFile('shapes.lua')
      expect(content).toContain('require')
      expect(content).toContain('canvas')
    })

    it('canvas_demo.lua demonstrates comprehensive canvas API', () => {
      const workspace = createExamplesWorkspace()
      const content = workspace.filesystem.readFile('canvas_demo.lua')
      expect(content).toContain('require')
      expect(content).toContain('canvas')
    })

    it('filesystem is read-only (cannot write)', () => {
      const workspace = createExamplesWorkspace()
      expect(() => {
        workspace.filesystem.writeFile('test.lua', 'content')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot create directory)', () => {
      const workspace = createExamplesWorkspace()
      expect(() => {
        workspace.filesystem.createDirectory('test')
      }).toThrow('read-only')
    })

    it('filesystem is read-only (cannot delete)', () => {
      const workspace = createExamplesWorkspace()
      expect(() => {
        workspace.filesystem.delete('hello.lua')
      }).toThrow('read-only')
    })
  })
})
