import { renderHook, act } from '@testing-library/react'
import { useShellTerminal } from './useShellTerminal'
import type { FileEntry } from '@lua-learning/shell-core'

describe('useShellTerminal tab completion', () => {
  const mockCommandNames = ['cd', 'clear', 'cp', 'help', 'ls', 'mkdir', 'mv', 'pwd', 'touch']

  const mockGetPathCompletions = (partialPath: string): FileEntry[] => {
    const allFiles: FileEntry[] = [
      { name: 'src', type: 'directory', path: '/src' },
      { name: 'docs', type: 'directory', path: '/docs' },
      { name: 'README.md', type: 'file', path: '/README.md' },
    ]
    if (partialPath === '') {
      return allFiles
    }
    return allFiles.filter((f) => f.name.startsWith(partialPath))
  }

  describe('handleTab with command completion', () => {
    it('should complete single matching command', () => {
      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockGetPathCompletions,
        })
      )

      // Type "cle" (partial "clear")
      act(() => { result.current.handleCharacter('c') })
      act(() => { result.current.handleCharacter('l') })
      act(() => { result.current.handleCharacter('e') })

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should complete to "clear"
      expect(result.current.currentLine).toBe('clear ')
      // Should have written the remaining characters
      expect(tabResult!.commands).toContainEqual(
        expect.objectContaining({ type: 'write', data: 'ar ' })
      )
    })

    it('should show multiple matching commands', () => {
      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockGetPathCompletions,
        })
      )

      // Type "c" (matches cd, clear, cp)
      act(() => {
        result.current.handleCharacter('c')
      })

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should not change input (multiple matches)
      expect(result.current.currentLine).toBe('c')
      // Should have suggestions
      expect(tabResult!.suggestions).toContain('cd')
      expect(tabResult!.suggestions).toContain('clear')
      expect(tabResult!.suggestions).toContain('cp')
    })

    it('should show all commands when input is empty', () => {
      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockGetPathCompletions,
        })
      )

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should have all commands as suggestions
      expect(tabResult!.suggestions).toEqual(mockCommandNames)
    })

    it('should do nothing when no commands match', () => {
      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockGetPathCompletions,
        })
      )

      // Type "xyz" (no match)
      act(() => { result.current.handleCharacter('x') })
      act(() => { result.current.handleCharacter('y') })
      act(() => { result.current.handleCharacter('z') })

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      expect(result.current.currentLine).toBe('xyz')
      expect(tabResult!.suggestions).toEqual([])
      expect(tabResult!.commands).toEqual([])
    })
  })

  describe('handleTab with path completion', () => {
    it('should complete single matching path after command', () => {
      // Mock returns only 'src' for 'sr' prefix
      const mockSinglePath = (partial: string): FileEntry[] => {
        if (partial === 'sr') {
          return [{ name: 'src', type: 'directory', path: '/src' }]
        }
        return []
      }

      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockSinglePath,
        })
      )

      // Type "cd sr" (partial "src")
      act(() => { result.current.handleCharacter('c') })
      act(() => { result.current.handleCharacter('d') })
      act(() => { result.current.handleCharacter(' ') })
      act(() => { result.current.handleCharacter('s') })
      act(() => { result.current.handleCharacter('r') })

      act(() => {
        result.current.handleTab()
      })

      // Should complete to "cd src/"
      expect(result.current.currentLine).toBe('cd src/')
    })

    it('should show multiple matching paths', () => {
      const mockMultiplePaths = (partial: string): FileEntry[] => {
        if (partial === '' || partial === 's') {
          return [
            { name: 'src', type: 'directory', path: '/src' },
            { name: 'scripts', type: 'directory', path: '/scripts' },
          ]
        }
        return []
      }

      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockMultiplePaths,
        })
      )

      // Type "ls s"
      act(() => { result.current.handleCharacter('l') })
      act(() => { result.current.handleCharacter('s') })
      act(() => { result.current.handleCharacter(' ') })
      act(() => { result.current.handleCharacter('s') })

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should not change input
      expect(result.current.currentLine).toBe('ls s')
      // Should have path suggestions
      expect(tabResult!.suggestions).toContain('src/')
      expect(tabResult!.suggestions).toContain('scripts/')
    })

    it('should append / for directories, space for files', () => {
      const mockFilePath = (partial: string): FileEntry[] => {
        if (partial === 'READ') {
          return [{ name: 'README.md', type: 'file', path: '/README.md' }]
        }
        return []
      }

      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockFilePath,
        })
      )

      // Type "cat READ"
      act(() => { result.current.handleCharacter('c') })
      act(() => { result.current.handleCharacter('a') })
      act(() => { result.current.handleCharacter('t') })
      act(() => { result.current.handleCharacter(' ') })
      act(() => { result.current.handleCharacter('R') })
      act(() => { result.current.handleCharacter('E') })
      act(() => { result.current.handleCharacter('A') })
      act(() => { result.current.handleCharacter('D') })

      act(() => {
        result.current.handleTab()
      })

      // Should complete to "cat README.md " (file gets space)
      expect(result.current.currentLine).toBe('cat README.md ')
    })
  })

  describe('handleTab suggestions display', () => {
    it('should return suggestions array for multiple matches', () => {
      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockGetPathCompletions,
        })
      )

      act(() => {
        result.current.handleCharacter('c')
      })

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      expect(tabResult!.suggestions.length).toBeGreaterThan(1)
      expect(tabResult!.suggestions.length).toBeLessThanOrEqual(10)
    })

    it('should indicate when more than 10 matches exist', () => {
      const manyCommands = Array.from({ length: 15 }, (_, i) => `cmd${i}`)

      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: manyCommands,
          getPathCompletions: mockGetPathCompletions,
        })
      )

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should have truncatedCount when more than 10
      expect(tabResult!.truncatedCount).toBe(15)
    })
  })

  describe('handleTab without completion support', () => {
    it('should return empty when no completion options provided', () => {
      const { result } = renderHook(() => useShellTerminal({}))

      act(() => {
        result.current.handleCharacter('h')
      })

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      expect(tabResult!.commands).toEqual([])
      expect(tabResult!.suggestions).toEqual([])
    })
  })
})
