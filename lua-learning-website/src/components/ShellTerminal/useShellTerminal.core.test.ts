import { renderHook, act } from '@testing-library/react'
import { useShellTerminal } from './useShellTerminal'

describe('useShellTerminal', () => {
  describe('initial state', () => {
    it('should initialize with empty current line', () => {
      const { result } = renderHook(() => useShellTerminal({}))
      expect(result.current.currentLine).toBe('')
    })

    it('should initialize with cursor position at 0', () => {
      const { result } = renderHook(() => useShellTerminal({}))
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should initialize with historyIndex at -1', () => {
      const { result } = renderHook(() => useShellTerminal({}))
      expect(result.current.historyIndex).toBe(-1)
    })
  })

  describe('handleCharacter', () => {
    it('should add character to current line', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('a')
      })

      expect(result.current.currentLine).toBe('a')
      expect(result.current.cursorPosition).toBe(1)
    })

    it('should insert character at cursor position', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('h')
      })
      act(() => {
        result.current.handleCharacter('i')
      })
      act(() => {
        result.current.handleArrowLeft()
      })
      act(() => {
        result.current.handleCharacter('X')
      })

      expect(result.current.currentLine).toBe('hXi')
      expect(result.current.cursorPosition).toBe(2)
    })

    it('should return write command', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      let commands: ReturnType<typeof result.current.handleCharacter>
      act(() => {
        commands = result.current.handleCharacter('a')
      })

      expect(commands!).toContainEqual({ type: 'write', data: 'a' })
    })

    it('should return moveCursor command when inserting mid-line', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleArrowLeft()
      })

      let commands: ReturnType<typeof result.current.handleCharacter>
      act(() => {
        commands = result.current.handleCharacter('X')
      })

      expect(commands!).toContainEqual({ type: 'write', data: 'Xb' })
      expect(commands!).toContainEqual({ type: 'moveCursor', direction: 'left', count: 1 })
    })
  })

  describe('handleBackspace', () => {
    it('should do nothing when cursor is at start', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      let commands: ReturnType<typeof result.current.handleBackspace>
      act(() => {
        commands = result.current.handleBackspace()
      })

      expect(result.current.currentLine).toBe('')
      expect(commands!).toEqual([])
    })

    it('should delete character before cursor', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleBackspace()
      })

      expect(result.current.currentLine).toBe('a')
      expect(result.current.cursorPosition).toBe(1)
    })

    it('should delete character in middle of line', () => {
      const { result } = renderHook(() => useShellTerminal({}))

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
        result.current.handleArrowLeft()
      })
      act(() => {
        result.current.handleBackspace()
      })

      expect(result.current.currentLine).toBe('ac')
      expect(result.current.cursorPosition).toBe(1)
    })

    it('should return correct commands', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCharacter('b')
      })

      let commands: ReturnType<typeof result.current.handleBackspace>
      act(() => {
        commands = result.current.handleBackspace()
      })

      expect(commands!).toContainEqual({ type: 'moveCursor', direction: 'left', count: 1 })
    })
  })

  describe('handleArrowLeft', () => {
    it('should do nothing when cursor is at start', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      let commands: ReturnType<typeof result.current.handleArrowLeft>
      act(() => {
        commands = result.current.handleArrowLeft()
      })

      expect(result.current.cursorPosition).toBe(0)
      expect(commands!).toEqual([])
    })

    it('should move cursor left', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCharacter('b')
      })

      let commands: ReturnType<typeof result.current.handleArrowLeft>
      act(() => {
        commands = result.current.handleArrowLeft()
      })

      expect(result.current.cursorPosition).toBe(1)
      expect(commands!).toContainEqual({ type: 'moveCursor', direction: 'left', count: 1 })
    })
  })

  describe('handleArrowRight', () => {
    it('should do nothing when cursor is at end', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('a')
      })

      let commands: ReturnType<typeof result.current.handleArrowRight>
      act(() => {
        commands = result.current.handleArrowRight()
      })

      expect(result.current.cursorPosition).toBe(1)
      expect(commands!).toEqual([])
    })

    it('should move cursor right', () => {
      const { result } = renderHook(() => useShellTerminal({}))

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

      let commands: ReturnType<typeof result.current.handleArrowRight>
      act(() => {
        commands = result.current.handleArrowRight()
      })

      expect(result.current.cursorPosition).toBe(1)
      expect(commands!).toContainEqual({ type: 'moveCursor', direction: 'right', count: 1 })
    })
  })
})
