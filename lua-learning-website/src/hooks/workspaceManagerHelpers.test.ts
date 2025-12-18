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
  fetchAndCreateDocsWorkspace,
  createLibraryWorkspace,
  createBookWorkspace,
  fetchAndCreateBookWorkspace,
  createExamplesWorkspace,
  fetchAndCreateExamplesWorkspace,
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
  EXAMPLES_PUBLIC_PATH,
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
    // Mock docs files that match the expected content structure
    const mockDocsFiles: Record<string, string> = {
      'shell.md': `# Shell Library

The shell library provides functions for terminal control.

## Loading the Library

\`\`\`lua
local shell = require('shell')
\`\`\`

## Color Constants

| Constant | Description |
|----------|-------------|
| \`shell.BLACK\` | Black color |
| \`shell.RED\` | Red color |
| \`shell.GREEN\` | Green color |

## Screen Control

### shell.clear()

Clears the terminal screen.

## Color Control

### shell.foreground(color)

Sets the text foreground color.

### shell.background(color)

Sets the text background color.

### shell.reset()

Resets all color attributes.

## Cursor Control

### shell.set_cursor(row, col)

Moves cursor to position.

### shell.cursor_up(n)

Moves cursor up.

### shell.cursor_down(n)

Moves cursor down.

### shell.cursor_left(n)

Moves cursor left.

### shell.cursor_right(n)

Moves cursor right.

### shell.save_cursor()

Saves cursor position.

### shell.restore_cursor()

Restores cursor position.

### shell.hide_cursor()

Hides cursor.

### shell.show_cursor()

Shows cursor.

## Terminal Dimensions

### shell.width()

Returns terminal width.

### shell.height()

Returns terminal height.
`,
      'canvas.md': `# Canvas Library

The canvas library provides functions for 2D graphics rendering.

## Loading the Library

\`\`\`lua
local canvas = require('canvas')
\`\`\`

## Game Loop

### canvas.tick(callback)

Register tick callback.

## Drawing Functions

### canvas.clear()

Clear the canvas.

### canvas.set_color(r, g, b, a)

Set drawing color.

### canvas.draw_rect(x, y, width, height)

Draw rectangle outline.

### canvas.fill_rect(x, y, width, height)

Draw filled rectangle.

### canvas.draw_circle(x, y, radius)

Draw circle outline.

### canvas.fill_circle(x, y, radius)

Draw filled circle.

### canvas.draw_line(x1, y1, x2, y2)

Draw line.

### canvas.draw_text(x, y, text)

Draw text.

## Timing Functions

### canvas.get_delta()

Get time since last frame.

### canvas.get_time()

Get total time.

## Keyboard Input

### canvas.is_key_down(key)

Check if key is held.

### canvas.is_key_pressed(key)

Check if key was pressed.

## Mouse Input

### canvas.get_mouse_x()

Get mouse X position.

### canvas.get_mouse_y()

Get mouse Y position.

### canvas.is_mouse_down(button)

Check if mouse button is held.
`,
      'lua/basics.md': '# Lua Basics\n\nCore global functions.',
      'lua/string.md': '# String Library\n\nString functions.',
      'lua/table.md': '# Table Library\n\nTable functions.',
      'lua/math.md': '# Math Library\n\nMath functions.',
      'lua/io.md': '# IO Library\n\nIO functions.',
    }

    it('creates a workspace with id DOCS_WORKSPACE_ID', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(workspace.id).toBe(DOCS_WORKSPACE_ID)
    })

    it('creates a workspace with name DOCS_WORKSPACE_NAME', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(workspace.name).toBe(DOCS_WORKSPACE_NAME)
    })

    it('creates a workspace with type "docs"', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(workspace.type).toBe('docs')
    })

    it('creates a workspace with mountPath DOCS_MOUNT_PATH', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(workspace.mountPath).toBe(DOCS_MOUNT_PATH)
    })

    it('creates a workspace with status "connected"', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(workspace.status).toBe('connected')
    })

    it('creates a workspace with isReadOnly set to true', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(workspace.isReadOnly).toBe(true)
    })

    it('creates a workspace with a filesystem', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(workspace.filesystem).toBeDefined()
      expect(typeof workspace.filesystem.readFile).toBe('function')
    })

    it('filesystem contains shell.md file', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(workspace.filesystem.exists('shell.md')).toBe(true)
      expect(workspace.filesystem.isFile('shell.md')).toBe(true)
    })

    it('shell.md contains shell library documentation', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('# Shell Library')
      expect(content).toContain('require')
      expect(content).toContain('shell')
    })

    it('shell.md documents color constants', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('shell.BLACK')
      expect(content).toContain('shell.RED')
      expect(content).toContain('shell.GREEN')
    })

    it('shell.md documents screen control functions', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('shell.clear()')
    })

    it('shell.md documents color control functions', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('shell.foreground')
      expect(content).toContain('shell.background')
      expect(content).toContain('shell.reset')
    })

    it('shell.md documents cursor control functions', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
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
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('shell.md')
      expect(content).toContain('shell.width')
      expect(content).toContain('shell.height')
    })

    it('shell.md contains usage examples', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('shell.md')
      // Check for code examples (lua code blocks)
      expect(content).toContain('```lua')
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

    it('filesystem contains canvas.md file', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      expect(workspace.filesystem.exists('canvas.md')).toBe(true)
      expect(workspace.filesystem.isFile('canvas.md')).toBe(true)
    })

    it('canvas.md contains canvas library documentation', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('# Canvas Library')
      expect(content).toContain('require')
      expect(content).toContain('canvas')
    })

    it('canvas.md documents drawing functions', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
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
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('canvas.get_delta')
      expect(content).toContain('canvas.get_time')
    })

    it('canvas.md documents keyboard input functions', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('canvas.is_key_down')
      expect(content).toContain('canvas.is_key_pressed')
    })

    it('canvas.md documents mouse input functions', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('canvas.get_mouse_x')
      expect(content).toContain('canvas.get_mouse_y')
      expect(content).toContain('canvas.is_mouse_down')
    })

    it('canvas.md documents game loop', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('canvas.tick')
    })

    it('canvas.md contains usage examples', () => {
      const workspace = createDocsWorkspace(mockDocsFiles)
      const content = workspace.filesystem.readFile('canvas.md')
      expect(content).toContain('```lua')
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

    it('has EXAMPLES_PUBLIC_PATH set to "/examples"', () => {
      expect(EXAMPLES_PUBLIC_PATH).toBe('/examples')
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

    it('creates a workspace with id EXAMPLES_WORKSPACE_ID', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.id).toBe(EXAMPLES_WORKSPACE_ID)
    })

    it('creates a workspace with name EXAMPLES_WORKSPACE_NAME', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.name).toBe(EXAMPLES_WORKSPACE_NAME)
    })

    it('creates a workspace with type "examples"', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.type).toBe('examples')
    })

    it('creates a workspace with mountPath EXAMPLES_MOUNT_PATH', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.mountPath).toBe(EXAMPLES_MOUNT_PATH)
    })

    it('creates a workspace with status "connected"', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.status).toBe('connected')
    })

    it('creates a workspace with isReadOnly set to true', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
      expect(workspace.isReadOnly).toBe(true)
    })

    it('creates a workspace with a filesystem', () => {
      const workspace = createExamplesWorkspace(mockTextFiles)
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
