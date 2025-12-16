/**
 * Tests for workspaceManagerHelpers - docs workspace functionality.
 */
import { describe, it, expect, vi } from 'vitest'

// Mock the lua-runtime module
vi.mock('@lua-learning/lua-runtime', () => ({
  LUA_SHELL_CODE: '-- mock shell code',
}))

import {
  createDocsWorkspace,
  DOCS_WORKSPACE_ID,
  DOCS_WORKSPACE_NAME,
  DOCS_MOUNT_PATH,
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

    it('filesystem lists shell.md and lua/ in root directory', () => {
      const workspace = createDocsWorkspace()
      const entries = workspace.filesystem.listDirectory('/')
      expect(entries).toHaveLength(2)
      // Directories come first, then files (sorted)
      expect(entries[0].name).toBe('lua')
      expect(entries[0].type).toBe('directory')
      expect(entries[1].name).toBe('shell.md')
      expect(entries[1].type).toBe('file')
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
  })
})
