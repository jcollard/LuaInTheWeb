/**
 * Tests for tab completion functionality.
 */

import { describe, it, expect } from 'vitest'
import {
  getCommandCompletions,
  getPathCompletions,
  getCompletionContext,
  CompletionContext,
} from '../src/tabCompletion'
import type { IFileSystem, FileEntry } from '../src/types'

describe('getCommandCompletions', () => {
  const commands = ['cd', 'clear', 'cp', 'cat', 'help', 'ls', 'mkdir', 'mv', 'pwd', 'touch']

  it('should return all commands when prefix is empty', () => {
    const result = getCommandCompletions('', commands)
    expect(result).toEqual(commands)
  })

  it('should return commands matching a single-character prefix', () => {
    const result = getCommandCompletions('c', commands)
    expect(result).toEqual(['cd', 'clear', 'cp', 'cat'])
  })

  it('should return commands matching a multi-character prefix', () => {
    const result = getCommandCompletions('cl', commands)
    expect(result).toEqual(['clear'])
  })

  it('should return empty array when no commands match', () => {
    const result = getCommandCompletions('xyz', commands)
    expect(result).toEqual([])
  })

  it('should be case-sensitive', () => {
    const result = getCommandCompletions('CD', commands)
    expect(result).toEqual([])
  })

  it('should return exact match when prefix matches fully', () => {
    const result = getCommandCompletions('ls', commands)
    expect(result).toEqual(['ls'])
  })
})

describe('getPathCompletions', () => {
  function createMockFileSystem(entries: FileEntry[], cwd: string = '/'): IFileSystem {
    return {
      getCurrentDirectory: () => cwd,
      setCurrentDirectory: () => {},
      exists: (path: string) => entries.some((e) => e.path === path),
      isDirectory: (path: string) => entries.some((e) => e.path === path && e.type === 'directory'),
      isFile: (path: string) => entries.some((e) => e.path === path && e.type === 'file'),
      listDirectory: (path: string) => {
        const normalized = path === '' ? '/' : path
        return entries.filter((e) => {
          const parent = e.path.substring(0, e.path.lastIndexOf('/')) || '/'
          return parent === normalized
        })
      },
      readFile: () => '',
      writeFile: () => {},
      createDirectory: () => {},
      delete: () => {},
    }
  }

  const rootEntries: FileEntry[] = [
    { name: 'src', type: 'directory', path: '/src' },
    { name: 'docs', type: 'directory', path: '/docs' },
    { name: 'README.md', type: 'file', path: '/README.md' },
    { name: 'package.json', type: 'file', path: '/package.json' },
  ]

  const srcEntries: FileEntry[] = [
    { name: 'components', type: 'directory', path: '/src/components' },
    { name: 'hooks', type: 'directory', path: '/src/hooks' },
    { name: 'index.ts', type: 'file', path: '/src/index.ts' },
  ]

  it('should return all entries when partial path is empty', () => {
    const fs = createMockFileSystem(rootEntries)
    const result = getPathCompletions('', fs)
    expect(result).toEqual([
      { name: 'src', type: 'directory', path: '/src' },
      { name: 'docs', type: 'directory', path: '/docs' },
      { name: 'README.md', type: 'file', path: '/README.md' },
      { name: 'package.json', type: 'file', path: '/package.json' },
    ])
  })

  it('should filter entries by prefix', () => {
    const fs = createMockFileSystem(rootEntries)
    const result = getPathCompletions('s', fs)
    expect(result).toEqual([{ name: 'src', type: 'directory', path: '/src' }])
  })

  it('should complete paths in subdirectories', () => {
    const allEntries = [...rootEntries, ...srcEntries]
    const fs = createMockFileSystem(allEntries)
    const result = getPathCompletions('src/c', fs)
    expect(result).toEqual([{ name: 'components', type: 'directory', path: '/src/components' }])
  })

  it('should return all entries in directory when path ends with /', () => {
    const allEntries = [...rootEntries, ...srcEntries]
    const fs = createMockFileSystem(allEntries)
    const result = getPathCompletions('src/', fs)
    expect(result).toEqual(srcEntries)
  })

  it('should return empty array for non-existent directory', () => {
    const fs = createMockFileSystem(rootEntries)
    const result = getPathCompletions('nonexistent/', fs)
    expect(result).toEqual([])
  })

  it('should handle absolute paths', () => {
    const fs = createMockFileSystem(rootEntries)
    const result = getPathCompletions('/s', fs)
    expect(result).toEqual([{ name: 'src', type: 'directory', path: '/src' }])
  })

  it('should handle relative paths from non-root cwd', () => {
    const allEntries = [...rootEntries, ...srcEntries]
    const fs = createMockFileSystem(allEntries, '/src')
    const result = getPathCompletions('c', fs)
    expect(result).toEqual([{ name: 'components', type: 'directory', path: '/src/components' }])
  })
})

describe('getCompletionContext', () => {
  it('should return command completion for empty input', () => {
    const result = getCompletionContext('', 0)
    expect(result).toEqual<CompletionContext>({
      type: 'command',
      prefix: '',
      replaceStart: 0,
      replaceEnd: 0,
    })
  })

  it('should return command completion for partial first word', () => {
    const result = getCompletionContext('hel', 3)
    expect(result).toEqual<CompletionContext>({
      type: 'command',
      prefix: 'hel',
      replaceStart: 0,
      replaceEnd: 3,
    })
  })

  it('should return path completion for second word', () => {
    const result = getCompletionContext('cd sr', 5)
    expect(result).toEqual<CompletionContext>({
      type: 'path',
      prefix: 'sr',
      replaceStart: 3,
      replaceEnd: 5,
    })
  })

  it('should return path completion for empty second word', () => {
    const result = getCompletionContext('ls ', 3)
    expect(result).toEqual<CompletionContext>({
      type: 'path',
      prefix: '',
      replaceStart: 3,
      replaceEnd: 3,
    })
  })

  it('should return path completion for path with slashes', () => {
    const result = getCompletionContext('cd src/comp', 11)
    expect(result).toEqual<CompletionContext>({
      type: 'path',
      prefix: 'src/comp',
      replaceStart: 3,
      replaceEnd: 11,
    })
  })

  it('should handle cursor in middle of input', () => {
    const result = getCompletionContext('ls doc test', 6)
    expect(result).toEqual<CompletionContext>({
      type: 'path',
      prefix: 'doc',
      replaceStart: 3,
      replaceEnd: 6,
    })
  })

  it('should handle multiple arguments', () => {
    const result = getCompletionContext('cp src/file dest/f', 18)
    expect(result).toEqual<CompletionContext>({
      type: 'path',
      prefix: 'dest/f',
      replaceStart: 12,
      replaceEnd: 18,
    })
  })
})
