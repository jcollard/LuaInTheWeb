import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaReplProcess } from '../src/LuaReplProcess'

/**
 * Tests for cursor editing functionality in LuaReplProcess.
 * These tests cover cursor position tracking, cursor movement,
 * character insertion, and line navigation in continuation mode.
 */
describe('LuaReplProcess cursor editing', () => {
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

  describe('cursor position tracking', () => {
    it('should have cursorPosition property initialized to 0', () => {
      expect(process.cursorPosition).toBe(0)
    })

    it('should have currentLineIndex property initialized to 0', () => {
      expect(process.currentLineIndex).toBe(0)
    })

    it('should have currentLine property initialized to empty string', () => {
      expect(process.currentLine).toBe('')
    })
  })

  describe('handleKey - ArrowLeft', () => {
    it('should do nothing when cursor is at position 0', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleKey('ArrowLeft')

      expect(process.cursorPosition).toBe(0)
      // Should not output anything (cursor already at start)
      expect(onOutput).not.toHaveBeenCalled()
    })

    it('should move cursor left and output ANSI escape sequence', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Type some characters to move cursor
      process.handleKey('a')
      process.handleKey('b')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.cursorPosition).toBe(2)
      onOutput.mockClear()

      process.handleKey('ArrowLeft')

      expect(process.cursorPosition).toBe(1)
      // Should output cursor left escape sequence
      expect(onOutput).toHaveBeenCalledWith('\x1b[D')
    })
  })

  describe('handleKey - ArrowRight', () => {
    it('should do nothing when cursor is at end of line', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleKey('a')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.cursorPosition).toBe(1)
      onOutput.mockClear()

      process.handleKey('ArrowRight')

      expect(process.cursorPosition).toBe(1)
      // Should not output anything (cursor already at end)
      expect(onOutput).not.toHaveBeenCalled()
    })

    it('should move cursor right when not at end', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleKey('a')
      process.handleKey('b')
      process.handleKey('ArrowLeft')
      process.handleKey('ArrowLeft')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.cursorPosition).toBe(0)
      onOutput.mockClear()

      process.handleKey('ArrowRight')

      expect(process.cursorPosition).toBe(1)
      // Should output cursor right escape sequence
      expect(onOutput).toHaveBeenCalledWith('\x1b[C')
    })
  })

  describe('handleKey - character insertion', () => {
    it('should insert character at end and move cursor', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleKey('a')

      expect(process.currentLine).toBe('a')
      expect(process.cursorPosition).toBe(1)
      expect(onOutput).toHaveBeenCalledWith('a')
    })

    it('should insert character at cursor position in middle of line', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleKey('a')
      process.handleKey('c')
      process.handleKey('ArrowLeft') // cursor at position 1
      onOutput.mockClear()

      process.handleKey('b') // insert 'b' at position 1

      expect(process.currentLine).toBe('abc')
      expect(process.cursorPosition).toBe(2)
      // Should redraw line from cursor position
      expect(onOutput).toHaveBeenCalled()
    })

    it('should handle multiple character insertions', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleKey('h')
      process.handleKey('e')
      process.handleKey('l')
      process.handleKey('l')
      process.handleKey('o')

      expect(process.currentLine).toBe('hello')
      expect(process.cursorPosition).toBe(5)
    })
  })

  describe('handleKey - backspace', () => {
    it('should do nothing when cursor is at position 0 on first line', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))
      onOutput.mockClear()

      process.handleKey('Backspace')

      expect(process.currentLine).toBe('')
      expect(process.cursorPosition).toBe(0)
    })

    it('should delete character before cursor', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleKey('a')
      process.handleKey('b')
      process.handleKey('c')
      onOutput.mockClear()

      process.handleKey('Backspace')

      expect(process.currentLine).toBe('ab')
      expect(process.cursorPosition).toBe(2)
    })

    it('should delete character at cursor position in middle', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleKey('a')
      process.handleKey('b')
      process.handleKey('c')
      process.handleKey('ArrowLeft') // cursor after 'b'
      onOutput.mockClear()

      process.handleKey('Backspace')

      expect(process.currentLine).toBe('ac')
      expect(process.cursorPosition).toBe(1)
    })
  })

  describe('continuation mode - line navigation', () => {
    it('should navigate to previous line with ArrowUp in continuation mode', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter multi-line mode
      process.handleInput('function test()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.inContinuationMode).toBe(true)

      // Type on second line
      process.handleKey('p')
      process.handleKey('r')
      process.handleKey('i')
      process.handleKey('n')
      process.handleKey('t')

      expect(process.currentLineIndex).toBe(1)
      onOutput.mockClear()

      // Navigate up to first line
      process.handleKey('ArrowUp')

      expect(process.currentLineIndex).toBe(0)
      expect(process.currentLine).toBe('function test()')
    })

    it('should navigate to next line with ArrowDown in continuation mode', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter multi-line mode
      process.handleInput('function test()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Type second line
      process.handleKey('p')
      process.handleKey('r')
      process.handleKey('i')
      process.handleKey('n')
      process.handleKey('t')

      // Navigate up
      process.handleKey('ArrowUp')
      expect(process.currentLineIndex).toBe(0)

      onOutput.mockClear()

      // Navigate back down
      process.handleKey('ArrowDown')

      expect(process.currentLineIndex).toBe(1)
    })

    it('should not navigate past first line with ArrowUp in continuation mode', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter multi-line mode
      process.handleInput('function test()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.currentLineIndex).toBe(1) // on second line (empty continuation)

      // Navigate up to first line
      process.handleKey('ArrowUp')
      expect(process.currentLineIndex).toBe(0)
      onOutput.mockClear()

      // Try to navigate up again - should stay on first line
      process.handleKey('ArrowUp')

      expect(process.currentLineIndex).toBe(0)
    })

    it('should not navigate past last line with ArrowDown in continuation mode', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter multi-line mode
      process.handleInput('function test()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.currentLineIndex).toBe(1)
      onOutput.mockClear()

      // Try to navigate down - should stay on current line
      process.handleKey('ArrowDown')

      expect(process.currentLineIndex).toBe(1)
    })

    it('should preserve cursor position when navigating between lines', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter multi-line mode with content
      process.handleInput('function test()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Type on second line: "  print"
      process.handleKey(' ')
      process.handleKey(' ')
      process.handleKey('p')
      process.handleKey('r')
      process.handleKey('i')
      process.handleKey('n')
      process.handleKey('t')

      expect(process.cursorPosition).toBe(7) // "  print"

      // Navigate up - cursor should clamp to first line length
      process.handleKey('ArrowUp')

      // First line is "function test()" which is 15 chars
      // Cursor should stay at 7 (within bounds)
      expect(process.cursorPosition).toBe(7)
    })

    it('should clamp cursor position when moving to shorter line', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter "ab" then multi-line
      process.handleInput('if true then')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Type "x" on second line
      process.handleKey('x')

      expect(process.cursorPosition).toBe(1)

      // Navigate up to first line "if true then" (12 chars)
      process.handleKey('ArrowUp')

      expect(process.cursorPosition).toBe(1) // stays at 1

      // Navigate back down to "x"
      process.handleKey('ArrowDown')

      expect(process.cursorPosition).toBe(1) // stays at 1 (line is only 1 char)
    })
  })

  describe('backspace line merging in continuation mode', () => {
    it('should merge with previous line when backspace at position 0', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter multi-line mode
      process.handleInput('function test()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Type "  end" on second line
      process.handleKey(' ')
      process.handleKey(' ')
      process.handleKey('e')
      process.handleKey('n')
      process.handleKey('d')

      // Move cursor to beginning of second line
      process.handleKey('ArrowLeft')
      process.handleKey('ArrowLeft')
      process.handleKey('ArrowLeft')
      process.handleKey('ArrowLeft')
      process.handleKey('ArrowLeft')

      expect(process.cursorPosition).toBe(0)
      expect(process.currentLineIndex).toBe(1)

      onOutput.mockClear()

      // Backspace should merge with previous line
      process.handleKey('Backspace')

      expect(process.currentLineIndex).toBe(0)
      expect(process.currentLine).toBe('function test()  end')
      // Cursor should be at the merge point
      expect(process.cursorPosition).toBe(15) // length of "function test()"
    })
  })

  describe('state reset on execution', () => {
    it('should reset cursor position after executing code', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('2 + 2')
      await new Promise((resolve) => setTimeout(resolve, 100))

      // After execution, cursor should be reset for new input
      expect(process.cursorPosition).toBe(0)
      expect(process.currentLine).toBe('')
      expect(process.currentLineIndex).toBe(0)
    })

    it('should reset cursor state after syntax error', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleInput('invalid syntax %%%')
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(process.cursorPosition).toBe(0)
      expect(process.currentLine).toBe('')
      expect(process.currentLineIndex).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should not handle keys when process is not running', () => {
      // Process not started
      process.handleKey('a')
      expect(process.currentLine).toBe('')
    })

    it('should handle ANSI output for cursor left', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleKey('a')
      process.handleKey('b')
      onOutput.mockClear()

      process.handleKey('ArrowLeft')

      expect(onOutput).toHaveBeenCalledWith('\x1b[D')
    })

    it('should handle ANSI output for cursor right', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleKey('a')
      process.handleKey('b')
      process.handleKey('ArrowLeft')
      process.handleKey('ArrowLeft')
      onOutput.mockClear()

      process.handleKey('ArrowRight')

      expect(onOutput).toHaveBeenCalledWith('\x1b[C')
    })

    it('should handle character insertion in middle with ANSI redraw', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleKey('a')
      process.handleKey('c')
      process.handleKey('ArrowLeft')
      onOutput.mockClear()

      process.handleKey('b')

      // Should output: char + rest of line + cursor back
      expect(onOutput).toHaveBeenCalled()
      const output = onOutput.mock.calls[0][0]
      expect(output).toContain('b')
      expect(output).toContain('c')
    })

    it('should handle backspace at end of line', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleKey('a')
      process.handleKey('b')
      onOutput.mockClear()

      process.handleKey('Backspace')

      expect(process.currentLine).toBe('a')
      expect(onOutput).toHaveBeenCalledWith('\b \b')
    })

    it('should handle backspace in middle of line', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      process.handleKey('a')
      process.handleKey('b')
      process.handleKey('c')
      process.handleKey('ArrowLeft')
      onOutput.mockClear()

      process.handleKey('Backspace')

      expect(process.currentLine).toBe('ac')
      expect(process.cursorPosition).toBe(1)
    })

    it('should update inputBuffer when typing in continuation mode', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter continuation mode
      process.handleInput('function foo()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.inContinuationMode).toBe(true)

      // Type characters - they go into currentLine but buffer slot isn't created yet
      process.handleKey('p')
      process.handleKey('r')
      process.handleKey('i')
      process.handleKey('n')
      process.handleKey('t')

      expect(process.currentLine).toBe('print')
    })

    it('should preserve typed content when navigating up then down', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter continuation mode
      process.handleInput('function foo()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Type on second line
      process.handleKey('p')
      process.handleKey('r')
      process.handleKey('i')
      process.handleKey('n')
      process.handleKey('t')

      // Navigate up
      process.handleKey('ArrowUp')
      expect(process.currentLineIndex).toBe(0)

      // Navigate down - content should be preserved
      process.handleKey('ArrowDown')
      expect(process.currentLineIndex).toBe(1)
      expect(process.currentLine).toBe('print')
    })

    it('should use regular history navigation when not in continuation mode', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Execute some commands to build history
      process.handleInput('x = 1')
      await new Promise((resolve) => setTimeout(resolve, 50))

      process.handleInput('y = 2')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.inContinuationMode).toBe(false)

      onOutput.mockClear()

      // ArrowUp should navigate history, not lines
      process.handleKey('ArrowUp')

      // Should show the history entry
      expect(onOutput).toHaveBeenCalledWith(expect.stringContaining('y = 2'))
    })

    it('should do nothing on ArrowUp when at first line in continuation mode', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter continuation mode
      process.handleInput('function foo()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Navigate up to first line
      process.handleKey('ArrowUp')
      expect(process.currentLineIndex).toBe(0)

      onOutput.mockClear()

      // Try to go up again - should do nothing
      process.handleKey('ArrowUp')
      expect(process.currentLineIndex).toBe(0)
      // No ANSI output for line change since we didn't move
    })

    it('should do nothing on ArrowDown when at last line in continuation mode', async () => {
      process.start()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Enter continuation mode
      process.handleInput('function foo()')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(process.currentLineIndex).toBe(1)

      onOutput.mockClear()

      // Try to go down - should do nothing (already at new line position)
      process.handleKey('ArrowDown')
      expect(process.currentLineIndex).toBe(1)
    })
  })
})
