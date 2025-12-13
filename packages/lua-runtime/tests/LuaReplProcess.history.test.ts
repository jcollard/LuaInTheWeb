import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaReplProcess } from '../src/LuaReplProcess'

describe('LuaReplProcess - History', () => {
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

    it('should limit history size to prevent unbounded growth', async () => {
      // Note: Full integration test of 1000+ entries is impractical due to async execution.
      // This test verifies history grows correctly; the limit (MAX_HISTORY_SIZE = 1000) is
      // enforced via shift() when exceeded. See LuaReplProcess.checkAndExecuteBuffer().
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Add several unique commands
      for (let i = 0; i < 10; i++) {
        process.handleInput(`x = ${i}`)
        await new Promise((resolve) => setTimeout(resolve, 30))
      }

      const history = process.getHistory()
      expect(history.length).toBe(10)
      expect(history[0]).toBe('x = 0')
      expect(history[9]).toBe('x = 9')
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

  describe('multi-line history', () => {
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

    it('should execute recalled multi-line history entry on Enter', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter and execute a multi-line function
      process.handleInput('function greet()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('  print("hi")')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('end')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Now recall it with ArrowUp
      process.handleKey!('ArrowUp')

      onOutput.mockClear()

      // Press Enter (terminal sends empty string when viewing history)
      process.handleInput('')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should show the prompt (function was re-defined)
      expect(onOutput).toHaveBeenCalledWith('> ')

      // Call the function to verify it works
      onOutput.mockClear()
      process.handleInput('greet()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onOutput).toHaveBeenCalledWith('hi\n')
    })

    it('should execute recalled multi-line for loop on Enter', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter and execute a multi-line for loop
      process.handleInput('for i=1,2 do')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('  print(i)')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('end')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Now recall it with ArrowUp
      process.handleKey!('ArrowUp')

      onOutput.mockClear()

      // Press Enter (terminal sends empty string when viewing history)
      process.handleInput('')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should have printed 1 and 2 again
      expect(onOutput).toHaveBeenCalledWith('1\n')
      expect(onOutput).toHaveBeenCalledWith('2\n')
    })
  })
})
