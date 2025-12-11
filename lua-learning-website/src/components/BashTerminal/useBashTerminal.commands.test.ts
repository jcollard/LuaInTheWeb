import { renderHook, act } from '@testing-library/react'
import { useBashTerminal } from './useBashTerminal'
import type { TerminalCommand } from './useBashTerminal'

describe('useBashTerminal', () => {
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
