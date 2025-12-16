import { describe, it, expect } from 'vitest'
import { parseLuaDocComments } from './luaDocParser'

describe('luaDocParser', () => {
  describe('parseLuaDocComments', () => {
    it('parses simple function with doc comment', () => {
      const code = `--- Adds two numbers
function add(a, b)
  return a + b
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('add')
      expect(result[0].description).toBe('Adds two numbers')
    })

    it('parses function with multi-line doc comment', () => {
      const code = `--- Calculates the sum of two numbers
-- This is a detailed description
-- that spans multiple lines
function add(a, b)
  return a + b
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('add')
      expect(result[0].description).toContain('Calculates the sum')
      expect(result[0].description).toContain('detailed description')
    })

    it('parses function with @param annotations', () => {
      const code = `--- Adds two numbers
-- @param a The first number
-- @param b The second number
function add(a, b)
  return a + b
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(1)
      expect(result[0].params).toHaveLength(2)
      expect(result[0].params?.[0]).toEqual({ name: 'a', description: 'The first number' })
      expect(result[0].params?.[1]).toEqual({ name: 'b', description: 'The second number' })
    })

    it('parses function with @return annotation', () => {
      const code = `--- Adds two numbers
-- @return The sum
function add(a, b)
  return a + b
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(1)
      expect(result[0].returns).toBe('The sum')
    })

    it('parses local function with doc comment', () => {
      const code = `--- Subtracts b from a
local function subtract(a, b)
  return a - b
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('subtract')
      expect(result[0].description).toBe('Subtracts b from a')
    })

    it('ignores functions without doc comments', () => {
      const code = `function noDoc(x)
  return x
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(0)
    })

    it('ignores regular comments before functions', () => {
      const code = `-- This is a regular comment
function notDocumented(x)
  return x
end`

      const result = parseLuaDocComments(code)

      // Regular comments starting with -- (not ---) are not doc comments
      expect(result).toHaveLength(0)
    })

    it('parses multiple functions', () => {
      const code = `--- First function
function first()
end

--- Second function
function second()
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('first')
      expect(result[1].name).toBe('second')
    })

    it('extracts function signature', () => {
      const code = `--- Does something
function doSomething(x, y, z)
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(1)
      expect(result[0].signature).toBe('doSomething(x, y, z)')
    })

    it('handles function with no parameters', () => {
      const code = `--- Gets the current time
function getTime()
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('getTime')
      expect(result[0].signature).toBe('getTime()')
    })

    it('returns empty array for empty code', () => {
      const result = parseLuaDocComments('')

      expect(result).toEqual([])
    })

    it('returns empty array for code without functions', () => {
      const code = `local x = 5
print(x)`

      const result = parseLuaDocComments(code)

      expect(result).toEqual([])
    })

    it('parses method-style function definitions', () => {
      const code = `--- Sets the player name
function Player:setName(name)
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Player:setName')
      expect(result[0].signature).toBe('Player:setName(name)')
    })

    it('handles doc comments with LuaDoc-style types', () => {
      const code = `---@param x number The x coordinate
---@param y number The y coordinate
---@return boolean Whether the point is valid
function isValid(x, y)
end`

      const result = parseLuaDocComments(code)

      expect(result).toHaveLength(1)
      expect(result[0].params).toHaveLength(2)
      expect(result[0].returns).toBeTruthy()
    })
  })
})
