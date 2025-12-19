import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaEngineFactory, type LuaEngineCallbacks } from '../src/LuaEngineFactory'

describe('LuaEngineFactory io.read format handling', () => {
  let callbacks: LuaEngineCallbacks

  beforeEach(() => {
    callbacks = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onReadInput: vi.fn(),
    }
  })

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
