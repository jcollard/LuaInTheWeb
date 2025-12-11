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

  describe('handleArrowUp (history)', () => {
    it('should do nothing with no history', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      let commands: ReturnType<typeof result.current.handleArrowUp>
      act(() => {
        commands = result.current.handleArrowUp()
      })

      expect(result.current.currentLine).toBe('')
      expect(commands!).toEqual([])
    })

    it('should navigate to last history item', () => {
      const { result } = renderHook(() =>
        useShellTerminal({ history: ['ls', 'pwd', 'help'] })
      )

      act(() => {
        result.current.handleArrowUp()
      })

      expect(result.current.currentLine).toBe('help')
      expect(result.current.historyIndex).toBe(2)
    })

    it('should navigate backwards through history', () => {
      const { result } = renderHook(() =>
        useShellTerminal({ history: ['ls', 'pwd', 'help'] })
      )

      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowUp()
      })

      expect(result.current.currentLine).toBe('pwd')
      expect(result.current.historyIndex).toBe(1)
    })

    it('should stop at first history item', () => {
      const { result } = renderHook(() =>
        useShellTerminal({ history: ['ls', 'pwd'] })
      )

      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowUp() // Should not go past first
      })

      expect(result.current.currentLine).toBe('ls')
      expect(result.current.historyIndex).toBe(0)
    })

    it('should return clearLine and write commands', () => {
      const { result } = renderHook(() =>
        useShellTerminal({ history: ['ls'] })
      )

      let commands: ReturnType<typeof result.current.handleArrowUp>
      act(() => {
        commands = result.current.handleArrowUp()
      })

      expect(commands!).toContainEqual({ type: 'clearLine' })
      expect(commands!).toContainEqual({ type: 'write', data: 'ls' })
    })
  })

  describe('handleArrowDown (history)', () => {
    it('should do nothing when not navigating history', () => {
      const { result } = renderHook(() =>
        useShellTerminal({ history: ['ls', 'pwd'] })
      )

      let commands: ReturnType<typeof result.current.handleArrowDown>
      act(() => {
        commands = result.current.handleArrowDown()
      })

      expect(result.current.currentLine).toBe('')
      expect(commands!).toEqual([])
    })

    it('should navigate forward through history', () => {
      const { result } = renderHook(() =>
        useShellTerminal({ history: ['ls', 'pwd', 'help'] })
      )

      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowDown()
      })

      expect(result.current.currentLine).toBe('help')
      expect(result.current.historyIndex).toBe(2)
    })

    it('should clear line when past end of history', () => {
      const { result } = renderHook(() =>
        useShellTerminal({ history: ['ls'] })
      )

      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleArrowDown()
      })

      expect(result.current.currentLine).toBe('')
      expect(result.current.historyIndex).toBe(-1)
    })
  })

  describe('handleEnter', () => {
    it('should call onCommand with current line', () => {
      const onCommand = vi.fn()
      const { result } = renderHook(() =>
        useShellTerminal({ onCommand })
      )

      act(() => {
        result.current.handleCharacter('l')
      })
      act(() => {
        result.current.handleCharacter('s')
      })
      act(() => {
        result.current.handleEnter()
      })

      expect(onCommand).toHaveBeenCalledWith('ls')
    })

    it('should not call onCommand with empty line', () => {
      const onCommand = vi.fn()
      const { result } = renderHook(() =>
        useShellTerminal({ onCommand })
      )

      act(() => {
        result.current.handleEnter()
      })

      expect(onCommand).not.toHaveBeenCalled()
    })

    it('should trim whitespace before calling onCommand', () => {
      const onCommand = vi.fn()
      const { result } = renderHook(() =>
        useShellTerminal({ onCommand })
      )

      act(() => {
        result.current.handleCharacter(' ')
      })
      act(() => {
        result.current.handleCharacter('l')
      })
      act(() => {
        result.current.handleCharacter('s')
      })
      act(() => {
        result.current.handleCharacter(' ')
      })
      act(() => {
        result.current.handleEnter()
      })

      expect(onCommand).toHaveBeenCalledWith('ls')
    })

    it('should clear current line after enter', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleEnter()
      })

      expect(result.current.currentLine).toBe('')
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should reset history index after enter', () => {
      const { result } = renderHook(() =>
        useShellTerminal({ history: ['ls'] })
      )

      act(() => {
        result.current.handleArrowUp()
      })
      act(() => {
        result.current.handleEnter()
      })

      expect(result.current.historyIndex).toBe(-1)
    })

    it('should return empty commands when line has content (newline handled by onCommand)', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('a')
      })

      let commands: ReturnType<typeof result.current.handleEnter>
      act(() => {
        commands = result.current.handleEnter()
      })

      expect(commands!).toEqual([])
    })

    it('should return writeln command when line is empty (to show new prompt)', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      let commands: ReturnType<typeof result.current.handleEnter>
      act(() => {
        commands = result.current.handleEnter()
      })

      expect(commands!).toContainEqual({ type: 'writeln', data: '' })
    })
  })

  describe('handleCtrlC', () => {
    it('should clear current line', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('a')
      })
      act(() => {
        result.current.handleCharacter('b')
      })
      act(() => {
        result.current.handleCtrlC()
      })

      expect(result.current.currentLine).toBe('')
      expect(result.current.cursorPosition).toBe(0)
    })

    it('should return ^C write and newline', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      let commands: ReturnType<typeof result.current.handleCtrlC>
      act(() => {
        commands = result.current.handleCtrlC()
      })

      expect(commands!).toContainEqual({ type: 'write', data: '^C' })
      expect(commands!).toContainEqual({ type: 'writeln', data: '' })
    })
  })

  describe('handleCtrlL', () => {
    it('should return clear command', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      let commands: ReturnType<typeof result.current.handleCtrlL>
      act(() => {
        commands = result.current.handleCtrlL()
      })

      expect(commands!).toContainEqual({ type: 'clear' })
    })
  })
})
