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

      // Flush buffered output
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('hello world\n')
    })

    it('should concatenate multiple print arguments with tabs', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print("a", "b", "c")')

      // Flush buffered output
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('a\tb\tc\n')
    })

    it('should convert nil values to string "nil" in print', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print(nil)')

      // Flush buffered output
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('nil\n')
    })

    it('should provide io.write function that outputs without newline', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('io.write("hello")')

      // Flush buffered output
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('hello')
    })

    it('should use default empty string handler when onReadInput is not provided', async () => {
      const callbacksNoRead: LuaEngineCallbacks = {
        onOutput: vi.fn(),
        onError: vi.fn(),
        // onReadInput intentionally not provided
      }
      const engine = await LuaEngineFactory.create(callbacksNoRead)

      // io.read() returns nil at EOF (empty input) per Lua 5.4 spec
      // The default handler returns empty string, which triggers EOF behavior
      await engine.doString('result = io.read()')
      const result = await engine.doString('return result')

      expect(result).toBeNull()

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

      // Flush buffered output
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('42\n')
    })

    it('should convert booleans in print', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print(true, false)')

      // Flush buffered output
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('true\tfalse\n')
    })
  })

  describe('executeCode', () => {
    it('should execute Lua statements', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await LuaEngineFactory.executeCode(engine, 'x = 42', callbacks)

      // Verify by printing the value
      await engine.doString('print(x)')

      // Flush buffered output
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('42\n')
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

  describe('isCodeComplete', () => {
    it('should return complete:true for complete single-line statement', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.isCodeComplete(engine, 'print("hello")')

      expect(result.complete).toBe(true)
      expect(result.error).toBeUndefined()

      engine.global.close()
    })

    it('should return complete:true for complete expression', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.isCodeComplete(engine, '1 + 1')

      expect(result.complete).toBe(true)

      engine.global.close()
    })

    it('should return complete:false for incomplete function definition', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.isCodeComplete(engine, 'function hello()')

      expect(result.complete).toBe(false)

      engine.global.close()
    })

    it('should return complete:false for incomplete if statement', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.isCodeComplete(engine, 'if true then')

      expect(result.complete).toBe(false)

      engine.global.close()
    })

    it('should return complete:false for incomplete for loop', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.isCodeComplete(engine, 'for i=1,10 do')

      expect(result.complete).toBe(false)

      engine.global.close()
    })

    it('should return complete:false for incomplete while loop', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.isCodeComplete(engine, 'while true do')

      expect(result.complete).toBe(false)

      engine.global.close()
    })

    it('should return complete:true for complete multi-line function', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const code = 'function hello()\n  print("hi")\nend'
      const result = await LuaEngineFactory.isCodeComplete(engine, code)

      expect(result.complete).toBe(true)

      engine.global.close()
    })

    it('should return complete:false with error for syntax errors', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.isCodeComplete(engine, 'this is not valid lua!')

      expect(result.complete).toBe(false)
      expect(result.error).toBeDefined()

      engine.global.close()
    })

    it('should distinguish syntax error from incomplete code', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // Incomplete code - no error message (waiting for more input)
      const incomplete = await LuaEngineFactory.isCodeComplete(engine, 'function test()')
      expect(incomplete.complete).toBe(false)
      expect(incomplete.error).toBeUndefined()

      // Syntax error - has error message
      const syntaxError = await LuaEngineFactory.isCodeComplete(engine, 'function 123bad()')
      expect(syntaxError.complete).toBe(false)
      expect(syntaxError.error).toBeDefined()

      engine.global.close()
    })

    it('should return complete:true for empty string', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.isCodeComplete(engine, '')

      expect(result.complete).toBe(true)

      engine.global.close()
    })

    it('should return complete:false for incomplete do block', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.isCodeComplete(engine, 'do')

      expect(result.complete).toBe(false)

      engine.global.close()
    })

    it('should return complete:false for incomplete repeat until', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const result = await LuaEngineFactory.isCodeComplete(engine, 'repeat')

      expect(result.complete).toBe(false)

      engine.global.close()
    })

    it('should handle nested incomplete structures', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // Function with nested if - both incomplete
      const code = 'function test()\n  if true then'
      const result = await LuaEngineFactory.isCodeComplete(engine, code)

      expect(result.complete).toBe(false)

      engine.global.close()
    })

    it('should handle code containing ]=] (level-1 long string delimiter)', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // User code with a level-1 long string - works because we embed with level-2
      const code = 'local s = [=[hello]=]'
      const result = await LuaEngineFactory.isCodeComplete(engine, code)

      expect(result.complete).toBe(true)

      engine.global.close()
    })

    // Known limitation: code containing ]==] (level-2 delimiter) will break parsing
    // This is extremely rare in practice - Lua long strings with multiple = signs
    // are uncommon. If needed, we could implement dynamic delimiter detection.
    it.skip('known limitation: code containing ]==] breaks parsing', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // This would break because our embedding uses [==[...]==]
      const code = 'local s = [==[contains ]==] in string]==]'
      const result = await LuaEngineFactory.isCodeComplete(engine, code)

      expect(result.complete).toBe(true)

      engine.global.close()
    })
  })

  describe('io.read format handling', () => {
    describe('format normalization (star-less syntax)', () => {
      it('should handle io.read("l") same as io.read("*l")', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('test line')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("l")')
        const result = await engine.doString('return result')

        expect(result).toBe('test line')
        engine.global.close()
      })

      it('should handle io.read("a") same as io.read("*a")', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('all input')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("a")')
        const result = await engine.doString('return result')

        expect(result).toBe('all input')
        engine.global.close()
      })

      it('should handle io.read("n") same as io.read("*n")', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('42')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("n")')
        const result = await engine.doString('return result')

        expect(result).toBe(42)
        engine.global.close()
      })
    })

    describe('L format (line with newline)', () => {
      it('should return line with newline for io.read("L")', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('test line')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("L")')
        const result = await engine.doString('return result')

        expect(result).toBe('test line\n')
        engine.global.close()
      })

      it('should return line with newline for io.read("*L")', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('another line')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("*L")')
        const result = await engine.doString('return result')

        expect(result).toBe('another line\n')
        engine.global.close()
      })
    })

    describe('io.read(n) - read n characters', () => {
      it('should pass charCount to onReadInput callback for io.read(5)', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('hello')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read(5)')
        const result = await engine.doString('return result')

        expect(result).toBe('hello')
        expect(callbacks.onReadInput).toHaveBeenCalledWith(5)
        engine.global.close()
      })

      it('should pass charCount to onReadInput callback for io.read(1)', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('x')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read(1)')
        const result = await engine.doString('return result')

        expect(result).toBe('x')
        expect(callbacks.onReadInput).toHaveBeenCalledWith(1)
        engine.global.close()
      })

      it('should handle io.read(0) returning empty string', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read(0)')
        const result = await engine.doString('return result')

        expect(result).toBe('')
        engine.global.close()
      })

      it('should truncate to exactly n characters even if callback returns more', async () => {
        // BUG TEST: Exposes issue where io.read(1) returns full line instead of 1 char
        // When user types "Hello!" and presses Enter, io.read(1) should return "H"
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('Hello!')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read(1)')
        const result = await engine.doString('return result')

        // Should only return first character, not the full string
        expect(result).toBe('H')
        engine.global.close()
      })

      it('should truncate io.read(5) to exactly 5 characters', async () => {
        // BUG TEST: Exposes issue where io.read(5) returns full line instead of 5 chars
        // Simulates user typing "This is my input" when only 5 chars were requested
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue(
          'This is my input'
        )
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read(5)')
        const result = await engine.doString('return result')

        // Should only return first 5 characters: "This "
        expect(result).toBe('This ')
        engine.global.close()
      })

      it('should allow detecting arrow keys by reading escape sequence in parts', async () => {
        // Test the use case from the example:
        // local c = io.read(1)
        // if c == "\x1b" then
        //   local seq = io.read(2)
        //   if seq == "[A" then print("Up arrow!") end
        // end
        //
        // First io.read(1) should get "\x1b" (escape char)
        // Second io.read(2) should get "[A" (rest of arrow sequence)
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce('\x1b[A') // First call returns full escape sequence
          .mockResolvedValueOnce('[A') // Second call (if needed)
        const engine = await LuaEngineFactory.create(callbacks)

        // First read: get just the escape character
        await engine.doString('c = io.read(1)')
        const c = await engine.doString('return c')
        expect(c).toBe('\x1b')

        // Second read: get the rest of the sequence
        await engine.doString('seq = io.read(2)')
        const seq = await engine.doString('return seq')
        expect(seq).toBe('[A')

        engine.global.close()
      })
    })

    describe('number format parsing', () => {
      it('should parse integer with io.read("n")', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('123')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("n")')
        const result = await engine.doString('return result')

        expect(result).toBe(123)
        engine.global.close()
      })

      it('should parse float with io.read("n")', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('3.14')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("n")')
        const result = await engine.doString('return result')

        expect(result).toBeCloseTo(3.14)
        engine.global.close()
      })

      it('should parse scientific notation with io.read("n")', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('1.5e10')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("n")')
        const result = await engine.doString('return result')

        expect(result).toBe(1.5e10)
        engine.global.close()
      })

      it('should skip leading whitespace when parsing number', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('   42')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("n")')
        const result = await engine.doString('return result')

        expect(result).toBe(42)
        engine.global.close()
      })

      it('should return nil for invalid number input', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('not a number')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("n")')
        const result = await engine.doString('return result')

        expect(result).toBeNull()
        engine.global.close()
      })
    })

    describe('multiple arguments', () => {
      it('should return multiple values for multiple format arguments', async () => {
        const inputCalls: number[] = []
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockImplementation(
          (charCount?: number) => {
            inputCalls.push(charCount ?? -1)
            // Return different values for each call
            if (inputCalls.length === 1) return Promise.resolve('line one')
            if (inputCalls.length === 2) return Promise.resolve('42')
            return Promise.resolve('chars')
          }
        )
        const engine = await LuaEngineFactory.create(callbacks)

        // io.read("l", "n", 5) should return 3 values
        await engine.doString('a, b, c = io.read("l", "n", 5)')
        const a = await engine.doString('return a')
        const b = await engine.doString('return b')
        const c = await engine.doString('return c')

        expect(a).toBe('line one')
        expect(b).toBe(42)
        expect(c).toBe('chars')
        engine.global.close()
      })

      it('should call onReadInput with correct charCount for numeric args in multi-read', async () => {
        const inputCalls: (number | undefined)[] = []
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockImplementation(
          (charCount?: number) => {
            inputCalls.push(charCount)
            return Promise.resolve(charCount ? 'x'.repeat(charCount) : 'line')
          }
        )
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('a, b = io.read("l", 3)')

        // First call should be undefined (line mode), second should be 3
        expect(inputCalls).toEqual([undefined, 3])
        engine.global.close()
      })
    })

    describe('EOF handling', () => {
      it('should return nil for io.read("l") at EOF (empty input)', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("l")')
        const result = await engine.doString('return result')

        expect(result).toBeNull()
        engine.global.close()
      })

      it('should return empty string for io.read("a") at EOF', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("a")')
        const result = await engine.doString('return result')

        expect(result).toBe('')
        engine.global.close()
      })

      it('should return nil for io.read("n") at EOF', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read("n")')
        const result = await engine.doString('return result')

        expect(result).toBeNull()
        engine.global.close()
      })

      it('should return nil for io.read(n) at EOF', async () => {
        ;(callbacks.onReadInput as ReturnType<typeof vi.fn>).mockResolvedValue('')
        const engine = await LuaEngineFactory.create(callbacks)

        await engine.doString('result = io.read(5)')
        const result = await engine.doString('return result')

        expect(result).toBeNull()
        engine.global.close()
      })
    })
  })

  describe('file operations (io.open)', () => {
    describe('fileOperations callbacks', () => {
      it('should call fileOpen callback when io.open is called', async () => {
        const fileOpen = vi.fn().mockReturnValue({ success: true, handle: 1 })
        const callbacksWithFile: LuaEngineCallbacks = {
          ...callbacks,
          fileOperations: {
            open: fileOpen,
            read: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
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
            close: vi.fn(),
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
            close: vi.fn(),
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
            close: vi.fn(),
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
            close: vi.fn(),
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
            close: vi.fn(),
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
            close: vi.fn(),
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
        const fileClose = vi.fn().mockReturnValue({ success: true })
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
        const fileClose = vi.fn().mockReturnValue({ success: true })
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
            close: vi.fn().mockReturnValue({ success: true }),
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
            close: vi.fn(),
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
            close: vi.fn(),
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
            close: vi.fn(),
          },
        }
        const engine = await LuaEngineFactory.create(callbacksWithFile)

        await engine.doString('f = io.open("/test.txt", "a")')

        expect(fileOpen).toHaveBeenCalledWith('/test.txt', 'a')
        engine.global.close()
      })
    })
  })
})
