import { renderHook, act } from '@testing-library/react'
import { useBashTerminal } from './useBashTerminal'
import type { TerminalCommand } from './useBashTerminal'

describe('useBashTerminal', () => {
  describe('home key', () => {
    it('should move cursor to position 0', () => {
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
        result.current.handleHome()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should do nothing when cursor is already at position 0', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleHome()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should return moveCursor command with correct count', () => {
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

      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleHome()
      })

      // Assert - should move left by cursor position (3)
      expect(commands!).toEqual([{ type: 'moveCursor', direction: 'left', count: 3 }])
    })

    it('should return empty array when cursor is at position 0', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleHome()
      })

      // Assert
      expect(commands!).toEqual([])
    })

    it('should work correctly from middle of line', () => {
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
      act(() => {
        result.current.handleHome()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should return correct moveCursor count from middle of line', () => {
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
        commands = result.current.handleHome()
      })

      // Assert - should move left by cursor position (2)
      expect(commands!).toEqual([{ type: 'moveCursor', direction: 'left', count: 2 }])
    })
  })

  describe('end key', () => {
    it('should move cursor to end of line', () => {
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
        result.current.handleHome() // move to start
      })
      act(() => {
        result.current.handleEnd()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(3)
    })

    it('should do nothing when cursor is already at end', () => {
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
        result.current.handleEnd()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(2)
    })

    it('should return moveCursor command with correct count', () => {
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
        result.current.handleHome() // move to start
      })

      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleEnd()
      })

      // Assert - should move right by (length - position) = 3
      expect(commands!).toEqual([{ type: 'moveCursor', direction: 'right', count: 3 }])
    })

    it('should return empty array when cursor is at end', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      act(() => {
        result.current.handleCharacter('a')
      })

      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleEnd()
      })

      // Assert
      expect(commands!).toEqual([])
    })

    it('should work correctly from middle of line', () => {
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
      act(() => {
        result.current.handleArrowLeft() // cursor at position 1
      })
      act(() => {
        result.current.handleEnd()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(3)
    })

    it('should return correct moveCursor count from middle of line', () => {
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
      act(() => {
        result.current.handleArrowLeft() // cursor at position 1
      })

      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleEnd()
      })

      // Assert - should move right by (length - position) = 3 - 1 = 2
      expect(commands!).toEqual([{ type: 'moveCursor', direction: 'right', count: 2 }])
    })

    it('should work on empty line', () => {
      // Arrange
      const { result } = renderHook(() => useBashTerminal())

      // Act
      let commands: TerminalCommand[]
      act(() => {
        commands = result.current.handleEnd()
      })

      // Assert
      expect(result.current.cursorPosition).toBe(0)
      expect(commands!).toEqual([])
    })
  })
})
