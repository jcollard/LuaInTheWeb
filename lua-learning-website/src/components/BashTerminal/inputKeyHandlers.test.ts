import { describe, it, expect } from 'vitest'
import {
  handleEnterKey,
  handleArrowUp,
  handleArrowDown,
  handleBackspace,
  handleCharacter,
  type InputState,
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
})
