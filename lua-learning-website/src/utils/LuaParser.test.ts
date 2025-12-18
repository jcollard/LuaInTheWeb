/**
 * Tests for LuaParser utility module.
 * Uses luaparse for syntax checking to avoid WASM-related errors.
 */

import { describe, it, expect } from 'vitest'
import { LuaParser } from './LuaParser'

describe('LuaParser', () => {
  describe('checkSyntax', () => {
    describe('valid code', () => {
      it('returns valid for empty string', () => {
        const result = LuaParser.checkSyntax('')
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('returns valid for whitespace-only code', () => {
        const result = LuaParser.checkSyntax('   \n\t  ')
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('returns valid for simple print statement', () => {
        const result = LuaParser.checkSyntax('print("hello")')
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('returns valid for variable assignment', () => {
        const result = LuaParser.checkSyntax('x = 10')
        expect(result.valid).toBe(true)
      })

      it('returns valid for function definition', () => {
        const code = `
function greet(name)
  return "Hello, " .. name
end
`
        const result = LuaParser.checkSyntax(code)
        expect(result.valid).toBe(true)
      })

      it('returns valid for if statement', () => {
        const code = `
if x > 10 then
  print("big")
else
  print("small")
end
`
        const result = LuaParser.checkSyntax(code)
        expect(result.valid).toBe(true)
      })

      it('returns valid for for loop', () => {
        const code = `
for i = 1, 10 do
  print(i)
end
`
        const result = LuaParser.checkSyntax(code)
        expect(result.valid).toBe(true)
      })

      it('returns valid for table literal', () => {
        const result = LuaParser.checkSyntax('t = { a = 1, b = 2, "c" }')
        expect(result.valid).toBe(true)
      })

      it('returns valid for expression (can be evaluated)', () => {
        const result = LuaParser.checkSyntax('1 + 2')
        expect(result.valid).toBe(true)
      })

      it('returns valid for multi-line string', () => {
        const code = `s = [[
multi
line
string
]]`
        const result = LuaParser.checkSyntax(code)
        expect(result.valid).toBe(true)
      })
    })

    describe('invalid code with syntax errors', () => {
      it('returns error for unclosed string', () => {
        const result = LuaParser.checkSyntax('print("hello)')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.error?.message).toContain('string')
      })

      it('returns error for missing end keyword', () => {
        const result = LuaParser.checkSyntax('if true then print("x")')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.incomplete).toBe(true)
      })

      it('returns error for invalid syntax', () => {
        const result = LuaParser.checkSyntax('if if if')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('returns error with line number for multi-line code', () => {
        const code = `
print("line 1")
print("line 2"
print("line 3")
`
        const result = LuaParser.checkSyntax(code)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.error?.line).toBeGreaterThan(1)
      })

      it('returns error for unexpected token', () => {
        const result = LuaParser.checkSyntax('local = 5')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('returns error for mismatched brackets', () => {
        const result = LuaParser.checkSyntax('t = { a = 1')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.incomplete).toBe(true)
      })
    })

    describe('incomplete code detection', () => {
      it('marks unclosed function as incomplete', () => {
        const result = LuaParser.checkSyntax('function foo()')
        expect(result.valid).toBe(false)
        expect(result.incomplete).toBe(true)
      })

      it('marks unclosed if as incomplete', () => {
        const result = LuaParser.checkSyntax('if true then')
        expect(result.valid).toBe(false)
        expect(result.incomplete).toBe(true)
      })

      it('marks unclosed while as incomplete', () => {
        const result = LuaParser.checkSyntax('while true do')
        expect(result.valid).toBe(false)
        expect(result.incomplete).toBe(true)
      })

      it('marks unclosed for as incomplete', () => {
        const result = LuaParser.checkSyntax('for i = 1, 10 do')
        expect(result.valid).toBe(false)
        expect(result.incomplete).toBe(true)
      })

      it('does not mark real syntax errors as incomplete', () => {
        const result = LuaParser.checkSyntax('local = 5')
        expect(result.valid).toBe(false)
        expect(result.incomplete).toBe(false)
      })
    })

    describe('error message quality', () => {
      it('does not contain WASM-related error messages', () => {
        // This is the key requirement - no WASM errors should leak through
        const badCodes = [
          'print("hello)',
          'if if if',
          'local = 5',
          '))))',
          'function',
          '[[[[',
        ]

        for (const code of badCodes) {
          const result = LuaParser.checkSyntax(code)
          expect(result.valid).toBe(false)
          expect(result.error?.message).toBeDefined()
          expect(result.error?.message.toLowerCase()).not.toContain('wasm')
          expect(result.error?.message.toLowerCase()).not.toContain('memory access')
          expect(result.error?.message.toLowerCase()).not.toContain('runtime error')
        }
      })

      it('provides clean Lua-specific error messages', () => {
        const result = LuaParser.checkSyntax('print("unclosed')
        expect(result.valid).toBe(false)
        expect(result.error?.message).toBeDefined()
        // Should be a clean message, not a JS stack trace
        expect(result.error?.message).not.toContain('at ')
        expect(result.error?.message).not.toContain('.js:')
      })
    })

    describe('edge cases', () => {
      it('handles very long code', () => {
        const code = 'x = 1\n'.repeat(1000)
        const result = LuaParser.checkSyntax(code)
        expect(result.valid).toBe(true)
      })

      it('handles unicode characters in strings', () => {
        const result = LuaParser.checkSyntax('s = "Hello 世界 🌍"')
        expect(result.valid).toBe(true)
      })

      it('handles comments', () => {
        const code = `
-- this is a comment
x = 10 -- inline comment
--[[
  multi-line comment
]]
`
        const result = LuaParser.checkSyntax(code)
        expect(result.valid).toBe(true)
      })
    })

    describe('error extraction', () => {
      it('extracts line number from error', () => {
        const result = LuaParser.checkSyntax('x = 1\ny = 2\nprint("unclosed')
        expect(result.valid).toBe(false)
        expect(result.error?.line).toBe(3)
      })

      it('extracts column number from error', () => {
        const result = LuaParser.checkSyntax('local = 5')
        expect(result.valid).toBe(false)
        expect(result.error?.column).toBeDefined()
        expect(result.error?.column).toBeGreaterThan(0)
      })

      it('extracts message from error', () => {
        const result = LuaParser.checkSyntax('if if')
        expect(result.valid).toBe(false)
        expect(result.error?.message).toBeDefined()
        expect(result.error?.message.length).toBeGreaterThan(0)
      })

      it('handles error without line/column format gracefully', () => {
        // This tests the fallback path in extractErrorInfo
        // The error message is always in [line:col] format from luaparse
        // but we test the fallback behavior anyway
        const result = LuaParser.checkSyntax('function')
        expect(result.valid).toBe(false)
        expect(result.error?.message).toBeDefined()
      })
    })

    describe('incomplete code detection details', () => {
      it('detects eof in error message for incomplete code', () => {
        const result = LuaParser.checkSyntax('function test()')
        expect(result.valid).toBe(false)
        expect(result.incomplete).toBe(true)
      })

      it('detects incomplete table literal', () => {
        const result = LuaParser.checkSyntax('t = {')
        expect(result.valid).toBe(false)
        expect(result.incomplete).toBe(true)
      })

      it('detects incomplete string', () => {
        const result = LuaParser.checkSyntax('s = "hello')
        expect(result.valid).toBe(false)
        // Unclosed string is a real error, not incomplete
        expect(result.incomplete).toBe(false)
      })

      it('properly identifies complete but invalid code as not incomplete', () => {
        // "local = 5" is complete (not missing end/closing bracket)
        // but syntactically invalid
        const result = LuaParser.checkSyntax('local = 5')
        expect(result.valid).toBe(false)
        expect(result.incomplete).toBe(false)
      })
    })

    describe('expression vs statement parsing', () => {
      it('accepts bare number as expression', () => {
        const result = LuaParser.checkSyntax('42')
        expect(result.valid).toBe(true)
      })

      it('accepts bare string as expression', () => {
        const result = LuaParser.checkSyntax('"hello"')
        expect(result.valid).toBe(true)
      })

      it('accepts function call as statement', () => {
        const result = LuaParser.checkSyntax('print()')
        expect(result.valid).toBe(true)
      })

      it('accepts arithmetic expression', () => {
        const result = LuaParser.checkSyntax('1 + 2 * 3')
        expect(result.valid).toBe(true)
      })

      it('accepts table constructor as expression', () => {
        const result = LuaParser.checkSyntax('{1, 2, 3}')
        expect(result.valid).toBe(true)
      })
    })
  })
})
