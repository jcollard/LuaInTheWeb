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

    it('should complete subdirectory when path ends with /', () => {
      // Mock returns 'bar' directory inside 'foo/'
      const mockSubdirPath = (partial: string): FileEntry[] => {
        if (partial === 'foo/') {
          return [{ name: 'bar', type: 'directory', path: '/foo/bar' }]
        }
        return []
      }

      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockSubdirPath,
        })
      )

      // Type "touch foo/"
      act(() => { result.current.handleCharacter('t') })
      act(() => { result.current.handleCharacter('o') })
      act(() => { result.current.handleCharacter('u') })
      act(() => { result.current.handleCharacter('c') })
      act(() => { result.current.handleCharacter('h') })
      act(() => { result.current.handleCharacter(' ') })
      act(() => { result.current.handleCharacter('f') })
      act(() => { result.current.handleCharacter('o') })
      act(() => { result.current.handleCharacter('o') })
      act(() => { result.current.handleCharacter('/') })

      act(() => {
        result.current.handleTab()
      })

      // Should complete to "touch foo/bar/"
      expect(result.current.currentLine).toBe('touch foo/bar/')
    })

    it('should complete partial filename in subdirectory', () => {
      // Mock returns 'bar' when typing partial 'foo/b'
      const mockPartialSubdir = (partial: string): FileEntry[] => {
        if (partial === 'foo/b') {
          return [{ name: 'bar', type: 'directory', path: '/foo/bar' }]
        }
        return []
      }

      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockPartialSubdir,
        })
      )

      // Type "cd foo/b"
      act(() => { result.current.handleCharacter('c') })
      act(() => { result.current.handleCharacter('d') })
      act(() => { result.current.handleCharacter(' ') })
      act(() => { result.current.handleCharacter('f') })
      act(() => { result.current.handleCharacter('o') })
      act(() => { result.current.handleCharacter('o') })
      act(() => { result.current.handleCharacter('/') })
      act(() => { result.current.handleCharacter('b') })

      act(() => {
        result.current.handleTab()
      })

      // Should complete to "cd foo/bar/"
      expect(result.current.currentLine).toBe('cd foo/bar/')
    })

    it('should complete to common prefix when multiple paths share one', () => {
      // Mock: 'test' prefix matches 'test/' and 'test2/'
      const mockCommonPrefixPaths = (partial: string): FileEntry[] => {
        if (partial === 't' || partial === 'te' || partial === 'tes' || partial === 'test') {
          return [
            { name: 'test', type: 'directory', path: '/test' },
            { name: 'test2', type: 'directory', path: '/test2' },
          ]
        }
        return []
      }

      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockCommonPrefixPaths,
        })
      )

      // Type "cd t"
      act(() => { result.current.handleCharacter('c') })
      act(() => { result.current.handleCharacter('d') })
      act(() => { result.current.handleCharacter(' ') })
      act(() => { result.current.handleCharacter('t') })

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should complete to common prefix "test" (both test/ and test2/ share "test")
      expect(result.current.currentLine).toBe('cd test')
      // Should NOT show suggestions yet since we extended the input
      expect(tabResult!.suggestions).toEqual([])
    })

    it('should show suggestions when at common prefix with no further extension', () => {
      // Mock: 'test' prefix matches 'test/' and 'test2/' - no more common chars
      const mockCommonPrefixPaths = (partial: string): FileEntry[] => {
        if (partial === 'test') {
          return [
            { name: 'test', type: 'directory', path: '/test' },
            { name: 'test2', type: 'directory', path: '/test2' },
          ]
        }
        return []
      }

      const { result } = renderHook(() =>
        useShellTerminal({
          commandNames: mockCommandNames,
          getPathCompletions: mockCommonPrefixPaths,
        })
      )

      // Type "cd test" (already at common prefix)
      act(() => { result.current.handleCharacter('c') })
      act(() => { result.current.handleCharacter('d') })
      act(() => { result.current.handleCharacter(' ') })
      act(() => { result.current.handleCharacter('t') })
      act(() => { result.current.handleCharacter('e') })
      act(() => { result.current.handleCharacter('s') })
      act(() => { result.current.handleCharacter('t') })

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should NOT change input (already at common prefix)
      expect(result.current.currentLine).toBe('cd test')
      // Should show suggestions since no further common prefix
      expect(tabResult!.suggestions).toContain('test/')
      expect(tabResult!.suggestions).toContain('test2/')
    })

    it('should show multiple matching paths when no common prefix extends input', () => {
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

      // Type "ls s" - common prefix is just 's' which user already typed
      act(() => { result.current.handleCharacter('l') })
      act(() => { result.current.handleCharacter('s') })
      act(() => { result.current.handleCharacter(' ') })
      act(() => { result.current.handleCharacter('s') })

      let tabResult: ReturnType<typeof result.current.handleTab>
      act(() => {
        tabResult = result.current.handleTab()
      })

      // Should not change input (common prefix 's' doesn't extend beyond what's typed)
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
      // Use commands with no common prefix (a0, b1, c2, etc.) so partial completion doesn't trigger
      const manyCommands = Array.from({ length: 15 }, (_, i) => `${String.fromCharCode(97 + i)}${i}`)

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
