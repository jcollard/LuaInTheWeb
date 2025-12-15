import { describe, expect, it } from 'vitest'
import { calculateCorrectIndent } from '../luaBlockParser'

describe('calculateCorrectIndent', () => {
  describe('basic blocks - returns indent for new code inside block', () => {
    it('returns 1 level inside a function at level 0', () => {
      const code = `function foo()`
      // New code inside this function should be at level 1
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 1 level inside an if block at level 0', () => {
      const code = `if true then`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 1 level inside a for loop at level 0', () => {
      const code = `for i = 1, 10 do`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 1 level inside a while loop at level 0', () => {
      const code = `while true do`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 1 level inside a repeat block at level 0', () => {
      const code = `repeat`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 1 level inside a standalone do block at level 0', () => {
      const code = `do`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 1 level inside an else clause', () => {
      const code = `if true then
    print("a")
else`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 1 level inside an elseif clause', () => {
      const code = `if a then
    print("a")
elseif b then`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })
  })

  describe('nested blocks - returns correct nested indent', () => {
    it('returns 2 levels inside nested function', () => {
      const code = `function outer()
    function inner()`
      // New code inside inner function should be at level 2
      const result = calculateCorrectIndent(code)
      expect(result).toBe(2)
    })

    it('returns 2 levels inside function with if', () => {
      const code = `function foo()
    if true then`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(2)
    })

    it('returns 3 levels with deeply nested blocks', () => {
      const code = `function foo()
    if true then
        for i = 1, 10 do`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(3)
    })

    it('returns 4 levels with very deep nesting', () => {
      const code = `function foo()
    if true then
        for i = 1, 10 do
            while x do`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(4)
    })
  })

  describe('after closed blocks - returns correct outer indent', () => {
    it('returns 0 after all blocks are closed', () => {
      const code = `function foo()
    print("hello")
end`
      // After function is closed, new code is at level 0
      const result = calculateCorrectIndent(code)
      expect(result).toBe(0)
    })

    it('returns 1 after inner block is closed but outer is open', () => {
      const code = `function outer()
    function inner()
        print("hello")
    end`
      // Inner is closed, still inside outer at level 1
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 1 after if-end inside function', () => {
      const code = `function foo()
    if true then
        print("hello")
    end`
      // if is closed, still inside function at level 1
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 2 after nested for-end', () => {
      const code = `function foo()
    if true then
        for i = 1, 10 do
            print(i)
        end`
      // for is closed, still inside function>if at level 2
      const result = calculateCorrectIndent(code)
      expect(result).toBe(2)
    })
  })

  describe('repeat-until handling', () => {
    it('returns 1 inside repeat block', () => {
      const code = `repeat`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 0 after repeat-until is closed', () => {
      const code = `repeat
    x = x + 1
until x > 10`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(0)
    })

    it('returns 1 after nested repeat-until inside function', () => {
      const code = `function foo()
    repeat
        x = x + 1
    until x > 10`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })
  })

  describe('else/elseif handling', () => {
    it('returns 1 inside else at top level', () => {
      const code = `if true then
    print("a")
else`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 2 inside else nested in function', () => {
      const code = `function foo()
    if true then
        print("a")
    else`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(2)
    })

    it('returns 1 inside elseif at top level', () => {
      const code = `if a then
    print("a")
elseif b then`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('handles multiple elseif chains', () => {
      const code = `if a then
    print("a")
elseif b then
    print("b")
elseif c then`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('returns 0 for empty code', () => {
      const code = ''
      const result = calculateCorrectIndent(code)
      expect(result).toBe(0)
    })

    it('returns 0 for code with no blocks', () => {
      const code = `local x = 1
print(x)`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(0)
    })

    it('returns 0 when more closes than opens', () => {
      const code = `print("hello")
end`
      // Orphan end, still returns 0
      const result = calculateCorrectIndent(code)
      expect(result).toBe(0)
    })
  })

  describe('ignores keywords in strings and comments', () => {
    it('returns 0 when function is inside string', () => {
      const code = `local s = "function foo()"`
      // No real function, should return 0
      const result = calculateCorrectIndent(code)
      expect(result).toBe(0)
    })

    it('returns 1 for real function after fake in string', () => {
      const code = `local s = "function fake()"
function real()`
      // Only real() is a block opener
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('returns 0 when function is inside comment', () => {
      const code = `-- function foo()`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(0)
    })

    it('returns 1 for real function after fake in multi-line comment', () => {
      const code = `--[[
function fake()
]]
function real()`
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })

    it('ignores end inside string', () => {
      const code = `function foo()
    local s = "end"`
      // The 'end' in string doesn't close the function
      const result = calculateCorrectIndent(code)
      expect(result).toBe(1)
    })
  })
})
