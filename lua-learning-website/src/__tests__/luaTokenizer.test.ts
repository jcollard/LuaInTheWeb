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

  // Table constructor pattern tests are in luaTokenizerTable.test.ts

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

  describe('indentationRules', () => {
    it('has indentationRules configured', () => {
      expect(luaLanguageConfig.indentationRules).toBeDefined()
    })

    it('has increaseIndentPattern for block-opening keywords', () => {
      const rules = luaLanguageConfig.indentationRules
      expect(rules?.increaseIndentPattern).toBeDefined()
      expect(rules?.increaseIndentPattern).toBeInstanceOf(RegExp)
    })

    it('has decreaseIndentPattern for block-closing keywords', () => {
      const rules = luaLanguageConfig.indentationRules
      expect(rules?.decreaseIndentPattern).toBeDefined()
      expect(rules?.decreaseIndentPattern).toBeInstanceOf(RegExp)
    })

    describe('increaseIndentPattern', () => {
      const getPattern = () => luaLanguageConfig.indentationRules?.increaseIndentPattern

      it('matches function declarations', () => {
        const pattern = getPattern()
        expect('function foo()').toMatch(pattern!)
        expect('local function bar()').toMatch(pattern!)
        expect('function()').toMatch(pattern!)
      })

      it('matches if statements', () => {
        const pattern = getPattern()
        expect('if x > 0 then').toMatch(pattern!)
        expect('if true then').toMatch(pattern!)
      })

      it('matches for loops', () => {
        const pattern = getPattern()
        expect('for i = 1, 10 do').toMatch(pattern!)
        expect('for k, v in pairs(t) do').toMatch(pattern!)
      })

      it('matches while loops', () => {
        const pattern = getPattern()
        expect('while x > 0 do').toMatch(pattern!)
      })

      it('matches repeat blocks', () => {
        const pattern = getPattern()
        expect('repeat').toMatch(pattern!)
      })

      it('matches do blocks', () => {
        const pattern = getPattern()
        expect('do').toMatch(pattern!)
      })

      it('matches else and elseif', () => {
        const pattern = getPattern()
        expect('else').toMatch(pattern!)
        expect('elseif x then').toMatch(pattern!)
      })

      it('does not match keywords in comments', () => {
        const pattern = getPattern()
        expect('-- function foo()').not.toMatch(pattern!)
        expect('-- if x then').not.toMatch(pattern!)
      })
    })

    describe('decreaseIndentPattern', () => {
      const getPattern = () => luaLanguageConfig.indentationRules?.decreaseIndentPattern

      it('matches end keyword at start of line', () => {
        const pattern = getPattern()
        expect('end').toMatch(pattern!)
        expect('  end').toMatch(pattern!)
        expect('\tend').toMatch(pattern!)
      })

      it('matches else keyword at start of line', () => {
        const pattern = getPattern()
        expect('else').toMatch(pattern!)
        expect('  else').toMatch(pattern!)
      })

      it('matches elseif keyword at start of line', () => {
        const pattern = getPattern()
        expect('elseif').toMatch(pattern!)
        expect('elseif x then').toMatch(pattern!)
        expect('  elseif b then').toMatch(pattern!)
      })

      it('matches until keyword at start of line', () => {
        const pattern = getPattern()
        expect('until x > 0').toMatch(pattern!)
        expect('  until').toMatch(pattern!)
      })

      it('does not match keywords in comments', () => {
        const pattern = getPattern()
        expect('-- end').not.toMatch(pattern!)
        expect('-- else').not.toMatch(pattern!)
        expect('  -- end').not.toMatch(pattern!)
      })

      it('does not match keywords in middle of line', () => {
        const pattern = getPattern()
        expect('x = "end"').not.toMatch(pattern!)
        expect('return end_value').not.toMatch(pattern!) // 'end' is part of identifier
      })
    })
  })

  describe('onEnterRules', () => {
    it('has onEnterRules configured', () => {
      expect(luaLanguageConfig.onEnterRules).toBeDefined()
      expect(Array.isArray(luaLanguageConfig.onEnterRules)).toBe(true)
    })

    it('has at least one onEnterRule', () => {
      expect(luaLanguageConfig.onEnterRules?.length).toBeGreaterThan(0)
    })

    it('has rules with beforeText patterns', () => {
      const rules = luaLanguageConfig.onEnterRules
      const hasBeforeText = rules?.some((rule) => rule.beforeText !== undefined)
      expect(hasBeforeText).toBe(true)
    })

    it('has rules with action configurations', () => {
      const rules = luaLanguageConfig.onEnterRules
      const hasAction = rules?.some((rule) => rule.action !== undefined)
      expect(hasAction).toBe(true)
    })
  })

  describe('nested structure patterns', () => {
    const getIncreasePattern = () =>
      luaLanguageConfig.indentationRules?.increaseIndentPattern
    const getDecreasePattern = () =>
      luaLanguageConfig.indentationRules?.decreaseIndentPattern

    it('handles function inside if block', () => {
      const increase = getIncreasePattern()!
      const decrease = getDecreasePattern()!

      // Each line should trigger appropriate indentation
      expect('if condition then').toMatch(increase)
      expect('  function inner()').toMatch(increase)
      expect('  end').toMatch(decrease) // end at start of line (with indent)
      expect('end').toMatch(decrease)
    })

    it('handles nested loops', () => {
      const increase = getIncreasePattern()!
      const decrease = getDecreasePattern()!

      expect('for i = 1, 10 do').toMatch(increase)
      expect('  while j > 0 do').toMatch(increase)
      expect('  end').toMatch(decrease) // end at start of line (with indent)
      expect('end').toMatch(decrease)
    })

    it('handles repeat-until inside function', () => {
      const increase = getIncreasePattern()!
      const decrease = getDecreasePattern()!

      expect('function test()').toMatch(increase)
      expect('  repeat').toMatch(increase)
      expect('until done').toMatch(decrease) // until at start of line
      expect('end').toMatch(decrease)
    })

    it('handles if-elseif-else chain', () => {
      const increase = getIncreasePattern()!
      const decrease = getDecreasePattern()!

      expect('if a then').toMatch(increase)
      expect('elseif b then').toMatch(increase)
      expect('elseif b then').toMatch(decrease) // elseif at start of line
      expect('else').toMatch(increase)
      expect('else').toMatch(decrease) // else at start of line
      expect('end').toMatch(decrease)
    })

    it('handles anonymous function in table', () => {
      const increase = getIncreasePattern()!

      // Anonymous functions should also trigger indent
      expect('callback = function()').toMatch(increase)
      expect('items = { function()').toMatch(increase)
    })

    it('handles do-end blocks', () => {
      const increase = getIncreasePattern()!
      const decrease = getDecreasePattern()!

      expect('do').toMatch(increase)
      expect('end').toMatch(decrease)
    })

    it('does not match keywords that do not end the line properly', () => {
      const increase = getIncreasePattern()!
      const decrease = getDecreasePattern()!

      // These lines contain keywords but don't follow the expected patterns
      // Note: Regex-based rules can't perfectly detect string context, but they
      // work well for typical code patterns where keywords end lines properly
      expect('x = "then"').not.toMatch(increase) // 'then' in string, not at end
      expect('y = something').not.toMatch(increase) // no block keyword
      expect('z = 42').not.toMatch(decrease) // no closing keyword
      expect('msg = "end of line"').not.toMatch(decrease) // 'end' not at start
    })
  })
})
