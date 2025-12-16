/**
 * Tests for workspaceManagerHelpers - docs workspace functionality.
 */
import { describe, it, expect, vi } from 'vitest'

// Mock the lua-runtime module
vi.mock('@lua-learning/lua-runtime', () => ({
  LUA_SHELL_CODE: '-- mock shell code',
  LUA_CANVAS_CODE: '-- mock canvas code\nlocal canvas = {}\nfunction canvas.on_draw(callback) end\nfunction canvas.clear() end\nfunction canvas.set_color(r, g, b, a) end\nfunction canvas.rect(x, y, w, h) end\nfunction canvas.fill_rect(x, y, w, h) end\nfunction canvas.circle(x, y, r) end\nfunction canvas.fill_circle(x, y, r) end\nfunction canvas.line(x1, y1, x2, y2) end\nfunction canvas.text(x, y, text) end\nfunction canvas.get_delta() end\nfunction canvas.get_time() end\nfunction canvas.is_key_down(key) end\nfunction canvas.is_key_pressed(key) end\nfunction canvas.get_mouse_x() end\nfunction canvas.get_mouse_y() end\nfunction canvas.is_mouse_down(button) end\nreturn canvas',
}))

import {
  createDocsWorkspace,
  createLibraryWorkspace,
  DOCS_WORKSPACE_ID,
  DOCS_WORKSPACE_NAME,
  DOCS_MOUNT_PATH,
  LIBRARY_WORKSPACE_ID,
  LIBRARY_WORKSPACE_NAME,
  LIBRARY_MOUNT_PATH,
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

    it('filesystem lists shell.md and canvas.md in root directory', () => {
      const workspace = createDocsWorkspace()
      const entries = workspace.filesystem.listDirectory('/')
      expect(entries).toHaveLength(2)
      const names = entries.map((e) => e.name)
      expect(names).toContain('shell.md')
      expect(names).toContain('canvas.md')
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
      expect(content).toContain('canvas.on_draw')
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
      expect(content).toContain('canvas.on_draw')
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
})
