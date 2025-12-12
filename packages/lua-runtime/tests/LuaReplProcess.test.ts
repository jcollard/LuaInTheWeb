import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaReplProcess } from '../src/LuaReplProcess'

describe('LuaReplProcess', () => {
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

  describe('initial state', () => {
    it('should not be running initially', () => {
      expect(process.isRunning()).toBe(false)
    })
  })

  describe('start', () => {
    it('should set running to true after start', async () => {
      process.start()

      // Wait for engine initialization
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(process.isRunning()).toBe(true)
    })

    it('should output welcome message on start', async () => {
      process.start()

      // Wait for engine initialization
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(onOutput).toHaveBeenCalledWith(expect.stringContaining('Lua'))
    })

    it('should output welcome message followed by prompt on new line', async () => {
      process.start()

      // Wait for engine initialization
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Get all output calls in order
      const outputCalls = onOutput.mock.calls.map((call) => call[0])

      // First call should be welcome message with newline
      expect(outputCalls[0]).toBe('Lua 5.4 REPL - Type exit() to quit\n')

      // Second call should be the prompt
      expect(outputCalls[1]).toBe('> ')
    })
  })

  describe('stop', () => {
    it('should set running to false after stop', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.stop()

      expect(process.isRunning()).toBe(false)
    })

    it('should call onExit with code 0 when stopped', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.stop()

      expect(onExit).toHaveBeenCalledWith(0)
    })

    it('should do nothing if not running', () => {
      process.stop()

      expect(onExit).not.toHaveBeenCalled()
    })
  })

  describe('handleInput', () => {
    it('should execute Lua code and output result', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('print("hello")')

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onOutput).toHaveBeenCalledWith('hello\n')
    })

    it('should evaluate expressions and output formatted result', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('1 + 1')

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onOutput).toHaveBeenCalledWith('2\n')
    })

    it('should output result followed by prompt after expression', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('1 + 1')

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Get all output calls in order
      const outputCalls = onOutput.mock.calls.map((call) => call[0])

      // First should be the result with newline
      expect(outputCalls[0]).toBe('2\n')

      // Second should be the prompt
      expect(outputCalls[1]).toBe('> ')
    })

    it('should output prompt after print statement', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('print("hello")')

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Get all output calls in order
      const outputCalls = onOutput.mock.calls.map((call) => call[0])

      // First should be the print output with newline
      expect(outputCalls[0]).toBe('hello\n')

      // Second should be the prompt
      expect(outputCalls[1]).toBe('> ')
    })

    it('should output errors for invalid code with [error] prefix', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onError.mockClear()

      process.handleInput('this is not valid lua')

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onError).toHaveBeenCalled()
      const errorCall = onError.mock.calls[0][0]
      expect(errorCall).toMatch(/^\[error\]/)
    })

    it('should output prompt after error', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('this is not valid lua')

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should still show prompt after error
      expect(onOutput).toHaveBeenCalledWith('> ')
    })

    it('should do nothing if not running', () => {
      process.handleInput('print("hello")')

      expect(onOutput).not.toHaveBeenCalled()
    })

    it('should preserve state between inputs', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('x = 42')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('print(x)')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onOutput).toHaveBeenCalledWith('42\n')
    })
  })

  describe('exit command', () => {
    it('should stop and exit when exit() is called', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('exit()')

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.isRunning()).toBe(false)
      expect(onExit).toHaveBeenCalledWith(0)
    })
  })

  describe('io.read support', () => {
    it('should handle io.read() by waiting for input', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      // Start code that calls io.read()
      process.handleInput('result = io.read()')

      // Wait a bit for the io.read to be called
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Provide the input
      process.handleInput('test input')

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify the input was received
      process.handleInput('print(result)')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onOutput).toHaveBeenCalledWith('test input\n')
    })
  })

  describe('edge cases', () => {
    it('should not start again if already running', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      // Try to start again
      process.start()

      // Should not output another welcome message
      expect(onOutput).not.toHaveBeenCalledWith(expect.stringContaining('Lua'))
    })

    it('should handle multiple consecutive inputs', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('a = 1')
      process.handleInput('b = 2')
      process.handleInput('c = a + b')
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('print(c)')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onOutput).toHaveBeenCalledWith('3\n')
    })

    it('should handle errors gracefully', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onError.mockClear()

      process.handleInput('error("custom error")')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onError).toHaveBeenCalled()
      // Should still be running after an error
      expect(process.isRunning()).toBe(true)
    })

    it('should reject pending inputs when stopped', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Start code that calls io.read() - this will add to the input queue
      process.handleInput('result = io.read()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Stop while waiting for input
      process.stop()

      // The pending input should be rejected and process stopped
      expect(process.isRunning()).toBe(false)
    })
  })
})
