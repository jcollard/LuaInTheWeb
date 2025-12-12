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

    it('should output nil for undefined variables', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleInput('notdefined')

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onOutput).toHaveBeenCalledWith('nil\n')
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

  describe('raw key input support', () => {
    it('should support raw input (supportsRawInput is true)', () => {
      expect(process.supportsRawInput).toBe(true)
    })

    it('should have handleKey method', () => {
      expect(process.handleKey).toBeDefined()
      expect(typeof process.handleKey).toBe('function')
    })
  })

  describe('command history', () => {
    it('should store executed commands in history', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('x = 1')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('y = 2')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // History should contain the executed commands
      expect(process.getHistory()).toEqual(['x = 1', 'y = 2'])
    })

    it('should not store empty commands in history', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('x = 1')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('y = 2')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.getHistory()).toEqual(['x = 1', 'y = 2'])
    })

    it('should not store duplicate consecutive commands', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('x = 1')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('x = 1')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('y = 2')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.getHistory()).toEqual(['x = 1', 'y = 2'])
    })
  })

  describe('handleKey - history navigation', () => {
    it('should navigate to previous command on ArrowUp', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('first')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('second')
      await new Promise((resolve) => setTimeout(resolve, 50))

      onOutput.mockClear()

      // Press ArrowUp - should show 'second' (most recent)
      process.handleKey!('ArrowUp')

      // Should clear line and show previous command
      expect(onOutput).toHaveBeenCalledWith('\r\x1b[K> second')
    })

    it('should navigate to older commands on multiple ArrowUp', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('first')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('second')
      await new Promise((resolve) => setTimeout(resolve, 50))

      onOutput.mockClear()

      // Press ArrowUp twice
      process.handleKey!('ArrowUp')
      process.handleKey!('ArrowUp')

      // Should show 'first' (oldest)
      expect(onOutput).toHaveBeenLastCalledWith('\r\x1b[K> first')
    })

    it('should navigate to newer command on ArrowDown', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('first')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('second')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Navigate to oldest
      process.handleKey!('ArrowUp')
      process.handleKey!('ArrowUp')

      onOutput.mockClear()

      // Navigate back to newer
      process.handleKey!('ArrowDown')

      expect(onOutput).toHaveBeenCalledWith('\r\x1b[K> second')
    })

    it('should clear line when ArrowDown past newest command', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('first')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Navigate up
      process.handleKey!('ArrowUp')

      onOutput.mockClear()

      // Navigate down past the newest
      process.handleKey!('ArrowDown')

      // Should show empty line with prompt
      expect(onOutput).toHaveBeenCalledWith('\r\x1b[K> ')
    })

    it('should not go past oldest command on ArrowUp', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('only')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Press ArrowUp multiple times
      process.handleKey!('ArrowUp')
      onOutput.mockClear()

      process.handleKey!('ArrowUp')

      // Should still show 'only'
      expect(onOutput).toHaveBeenCalledWith('\r\x1b[K> only')
    })

    it('should do nothing on ArrowUp when history is empty', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      onOutput.mockClear()

      process.handleKey!('ArrowUp')

      // Should not output anything (no history to show)
      expect(onOutput).not.toHaveBeenCalled()
    })

    it('should do nothing on ArrowDown when at current input', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('first')
      await new Promise((resolve) => setTimeout(resolve, 50))

      onOutput.mockClear()

      // Press ArrowDown without navigating up first
      process.handleKey!('ArrowDown')

      // Should not output anything (already at current input)
      expect(onOutput).not.toHaveBeenCalled()
    })
  })

  describe('multi-line input', () => {
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

      // Should have printed 1 and 2
      expect(onOutput).toHaveBeenCalledWith('1\n')
      expect(onOutput).toHaveBeenCalledWith('2\n')
    })

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

    it('should store complete multi-line block as single history entry', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('function test()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('  print("test")')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('end')
      await new Promise((resolve) => setTimeout(resolve, 50))

      const history = process.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0]).toBe('function test()\n  print("test")\nend')
    })

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
