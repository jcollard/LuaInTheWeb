import { describe, it, expect } from 'vitest'
import { getLibraryDocumentation, getAvailableLibraries } from './luaLibraryDocs'

describe('luaLibraryDocs', () => {
  describe('getAvailableLibraries', () => {
    it('returns shell as an available library', () => {
      const libs = getAvailableLibraries()

      expect(libs).toContain('shell')
    })
  })

  describe('getLibraryDocumentation', () => {
    it('returns documentation for shell.clear', () => {
      const doc = getLibraryDocumentation('shell', 'clear')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('clear')
      expect(doc?.signature).toContain('shell.clear')
      expect(doc?.description).toContain('Clear')
    })

    it('returns documentation for shell.foreground', () => {
      const doc = getLibraryDocumentation('shell', 'foreground')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('foreground')
      expect(doc?.signature).toContain('shell.foreground')
      expect(doc?.description).toContain('color')
    })

    it('returns documentation for shell.background', () => {
      const doc = getLibraryDocumentation('shell', 'background')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('background')
    })

    it('returns documentation for shell.reset', () => {
      const doc = getLibraryDocumentation('shell', 'reset')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('Reset')
    })

    it('returns documentation for shell.set_cursor', () => {
      const doc = getLibraryDocumentation('shell', 'set_cursor')

      expect(doc).not.toBeNull()
      expect(doc?.signature).toContain('x')
      expect(doc?.signature).toContain('y')
    })

    it('returns documentation for shell.cursor_up', () => {
      const doc = getLibraryDocumentation('shell', 'cursor_up')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for shell.cursor_down', () => {
      const doc = getLibraryDocumentation('shell', 'cursor_down')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for shell.cursor_left', () => {
      const doc = getLibraryDocumentation('shell', 'cursor_left')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for shell.cursor_right', () => {
      const doc = getLibraryDocumentation('shell', 'cursor_right')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for shell.save_cursor', () => {
      const doc = getLibraryDocumentation('shell', 'save_cursor')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for shell.restore_cursor', () => {
      const doc = getLibraryDocumentation('shell', 'restore_cursor')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for shell.hide_cursor', () => {
      const doc = getLibraryDocumentation('shell', 'hide_cursor')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for shell.show_cursor', () => {
      const doc = getLibraryDocumentation('shell', 'show_cursor')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for shell.width', () => {
      const doc = getLibraryDocumentation('shell', 'width')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('width')
    })

    it('returns documentation for shell.height', () => {
      const doc = getLibraryDocumentation('shell', 'height')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('height')
    })

    it('returns documentation for shell color constants', () => {
      const redDoc = getLibraryDocumentation('shell', 'RED')
      const greenDoc = getLibraryDocumentation('shell', 'GREEN')
      const blueDoc = getLibraryDocumentation('shell', 'BLUE')

      expect(redDoc).not.toBeNull()
      expect(redDoc?.description).toContain('Red')
      expect(greenDoc).not.toBeNull()
      expect(blueDoc).not.toBeNull()
    })

    it('returns null for unknown library', () => {
      const doc = getLibraryDocumentation('unknown', 'something')

      expect(doc).toBeNull()
    })

    it('returns null for unknown member', () => {
      const doc = getLibraryDocumentation('shell', 'unknown_member')

      expect(doc).toBeNull()
    })

    it('includes library name in returned entry', () => {
      const doc = getLibraryDocumentation('shell', 'clear')

      expect(doc?.library).toBe('shell')
    })
  })
})
