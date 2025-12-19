import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaEngineFactory, type LuaEngineCallbacks } from '../src/LuaEngineFactory'

describe('LuaEngineFactory file operations (io.open)', () => {
  let callbacks: LuaEngineCallbacks

  beforeEach(() => {
    callbacks = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onReadInput: vi.fn(),
    }
  })

  describe('fileOperations callbacks', () => {
    it('should call fileOpen callback when io.open is called', async () => {
      const fileOpen = vi.fn().mockReturnValue({ success: true, handle: 1 })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: fileOpen,
          read: vi.fn(),
          write: vi.fn(),
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('local f = io.open("/test.txt", "r")')

      expect(fileOpen).toHaveBeenCalledWith('/test.txt', 'r')
      engine.global.close()
    })

    it('should return nil and error when file does not exist', async () => {
      const fileOpen = vi
        .fn()
        .mockReturnValue({ success: false, error: 'No such file or directory' })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: fileOpen,
          read: vi.fn(),
          write: vi.fn(),
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f, err = io.open("/nonexistent.txt", "r")')
      const f = await engine.doString('return f')
      const err = await engine.doString('return err')

      expect(f).toBeNull()
      expect(err).toBe('No such file or directory')
      engine.global.close()
    })

    it('should return file handle on successful open', async () => {
      const fileOpen = vi.fn().mockReturnValue({ success: true, handle: 42 })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: fileOpen,
          read: vi.fn(),
          write: vi.fn(),
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f = io.open("/test.txt", "r")')
      const result = await engine.doString('return f ~= nil')

      expect(result).toBe(true)
      engine.global.close()
    })
  })

  describe('file:read()', () => {
    it('should call fileRead callback with handle and format', async () => {
      const fileRead = vi.fn().mockReturnValue({ success: true, data: 'file content' })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: vi.fn().mockReturnValue({ success: true, handle: 1 }),
          read: fileRead,
          write: vi.fn(),
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f = io.open("/test.txt", "r")')
      await engine.doString('content = f:read("a")')
      const content = await engine.doString('return content')

      expect(fileRead).toHaveBeenCalledWith(1, 'a')
      expect(content).toBe('file content')
      engine.global.close()
    })

    it('should return nil at end of file', async () => {
      const fileRead = vi.fn().mockReturnValue({ success: true, data: null })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: vi.fn().mockReturnValue({ success: true, handle: 1 }),
          read: fileRead,
          write: vi.fn(),
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f = io.open("/test.txt", "r")')
      await engine.doString('content = f:read("l")')
      const content = await engine.doString('return content')

      expect(content).toBeNull()
      engine.global.close()
    })
  })

  describe('file:write()', () => {
    it('should call fileWrite callback with handle and content', async () => {
      const fileWrite = vi.fn().mockReturnValue({ success: true })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: vi.fn().mockReturnValue({ success: true, handle: 1 }),
          read: vi.fn(),
          write: fileWrite,
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f = io.open("/test.txt", "w")')
      await engine.doString('f:write("hello world")')

      expect(fileWrite).toHaveBeenCalledWith(1, 'hello world')
      engine.global.close()
    })

    it('should return file handle for chaining on success', async () => {
      const fileWrite = vi.fn().mockReturnValue({ success: true })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: vi.fn().mockReturnValue({ success: true, handle: 1 }),
          read: vi.fn(),
          write: fileWrite,
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f = io.open("/test.txt", "w")')
      await engine.doString('result = f:write("hello"):write(" world")')
      const result = await engine.doString('return result ~= nil')

      expect(result).toBe(true)
      expect(fileWrite).toHaveBeenCalledTimes(2)
      engine.global.close()
    })
  })

  describe('file:close() and io.close()', () => {
    it('should call fileClose callback with handle', async () => {
      const fileClose = vi.fn().mockResolvedValue({ success: true })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: vi.fn().mockReturnValue({ success: true, handle: 1 }),
          read: vi.fn(),
          write: vi.fn(),
          close: fileClose,
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f = io.open("/test.txt", "r")')
      await engine.doString('f:close()')

      expect(fileClose).toHaveBeenCalledWith(1)
      engine.global.close()
    })

    it('should support io.close(file) syntax', async () => {
      const fileClose = vi.fn().mockResolvedValue({ success: true })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: vi.fn().mockReturnValue({ success: true, handle: 1 }),
          read: vi.fn(),
          write: vi.fn(),
          close: fileClose,
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f = io.open("/test.txt", "r")')
      await engine.doString('io.close(f)')

      expect(fileClose).toHaveBeenCalledWith(1)
      engine.global.close()
    })
  })

  describe('io.lines()', () => {
    it('should iterate over file lines', async () => {
      const lines = ['line1', 'line2', 'line3']
      let readIndex = 0
      const fileRead = vi.fn().mockImplementation(() => {
        if (readIndex < lines.length) {
          return { success: true, data: lines[readIndex++] }
        }
        return { success: true, data: null }
      })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: vi.fn().mockReturnValue({ success: true, handle: 1 }),
          read: fileRead,
          write: vi.fn(),
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString(`
        result = {}
        for line in io.lines("/test.txt") do
          table.insert(result, line)
        end
      `)
      const count = await engine.doString('return #result')
      const first = await engine.doString('return result[1]')
      const second = await engine.doString('return result[2]')
      const third = await engine.doString('return result[3]')

      expect(count).toBe(3)
      expect(first).toBe('line1')
      expect(second).toBe('line2')
      expect(third).toBe('line3')
      engine.global.close()
    })
  })

  describe('mode support', () => {
    it('should default to "r" mode when mode is not specified', async () => {
      const fileOpen = vi.fn().mockReturnValue({ success: true, handle: 1 })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: fileOpen,
          read: vi.fn(),
          write: vi.fn(),
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f = io.open("/test.txt")')

      expect(fileOpen).toHaveBeenCalledWith('/test.txt', 'r')
      engine.global.close()
    })

    it('should support "w" mode for writing', async () => {
      const fileOpen = vi.fn().mockReturnValue({ success: true, handle: 1 })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: fileOpen,
          read: vi.fn(),
          write: vi.fn(),
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f = io.open("/test.txt", "w")')

      expect(fileOpen).toHaveBeenCalledWith('/test.txt', 'w')
      engine.global.close()
    })

    it('should support "a" mode for appending', async () => {
      const fileOpen = vi.fn().mockReturnValue({ success: true, handle: 1 })
      const callbacksWithFile: LuaEngineCallbacks = {
        ...callbacks,
        fileOperations: {
          open: fileOpen,
          read: vi.fn(),
          write: vi.fn(),
          close: vi.fn().mockResolvedValue({ success: true }),
        },
      }
      const engine = await LuaEngineFactory.create(callbacksWithFile)

      await engine.doString('f = io.open("/test.txt", "a")')

      expect(fileOpen).toHaveBeenCalledWith('/test.txt', 'a')
      engine.global.close()
    })
  })
})
