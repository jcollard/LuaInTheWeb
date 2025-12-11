import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useShellTerminal } from './useShellTerminal'

describe('useShellTerminal', () => {
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
