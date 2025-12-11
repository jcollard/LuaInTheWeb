import { renderHook, act } from '@testing-library/react'
import { useBashTerminal } from './useBashTerminal'
import type { TerminalCommand } from './useBashTerminal'

describe('useBashTerminal', () => {
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
})
