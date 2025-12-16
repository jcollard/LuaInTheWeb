import { describe, it, expect } from 'vitest'
import { parseRequireStatements, type RequireMapping } from './luaRequireParser'

describe('luaRequireParser', () => {
  describe('parseRequireStatements', () => {
    it('parses simple require statement', () => {
      const code = `local shell = require('shell')`

      const result = parseRequireStatements(code)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual<RequireMapping>({
        localName: 'shell',
        moduleName: 'shell',
        lineNumber: 1,
      })
    })

    it('parses require with double quotes', () => {
      const code = `local shell = require("shell")`

      const result = parseRequireStatements(code)

      expect(result).toHaveLength(1)
      expect(result[0].moduleName).toBe('shell')
    })

    it('parses multiple require statements', () => {
      const code = `local shell = require('shell')
local json = require('json')
local utils = require('utils')`

      const result = parseRequireStatements(code)

      expect(result).toHaveLength(3)
      expect(result[0].localName).toBe('shell')
      expect(result[1].localName).toBe('json')
      expect(result[2].localName).toBe('utils')
    })

    it('parses require with different local name than module', () => {
      const code = `local sh = require('shell')`

      const result = parseRequireStatements(code)

      expect(result).toHaveLength(1)
      expect(result[0].localName).toBe('sh')
      expect(result[0].moduleName).toBe('shell')
    })

    it('handles require with path', () => {
      const code = `local mylib = require('libs/mylib')`

      const result = parseRequireStatements(code)

      expect(result).toHaveLength(1)
      expect(result[0].moduleName).toBe('libs/mylib')
    })

    it('ignores non-require statements', () => {
      const code = `local x = 5
print("hello")
local shell = require('shell')
function test() end`

      const result = parseRequireStatements(code)

      expect(result).toHaveLength(1)
      expect(result[0].localName).toBe('shell')
    })

    it('returns empty array for code without requires', () => {
      const code = `print("hello")
local x = 5`

      const result = parseRequireStatements(code)

      expect(result).toEqual([])
    })

    it('returns empty array for empty code', () => {
      const result = parseRequireStatements('')

      expect(result).toEqual([])
    })

    it('tracks correct line numbers', () => {
      const code = `-- some comment
local x = 5
local shell = require('shell')
local json = require('json')`

      const result = parseRequireStatements(code)

      expect(result).toHaveLength(2)
      expect(result[0].lineNumber).toBe(3)
      expect(result[1].lineNumber).toBe(4)
    })

    it('handles require with spaces', () => {
      const code = `local shell  =  require( 'shell' )`

      const result = parseRequireStatements(code)

      expect(result).toHaveLength(1)
      expect(result[0].localName).toBe('shell')
      expect(result[0].moduleName).toBe('shell')
    })
  })
})
