/**
 * Tests for Lua error message transformation.
 * Transforms cryptic Lua errors into user-friendly messages with hints.
 */
import { describe, it, expect } from 'vitest'
import { transformLuaError } from '../src/luaErrorTransformer'

describe('transformLuaError', () => {
  describe('iterator error transformation', () => {
    it('should transform "o is not a function" to helpful message with hint', () => {
      const error = 'o is not a function'
      const result = transformLuaError(error)
      expect(result).toContain('iterate')
      expect(result).toContain('pairs()')
      expect(result).toContain('ipairs()')
    })

    it('should preserve line number prefix when present', () => {
      const error = '[string "test.lua"]:3: o is not a function'
      const result = transformLuaError(error)
      expect(result).toContain('[string "test.lua"]:3:')
      expect(result).toContain('pairs()')
    })

    it('should handle error with filename prefix', () => {
      const error = 'main.lua:5: o is not a function'
      const result = transformLuaError(error)
      expect(result).toContain('main.lua:5:')
      expect(result).toContain('pairs()')
    })
  })

  describe('passthrough for unrecognized errors', () => {
    it('should return original error for unknown patterns', () => {
      const error = 'some random error message'
      const result = transformLuaError(error)
      expect(result).toBe(error)
    })

    it('should preserve line numbers in unrecognized errors', () => {
      const error = '[string "test.lua"]:10: undefined variable x'
      const result = transformLuaError(error)
      expect(result).toBe(error)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string and return empty string', () => {
      const result = transformLuaError('')
      expect(result).toBe('')
      // Explicitly verify it returns the empty input unchanged
      expect(result.length).toBe(0)
    })

    it('should transform without prefix and have no prefix in result', () => {
      // When there's no line prefix, the transformed message should not have any prefix
      const error = 'o is not a function'
      const result = transformLuaError(error)
      expect(result).toContain('pairs()')
      // Should start directly with the transformed message - no prefix added
      expect(result).toMatch(/^attempt to iterate/)
      // Should not have any dangling prefix
      expect(result).not.toContain('[string')
      expect(result).not.toContain('.lua:')
    })

    it('should handle "o is not a function" in middle of other text', () => {
      // Should still match if the pattern is at the end (message portion)
      const error = '[string "..."]:1: o is not a function'
      const result = transformLuaError(error)
      expect(result).toContain('pairs()')
    })

    it('should not transform if pattern appears but is not the actual error', () => {
      // If someone has a string containing the text, don't transform
      const error = 'print("o is not a function")'
      const result = transformLuaError(error)
      expect(result).toBe(error)
    })

    it('should not transform if error has text before "o is not a function"', () => {
      // Pattern should only match if "o is not a function" is the entire message
      const error = 'some prefix o is not a function'
      const result = transformLuaError(error)
      expect(result).toBe(error)
    })

    it('should not transform if error has text after "o is not a function"', () => {
      // Pattern should only match if "o is not a function" is the entire message
      const error = 'o is not a function extra'
      const result = transformLuaError(error)
      expect(result).toBe(error)
    })

    it('should not transform with prefix when message has extra text after', () => {
      // Even with valid line prefix, extra text after should prevent transformation
      const error = '[string "test.lua"]:3: o is not a function blah'
      const result = transformLuaError(error)
      expect(result).toBe(error)
    })

    it('should handle multi-digit line numbers in [string] format', () => {
      const error = '[string "test.lua"]:123: o is not a function'
      const result = transformLuaError(error)
      expect(result).toContain('[string "test.lua"]:123:')
      expect(result).toContain('pairs()')
      // Verify the original cryptic message was transformed
      expect(result).not.toContain('o is not a function')
    })

    it('should handle prefix with no trailing space', () => {
      // Test that \s* (zero or more spaces) works, not just \s (exactly one space)
      const error = '[string "test.lua"]:3:o is not a function'  // no space after colon
      const result = transformLuaError(error)
      // Should still extract prefix correctly
      expect(result).toContain('[string "test.lua"]:3:')
      // Should transform the message
      expect(result).toContain('pairs()')
      expect(result).not.toContain('o is not a function')
    })

    it('should handle multi-digit line numbers in filename.lua format', () => {
      const error = 'main.lua:99: o is not a function'
      const result = transformLuaError(error)
      expect(result).toContain('main.lua:99:')
      expect(result).toContain('pairs()')
      // Verify the original cryptic message was transformed
      expect(result).not.toContain('o is not a function')
    })

    it('should preserve space after line number prefix', () => {
      const error = '[string "test.lua"]:3: o is not a function'
      const result = transformLuaError(error)
      // The result should have a space after the colon
      expect(result).toMatch(/\]:3:\s/)
    })

    it('should handle line prefix only at start of string', () => {
      // If line prefix appears somewhere else, it should not be extracted
      // and the whole string should be returned unchanged
      const error = 'before [string "test.lua"]:3: o is not a function'
      const result = transformLuaError(error)
      // Since prefix is not at start, pattern doesn't match, so original returned
      expect(result).toBe(error)
    })

    it('should require complete pattern match for line prefix', () => {
      // Malformed prefixes should not be extracted
      const error = '[string "test.lua"]:3 o is not a function'  // missing colon after line
      const result = transformLuaError(error)
      expect(result).toBe(error)
    })
  })
})
