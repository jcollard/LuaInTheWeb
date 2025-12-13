import { describe, it, expect, beforeEach, vi } from 'vitest'

// Define mock at top level using vi.hoisted
const { mockFormatCode, mockInit, mockConfigNew } = vi.hoisted(() => ({
  mockFormatCode: vi.fn(),
  mockInit: vi.fn(() => Promise.resolve()),
  mockConfigNew: vi.fn(() => ({
    column_width: 80,
    line_endings: 0,
    indent_type: 0,
    indent_width: 2,
    quote_style: 0,
    call_parentheses: 0,
    collapse_simple_statement: 0,
  })),
}))

vi.mock('@johnnymorganz/stylua', () => ({
  default: mockInit,
  formatCode: mockFormatCode,
  Config: { new: mockConfigNew },
  OutputVerification: { Full: 0, None: 1 },
  IndentType: { Tabs: 0, Spaces: 1 },
  LineEndings: { Unix: 0, Windows: 1 },
  QuoteStyle: { AutoPreferDouble: 0, AutoPreferSingle: 1 },
  CallParenType: { Always: 0, NoSingleString: 1 },
  CollapseSimpleStatement: { Never: 0, FunctionOnly: 1 },
}))

// Import after mocking
import {
  formatLuaCode,
  initFormatter,
  isFormatterReady,
} from '../utils/luaFormatter'

describe('luaFormatter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initFormatter', () => {
    it('initializes the formatter successfully', async () => {
      await initFormatter()
      expect(isFormatterReady()).toBe(true)
    })

    it('only initializes once when called multiple times', async () => {
      // Reset for this specific test
      vi.resetModules()
      vi.clearAllMocks()

      const { initFormatter: freshInit } = await import('../utils/luaFormatter')

      await freshInit()
      await freshInit()
      await freshInit()

      // Should only call init once
      expect(mockInit).toHaveBeenCalledTimes(1)
    })
  })

  describe('isFormatterReady', () => {
    it('returns true after initialization', async () => {
      await initFormatter()
      expect(isFormatterReady()).toBe(true)
    })
  })

  describe('formatLuaCode', () => {
    beforeEach(async () => {
      await initFormatter()
    })

    describe('basic formatting', () => {
      it('formats simple print statement', () => {
        mockFormatCode.mockReturnValue('print("hello")\n')
        const result = formatLuaCode('print("hello")')
        expect(result.success).toBe(true)
        expect(result.code).toBe('print("hello")\n')
      })

      it('calls formatCode with config and verification', () => {
        mockFormatCode.mockReturnValue('formatted')
        formatLuaCode('some code')
        expect(mockFormatCode).toHaveBeenCalledWith(
          'some code',
          expect.any(Object),
          undefined,
          0 // OutputVerification.Full
        )
      })

      it('creates a new config for each format call', () => {
        mockFormatCode.mockReturnValue('formatted')
        mockConfigNew.mockClear()
        formatLuaCode('code1')
        formatLuaCode('code2')
        expect(mockConfigNew).toHaveBeenCalledTimes(2)
      })
    })

    describe('edge cases', () => {
      it('handles empty input without calling formatCode', () => {
        const result = formatLuaCode('')
        expect(result.success).toBe(true)
        expect(result.code).toBe('')
        expect(mockFormatCode).not.toHaveBeenCalled()
      })

      it('handles whitespace-only input without calling formatCode', () => {
        const result = formatLuaCode('   \n\t\n   ')
        expect(result.success).toBe(true)
        expect(result.code).toBe('')
        expect(mockFormatCode).not.toHaveBeenCalled()
      })

      it('returns error when formatCode throws an Error', () => {
        mockFormatCode.mockImplementation(() => {
          throw new Error('Syntax error at line 1')
        })
        const result = formatLuaCode('invalid code')
        expect(result.success).toBe(false)
        expect(result.error).toBe('Syntax error at line 1')
      })

      it('returns error when formatCode throws a string', () => {
        mockFormatCode.mockImplementation(() => {
          throw 'Some string error'
        })
        const result = formatLuaCode('invalid code')
        expect(result.success).toBe(false)
        expect(result.error).toBe('Some string error')
      })
    })

    describe('return type structure', () => {
      it('returns success true and formatted code on valid input', () => {
        mockFormatCode.mockReturnValue('print("test")\n')
        const result = formatLuaCode('print("test")')
        expect(result).toHaveProperty('success', true)
        expect(result).toHaveProperty('code')
        expect(typeof result.code).toBe('string')
        expect(result.error).toBeUndefined()
      })

      it('returns success false and error on error', () => {
        mockFormatCode.mockImplementation(() => {
          throw new Error('Parse error')
        })
        const result = formatLuaCode('invalid')
        expect(result).toHaveProperty('success', false)
        expect(result).toHaveProperty('error')
        expect(typeof result.error).toBe('string')
        expect(result.code).toBeUndefined()
      })
    })
  })

  describe('formatLuaCode when not initialized', () => {
    it('returns error when formatter is not initialized', async () => {
      // Reset module state by re-importing
      vi.resetModules()
      vi.clearAllMocks()

      const {
        formatLuaCode: freshFormatLuaCode,
        isFormatterReady: freshIsFormatterReady,
      } = await import('../utils/luaFormatter')

      expect(freshIsFormatterReady()).toBe(false)
      const result = freshFormatLuaCode('print("test")')
      expect(result.success).toBe(false)
      expect(result.error).toContain('not initialized')
    })
  })
})
