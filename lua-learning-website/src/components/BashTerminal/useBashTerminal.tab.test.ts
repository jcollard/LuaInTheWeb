import { renderHook, act } from '@testing-library/react'
import { useBashTerminal, type CompletionEntry } from './useBashTerminal'

// Helper function to type a string one character at a time
function typeString(
  result: { current: ReturnType<typeof useBashTerminal> },
  str: string
) {
  str.split('').forEach((char) => {
    act(() => {
      result.current.handleCharacter(char)
    })
  })
}

describe('useBashTerminal tab completion', () => {
  const mockFiles: CompletionEntry[] = [
    { name: 'untitled-1.lua', type: 'file' },
    { name: 'untitled-2.lua', type: 'file' },
    { name: 'main.lua', type: 'file' },
    { name: 'docs', type: 'directory' },
  ]

  const mockCommands = ['clear', 'cd', 'cat', 'ls', 'pwd', 'help']

  const getPathCompletions = () => mockFiles

  describe('partial completion (common prefix)', () => {
    it('should complete to common prefix when multiple files match', () => {
      const { result } = renderHook(() =>
        useBashTerminal({
          commandNames: mockCommands,
          getPathCompletions,
        })
      )

      // Type 'un'
      typeString(result, 'un')

      // Press Tab
      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should complete to 'untitled-'
      expect(result.current.currentLine).toBe('untitled-')
      expect(tabResult!.suggestions).toEqual([])
    })

    it('should show suggestions when no additional common prefix exists', () => {
      const { result } = renderHook(() =>
        useBashTerminal({
          commandNames: mockCommands,
          getPathCompletions,
        })
      )

      // Type 'untitled-'
      typeString(result, 'untitled-')

      // Press Tab
      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should show suggestions
      expect(result.current.currentLine).toBe('untitled-')
      expect(tabResult!.suggestions).toEqual(['untitled-1.lua', 'untitled-2.lua'])
    })
  })

  describe('single match completion', () => {
    it('should fully complete single file match with space', () => {
      const { result } = renderHook(() =>
        useBashTerminal({
          commandNames: mockCommands,
          getPathCompletions,
        })
      )

      // Type 'main'
      typeString(result, 'main')

      // Press Tab
      act(() => {
        result.current.handleTab()
      })

      // Should complete to 'main.lua '
      expect(result.current.currentLine).toBe('main.lua ')
    })

    it('should fully complete single directory match with slash', () => {
      const { result } = renderHook(() =>
        useBashTerminal({
          commandNames: mockCommands,
          getPathCompletions,
        })
      )

      // Type 'do'
      typeString(result, 'do')

      // Press Tab
      act(() => {
        result.current.handleTab()
      })

      // Should complete to 'docs/'
      expect(result.current.currentLine).toBe('docs/')
    })

    it('should fully complete single command match with space', () => {
      const { result } = renderHook(() =>
        useBashTerminal({
          commandNames: mockCommands,
          getPathCompletions,
        })
      )

      // Type 'pw'
      typeString(result, 'pw')

      // Press Tab
      act(() => {
        result.current.handleTab()
      })

      // Should complete to 'pwd '
      expect(result.current.currentLine).toBe('pwd ')
    })
  })

  describe('no matches', () => {
    it('should return unchanged when no matches', () => {
      const { result } = renderHook(() =>
        useBashTerminal({
          commandNames: mockCommands,
          getPathCompletions,
        })
      )

      // Type 'xyz'
      typeString(result, 'xyz')

      // Press Tab
      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should remain unchanged
      expect(result.current.currentLine).toBe('xyz')
      expect(tabResult!.suggestions).toEqual([])
    })
  })

  describe('command completion', () => {
    it('should show command suggestions when prefix matches multiple commands', () => {
      const { result } = renderHook(() =>
        useBashTerminal({
          commandNames: mockCommands,
          getPathCompletions,
        })
      )

      // Type 'c'
      typeString(result, 'c')

      // Press Tab
      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should show command suggestions (cat, cd, clear)
      expect(tabResult!.suggestions).toEqual(['cat', 'cd', 'clear'])
    })
  })

  describe('terminal commands', () => {
    it('should return terminal commands for completion', () => {
      const { result } = renderHook(() =>
        useBashTerminal({
          commandNames: mockCommands,
          getPathCompletions,
        })
      )

      // Type 'pw'
      typeString(result, 'pw')

      // Press Tab
      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should return terminal commands
      expect(tabResult!.commands.length).toBeGreaterThan(0)
      expect(tabResult!.commands.some((cmd) => cmd.type === 'write')).toBe(true)
    })

    it('should return empty commands when only showing suggestions', () => {
      const { result } = renderHook(() =>
        useBashTerminal({
          commandNames: mockCommands,
          getPathCompletions,
        })
      )

      // Type 'c'
      typeString(result, 'c')

      // Press Tab
      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should return empty commands since only suggestions
      expect(tabResult!.commands).toEqual([])
    })
  })
})
