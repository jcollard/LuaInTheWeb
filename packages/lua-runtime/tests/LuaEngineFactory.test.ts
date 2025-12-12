import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaEngineFactory, type LuaEngineCallbacks } from '../src/LuaEngineFactory'

describe('LuaEngineFactory', () => {
  let callbacks: LuaEngineCallbacks

  beforeEach(() => {
    callbacks = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onReadInput: vi.fn(),
    }
  })

  describe('create', () => {
    it('should create a Lua engine', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      expect(engine).toBeDefined()
      expect(typeof engine.doString).toBe('function')

      engine.global.close()
    })

    it('should route print() output to onOutput callback', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print("hello world")')

      expect(callbacks.onOutput).toHaveBeenCalledWith('hello world')

      engine.global.close()
    })

    it('should concatenate multiple print arguments with tabs', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print("a", "b", "c")')

      expect(callbacks.onOutput).toHaveBeenCalledWith('a\tb\tc')

      engine.global.close()
    })

    it('should convert nil values to string "nil" in print', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print(nil)')

      expect(callbacks.onOutput).toHaveBeenCalledWith('nil')

      engine.global.close()
    })

    it('should provide io.write function that outputs without newline', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('io.write("hello")')

      expect(callbacks.onOutput).toHaveBeenCalledWith('hello')

      engine.global.close()
    })

    it('should use default empty string handler when onReadInput is not provided', async () => {
      const callbacksNoRead: LuaEngineCallbacks = {
        onOutput: vi.fn(),
        onError: vi.fn(),
        // onReadInput intentionally not provided
      }
      const engine = await LuaEngineFactory.create(callbacksNoRead)

      // io.read() should return empty string when no handler is provided
      await engine.doString('result = io.read()')
      const result = await engine.doString('return result')

      expect(result).toBe('')

      engine.global.close()
    })

    it('should use onReadInput callback when provided', async () => {
      ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('user input')
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('result = io.read()')
      const result = await engine.doString('return result')

      expect(result).toBe('user input')
      expect(callbacks.onReadInput).toHaveBeenCalled()

      engine.global.close()
    })

    it('should convert numbers in print', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print(42)')

      expect(callbacks.onOutput).toHaveBeenCalledWith('42')

      engine.global.close()
    })

    it('should convert booleans in print', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print(true, false)')

      expect(callbacks.onOutput).toHaveBeenCalledWith('true\tfalse')

      engine.global.close()
    })
  })

  describe('executeCode', () => {
    it('should execute Lua statements', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await LuaEngineFactory.executeCode(engine, 'x = 42', callbacks)

      // Verify by printing the value
      await engine.doString('print(x)')
      expect(callbacks.onOutput).toHaveBeenCalledWith('42')

      engine.global.close()
    })

    it('should evaluate expressions and return formatted result', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.executeCode(engine, '1 + 1', callbacks)

      expect(result).toBe('2')

      engine.global.close()
    })

    it('should return nil for expression evaluating to nil', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.executeCode(engine, 'nil', callbacks)

      expect(result).toBe('nil')

      engine.global.close()
    })

    it('should call onError for syntax errors', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await LuaEngineFactory.executeCode(engine, 'this is not valid lua!', callbacks)

      expect(callbacks.onError).toHaveBeenCalled()

      engine.global.close()
    })

    it('should call onError for runtime errors', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await LuaEngineFactory.executeCode(engine, 'error("test error")', callbacks)

      expect(callbacks.onError).toHaveBeenCalled()
      const errorCall = (callbacks.onError as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(errorCall).toContain('test error')

      engine.global.close()
    })

    it('should format table expressions', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.executeCode(engine, '{1, 2, 3}', callbacks)

      expect(result).toContain('1')
      expect(result).toContain('2')
      expect(result).toContain('3')

      engine.global.close()
    })

    it('should return undefined for empty code', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.executeCode(engine, '', callbacks)

      expect(result).toBeUndefined()

      engine.global.close()
    })

    it('should return undefined for whitespace-only code', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.executeCode(engine, '   \n\t  ', callbacks)

      expect(result).toBeUndefined()

      engine.global.close()
    })

    it('should return undefined for successful statements', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.executeCode(engine, 'local x = 42', callbacks)

      expect(result).toBeUndefined()

      engine.global.close()
    })

    it('should format string expressions with quotes', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.executeCode(engine, '"hello"', callbacks)

      expect(result).toBe('"hello"')

      engine.global.close()
    })

    it('should format boolean expressions', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.executeCode(engine, 'true', callbacks)

      expect(result).toBe('true')

      engine.global.close()
    })
  })

  describe('close', () => {
    it('should close the engine and release resources', async () => {
      const engine = await LuaEngineFactory.create(callbacks)
      const closeSpy = vi.spyOn(engine.global, 'close')

      LuaEngineFactory.close(engine)

      expect(closeSpy).toHaveBeenCalled()
    })
  })
})
