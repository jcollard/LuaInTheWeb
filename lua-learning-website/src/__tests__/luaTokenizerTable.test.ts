import { describe, it, expect } from 'vitest'
import { luaTokenizerConfig } from '../utils/luaTokenizer'

describe('luaTokenizer table state', () => {
  describe('table constructor architecture', () => {
    it('has a separate table tokenizer state for table key highlighting', () => {
      // Table key highlighting should happen in a dedicated table state, not root
      // This prevents false positives like `local x, y, z = foo()` matching as table keys
      expect(luaTokenizerConfig.tokenizer).toHaveProperty('table')
    })

    it('root state does NOT have comma-identifier-equals pattern that matches variable assignment', () => {
      // REGRESSION GUARD: The bug was /(,)(\s*)([a-zA-Z_]\w*)(\s*)(=)/ in root
      // matching `z` in `local x, y, z = foo()` as a table property.
      // This pattern must NOT exist in root state - only in table state.
      const rootRules = luaTokenizerConfig.tokenizer.root

      const hasProblematicPattern = rootRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          const source = rule[0].source
          // Check for comma-identifier-equals pattern in root
          return source.includes('(,)') && source.includes('[a-zA-Z_]') && source.includes('(=)')
        }
        return false
      })

      // This pattern should NOT be in root - it causes false positives
      expect(hasProblematicPattern).toBe(false)
    })
  })
})
