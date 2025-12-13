import { describe, it, expect } from 'vitest'
import {
  luaLanguageConfig,
  luaTokenizerConfig,
  LUA_KEYWORDS,
} from '../utils/luaTokenizer'

describe('luaTokenizer', () => {
  describe('luaLanguageConfig', () => {
    it('has line comment configuration', () => {
      expect(luaLanguageConfig.comments?.lineComment).toBe('--')
    })

    it('has block comment configuration', () => {
      expect(luaLanguageConfig.comments?.blockComment).toEqual(['--[[', ']]'])
    })

    it('has bracket pairs configured', () => {
      expect(luaLanguageConfig.brackets).toContainEqual(['{', '}'])
      expect(luaLanguageConfig.brackets).toContainEqual(['[', ']'])
      expect(luaLanguageConfig.brackets).toContainEqual(['(', ')'])
    })

    it('has auto-closing pairs for strings and brackets', () => {
      const openChars = luaLanguageConfig.autoClosingPairs?.map((p) => p.open)
      expect(openChars).toContain('{')
      expect(openChars).toContain('[')
      expect(openChars).toContain('(')
      expect(openChars).toContain('"')
      expect(openChars).toContain("'")
    })
  })

  describe('LUA_KEYWORDS', () => {
    it('includes all Lua control flow keywords', () => {
      const controlFlow = [
        'if',
        'then',
        'else',
        'elseif',
        'end',
        'for',
        'while',
        'repeat',
        'until',
        'do',
        'break',
      ]
      for (const keyword of controlFlow) {
        expect(LUA_KEYWORDS).toContain(keyword)
      }
    })

    it('includes function-related keywords', () => {
      expect(LUA_KEYWORDS).toContain('function')
      expect(LUA_KEYWORDS).toContain('return')
      expect(LUA_KEYWORDS).toContain('local')
    })

    it('includes logical operators', () => {
      expect(LUA_KEYWORDS).toContain('and')
      expect(LUA_KEYWORDS).toContain('or')
      expect(LUA_KEYWORDS).toContain('not')
    })

    it('includes nil, true, and false', () => {
      expect(LUA_KEYWORDS).toContain('nil')
      expect(LUA_KEYWORDS).toContain('true')
      expect(LUA_KEYWORDS).toContain('false')
    })

    it('includes goto and in keywords', () => {
      expect(LUA_KEYWORDS).toContain('goto')
      expect(LUA_KEYWORDS).toContain('in')
    })
  })

  describe('luaTokenizerConfig', () => {
    it('has lua token postfix', () => {
      expect(luaTokenizerConfig.tokenPostfix).toBe('.lua')
    })

    it('has keywords array', () => {
      expect(luaTokenizerConfig.keywords).toEqual(LUA_KEYWORDS)
    })

    describe('tokenizer rules', () => {
      it('has root tokenizer state', () => {
        expect(luaTokenizerConfig.tokenizer).toHaveProperty('root')
        expect(Array.isArray(luaTokenizerConfig.tokenizer.root)).toBe(true)
      })

      it('has whitespace tokenizer state', () => {
        expect(luaTokenizerConfig.tokenizer).toHaveProperty('whitespace')
      })

      it('has comment tokenizer state', () => {
        expect(luaTokenizerConfig.tokenizer).toHaveProperty('comment')
      })

      it('has string tokenizer state', () => {
        expect(luaTokenizerConfig.tokenizer).toHaveProperty('string')
      })

      it('has multi-line string tokenizer state', () => {
        expect(luaTokenizerConfig.tokenizer).toHaveProperty('mlstring')
      })
    })
  })

  describe('multi-line string patterns', () => {
    // Test that multi-line string regex patterns are present
    const rootRules = luaTokenizerConfig.tokenizer.root

    it('has pattern for opening long bracket strings [[', () => {
      const hasLongBracketPattern = rootRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].source.includes('\\[\\[')
        }
        return false
      })
      expect(hasLongBracketPattern).toBe(true)
    })

    it('has pattern for opening long bracket strings with equals [=[', () => {
      const hasLongBracketWithEqualsPattern = rootRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].source.includes('\\[=')
        }
        return false
      })
      expect(hasLongBracketWithEqualsPattern).toBe(true)
    })
  })

  describe('number patterns', () => {
    const rootRules = luaTokenizerConfig.tokenizer.root

    it('has pattern for hexadecimal numbers', () => {
      const hasHexPattern = rootRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].source.includes('0[xX]')
        }
        return false
      })
      expect(hasHexPattern).toBe(true)
    })

    it('has pattern for floating point numbers', () => {
      const hasFloatPattern = rootRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].source.includes('\\d') && rule[0].source.includes('\\.')
        }
        return false
      })
      expect(hasFloatPattern).toBe(true)
    })

    it('has pattern for scientific notation', () => {
      const hasSciPattern = rootRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].source.includes('[eE]')
        }
        return false
      })
      expect(hasSciPattern).toBe(true)
    })
  })

  describe('comment patterns', () => {
    const whitespaceRules = luaTokenizerConfig.tokenizer.whitespace

    it('has pattern for single-line comments', () => {
      const hasSingleLineComment = whitespaceRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].source.includes('--') && rule[1] === 'comment'
        }
        return false
      })
      expect(hasSingleLineComment).toBe(true)
    })

    it('has pattern for multi-line comments', () => {
      const hasMultiLineComment = whitespaceRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].source.includes('--\\[')
        }
        return false
      })
      expect(hasMultiLineComment).toBe(true)
    })
  })

  describe('table constructor patterns', () => {
    const rootRules = luaTokenizerConfig.tokenizer.root

    it('has bracket delimiters for table constructors', () => {
      const hasBracketPattern = rootRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          // Match patterns like [{}()[\]] or [{}()\[\]]
          const source = rule[0].source
          return (
            source.includes('[{}]') ||
            source.includes('[{}()') ||
            source === '[{}()[\\]]'
          )
        }
        return false
      })
      expect(hasBracketPattern).toBe(true)
    })

    it('has table key highlighting pattern', () => {
      const hasKeyPattern = rootRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          // Check for key: pattern or key = pattern in table context
          return (
            rule[0].source.includes('key') ||
            (rule[0].source.includes('[a-zA-Z_]') && rule[0].source.includes('='))
          )
        }
        return false
      })
      expect(hasKeyPattern).toBe(true)
    })
  })

  describe('string patterns', () => {
    const rootRules = luaTokenizerConfig.tokenizer.root

    it('has pattern for double-quoted strings', () => {
      const hasDoubleQuote = rootRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].source === '"'
        }
        return false
      })
      expect(hasDoubleQuote).toBe(true)
    })

    it('has pattern for single-quoted strings', () => {
      const hasSingleQuote = rootRules.some((rule) => {
        if (Array.isArray(rule) && rule[0] instanceof RegExp) {
          return rule[0].source === "'"
        }
        return false
      })
      expect(hasSingleQuote).toBe(true)
    })
  })

  describe('escape sequence pattern', () => {
    it('has escape sequence regex', () => {
      expect(luaTokenizerConfig.escapes).toBeInstanceOf(RegExp)
    })

    it('escape pattern matches standard escapes', () => {
      const escapeRegex = luaTokenizerConfig.escapes
      expect('\\n').toMatch(escapeRegex)
      expect('\\t').toMatch(escapeRegex)
      expect('\\r').toMatch(escapeRegex)
      expect('\\"').toMatch(escapeRegex)
      expect("\\'").toMatch(escapeRegex)
      expect('\\\\').toMatch(escapeRegex)
    })

    it('escape pattern matches hex escapes', () => {
      const escapeRegex = luaTokenizerConfig.escapes
      expect('\\x41').toMatch(escapeRegex)
      expect('\\xFF').toMatch(escapeRegex)
    })

    it('escape pattern matches unicode escapes', () => {
      const escapeRegex = luaTokenizerConfig.escapes
      expect('\\u0041').toMatch(escapeRegex)
      expect('\\U00000041').toMatch(escapeRegex)
    })
  })
})
