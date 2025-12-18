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

    // Note: Color constants are defined with @field annotations which are
    // not currently parsed. This is documented as a future enhancement.
    it('returns null for shell color constants (not parsed yet)', () => {
      const redDoc = getLibraryDocumentation('shell', 'RED')
      const greenDoc = getLibraryDocumentation('shell', 'GREEN')
      const blueDoc = getLibraryDocumentation('shell', 'BLUE')

      // @field annotations are out of scope for initial unification
      expect(redDoc).toBeNull()
      expect(greenDoc).toBeNull()
      expect(blueDoc).toBeNull()
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

  describe('canvas library documentation', () => {
    it('returns canvas as an available library', () => {
      const libs = getAvailableLibraries()

      expect(libs).toContain('canvas')
    })

    // Canvas Lifecycle
    it('returns documentation for canvas.start', () => {
      const doc = getLibraryDocumentation('canvas', 'start')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('start')
      expect(doc?.signature).toContain('canvas.start')
      expect(doc?.description).toContain('Start')
      expect(doc?.library).toBe('canvas')
    })

    it('returns documentation for canvas.stop', () => {
      const doc = getLibraryDocumentation('canvas', 'stop')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('stop')
      expect(doc?.description).toContain('Stop')
    })

    // Game Loop
    it('returns documentation for canvas.tick', () => {
      const doc = getLibraryDocumentation('canvas', 'tick')

      expect(doc).not.toBeNull()
      expect(doc?.signature).toContain('callback')
      expect(doc?.description).toContain('tick callback')
    })

    // Canvas Configuration
    it('returns documentation for canvas.set_size', () => {
      const doc = getLibraryDocumentation('canvas', 'set_size')

      expect(doc).not.toBeNull()
      expect(doc?.signature).toContain('width')
      expect(doc?.signature).toContain('height')
    })

    it('returns documentation for canvas.get_width', () => {
      const doc = getLibraryDocumentation('canvas', 'get_width')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('width')
    })

    it('returns documentation for canvas.get_height', () => {
      const doc = getLibraryDocumentation('canvas', 'get_height')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('height')
    })

    // Drawing State
    it('returns documentation for canvas.clear', () => {
      const doc = getLibraryDocumentation('canvas', 'clear')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('Clear')
    })

    it('returns documentation for canvas.set_color', () => {
      const doc = getLibraryDocumentation('canvas', 'set_color')

      expect(doc).not.toBeNull()
      expect(doc?.signature).toContain('r, g, b')
      expect(doc?.params).toBeDefined()
      // Note: Optional params (a?) are not parsed yet (out of scope)
      // The function has 4 params but only 3 are parsed (r, g, b - not 'a?')
      expect(doc?.params?.length).toBe(3)
    })

    it('returns documentation for canvas.set_line_width', () => {
      const doc = getLibraryDocumentation('canvas', 'set_line_width')

      expect(doc).not.toBeNull()
      expect(doc?.signature).toContain('width')
    })

    // Shape Drawing
    it('returns documentation for canvas.draw_rect', () => {
      const doc = getLibraryDocumentation('canvas', 'draw_rect')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('rectangle')
    })

    it('returns documentation for canvas.fill_rect', () => {
      const doc = getLibraryDocumentation('canvas', 'fill_rect')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('filled')
    })

    it('returns documentation for canvas.draw_circle', () => {
      const doc = getLibraryDocumentation('canvas', 'draw_circle')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('circle')
    })

    it('returns documentation for canvas.fill_circle', () => {
      const doc = getLibraryDocumentation('canvas', 'fill_circle')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for canvas.draw_line', () => {
      const doc = getLibraryDocumentation('canvas', 'draw_line')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('line')
    })

    it('returns documentation for canvas.draw_text', () => {
      const doc = getLibraryDocumentation('canvas', 'draw_text')

      expect(doc).not.toBeNull()
      expect(doc?.signature).toContain('text')
    })

    // Timing Functions
    it('returns documentation for canvas.get_delta', () => {
      const doc = getLibraryDocumentation('canvas', 'get_delta')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('time')
    })

    it('returns documentation for canvas.get_time', () => {
      const doc = getLibraryDocumentation('canvas', 'get_time')

      expect(doc).not.toBeNull()
      expect(doc?.returns).toContain('Total elapsed time')
    })

    // Keyboard Input
    it('returns documentation for canvas.is_key_down', () => {
      const doc = getLibraryDocumentation('canvas', 'is_key_down')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('key')
    })

    it('returns documentation for canvas.is_key_pressed', () => {
      const doc = getLibraryDocumentation('canvas', 'is_key_pressed')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('pressed this frame')
    })

    it('returns documentation for canvas.get_keys_down', () => {
      const doc = getLibraryDocumentation('canvas', 'get_keys_down')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for canvas.get_keys_pressed', () => {
      const doc = getLibraryDocumentation('canvas', 'get_keys_pressed')

      expect(doc).not.toBeNull()
    })

    // Mouse Input
    it('returns documentation for canvas.get_mouse_x', () => {
      const doc = getLibraryDocumentation('canvas', 'get_mouse_x')

      expect(doc).not.toBeNull()
      expect(doc?.description).toContain('mouse')
    })

    it('returns documentation for canvas.get_mouse_y', () => {
      const doc = getLibraryDocumentation('canvas', 'get_mouse_y')

      expect(doc).not.toBeNull()
    })

    it('returns documentation for canvas.is_mouse_down', () => {
      const doc = getLibraryDocumentation('canvas', 'is_mouse_down')

      expect(doc).not.toBeNull()
      expect(doc?.params).toBeDefined()
    })

    it('returns documentation for canvas.is_mouse_pressed', () => {
      const doc = getLibraryDocumentation('canvas', 'is_mouse_pressed')

      expect(doc).not.toBeNull()
    })

    // Key Constants
    // Note: canvas.keys is defined with @class annotation which is not parsed yet
    it('returns null for canvas.keys (not parsed yet)', () => {
      const doc = getLibraryDocumentation('canvas', 'keys')

      // @class annotations are out of scope for initial unification
      expect(doc).toBeNull()
    })

    it('includes canvas library name in returned entry', () => {
      const doc = getLibraryDocumentation('canvas', 'clear')

      expect(doc?.library).toBe('canvas')
    })
  })
})
