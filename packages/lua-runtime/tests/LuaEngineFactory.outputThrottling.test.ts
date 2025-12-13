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

      // Output should NOT be called immediately due to buffering
      // It will be flushed on close or when time/size threshold is met
      expect(callbacks.onOutput).not.toHaveBeenCalled()

      LuaEngineFactory.close(engine)
    })

    it('should flush buffer when time threshold is exceeded on next output', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      await engine.doString('print("first")')
      expect(callbacks.onOutput).not.toHaveBeenCalled()

      // Wait for more than FLUSH_INTERVAL_MS
      await new Promise((resolve) => setTimeout(resolve, FLUSH_INTERVAL_MS + 5))

      // Next print should trigger flush (including the new output in the batch)
      await engine.doString('print("second")')

      // Both outputs should be flushed together (add-then-flush behavior)
      expect(callbacks.onOutput).toHaveBeenCalledWith('first\nsecond\n')

      LuaEngineFactory.close(engine)
    })

    it('should batch rapid prints within flush interval', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // Rapid prints within same interval should be batched
      await engine.doString('print("one"); print("two"); print("three")')

      // Nothing flushed yet (all within same interval)
      expect(callbacks.onOutput).not.toHaveBeenCalled()

      // Close should flush all batched output
      LuaEngineFactory.close(engine)

      expect(callbacks.onOutput).toHaveBeenCalledTimes(1)
      expect(callbacks.onOutput).toHaveBeenCalledWith('one\ntwo\nthree\n')
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
