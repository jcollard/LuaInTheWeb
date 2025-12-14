import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaReplProcess } from '../src/LuaReplProcess'

describe('LuaReplProcess - Execution Control', () => {
  let process: LuaReplProcess
  let onOutput: ReturnType<typeof vi.fn>
  let onError: ReturnType<typeof vi.fn>
  let onExit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onOutput = vi.fn()
    onError = vi.fn()
    onExit = vi.fn()
    process = new LuaReplProcess()
    process.onOutput = onOutput
    process.onError = onError
    process.onExit = onExit
  })

  describe('stop request mechanism', () => {
    it('should request stop from Lua when stop() is called during execution', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()
      onError.mockClear()

      // Start a long-running loop (but with low instruction limit for test)
      // The actual stopping happens via the debug hook mechanism
      process.handleInput('for i = 1, 1000000 do local x = i end')

      // Give a tiny bit of time for execution to start
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Stop the process
      process.stop()

      // Should not throw, process should stop cleanly
      expect(process.isRunning()).toBe(false)
      expect(onExit).toHaveBeenCalledWith(0)
    })
  })

  describe('instruction limit callback', () => {
    it('should stop execution when instruction limit is reached and user declines to continue', async () => {
      // Create process with custom instruction limit callback
      const customProcess = new LuaReplProcess({
        instructionLimit: 100,
        instructionCheckInterval: 10,
        onInstructionLimitReached: () => false, // Don't continue
      })
      customProcess.onOutput = onOutput
      customProcess.onError = onError
      customProcess.onExit = onExit

      customProcess.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()
      onError.mockClear()

      // Run code that will exceed limit
      customProcess.handleInput('for i = 1, 1000 do local x = i end')
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should have stopped with an error message
      expect(onError).toHaveBeenCalled()
      const errorMsg = onError.mock.calls.find((call) =>
        call[0].includes('instruction limit')
      )
      expect(errorMsg).toBeDefined()

      customProcess.stop()
    })

    it('should continue execution when instruction limit is reached and user confirms', async () => {
      let limitCallCount = 0
      const customProcess = new LuaReplProcess({
        instructionLimit: 50,
        instructionCheckInterval: 5,
        onInstructionLimitReached: () => {
          limitCallCount++
          return limitCallCount < 3 // Continue first 2 times, then stop
        },
      })
      customProcess.onOutput = onOutput
      customProcess.onError = onError
      customProcess.onExit = onExit

      customProcess.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()
      onError.mockClear()

      // Run code that will exceed limit multiple times
      customProcess.handleInput('for i = 1, 1000 do local x = i end')
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Should have called the callback multiple times
      expect(limitCallCount).toBeGreaterThanOrEqual(2)

      customProcess.stop()
    })
  })

  describe('instruction count reset between commands', () => {
    it('should reset instruction count between REPL commands', async () => {
      let instructionLimitCallCount = 0
      const customProcess = new LuaReplProcess({
        instructionLimit: 200,
        instructionCheckInterval: 10,
        onInstructionLimitReached: () => {
          instructionLimitCallCount++
          return false // Stop on first limit
        },
      })
      customProcess.onOutput = onOutput
      customProcess.onError = onError
      customProcess.onExit = onExit

      customProcess.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // First command - runs some instructions but doesn't hit limit
      customProcess.handleInput('for i = 1, 50 do local x = i end')
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Second command - should start fresh, not accumulate from first
      customProcess.handleInput('for i = 1, 50 do local x = i end')
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Neither should have hit the limit since each is under 200 lines
      expect(instructionLimitCallCount).toBe(0)

      customProcess.stop()
    })
  })

  describe('execution hook setup', () => {
    it('should wrap code execution with debug hooks', async () => {
      // Verify that code execution properly sets up and clears hooks
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      // Simple code that should work with hooks
      process.handleInput('x = 1')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should complete without errors
      expect(onError).not.toHaveBeenCalled()
      expect(process.isRunning()).toBe(true)

      process.stop()
    })
  })

  describe('continuation mode state', () => {
    it('should expose inContinuationMode property', () => {
      expect(process.inContinuationMode).toBeDefined()
      expect(typeof process.inContinuationMode).toBe('boolean')
    })

    it('should not be in continuation mode initially', () => {
      expect(process.inContinuationMode).toBe(false)
    })
  })
})
