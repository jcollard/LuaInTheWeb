import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaEngineFactory, type LuaEngineCallbacks } from '../src/LuaEngineFactory'
import type { LuaEngine } from 'wasmoon'

describe('LuaEngineFactory - Shell Library', () => {
  let callbacks: LuaEngineCallbacks
  let engine: LuaEngine

  beforeEach(() => {
    callbacks = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onReadInput: vi.fn(),
    }
  })

  afterEach(() => {
    if (engine) {
      LuaEngineFactory.close(engine)
    }
  })

  describe('Terminal Dimension Callbacks', () => {
    it('should call getTerminalWidth callback when shell.width() is called', async () => {
      const callbacksWithDimensions: LuaEngineCallbacks = {
        ...callbacks,
        getTerminalWidth: vi.fn().mockReturnValue(80),
      }
      engine = await LuaEngineFactory.create(callbacksWithDimensions)

      const result = await engine.doString(`
        local shell = require('shell')
        return shell.width()
      `)

      expect(callbacksWithDimensions.getTerminalWidth).toHaveBeenCalled()
      expect(result).toBe(80)
    })

    it('should call getTerminalHeight callback when shell.height() is called', async () => {
      const callbacksWithDimensions: LuaEngineCallbacks = {
        ...callbacks,
        getTerminalHeight: vi.fn().mockReturnValue(24),
      }
      engine = await LuaEngineFactory.create(callbacksWithDimensions)

      const result = await engine.doString(`
        local shell = require('shell')
        return shell.height()
      `)

      expect(callbacksWithDimensions.getTerminalHeight).toHaveBeenCalled()
      expect(result).toBe(24)
    })

    it('should return default width (80) when getTerminalWidth is not provided', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local shell = require('shell')
        return shell.width()
      `)

      expect(result).toBe(80)
    })

    it('should return default height (24) when getTerminalHeight is not provided', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local shell = require('shell')
        return shell.height()
      `)

      expect(result).toBe(24)
    })
  })

  describe('require() and package system', () => {
    it('should load shell library via require("shell")', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local shell = require('shell')
        return type(shell)
      `)

      expect(result).toBe('table')
    })

    it('should cache module in package.loaded', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local shell1 = require('shell')
        local shell2 = require('shell')
        return shell1 == shell2
      `)

      expect(result).toBe(true)
    })

    it('should throw error for unknown modules (standard Lua behavior)', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      // Standard Lua throws an error when module is not found
      await expect(
        engine.doString(`
          local unknown = require('unknown_module')
          return unknown
        `)
      ).rejects.toThrow("module 'unknown_module' not found")
    })
  })

  describe('shell.clear()', () => {
    it('should output ANSI clear screen sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.clear()
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[2J\x1b[H')
    })
  })

  describe('shell.reset()', () => {
    it('should output ANSI reset sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.reset()
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[0m')
    })
  })

  describe('shell.foreground() - Color Control', () => {
    it('should output RGB foreground color from hex string', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.foreground('#FF6400')
      `)

      LuaEngineFactory.flushOutput(engine)

      // #FF6400 = RGB(255, 100, 0)
      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[38;2;255;100;0m')
    })

    it('should output RGB foreground color from three arguments', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.foreground(255, 100, 0)
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[38;2;255;100;0m')
    })

    it('should output RGB foreground color from named constant', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.foreground(shell.RED)
      `)

      LuaEngineFactory.flushOutput(engine)

      // RED = #FF0000 = RGB(255, 0, 0)
      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[38;2;255;0;0m')
    })

    it('should handle lowercase hex string', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.foreground('#ff6400')
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[38;2;255;100;0m')
    })
  })

  describe('shell.background() - Color Control', () => {
    it('should output RGB background color from hex string', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.background('#0000FF')
      `)

      LuaEngineFactory.flushOutput(engine)

      // #0000FF = RGB(0, 0, 255)
      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[48;2;0;0;255m')
    })

    it('should output RGB background color from three arguments', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.background(0, 0, 255)
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[48;2;0;0;255m')
    })

    it('should output RGB background color from named constant', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.background(shell.BLUE)
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[48;2;0;0;255m')
    })
  })

  describe('Color Constants', () => {
    it.each([
      ['BLACK', '#000000'],
      ['RED', '#FF0000'],
      ['GREEN', '#00FF00'],
      ['YELLOW', '#FFFF00'],
      ['BLUE', '#0000FF'],
      ['MAGENTA', '#FF00FF'],
      ['CYAN', '#00FFFF'],
      ['WHITE', '#FFFFFF'],
      ['ORANGE', '#FF6400'],
      ['PINK', '#FFC0CB'],
      ['GRAY', '#808080'],
    ])('should have %s color constant with value %s', async (name, hex) => {
      engine = await LuaEngineFactory.create(callbacks)

      const result = await engine.doString(`
        local shell = require('shell')
        return shell.${name}
      `)

      expect(result).toBe(hex)

      // Clean up for next iteration
      LuaEngineFactory.close(engine)
      engine = null!
    })
  })

  describe('shell.set_cursor()', () => {
    it('should output ANSI cursor position sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.set_cursor(10, 5)
      `)

      LuaEngineFactory.flushOutput(engine)

      // ANSI cursor position: \x1b[row;colH (row=y, col=x)
      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[5;10H')
    })
  })

  describe('Cursor Movement', () => {
    it('should output cursor up sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.cursor_up(3)
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[3A')
    })

    it('should output cursor down sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.cursor_down(2)
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[2B')
    })

    it('should output cursor right sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.cursor_right(5)
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[5C')
    })

    it('should output cursor left sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.cursor_left(4)
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[4D')
    })

    it('should default to 1 when no argument provided for cursor_up', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.cursor_up()
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[1A')
    })
  })

  describe('Cursor Save/Restore', () => {
    it('should output save cursor sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.save_cursor()
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[s')
    })

    it('should output restore cursor sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.restore_cursor()
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[u')
    })
  })

  describe('Cursor Visibility', () => {
    it('should output hide cursor sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.hide_cursor()
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[?25l')
    })

    it('should output show cursor sequence', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.show_cursor()
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[?25h')
    })
  })

  describe('Edge Cases', () => {
    it('should handle negative cursor movement values by using 0', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.cursor_up(-5)
      `)

      LuaEngineFactory.flushOutput(engine)

      // Negative should be treated as 0 (no movement)
      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[0A')
    })

    it('should clamp RGB values to 0-255 range', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.foreground(300, -10, 128)
      `)

      LuaEngineFactory.flushOutput(engine)

      // 300 -> 255, -10 -> 0, 128 stays
      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[38;2;255;0;128m')
    })

    it('should handle hex string without # prefix', async () => {
      engine = await LuaEngineFactory.create(callbacks)

      await engine.doString(`
        local shell = require('shell')
        shell.foreground('FF6400')
      `)

      LuaEngineFactory.flushOutput(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('\x1b[38;2;255;100;0m')
    })
  })
})
