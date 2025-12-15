import { describe, expect, it } from 'vitest'
import { findMatchingBlockIndent, stripStringsAndComments } from '../luaBlockParser'

describe('findMatchingBlockIndent', () => {
  describe('simple blocks', () => {
    it('returns 0 indent for end closing a function at level 0', () => {
      const code = `function foo()
    print("hello")
`
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('returns 0 indent for end closing an if at level 0', () => {
      const code = `if true then
    print("hello")
`
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('returns 0 indent for until closing a repeat at level 0', () => {
      const code = `repeat
    x = x + 1
`
      const result = findMatchingBlockIndent(code, 'until')
      expect(result).toBe(0)
    })

    it('returns 0 indent for else matching if at level 0', () => {
      const code = `if true then
    print("hello")
`
      const result = findMatchingBlockIndent(code, 'else')
      expect(result).toBe(0)
    })

    it('returns 0 indent for elseif matching if at level 0', () => {
      const code = `if true then
    print("hello")
`
      const result = findMatchingBlockIndent(code, 'elseif')
      expect(result).toBe(0)
    })
  })

  describe('nested blocks', () => {
    it('returns correct indent for end closing inner function', () => {
      const code = `function outer()
    function inner()
        print("hello")
`
      // The 'end' should close 'inner' which is at 4 spaces indent
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(4)
    })

    it('returns correct indent for end closing nested if', () => {
      const code = `if true then
    if false then
        print("hello")
`
      // The 'end' should close the inner if at 4 spaces indent
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(4)
    })

    it('returns 0 indent for end closing outer function after inner is closed', () => {
      const code = `function outer()
    function inner()
        print("hello")
    end
`
      // The next 'end' should close 'outer' which is at 0 indent
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('handles deeply nested blocks', () => {
      const code = `function foo()
    if true then
        for i = 1, 10 do
            while x do
                print("deep")
`
      // The 'end' should close 'while' at 12 spaces
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(12)
    })
  })

  describe('else and elseif within nested blocks', () => {
    it('returns correct indent for else in nested if', () => {
      const code = `function foo()
    if true then
        print("hello")
`
      // The 'else' should match the 'if' at 4 spaces
      const result = findMatchingBlockIndent(code, 'else')
      expect(result).toBe(4)
    })

    it('returns correct indent for elseif in nested if', () => {
      const code = `if a then
    if b then
        print("b")
`
      // The 'elseif' should match the inner 'if' at 4 spaces
      const result = findMatchingBlockIndent(code, 'elseif')
      expect(result).toBe(4)
    })

    it('handles else after elseif', () => {
      const code = `if a then
    print("a")
elseif b then
    print("b")
`
      // The 'else' should match the original 'if' at 0
      const result = findMatchingBlockIndent(code, 'else')
      expect(result).toBe(0)
    })
  })

  describe('for and while loops', () => {
    it('returns correct indent for end closing for loop', () => {
      const code = `for i = 1, 10 do
    print(i)
`
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('returns correct indent for end closing while loop', () => {
      const code = `while true do
    print("loop")
`
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('returns correct indent for end closing nested for in function', () => {
      const code = `function test()
    for i = 1, 10 do
        print(i)
`
      // The 'end' should close 'for' at 4 spaces
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(4)
    })
  })

  describe('do blocks', () => {
    it('returns correct indent for end closing standalone do block', () => {
      const code = `do
    local x = 1
`
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('returns correct indent for end closing nested do block', () => {
      const code = `function foo()
    do
        local x = 1
`
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(4)
    })
  })

  describe('repeat-until blocks', () => {
    it('returns correct indent for until closing nested repeat', () => {
      const code = `function foo()
    repeat
        x = x + 1
`
      const result = findMatchingBlockIndent(code, 'until')
      expect(result).toBe(4)
    })
  })

  describe('edge cases', () => {
    it('returns 0 when no matching opener found', () => {
      const code = `print("hello")
`
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('returns 0 for empty code', () => {
      const code = ''
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('handles tab indentation', () => {
      const code = `function foo()
\tif true then
\t\tprint("hello")
`
      // The 'end' should close 'if' at 1 tab
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(1) // Returns tab count
    })
  })

  describe('keywords inside strings - should be ignored', () => {
    it('ignores function keyword inside double-quoted string', () => {
      const code = `local s = "function foo() end"
if true then
    print(s)
`
      // The 'end' should match the 'if' at 0, not the fake 'function' in the string
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('ignores if/then keyword inside single-quoted string', () => {
      const code = `local s = 'if true then end'
function foo()
    print(s)
`
      // The 'end' should match 'function' at 0
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('ignores keywords inside multi-line string [[...]]', () => {
      const code = `local s = [[
function fake()
end
]]
function real()
    print(s)
`
      // The 'end' should match 'function real' at 0, not be confused by fake function/end in string
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('correctly handles unbalanced blocks in multi-line string', () => {
      // This test verifies that keywords in strings are ignored
      // The string contains TWO unclosed functions which would be on the stack if not ignored
      const code = `local s = [[
function unclosed1()
function unclosed2()
]]
if true then
    print(s)
`
      // Without string detection:
      // Stack would be: [function at 0, function at 0, if at 0]
      // 'end' would match last function at 0 (wrong!)
      //
      // With string detection:
      // Stack should be: [if at 0]
      // 'end' should match 'if' at 0 (correct!)
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('fails when string contains end that would close real block', () => {
      // This is the critical test - an 'end' inside a string should NOT close a real block
      const code = `function outer()
    function inner()
        local s = [[
end
]]
        print(s)
`
      // Without string detection:
      // Stack after line 2: [function outer at 0, function inner at 4]
      // Line 4 'end' would close inner function (wrong!)
      // Stack: [function outer at 0]
      // Next 'end' would match outer at 0 (wrong!)
      //
      // With string detection:
      // The 'end' in the string is ignored
      // Stack should still be: [function outer at 0, function inner at 4]
      // Next 'end' should match 'inner' at 4
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(4)
    })

    it('ignores keywords inside multi-line string [=[...]=]', () => {
      const code = `local s = [=[
function fake()
    if true then
    end
end
]=]
if true then
    print(s)
`
      // The 'end' should match 'if' at 0
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })
  })

  describe('keywords inside comments - should be ignored', () => {
    it('ignores keywords after single-line comment --', () => {
      const code = `-- function fake() end
if true then
    print("hello")
`
      // The 'end' should match 'if' at 0
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('ignores keywords inside multi-line comment --[[...]]', () => {
      const code = `--[[
function fake()
    if true then
    end
end
]]
function real()
    print("hello")
`
      // The 'end' should match 'function real' at 0
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('ignores keywords inside multi-line comment --[=[...]=]', () => {
      const code = `--[=[
function fake()
end
]=]
if true then
    for i = 1, 10 do
        print(i)
`
      // The 'end' should match 'for' at 4 spaces
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(4)
    })

    it('handles inline comment after code', () => {
      const code = `function foo() -- this function does stuff
    if true then -- and this is a conditional
        print("hello")
`
      // The 'end' should match 'if' at 4 spaces
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(4)
    })
  })

  describe('mixed strings and comments', () => {
    it('handles string containing comment markers', () => {
      const code = `local s = "-- not a comment"
function foo()
    print(s)
`
      // The 'end' should match 'function' at 0
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(0)
    })

    it('handles comment containing string markers', () => {
      const code = `-- local s = "string"
function foo()
    if true then
        print("hello")
`
      // The 'end' should match 'if' at 4
      const result = findMatchingBlockIndent(code, 'end')
      expect(result).toBe(4)
    })
  })

  describe('until keyword variations', () => {
    it('returns 0 when until has no matching repeat', () => {
      const code = `function foo()
    print("hello")
`
      const result = findMatchingBlockIndent(code, 'until')
      expect(result).toBe(0)
    })

    it('matches repeat correctly with nested blocks', () => {
      const code = `function foo()
    repeat
        if true then
            print("hello")
        end
`
      const result = findMatchingBlockIndent(code, 'until')
      expect(result).toBe(4)
    })
  })

  describe('else and elseif edge cases', () => {
    it('returns 0 for else when no if exists', () => {
      const code = `function foo()
    print("hello")
`
      const result = findMatchingBlockIndent(code, 'else')
      expect(result).toBe(0)
    })

    it('returns 0 for elseif when no if exists', () => {
      const code = `for i = 1, 10 do
    print(i)
`
      const result = findMatchingBlockIndent(code, 'elseif')
      expect(result).toBe(0)
    })
  })
})

describe('stripStringsAndComments', () => {
  describe('double-quoted strings', () => {
    it('replaces double-quoted string content with spaces', () => {
      const code = 'local s = "hello world"'
      const result = stripStringsAndComments(code)
      // "hello world" = 13 chars including quotes, replaced with spaces
      expect(result.length).toBe(code.length)
      expect(result.startsWith('local s = ')).toBe(true)
      expect(result.includes('hello')).toBe(false)
    })

    it('handles escaped characters in double-quoted strings', () => {
      const code = 'local s = "hello\\"world"'
      const result = stripStringsAndComments(code)
      expect(result.length).toBe(code.length)
      expect(result.includes('hello')).toBe(false)
    })

    it('handles unterminated double-quoted string at newline', () => {
      const code = 'local s = "hello\nworld"'
      const result = stripStringsAndComments(code)
      // String ends at newline, world is kept, but " starts a new empty string
      expect(result).toContain('\n')
      expect(result).toContain('world')
    })

    it('handles escaped newline in double-quoted string', () => {
      const code = 'local s = "hello\\nworld"'
      const result = stripStringsAndComments(code)
      expect(result.length).toBe(code.length)
      expect(result.includes('hello')).toBe(false)
    })
  })

  describe('single-quoted strings', () => {
    it('replaces single-quoted string content with spaces', () => {
      const code = "local s = 'hello world'"
      const result = stripStringsAndComments(code)
      expect(result.length).toBe(code.length)
      expect(result.includes('hello')).toBe(false)
    })

    it('handles escaped characters in single-quoted strings', () => {
      const code = "local s = 'hello\\'world'"
      const result = stripStringsAndComments(code)
      expect(result.length).toBe(code.length)
      expect(result.includes('hello')).toBe(false)
    })

    it('handles unterminated single-quoted string at newline', () => {
      const code = "local s = 'hello\nworld'"
      const result = stripStringsAndComments(code)
      // String ends at newline, world is kept, but ' starts a new empty string
      expect(result).toContain('\n')
      expect(result).toContain('world')
    })
  })

  describe('multi-line strings [[...]]', () => {
    it('replaces multi-line string content with spaces', () => {
      const code = 'local s = [[hello]]'
      const result = stripStringsAndComments(code)
      expect(result.length).toBe(code.length)
      expect(result.includes('hello')).toBe(false)
    })

    it('preserves newlines in multi-line strings', () => {
      const code = 'local s = [[hello\nworld]]'
      const result = stripStringsAndComments(code)
      expect(result.length).toBe(code.length)
      expect(result).toContain('\n')
      expect(result.includes('hello')).toBe(false)
    })

    it('handles unclosed multi-line string', () => {
      const code = 'local s = [[hello'
      const result = stripStringsAndComments(code)
      // Unclosed multi-line string - [ is output and then rest is normal
      expect(result).toBe('local s = [[hello')
    })
  })

  describe('multi-line strings [=[...]=]', () => {
    it('replaces multi-line string with equal signs', () => {
      const code = 'local s = [=[hello]=]'
      const result = stripStringsAndComments(code)
      expect(result.length).toBe(code.length)
      expect(result.includes('hello')).toBe(false)
    })

    it('handles [==[ style strings', () => {
      const code = 'local s = [==[hello]==]'
      const result = stripStringsAndComments(code)
      expect(result.length).toBe(code.length)
      expect(result.includes('hello')).toBe(false)
    })
  })

  describe('single-line comments', () => {
    it('replaces comment content with spaces', () => {
      const code = 'local x = 1 -- comment'
      const result = stripStringsAndComments(code)
      expect(result.startsWith('local x = 1')).toBe(true)
      expect(result.includes('comment')).toBe(false)
    })

    it('preserves newline after comment', () => {
      const code = 'local x = 1 -- comment\nlocal y = 2'
      const result = stripStringsAndComments(code)
      expect(result).toContain('\nlocal y = 2')
      expect(result.includes('comment')).toBe(false)
    })

    it('handles comment-only line', () => {
      const code = '-- this is a comment'
      const result = stripStringsAndComments(code)
      expect(result.length).toBe(code.length)
      expect(result.includes('comment')).toBe(false)
      expect(result.trim()).toBe('')
    })
  })

  describe('multi-line comments --[[...]]', () => {
    it('replaces multi-line comment content with spaces', () => {
      const code = 'local x = 1 --[[comment]]'
      const result = stripStringsAndComments(code)
      expect(result.startsWith('local x = 1')).toBe(true)
      expect(result.includes('comment')).toBe(false)
    })

    it('preserves newlines in multi-line comments', () => {
      const code = '--[[hello\nworld]]local x = 1'
      const result = stripStringsAndComments(code)
      expect(result).toContain('\n')
      expect(result).toContain('local x = 1')
      expect(result.includes('hello')).toBe(false)
    })

    it('handles --[=[...]=] style comments', () => {
      const code = '--[=[comment]=]local x = 1'
      const result = stripStringsAndComments(code)
      expect(result).toContain('local x = 1')
      expect(result.includes('comment')).toBe(false)
    })

    it('handles --[==[ style comments', () => {
      const code = '--[==[comment]==]local x = 1'
      const result = stripStringsAndComments(code)
      expect(result).toContain('local x = 1')
      expect(result.includes('comment')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      const code = ''
      const result = stripStringsAndComments(code)
      expect(result).toBe('')
    })

    it('handles code with no strings or comments', () => {
      const code = 'local x = 1 + 2'
      const result = stripStringsAndComments(code)
      expect(result).toBe('local x = 1 + 2')
    })

    it('handles single [ character', () => {
      const code = 'local t = t[1]'
      const result = stripStringsAndComments(code)
      expect(result).toBe('local t = t[1]')
    })

    it('handles [= without second [', () => {
      const code = 'local x = a[=1]'
      const result = stripStringsAndComments(code)
      expect(result).toBe('local x = a[=1]')
    })

    it('handles --[ that becomes single-line comment', () => {
      const code = 'local x = 1 --[ not a block comment'
      const result = stripStringsAndComments(code)
      // --[ is start of comment (because --[x where x is not [ or =)
      // But our implementation checks for --[[ or --[ specifically
      expect(result.startsWith('local x = 1')).toBe(true)
    })
  })
})
