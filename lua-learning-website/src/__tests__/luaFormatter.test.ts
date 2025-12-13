import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatLuaCode,
  initFormatter,
  isFormatterReady,
} from '../utils/luaFormatter'
// Import the mocks to access them in tests
import init, { format } from 'stylua-wasm'

// Cast to mock functions for type safety
// Note: mockInit is only used when the module hasn't been reset
const _mockInit = init as unknown as ReturnType<typeof vi.fn>
const mockFormat = format as unknown as ReturnType<typeof vi.fn>

// Re-export mockInit so it can be used in the first test (before reset)
// The underscore version is kept to avoid TS6133 when tests use fresh imports
void _mockInit

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

      // Re-import the mock module to get fresh mock reference
      const freshMockModule = await import('stylua-wasm')
      const freshMockInit = freshMockModule.default as unknown as ReturnType<typeof vi.fn>

      const { initFormatter: freshInit } = await import('../utils/luaFormatter')

      await freshInit()
      await freshInit()
      await freshInit()

      // Should only call init once
      expect(freshMockInit).toHaveBeenCalledTimes(1)
    })

    it('passes the WASM URL to init', async () => {
      vi.resetModules()
      vi.clearAllMocks()

      // Re-import the mock module to get fresh mock reference
      const freshMockModule = await import('stylua-wasm')
      const freshMockInit = freshMockModule.default as unknown as ReturnType<typeof vi.fn>

      const { initFormatter: freshInit } = await import('../utils/luaFormatter')
      await freshInit()

      expect(freshMockInit).toHaveBeenCalledWith('mock-wasm-url')
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
        mockFormat.mockReturnValue('print("hello")\n')
        const result = formatLuaCode('print("hello")')
        expect(result.success).toBe(true)
        expect(result.code).toBe('print("hello")\n')
      })

      it('calls format with code, config, and verification', () => {
        mockFormat.mockReturnValue('formatted')
        formatLuaCode('some code')
        expect(mockFormat).toHaveBeenCalledWith(
          'some code',
          expect.objectContaining({
            column_width: 80,
            indent_type: 0, // IndentType.Tabs
            indent_width: 2,
          }),
          0 // OutputVerification.Full
        )
      })

      it('uses the same config for each format call', () => {
        mockFormat.mockReturnValue('formatted')
        formatLuaCode('code1')
        formatLuaCode('code2')

        // Both calls should use the same config object structure
        const firstCallConfig = mockFormat.mock.calls[0][1]
        const secondCallConfig = mockFormat.mock.calls[1][1]
        expect(firstCallConfig).toEqual(secondCallConfig)
      })
    })

    describe('edge cases', () => {
      it('handles empty input without calling format', () => {
        const result = formatLuaCode('')
        expect(result.success).toBe(true)
        expect(result.code).toBe('')
        expect(mockFormat).not.toHaveBeenCalled()
      })

      it('handles whitespace-only input without calling format', () => {
        const result = formatLuaCode('   \n\t\n   ')
        expect(result.success).toBe(true)
        expect(result.code).toBe('')
        expect(mockFormat).not.toHaveBeenCalled()
      })

      it('returns error when format throws an Error', () => {
        mockFormat.mockImplementation(() => {
          throw new Error('Syntax error at line 1')
        })
        const result = formatLuaCode('invalid code')
        expect(result.success).toBe(false)
        expect(result.error).toBe('Syntax error at line 1')
      })

      it('returns error when format throws a string', () => {
        mockFormat.mockImplementation(() => {
          throw 'Some string error'
        })
        const result = formatLuaCode('invalid code')
        expect(result.success).toBe(false)
        expect(result.error).toBe('Some string error')
      })
    })

    describe('return type structure', () => {
      it('returns success true and formatted code on valid input', () => {
        mockFormat.mockReturnValue('print("test")\n')
        const result = formatLuaCode('print("test")')
        expect(result).toHaveProperty('success', true)
        expect(result).toHaveProperty('code')
        expect(typeof result.code).toBe('string')
        expect(result.error).toBeUndefined()
      })

      it('returns success false and error on error', () => {
        mockFormat.mockImplementation(() => {
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
