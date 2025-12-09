import { renderHook, act } from '@testing-library/react'
import { useBashTerminal } from './useBashTerminal'
import type { TerminalCommand } from './useBashTerminal'

describe('useBashTerminal', () => {
  describe('initial state', () => {
    it('should start with empty current line', () => {
      // Arrange & Act
      const { result } = renderHook(() => useBashTerminal())

      // Assert
      expect(result.current.currentLine).toBe('')
    })

    it('should start with cursor at position 0', () => {
      // Arrange & Act
      const { result } = renderHook(() => useBashTerminal())

      // Assert
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should start with empty history', () => {
      // Arrange & Act
      const { result } = renderHook(() => useBashTerminal())

      // Assert
      expect(result.current.history).toEqual([])
    })

    it('should start with historyIndex at -1', () => {
      // Arrange & Act
      const { result } = renderHook(() => useBashTerminal())

      // Assert
      expect(result.current.historyIndex).toBe(-1)
    })

    it('should start in single-line mode', () => {
      // Arrange & Act
      const { result } = renderHook(() => useBashTerminal())

      // Assert
      expect(result.current.isMultiLineMode).toBe(false)
    })

    it('should start with empty multiLineBuffer', () => {
      // Arrange & Act
      const { result } = renderHook(() => useBashTerminal())

      // Assert
      expect(result.current.multiLineBuffer).toEqual([])
    })

    it('should start with multiLineCursorLine at 0', () => {
      // Arrange & Act
      const { result } = renderHook(() => useBashTerminal())

      // Assert
      expect(result.current.multiLineCursorLine).toBe(0)
    })
  })

  describe('character input', () => {
    it('should insert character at cursor position', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })

      // Assert
      expect(result.current.currentLine).toBe('a')
      expect(result.current.cursorPosition).toBe(1)
    })

    it('should insert multiple characters sequentially', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act - each handler call in separate act() to allow ref updates
      act(() => {
        result.current.handleCharacter('h')
      })
      act(() => {
        result.current.handleCharacter('i')
      })

      // Assert
      expect(result.current.currentLine).toBe('hi')
      expect(result.current.cursorPosition).toBe(2)
    })

    it('should insert character in middle of line', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCharacter('c')
      })
      act(() => {
        result.current.handleArrowLeft() // cursor at position 1
      })
      act(() => {
        result.current.handleCharacter('b')
      })

      // Assert
      expect(result.current.currentLine).toBe('abc')
      expect(result.current.cursorPosition).toBe(2)
    })

    it('should return terminal commands for rendering', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      let commands: ReturnType<typeof result.current.handleCharacter>
      act(() => {
        commands = result.current.handleCharacter('a')
      })

      // Assert
      expect(commands!).toBeDefined()
      expect(commands!.length).toBeGreaterThan(0)
    })
  })

  describe('backspace', () => {
    it('should do nothing when line is empty', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleBackspace()
      })

      // Assert
      expect(result.current.currentLine).toBe('')
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should delete character before cursor', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleBackspace()
      })

      // Assert
      expect(result.current.currentLine).toBe('a')
      expect(result.current.cursorPosition).toBe(1)
    })

    it('should delete character in middle of line', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleCharacter('c')
      })
      act(() => {
        result.current.handleArrowLeft() // cursor after 'b'
      })
      act(() => {
        result.current.handleBackspace() // delete 'b'
      })

      // Assert
      expect(result.current.currentLine).toBe('ac')
      expect(result.current.cursorPosition).toBe(1)
    })

    it('should do nothing when cursor is at start', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleArrowLeft() // cursor at start
      })
      act(() => {
        result.current.handleBackspace()
      })

      // Assert
      expect(result.current.currentLine).toBe('a')
      expect(result.current.cursorPosition).toBe(0)
    })
  })

  describe('cursor movement', () => {
    it('should move cursor left', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleArrowLeft()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(1)
    })

    it('should not move cursor left past start', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleArrowLeft()
      })
      act(() => {
        result.current.handleArrowLeft()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should move cursor right', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleArrowLeft()
      })
      act(() => {
        result.current.handleArrowLeft()
      })
      act(() => {
        result.current.handleArrowRight()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(1)
    })

    it('should not move cursor right past end', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleArrowRight()
      })
      act(() => {
        result.current.handleArrowRight()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(1)
    })
  })

  describe('enter key', () => {
    it('should call onCommand with trimmed line', () => {
      // Arrange
      const onCommand = vi.fn()
      const { result } = renderHook(() => useBashTerminal({ onCommand }))

      // Act
      act(() => {
        result.current.handleCharacter('h')
      })
      act(() => {
        result.current.handleCharacter('i')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Assert
      expect(onCommand).toHaveBeenCalledWith('hi')
    })

    it('should not call onCommand when line is empty', () => {
      // Arrange
      const onCommand = vi.fn()
      const { result } = renderHook(() => useBashTerminal({ onCommand }))

      // Act
      act(() => {
        result.current.handleEnter()
      })

      // Assert
      expect(onCommand).not.toHaveBeenCalled()
    })

    it('should not call onCommand when line is whitespace only', () => {
      // Arrange
      const onCommand = vi.fn()
      const { result } = renderHook(() => useBashTerminal({ onCommand }))

      // Act
      act(() => {
        result.current.handleCharacter(' ')
      })
      act(() => {
        result.current.handleCharacter(' ')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Assert
      expect(onCommand).not.toHaveBeenCalled()
    })

    it('should clear line after enter', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('h')
      })
      act(() => {
        result.current.handleCharacter('i')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Assert
      expect(result.current.currentLine).toBe('')
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should add command to history', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('h')
      })
      act(() => {
        result.current.handleCharacter('i')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Assert
      expect(result.current.history).toEqual(['hi'])
    })
  })

  describe('ctrl+c', () => {
    it('should clear current line', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('h')
      })
      act(() => {
        result.current.handleCharacter('i')
      })
      act(() => {
        result.current.handleCtrlC()
      })

      // Assert
      expect(result.current.currentLine).toBe('')
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should not add to history', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('h')
      })
      act(() => {
        result.current.handleCharacter('i')
      })
      act(() => {
        result.current.handleCtrlC()
      })

      // Assert
      expect(result.current.history).toEqual([])
    })

    it('should return terminal commands with ^C text', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      let commands: TerminalCommand[]
      act(() => {
        result.current.handleCharacter('h')
      })
      act(() => {
        commands = result.current.handleCtrlC()
      })

      // Assert
      expect(commands!).toContainEqual({ type: 'write', data: '^C' })
      expect(commands!).toContainEqual({ type: 'writeln', data: '' })
    })
  })

  describe('terminal commands', () => {
    describe('handleCharacter commands', () => {
      it('should return write command with character at end of line', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        let commands: TerminalCommand[]
        act(() => {
          commands = result.current.handleCharacter('a')
        })

        // Assert
        expect(commands!).toEqual([{ type: 'write', data: 'a' }])
      })

      it('should return write and moveCursor commands when inserting in middle', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        act(() => {
          result.current.handleCharacter('a')
        })
        act(() => {
          result.current.handleCharacter('c')
        })
        act(() => {
          result.current.handleArrowLeft()
        })

        let commands: TerminalCommand[]
        act(() => {
          commands = result.current.handleCharacter('b')
        })

        // Assert - should write 'bc' and move cursor back 1
        expect(commands!).toContainEqual({ type: 'write', data: 'bc' })
        expect(commands!).toContainEqual({ type: 'moveCursor', direction: 'left', count: 1 })
      })
    })

    describe('handleBackspace commands', () => {
      it('should return empty array when line is empty', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        let commands: TerminalCommand[]
        act(() => {
          commands = result.current.handleBackspace()
        })

        // Assert
        expect(commands!).toEqual([])
      })

      it('should return proper commands when deleting at end of line', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        act(() => {
          result.current.handleCharacter('a')
        })
        act(() => {
          result.current.handleCharacter('b')
        })

        let commands: TerminalCommand[]
        act(() => {
          commands = result.current.handleBackspace()
        })

        // Assert - should move left, write space, move left
        expect(commands!.length).toBe(3)
        expect(commands![0]).toEqual({ type: 'moveCursor', direction: 'left', count: 1 })
        expect(commands![1].type).toBe('write')
        expect(commands![1].data).toContain(' ') // clears the character
        expect(commands![2]).toEqual({ type: 'moveCursor', direction: 'left', count: 1 })
      })

      it('should return proper commands when deleting in middle of line', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        act(() => {
          result.current.handleCharacter('a')
        })
        act(() => {
          result.current.handleCharacter('b')
        })
        act(() => {
          result.current.handleCharacter('c')
        })
        act(() => {
          result.current.handleArrowLeft() // cursor at position 2
        })

        let commands: TerminalCommand[]
        act(() => {
          commands = result.current.handleBackspace() // delete 'b'
        })

        // Assert - remaining text is 'c', need to move back 2 (c + space)
        expect(commands!.length).toBe(3)
        expect(commands![0]).toEqual({ type: 'moveCursor', direction: 'left', count: 1 })
        expect(commands![1]).toEqual({ type: 'write', data: 'c ' })
        expect(commands![2]).toEqual({ type: 'moveCursor', direction: 'left', count: 2 })
      })
    })

    describe('handleEnter commands', () => {
      it('should return writeln command', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        act(() => {
          result.current.handleCharacter('h')
        })
        act(() => {
          result.current.handleCharacter('i')
        })

        let commands: TerminalCommand[]
        act(() => {
          commands = result.current.handleEnter()
        })

        // Assert
        expect(commands!).toEqual([{ type: 'writeln', data: '' }])
      })

      it('should reset historyIndex to -1 after enter', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        act(() => {
          result.current.handleCharacter('h')
        })
        act(() => {
          result.current.handleCharacter('i')
        })
        act(() => {
          result.current.handleEnter()
        })

        // Assert
        expect(result.current.historyIndex).toBe(-1)
      })
    })

    describe('handleArrowLeft commands', () => {
      it('should return moveCursor left command', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        act(() => {
          result.current.handleCharacter('a')
        })

        let commands: TerminalCommand[]
        act(() => {
          commands = result.current.handleArrowLeft()
        })

        // Assert
        expect(commands!).toEqual([{ type: 'moveCursor', direction: 'left', count: 1 }])
      })

      it('should return empty array when at start', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        let commands: TerminalCommand[]
        act(() => {
          commands = result.current.handleArrowLeft()
        })

        // Assert
        expect(commands!).toEqual([])
      })
    })

    describe('handleArrowRight commands', () => {
      it('should return moveCursor right command', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        act(() => {
          result.current.handleCharacter('a')
        })
        act(() => {
          result.current.handleArrowLeft()
        })

        let commands: TerminalCommand[]
        act(() => {
          commands = result.current.handleArrowRight()
        })

        // Assert
        expect(commands!).toEqual([{ type: 'moveCursor', direction: 'right', count: 1 }])
      })

      it('should return empty array when at end', () => {
        // Arrange
        const { result } = renderHook(() => useBashTerminal())

        // Act
        act(() => {
          result.current.handleCharacter('a')
        })

        let commands: TerminalCommand[]
        act(() => {
          commands = result.current.handleArrowRight()
        })

        // Assert
        expect(commands!).toEqual([])
      })
    })
  })

  describe('history navigation', () => {
    it('should navigate to previous command with arrow up', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute first command
      act(() => {
        result.current.handleCharacter('f')
      })
      act(() => {
        result.current.handleCharacter('i')
      })
      act(() => {
        result.current.handleCharacter('r')
      })
      act(() => {
        result.current.handleCharacter('s')
      })
      act(() => {
        result.current.handleCharacter('t')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up
      act(() => {
        result.current.handleArrowUp()
      })

      // Assert
      expect(result.current.currentLine).toBe('first')
      expect(result.current.historyIndex).toBe(0)
    })

    it('should navigate through multiple history entries', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute two commands
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up twice
      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowUp()
      })

      // Assert
      expect(result.current.currentLine).toBe('a')
      expect(result.current.historyIndex).toBe(0)
    })

    it('should not navigate past first history entry', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute one command
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up multiple times
      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowUp()
      })

      // Assert - should still be at first entry
      expect(result.current.currentLine).toBe('a')
      expect(result.current.historyIndex).toBe(0)
    })

    it('should navigate forward with arrow down', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute two commands
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up twice, then down once
      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowDown()
      })

      // Assert
      expect(result.current.currentLine).toBe('b')
      expect(result.current.historyIndex).toBe(1)
    })

    it('should clear line when navigating past last history entry', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute one command
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up then down
      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowDown()
      })

      // Assert - should be empty line
      expect(result.current.currentLine).toBe('')
    })

    it('should do nothing when no history and pressing up', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleArrowUp()
      })

      // Assert
      expect(result.current.currentLine).toBe('')
      expect(result.current.historyIndex).toBe(-1)
    })

    it('should set cursor position to end of line when navigating history', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute command
      act(() => {
        result.current.handleCharacter('t')
      })
      act(() => {
        result.current.handleCharacter('e')
      })
      act(() => {
        result.current.handleCharacter('s')
      })
      act(() => {
        result.current.handleCharacter('t')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up
      act(() => {
        result.current.handleArrowUp()
      })

      // Assert - cursor should be at end
      expect(result.current.cursorPosition).toBe(4)
    })

    it('should return terminal commands for history navigation', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute command
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up
      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleArrowUp()
      })

      // Assert - should have commands to clear and rewrite line
      expect(commands!.length).toBeGreaterThan(0)
    })
  })

  describe('multi-line mode', () => {
    it('should enter multi-line mode on first Shift+Enter', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter()
      })

      // Assert
      expect(result.current.isMultiLineMode).toBe(true)
      expect(result.current.multiLineBuffer).toEqual(['a'])
    })

    it('should exit multi-line mode and execute on second Shift+Enter', () => {
      // Arrange
      const onCommand = vi.fn()
      const { result } = renderHook(() => useBashTerminal({ onCommand }))

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleShiftEnter() // Exit and execute
      })

      // Assert
      expect(result.current.isMultiLineMode).toBe(false)
      expect(onCommand).toHaveBeenCalledWith('a')
    })

    it('should add new line on Enter in multi-line mode', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleEnter() // Add new line
      })

      // Assert
      expect(result.current.multiLineBuffer).toEqual(['a', ''])
      expect(result.current.multiLineCursorLine).toBe(1)
    })

    it('should execute full multi-line command', () => {
      // Arrange
      const onCommand = vi.fn()
      const { result } = renderHook(() => useBashTerminal({ onCommand }))

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleEnter() // Add new line
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleShiftEnter() // Exit and execute
      })

      // Assert
      expect(onCommand).toHaveBeenCalledWith('a\nb')
    })

    it('should clear multi-line state on Ctrl+C', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleCtrlC()
      })

      // Assert
      expect(result.current.isMultiLineMode).toBe(false)
      expect(result.current.multiLineBuffer).toEqual([])
    })

    it('should return writeln command with empty data when entering multi-line mode', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })

      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleShiftEnter()
      })

      // Assert - verify exact command structure
      expect(commands!).toEqual([{ type: 'writeln', data: '' }])
    })

    it('should return writeln command with empty data when exiting multi-line mode', () => {
      // Arrange
      const onCommand = vi.fn()
      const { result } = renderHook(() => useBashTerminal({ onCommand }))

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })

      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleShiftEnter() // Exit multi-line mode
      })

      // Assert - verify exact command structure
      expect(commands!).toEqual([{ type: 'writeln', data: '' }])
    })

    it('should return writeln command with empty data in multi-line Enter', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })

      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleEnter() // Add new line in multi-line mode
      })

      // Assert - verify exact command structure
      expect(commands!).toEqual([{ type: 'writeln', data: '' }])
    })

    it('should preserve buffer content when adding new line in multi-line mode', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('f')
      })
      act(() => {
        result.current.handleCharacter('i')
      })
      act(() => {
        result.current.handleCharacter('r')
      })
      act(() => {
        result.current.handleCharacter('s')
      })
      act(() => {
        result.current.handleCharacter('t')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode with "first"
      })
      act(() => {
        result.current.handleEnter() // Add new line
      })

      // Assert - buffer should contain "first" and empty string, not be reset
      expect(result.current.multiLineBuffer).toEqual(['first', ''])
      expect(result.current.multiLineBuffer[0]).toBe('first')
    })

    it('should reset currentLine to empty after exiting multi-line mode', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleShiftEnter() // Exit multi-line mode
      })

      // Assert
      expect(result.current.currentLine).toBe('')
    })

    it('should reset multiLineBuffer to empty array after exiting multi-line mode', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleShiftEnter() // Exit multi-line mode
      })

      // Assert
      expect(result.current.multiLineBuffer).toEqual([])
    })

    it('should add multi-line command to history', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleEnter() // Add new line
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleShiftEnter() // Exit and execute
      })

      // Assert
      expect(result.current.history).toContain('a\nb')
    })

    it('should reset historyIndex to -1 after multi-line command execution', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute a regular command first to set history
      act(() => {
        result.current.handleCharacter('x')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up to set historyIndex
      act(() => {
        result.current.handleArrowUp()
      })
      expect(result.current.historyIndex).toBe(0)

      // Now execute a multi-line command
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleShiftEnter() // Exit and execute
      })

      // Assert - historyIndex should be reset to -1
      expect(result.current.historyIndex).toBe(-1)
    })

    it('should not call onCommand for whitespace-only multi-line command', () => {
      // Arrange
      const onCommand = vi.fn()
      const { result } = renderHook(() => useBashTerminal({ onCommand }))

      // Act
      act(() => {
        result.current.handleCharacter(' ')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleEnter() // Add new line
      })
      act(() => {
        result.current.handleCharacter(' ')
      })
      act(() => {
        result.current.handleShiftEnter() // Exit and try to execute
      })

      // Assert - onCommand should not be called for whitespace-only
      expect(onCommand).not.toHaveBeenCalled()
    })

    it('should not add whitespace-only multi-line command to history', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter(' ')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleShiftEnter() // Exit and try to execute
      })

      // Assert
      expect(result.current.history).toEqual([])
    })

    it('should reset multiLineCursorLine to 0 when exiting multi-line mode via Ctrl+C', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter() // Enter multi-line mode
      })
      act(() => {
        result.current.handleEnter() // Add new line, cursorLine becomes 1
      })
      expect(result.current.multiLineCursorLine).toBe(1)

      act(() => {
        result.current.handleCtrlC()
      })

      // Assert
      expect(result.current.multiLineCursorLine).toBe(0)
    })
  })

  describe('history navigation commands', () => {
    it('should return empty array when arrow down pressed without history navigation', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute a command but don't navigate
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Press arrow down without being in history navigation (historyIndex is -1)
      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleArrowDown()
      })

      // Assert - should return empty array since not navigating history
      expect(commands!).toEqual([])
    })

    it('should return clearLine command when navigating past end of history', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute a command
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up then down
      act(() => {
        result.current.handleArrowUp()
      })

      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleArrowDown()
      })

      // Assert - should have clearLine command
      expect(commands!).toEqual([{ type: 'clearLine' }])
    })

    it('should set historyIndex to -1 when navigating past end of history', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute a command
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up
      act(() => {
        result.current.handleArrowUp()
      })
      expect(result.current.historyIndex).toBe(0)

      // Navigate down past end
      act(() => {
        result.current.handleArrowDown()
      })

      // Assert
      expect(result.current.historyIndex).toBe(-1)
    })

    it('should return clearLine and write commands when navigating within history', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute two commands
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up twice then down once
      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowUp()
      })

      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleArrowDown()
      })

      // Assert - should have clearLine and write commands
      expect(commands!).toEqual([
        { type: 'clearLine' },
        { type: 'write', data: 'b' },
      ])
    })

    it('should return clearLine and write commands when navigating up', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute a command
      act(() => {
        result.current.handleCharacter('t')
      })
      act(() => {
        result.current.handleCharacter('e')
      })
      act(() => {
        result.current.handleCharacter('s')
      })
      act(() => {
        result.current.handleCharacter('t')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up
      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleArrowUp()
      })

      // Assert - should have clearLine and write commands
      expect(commands!).toEqual([
        { type: 'clearLine' },
        { type: 'write', data: 'test' },
      ])
    })

    it('should return empty array when at first history entry and pressing up', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Execute a command
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })

      // Navigate up to first entry
      act(() => {
        result.current.handleArrowUp()
      })
      expect(result.current.historyIndex).toBe(0)

      // Try to navigate up again
      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleArrowUp()
      })

      // Assert - should return empty array
      expect(commands!).toEqual([])
    })

    it('should return empty array when no history and pressing up', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Press up without any history
      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleArrowUp()
      })

      // Assert
      expect(commands!).toEqual([])
    })
  })

  describe('ctrl+c edge cases', () => {
    it('should not affect multiLineBuffer when not in multi-line mode', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Don't enter multi-line mode
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCtrlC()
      })

      // Assert - multiLineBuffer should still be empty
      expect(result.current.multiLineBuffer).toEqual([])
      expect(result.current.isMultiLineMode).toBe(false)
    })

    it('should clear multiLineBuffer when in multi-line mode', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Enter multi-line mode with content
      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleShiftEnter()
      })
      expect(result.current.multiLineBuffer).toEqual(['a'])

      // Press Ctrl+C
      act(() => {
        result.current.handleCtrlC()
      })

      // Assert
      expect(result.current.multiLineBuffer).toEqual([])
    })
  })
})
