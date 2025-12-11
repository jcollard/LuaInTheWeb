import { renderHook, act } from '@testing-library/react'
import { useBashTerminal } from './useBashTerminal'

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
})
