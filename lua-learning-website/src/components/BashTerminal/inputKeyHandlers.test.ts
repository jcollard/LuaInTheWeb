import { describe, it, expect } from 'vitest'
import {
  handleEnterKey,
  handleArrowUp,
  handleArrowDown,
  handleBackspace,
  handleCharacter,
  findLongestCommonPrefix,
  getTabCompletions,
  type InputState,
  type CompletionEntry,
} from './inputKeyHandlers'

function createDefaultState(overrides: Partial<InputState> = {}): InputState {
  return {
    currentLine: '',
    cursorPosition: 0,
    history: [],
    historyIndex: -1,
    isMultiLineMode: false,
    multiLineBuffer: [],
    multiLineCursorLine: 0,
    collapsedHistoryItem: null,
    ...overrides,
  }
}

describe('inputKeyHandlers', () => {
  describe('handleEnterKey', () => {
    it('should return command to execute in single-line mode', () => {
      const state = createDefaultState({ currentLine: 'print("hello")' })
      const result = handleEnterKey(state)

      expect(result.commandToExecute).toBe('print("hello")')
      expect(result.stateUpdate.currentLine).toBe('')
      expect(result.stateUpdate.cursorPosition).toBe(0)
    })

    it('should add command to history', () => {
      const state = createDefaultState({
        currentLine: 'test command',
        history: ['prev'],
      })
      const result = handleEnterKey(state)

      expect(result.stateUpdate.history).toEqual(['prev', 'test command'])
    })

    it('should not add empty command to history', () => {
      const state = createDefaultState({
        currentLine: '   ',
        history: ['prev'],
      })
      const result = handleEnterKey(state)

      expect(result.commandToExecute).toBeUndefined()
      expect(result.stateUpdate.history).toEqual(['prev'])
    })

    it('should split line at cursor in multi-line mode', () => {
      const state = createDefaultState({
        isMultiLineMode: true,
        currentLine: 'hello world',
        cursorPosition: 5,
        multiLineBuffer: ['hello world'],
        multiLineCursorLine: 0,
      })
      const result = handleEnterKey(state)

      expect(result.isMultiLineNewLine).toBe(true)
      expect(result.stateUpdate.multiLineBuffer).toEqual(['hello', ' world'])
      expect(result.stateUpdate.currentLine).toBe(' world')
      expect(result.stateUpdate.cursorPosition).toBe(0)
    })
  })

  describe('handleArrowUp', () => {
    it('should navigate to previous history item', () => {
      const state = createDefaultState({
        history: ['cmd1', 'cmd2', 'cmd3'],
        historyIndex: 2,
      })
      const result = handleArrowUp(state)

      expect(result.stateUpdate.historyIndex).toBe(1)
      expect(result.stateUpdate.currentLine).toBe('cmd2')
    })

    it('should start from last history item when not navigating', () => {
      const state = createDefaultState({
        history: ['cmd1', 'cmd2'],
        historyIndex: -1,
      })
      const result = handleArrowUp(state)

      expect(result.stateUpdate.historyIndex).toBe(1)
      expect(result.stateUpdate.currentLine).toBe('cmd2')
    })

    it('should do nothing when at first history item', () => {
      const state = createDefaultState({
        history: ['cmd1', 'cmd2'],
        historyIndex: 0,
      })
      const result = handleArrowUp(state)

      expect(result.stateUpdate).toEqual({})
    })

    it('should collapse multi-line history items', () => {
      const state = createDefaultState({
        history: ['line1\nline2'],
        historyIndex: -1,
      })
      const result = handleArrowUp(state)

      expect(result.stateUpdate.currentLine).toBe('line1 line2')
      expect(result.stateUpdate.collapsedHistoryItem).toBe('line1\nline2')
    })

    it('should move cursor up in multi-line mode', () => {
      const state = createDefaultState({
        isMultiLineMode: true,
        currentLine: 'line2',
        cursorPosition: 3,
        multiLineBuffer: ['line1', 'line2'],
        multiLineCursorLine: 1,
      })
      const result = handleArrowUp(state)

      expect(result.stateUpdate.multiLineCursorLine).toBe(0)
      expect(result.stateUpdate.currentLine).toBe('line1')
      expect(result.stateUpdate.cursorPosition).toBe(3)
    })
  })

  describe('handleArrowDown', () => {
    it('should navigate to next history item', () => {
      const state = createDefaultState({
        history: ['cmd1', 'cmd2', 'cmd3'],
        historyIndex: 1,
      })
      const result = handleArrowDown(state)

      expect(result.stateUpdate.historyIndex).toBe(2)
      expect(result.stateUpdate.currentLine).toBe('cmd3')
    })

    it('should clear line when past end of history', () => {
      const state = createDefaultState({
        history: ['cmd1', 'cmd2'],
        historyIndex: 1,
      })
      const result = handleArrowDown(state)

      expect(result.stateUpdate.historyIndex).toBe(-1)
      expect(result.stateUpdate.currentLine).toBe('')
    })

    it('should do nothing when not navigating history', () => {
      const state = createDefaultState({
        history: ['cmd1'],
        historyIndex: -1,
      })
      const result = handleArrowDown(state)

      expect(result.stateUpdate).toEqual({})
    })

    it('should move cursor down in multi-line mode', () => {
      const state = createDefaultState({
        isMultiLineMode: true,
        currentLine: 'line1',
        cursorPosition: 3,
        multiLineBuffer: ['line1', 'line2'],
        multiLineCursorLine: 0,
      })
      const result = handleArrowDown(state)

      expect(result.stateUpdate.multiLineCursorLine).toBe(1)
      expect(result.stateUpdate.currentLine).toBe('line2')
      expect(result.stateUpdate.cursorPosition).toBe(3)
    })
  })

  describe('handleBackspace', () => {
    it('should delete character before cursor', () => {
      const state = createDefaultState({
        currentLine: 'hello',
        cursorPosition: 3,
      })
      const result = handleBackspace(state)

      expect(result.currentLine).toBe('helo')
      expect(result.cursorPosition).toBe(2)
    })

    it('should do nothing at start of line', () => {
      const state = createDefaultState({
        currentLine: 'hello',
        cursorPosition: 0,
      })
      const result = handleBackspace(state)

      expect(result.currentLine).toBeUndefined()
    })

    it('should merge lines in multi-line mode at start of line', () => {
      const state = createDefaultState({
        isMultiLineMode: true,
        currentLine: 'line2',
        cursorPosition: 0,
        multiLineBuffer: ['line1', 'line2'],
        multiLineCursorLine: 1,
      })
      const result = handleBackspace(state)

      expect(result.shouldMergeLines).toBe(true)
      expect(result.multiLineBuffer).toEqual(['line1line2'])
      expect(result.currentLine).toBe('line1line2')
      expect(result.cursorPosition).toBe(5)
    })

    it('should not merge on first line of multi-line mode', () => {
      const state = createDefaultState({
        isMultiLineMode: true,
        currentLine: 'line1',
        cursorPosition: 0,
        multiLineBuffer: ['line1', 'line2'],
        multiLineCursorLine: 0,
      })
      const result = handleBackspace(state)

      expect(result.shouldMergeLines).toBeUndefined()
    })
  })

  describe('handleCharacter', () => {
    it('should insert character at cursor position', () => {
      const state = createDefaultState({
        currentLine: 'helo',
        cursorPosition: 2,
      })
      const result = handleCharacter(state, 'l')

      expect(result.currentLine).toBe('hello')
      expect(result.cursorPosition).toBe(3)
    })

    it('should append character at end', () => {
      const state = createDefaultState({
        currentLine: 'test',
        cursorPosition: 4,
      })
      const result = handleCharacter(state, '!')

      expect(result.currentLine).toBe('test!')
      expect(result.cursorPosition).toBe(5)
    })

    it('should insert character at start', () => {
      const state = createDefaultState({
        currentLine: 'est',
        cursorPosition: 0,
      })
      const result = handleCharacter(state, 't')

      expect(result.currentLine).toBe('test')
      expect(result.cursorPosition).toBe(1)
    })
  })

  describe('findLongestCommonPrefix', () => {
    it('should return empty string for empty array', () => {
      expect(findLongestCommonPrefix([])).toBe('')
    })

    it('should return the string itself for single element array', () => {
      expect(findLongestCommonPrefix(['hello'])).toBe('hello')
    })

    it('should return common prefix for multiple strings', () => {
      expect(findLongestCommonPrefix(['untitled-1.lua', 'untitled-2.lua'])).toBe('untitled-')
    })

    it('should return empty string when no common prefix exists', () => {
      expect(findLongestCommonPrefix(['apple', 'banana', 'cherry'])).toBe('')
    })

    it('should return full string when all strings are identical', () => {
      expect(findLongestCommonPrefix(['test', 'test', 'test'])).toBe('test')
    })

    it('should handle strings with different lengths', () => {
      expect(findLongestCommonPrefix(['prefix', 'prefixLong', 'prefixShort'])).toBe('prefix')
    })

    it('should handle single character prefix', () => {
      expect(findLongestCommonPrefix(['abc', 'axy', 'azz'])).toBe('a')
    })

    it('should handle empty strings in array', () => {
      expect(findLongestCommonPrefix(['hello', '', 'help'])).toBe('')
    })

    it('should be case sensitive', () => {
      expect(findLongestCommonPrefix(['Hello', 'hello'])).toBe('')
    })

    it('should handle special characters', () => {
      expect(findLongestCommonPrefix(['file-1.txt', 'file-2.txt', 'file-3.txt'])).toBe('file-')
    })
  })

  describe('getTabCompletions', () => {
    const fileEntries: CompletionEntry[] = [
      { name: 'untitled-1.lua', type: 'file' },
      { name: 'untitled-2.lua', type: 'file' },
      { name: 'main.lua', type: 'file' },
      { name: 'docs', type: 'directory' },
    ]

    const commands = ['clear', 'cd', 'cat', 'ls', 'pwd', 'help']

    describe('partial completion (common prefix)', () => {
      it('should complete to common prefix when multiple files match', () => {
        const result = getTabCompletions('un', 2, commands, fileEntries)

        expect(result.completedText).toBe('untitled-')
        expect(result.suggestions).toEqual([])
        expect(result.truncatedCount).toBeUndefined()
      })

      it('should show suggestions when no additional common prefix exists', () => {
        const result = getTabCompletions('untitled-', 9, commands, fileEntries)

        expect(result.completedText).toBe('untitled-')
        expect(result.suggestions).toEqual(['untitled-1.lua', 'untitled-2.lua'])
      })

      it('should complete to common prefix for commands', () => {
        const result = getTabCompletions('c', 1, commands, fileEntries)

        // 'clear', 'cd', 'cat' all start with 'c' - no common prefix beyond 'c'
        expect(result.completedText).toBe('c')
        expect(result.suggestions).toEqual(['cat', 'cd', 'clear'])
      })
    })

    describe('single match completion', () => {
      it('should fully complete single file match with space', () => {
        const result = getTabCompletions('main', 4, commands, fileEntries)

        expect(result.completedText).toBe('main.lua ')
        expect(result.suggestions).toEqual([])
      })

      it('should fully complete single directory match with slash', () => {
        const result = getTabCompletions('do', 2, commands, fileEntries)

        expect(result.completedText).toBe('docs/')
        expect(result.suggestions).toEqual([])
      })

      it('should fully complete single command match with space', () => {
        const result = getTabCompletions('pw', 2, commands, fileEntries)

        expect(result.completedText).toBe('pwd ')
        expect(result.suggestions).toEqual([])
      })
    })

    describe('no matches', () => {
      it('should return unchanged text when no matches', () => {
        const result = getTabCompletions('xyz', 3, commands, fileEntries)

        expect(result.completedText).toBe('xyz')
        expect(result.suggestions).toEqual([])
      })
    })

    describe('empty input', () => {
      it('should show all commands on empty input', () => {
        const result = getTabCompletions('', 0, commands, fileEntries)

        expect(result.completedText).toBe('')
        expect(result.suggestions).toEqual(['cat', 'cd', 'clear', 'help', 'ls', 'pwd'])
      })
    })

    describe('path completion after command', () => {
      it('should complete file path after command', () => {
        const result = getTabCompletions('cat un', 6, commands, fileEntries)

        expect(result.completedText).toBe('cat untitled-')
        expect(result.suggestions).toEqual([])
      })

      it('should complete single file after command', () => {
        const result = getTabCompletions('cat ma', 6, commands, fileEntries)

        expect(result.completedText).toBe('cat main.lua ')
        expect(result.suggestions).toEqual([])
      })
    })

    describe('truncation', () => {
      it('should truncate when more than 10 matches', () => {
        const manyFiles: CompletionEntry[] = Array.from({ length: 15 }, (_, i) => ({
          name: `file${i}.txt`,
          type: 'file' as const,
        }))

        const result = getTabCompletions('file', 4, [], manyFiles)

        expect(result.suggestions.length).toBe(10)
        expect(result.truncatedCount).toBe(15)
      })
    })

    describe('cursor position handling', () => {
      it('should complete word at cursor position', () => {
        const result = getTabCompletions('cat un extra', 6, commands, fileEntries)

        // Completing 'un' at position 6
        expect(result.completedText).toBe('cat untitled- extra')
      })
    })
  })
})
