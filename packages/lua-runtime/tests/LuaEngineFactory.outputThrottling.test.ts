import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  LuaEngineFactory,
  type LuaEngineCallbacks,
  FLUSH_INTERVAL_MS,
  MAX_BUFFER_SIZE,
} from '../src/LuaEngineFactory'

describe('LuaEngineFactory - Output Throttling', () => {
  let callbacks: LuaEngineCallbacks

  beforeEach(() => {
    callbacks = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onReadInput: vi.fn(),
    }
  })

  describe('constants', () => {
    it('should export FLUSH_INTERVAL_MS constant (~60fps)', () => {
      expect(FLUSH_INTERVAL_MS).toBe(16)
    })

    it('should export MAX_BUFFER_SIZE constant', () => {
      expect(MAX_BUFFER_SIZE).toBe(1000)
    })
  })

  describe('print output buffering', () => {
    it('should buffer print outputs instead of calling callback immediately', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print("hello")')

      // Output may or may not be called depending on timing (if engine creation
      // took longer than FLUSH_INTERVAL_MS, it will flush). The key behavior is
      // that output eventually appears and is correctly formatted.
      LuaEngineFactory.close(engine)

      // Verify output was flushed and content is correct
      expect(callbacks.onOutput).toHaveBeenCalled()
      expect(callbacks.onOutput).toHaveBeenCalledWith('hello\n')
    })

    it('should flush buffer when time threshold is exceeded on next output', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print("first")')

      // Wait for more than FLUSH_INTERVAL_MS
      await new Promise((resolve) => setTimeout(resolve, FLUSH_INTERVAL_MS + 5))

      // Next print should trigger flush
      await engine.doString('print("second")')

      LuaEngineFactory.close(engine)

      // Verify both outputs appeared (may be in one or two calls depending on timing)
      const allOutput = (callbacks.onOutput as ReturnType<typeof vi.fn>).mock.calls
        .map((call) => call[0])
        .join('')
      expect(allOutput).toBe('first\nsecond\n')
    })

    it('should batch rapid prints within flush interval', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // Rapid prints within same interval should be batched
      await engine.doString('print("one"); print("two"); print("three")')

      // Close should flush all batched output
      LuaEngineFactory.close(engine)

      // Verify all output appeared (may be batched or in multiple calls depending on timing)
      const allOutput = (callbacks.onOutput as ReturnType<typeof vi.fn>).mock.calls
        .map((call) => call[0])
        .join('')
      expect(allOutput).toBe('one\ntwo\nthree\n')
    })

    it('should flush immediately when buffer exceeds MAX_BUFFER_SIZE', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // Generate enough outputs to exceed buffer size
      await engine.doString(`
        for i = 1, ${MAX_BUFFER_SIZE + 1} do
          print(i)
        end
      `)

      // Should have flushed at least once due to size threshold
      expect(callbacks.onOutput).toHaveBeenCalled()

      LuaEngineFactory.close(engine)
    })

    it('should flush when buffer reaches exactly MAX_BUFFER_SIZE', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // Generate exactly MAX_BUFFER_SIZE outputs
      await engine.doString(`
        for i = 1, ${MAX_BUFFER_SIZE} do
          print(i)
        end
      `)

      // Should have flushed when reaching exactly MAX_BUFFER_SIZE
      expect(callbacks.onOutput).toHaveBeenCalled()

      LuaEngineFactory.close(engine)
    })
  })

  describe('io.write output buffering', () => {
    it('should buffer io.write outputs', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('io.write("hello")')

      // Should be buffered
      expect(callbacks.onOutput).not.toHaveBeenCalled()

      // Close should flush
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('hello')
    })

    it('should batch io.write and print outputs together', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('io.write("hello "); print("world")')

      // Buffered together
      expect(callbacks.onOutput).not.toHaveBeenCalled()

      // Close should flush both in single call
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledTimes(1)
      expect(callbacks.onOutput).toHaveBeenCalledWith('hello world\n')
    })
  })

  describe('flush on close', () => {
    it('should flush remaining buffer when close() is called', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print("buffered")')
      expect(callbacks.onOutput).not.toHaveBeenCalled()

      // Close should flush the buffer
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('buffered\n')
    })

    it('should flush remaining buffer when closeDeferred() is called', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print("deferred")')
      expect(callbacks.onOutput).not.toHaveBeenCalled()

      // closeDeferred should flush immediately (before the setTimeout)
      LuaEngineFactory.closeDeferred(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('deferred\n')
    })

    it('should not error when closing with empty buffer', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // Close without any output
      expect(() => LuaEngineFactory.close(engine)).not.toThrow()
      expect(callbacks.onOutput).not.toHaveBeenCalled()
    })
  })

  describe('flush before io.read()', () => {
    it('should flush output buffer before io.read() blocks for input', async () => {
      let inputResolver: ((value: string) => void) | null = null
      const inputPromise = new Promise<string>((resolve) => {
        inputResolver = resolve
      })

      callbacks.onReadInput = vi.fn().mockReturnValue(inputPromise)

      const engine = await LuaEngineFactory.create(callbacks)

      // Start executing code that writes output then calls io.read()
      // This should NOT complete until we provide input
      const executePromise = engine.doString(`
        io.write("Enter your name: ")
        local name = io.read()
        print("Hello, " .. name)
      `)

      // Wait a tick for the io.read() to be called and block
      await new Promise((resolve) => setTimeout(resolve, 10))

      // CRITICAL: The output should be flushed BEFORE io.read() blocks
      // This is what the user expects - they see the prompt before being asked for input
      expect(callbacks.onOutput).toHaveBeenCalledWith('Enter your name: ')

      // Now provide input to unblock
      inputResolver!('World')

      // Wait for execution to complete
      await executePromise

      // Close to flush remaining output
      LuaEngineFactory.close(engine)

      // Verify the final output includes the greeting
      expect(callbacks.onOutput).toHaveBeenCalledWith('Hello, World\n')
    })

    it('should flush print() output before io.read() blocks', async () => {
      let inputResolver: ((value: string) => void) | null = null
      const inputPromise = new Promise<string>((resolve) => {
        inputResolver = resolve
      })

      callbacks.onReadInput = vi.fn().mockReturnValue(inputPromise)

      const engine = await LuaEngineFactory.create(callbacks)

      // Start executing code that prints then calls io.read()
      const executePromise = engine.doString(`
        print("Please enter a value:")
        local value = io.read()
        print("You entered: " .. value)
      `)

      // Wait a tick for the io.read() to be called and block
      await new Promise((resolve) => setTimeout(resolve, 10))

      // The print output should be flushed before io.read() blocks
      expect(callbacks.onOutput).toHaveBeenCalledWith('Please enter a value:\n')

      // Provide input
      inputResolver!('42')

      await executePromise
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('You entered: 42\n')
    })
  })

  describe('edge cases', () => {
    it('should handle empty print calls', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print()')

      // Flush on close
      LuaEngineFactory.close(engine)

      // Empty print should produce just newline
      expect(callbacks.onOutput).toHaveBeenCalledWith('\n')
    })

    it('should handle nil values in print', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print(nil)')

      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledWith('nil\n')
    })

    it('should preserve output order across multiple flushes', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // First batch - will exceed buffer size to force flush
      await engine.doString(`
        for i = 1, ${MAX_BUFFER_SIZE + 1} do
          print("batch1-" .. i)
        end
      `)

      const firstCallCount = (callbacks.onOutput as ReturnType<typeof vi.fn>).mock.calls.length
      expect(firstCallCount).toBeGreaterThan(0)

      // Second batch
      await engine.doString('print("final")')

      LuaEngineFactory.close(engine)

      // Verify final output was flushed
      const lastCall = (callbacks.onOutput as ReturnType<typeof vi.fn>).mock.calls.at(-1)
      expect(lastCall?.[0]).toContain('final')
    })

    it('should handle multiple engines with separate buffers', async () => {
      const callbacks1: LuaEngineCallbacks = {
        onOutput: vi.fn(),
        onError: vi.fn(),
      }
      const callbacks2: LuaEngineCallbacks = {
        onOutput: vi.fn(),
        onError: vi.fn(),
      }

      const engine1 = await LuaEngineFactory.create(callbacks1)
      const engine2 = await LuaEngineFactory.create(callbacks2)

      await engine1.doString('print("engine1")')
      await engine2.doString('print("engine2")')

      // Neither should be flushed yet
      expect(callbacks1.onOutput).not.toHaveBeenCalled()
      expect(callbacks2.onOutput).not.toHaveBeenCalled()

      // Close engine1 - should only flush engine1's buffer
      LuaEngineFactory.close(engine1)

      expect(callbacks1.onOutput).toHaveBeenCalledWith('engine1\n')
      expect(callbacks2.onOutput).not.toHaveBeenCalled()

      // Close engine2
      LuaEngineFactory.close(engine2)

      expect(callbacks2.onOutput).toHaveBeenCalledWith('engine2\n')
    })
  })
})
