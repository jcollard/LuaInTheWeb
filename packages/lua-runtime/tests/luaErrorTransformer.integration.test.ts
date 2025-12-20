/**
 * Integration tests for Lua error transformation.
 * Tests that formatLuaError correctly transforms actual Lua runtime errors.
 */
import { describe, it, expect } from 'vitest'
import { formatLuaError } from '../src/LuaEngineFactory'

describe('formatLuaError integration', () => {
  describe('iterator error transformation', () => {
    it('should transform "o is not a function" error with line number', () => {
      // Simulates the actual error format from wasmoon when using
      // for...in on a non-iterator value
      const rawError = '[string "test.lua"]:3: o is not a function'
      const result = formatLuaError(rawError)

      // Should have [error] prefix
      expect(result).toContain('[error]')
      // Should preserve line number location
      expect(result).toContain('[string "test.lua"]:3:')
      // Should transform the cryptic message to helpful one
      expect(result).toContain('iterate')
      expect(result).toContain('pairs()')
      expect(result).toContain('ipairs()')
      // Should NOT contain the original cryptic message
      expect(result).not.toContain('o is not a function')
    })

    it('should transform error from @filename format', () => {
      // Some Lua errors use @filename format
      const rawError = '@main.lua:5: o is not a function'
      const result = formatLuaError(rawError)

      expect(result).toContain('[error]')
      expect(result).toContain('pairs()')
    })

    it('should preserve and format regular errors', () => {
      const rawError = '[string "test.lua"]:10: attempt to call a nil value'
      const result = formatLuaError(rawError)

      expect(result).toBe('[error] [string "test.lua"]:10: attempt to call a nil value')
    })
  })

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const result = formatLuaError('')
      expect(result).toBe('[error] ')
    })

    it('should handle error without line number', () => {
      const rawError = 'o is not a function'
      const result = formatLuaError(rawError)

      expect(result).toContain('[error]')
      expect(result).toContain('pairs()')
    })
  })
})
