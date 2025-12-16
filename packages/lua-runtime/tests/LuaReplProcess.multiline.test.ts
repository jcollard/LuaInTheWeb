import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaReplProcess } from '../src/LuaReplProcess'

describe('LuaReplProcess - Multi-line Input', () => {
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

  describe('continuation prompts', () => {
    it('should show continuation prompt for incomplete function', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('function hello()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should show continuation prompt instead of executing
      expect(onOutput).toHaveBeenCalledWith('>> ')
    })

    it('should show continuation prompt for incomplete if statement', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('if true then')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onOutput).toHaveBeenCalledWith('>> ')
    })

    it('should show continuation prompt for incomplete for loop', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('for i=1,3 do')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onOutput).toHaveBeenCalledWith('>> ')
    })

    it('should continue showing >> prompt while building multi-line', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      // First line shows >> after incomplete
      process.handleInput('while true do')
      await new Promise((resolve) => setTimeout(resolve, 50))

      const calls1 = onOutput.mock.calls.map((c) => c[0])
      expect(calls1[calls1.length - 1]).toBe('>> ')

      // Second line also shows >>
      onOutput.mockClear()
      process.handleInput('  break')
      await new Promise((resolve) => setTimeout(resolve, 50))

      const calls2 = onOutput.mock.calls.map((c) => c[0])
      expect(calls2[calls2.length - 1]).toBe('>> ')

      // End shows >
      onOutput.mockClear()
      process.handleInput('end')
      await new Promise((resolve) => setTimeout(resolve, 50))

      const calls3 = onOutput.mock.calls.map((c) => c[0])
      expect(calls3[calls3.length - 1]).toBe('> ')
    })
  })

  describe('complete multi-line execution', () => {
    it('should execute complete multi-line function and show result', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      // Enter function definition
      process.handleInput('function hello()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('  print("hello")')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('end')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should now show regular prompt after execution
      expect(onOutput).toHaveBeenCalledWith('> ')

      // Call the function to verify it was defined
      onOutput.mockClear()
      process.handleInput('hello()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onOutput).toHaveBeenCalledWith('hello\n')
    })

    it('should execute complete multi-line for loop', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('for i=1,2 do')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('  print(i)')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('end')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should have printed 1 and 2 (may be batched together or separate)
      const allOutput = onOutput.mock.calls.map((call) => call[0]).join('')
      expect(allOutput).toContain('1\n')
      expect(allOutput).toContain('2\n')
    })
  })

  describe('nested structures', () => {
    it('should handle nested incomplete structures', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('function test()')
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(onOutput).toHaveBeenCalledWith('>> ')

      onOutput.mockClear()
      process.handleInput('  if true then')
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(onOutput).toHaveBeenCalledWith('>> ')

      onOutput.mockClear()
      process.handleInput('    print("nested")')
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(onOutput).toHaveBeenCalledWith('>> ')

      onOutput.mockClear()
      process.handleInput('  end')
      await new Promise((resolve) => setTimeout(resolve, 50))
      // Still incomplete (function not closed)
      expect(onOutput).toHaveBeenCalledWith('>> ')

      onOutput.mockClear()
      process.handleInput('end')
      await new Promise((resolve) => setTimeout(resolve, 50))
      // Now complete
      expect(onOutput).toHaveBeenCalledWith('> ')
    })
  })

  describe('continuation mode state', () => {
    it('should report inContinuationMode state', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(process.inContinuationMode).toBe(false)

      process.handleInput('function hello()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.inContinuationMode).toBe(true)

      process.handleInput('end')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.inContinuationMode).toBe(false)
    })

    it('should clear buffer and exit continuation mode on cancelInput()', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('function broken()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.inContinuationMode).toBe(true)

      onOutput.mockClear()
      process.cancelInput()

      expect(process.inContinuationMode).toBe(false)
      // Should show normal prompt
      expect(onOutput).toHaveBeenCalledWith('> ')
    })
  })

  describe('syntax errors', () => {
    it('should handle syntax errors in multi-line input', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Start incomplete code
      process.handleInput('function test()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      onError.mockClear()

      // Add code with clear syntax error (double keyword 'then then') and close
      process.handleInput('  if true then then')
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('  end')
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('end')
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should have reported an error
      expect(onError).toHaveBeenCalled()
      // Should exit continuation mode after error
      expect(process.inContinuationMode).toBe(false)
    })
  })
})
