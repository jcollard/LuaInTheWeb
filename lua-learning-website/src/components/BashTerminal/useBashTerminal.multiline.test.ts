import { renderHook, act } from '@testing-library/react'
import { useBashTerminal } from './useBashTerminal'
import type { TerminalCommand } from './useBashTerminal'

describe('useBashTerminal', () => {
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
})
