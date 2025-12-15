import { describe, it, expect } from 'vitest'
import { parseLuaError } from './luaErrorParser'
import type { LuaError } from './luaErrorParser'

describe('luaErrorParser', () => {
  describe('parseLuaError', () => {
    it('parses syntax error with line number', () => {
      const errorMessage = '[string "code"]:1: unexpected symbol near \'in\''
      const result = parseLuaError(errorMessage)

      expect(result).toEqual<LuaError>({
        line: 1,
        column: 1,
        message: "unexpected symbol near 'in'",
        fullMessage: errorMessage,
      })
    })

    it('parses error at different line numbers', () => {
      const errorMessage = '[string "test"]:15: \'end\' expected near <eof>'
      const result = parseLuaError(errorMessage)

      expect(result).toEqual<LuaError>({
        line: 15,
        column: 1,
        message: "'end' expected near <eof>",
        fullMessage: errorMessage,
      })
    })

    it('parses runtime error', () => {
      const errorMessage = '[string "code"]:3: attempt to call a nil value'
      const result = parseLuaError(errorMessage)

      expect(result).toEqual<LuaError>({
        line: 3,
        column: 1,
        message: 'attempt to call a nil value',
        fullMessage: errorMessage,
      })
    })

    it('parses module loading error', () => {
      const errorMessage = "[string \"code\"]:1: module 'utils' not found"
      const result = parseLuaError(errorMessage)

      expect(result).toEqual<LuaError>({
        line: 1,
        column: 1,
        message: "module 'utils' not found",
        fullMessage: errorMessage,
      })
    })

    it('parses error with file reference instead of string', () => {
      const errorMessage = 'main.lua:5: attempt to perform arithmetic on a nil value'
      const result = parseLuaError(errorMessage)

      expect(result).toEqual<LuaError>({
        line: 5,
        column: 1,
        message: 'attempt to perform arithmetic on a nil value',
        fullMessage: errorMessage,
      })
    })

    it('returns line 1 for unparseable error messages', () => {
      const errorMessage = 'Some unknown error format'
      const result = parseLuaError(errorMessage)

      expect(result).toEqual<LuaError>({
        line: 1,
        column: 1,
        message: 'Some unknown error format',
        fullMessage: errorMessage,
      })
    })

    it('handles empty error message', () => {
      const result = parseLuaError('')

      expect(result).toEqual<LuaError>({
        line: 1,
        column: 1,
        message: '',
        fullMessage: '',
      })
    })

    it('parses error with complex string content', () => {
      const errorMessage = '[string "function foo()..."]:10: \')\' expected near \'end\''
      const result = parseLuaError(errorMessage)

      expect(result).toEqual<LuaError>({
        line: 10,
        column: 1,
        message: "')' expected near 'end'",
        fullMessage: errorMessage,
      })
    })

    it('parses error referencing another line in message', () => {
      const errorMessage = "[string \"code\"]:7: 'end' expected (to close 'function' at line 3) near <eof>"
      const result = parseLuaError(errorMessage)

      expect(result).toEqual<LuaError>({
        line: 7,
        column: 1,
        message: "'end' expected (to close 'function' at line 3) near <eof>",
        fullMessage: errorMessage,
      })
    })

    it('handles multiline error messages by taking first line', () => {
      const errorMessage = "[string \"code\"]:2: error message\nstack traceback:\n  [C]: in function"
      const result = parseLuaError(errorMessage)

      expect(result.line).toBe(2)
      expect(result.message).toBe('error message')
    })

    it('parses error with [error] prefix', () => {
      const errorMessage = '[error] [string "..."]:6: unexpected symbol near \'0\''
      const result = parseLuaError(errorMessage)

      expect(result).toEqual<LuaError>({
        line: 6,
        column: 1,
        message: "unexpected symbol near '0'",
        fullMessage: errorMessage,
      })
    })

    it('parses file error with [error] prefix', () => {
      const errorMessage = '[error] test.lua:5: some error'
      const result = parseLuaError(errorMessage)

      expect(result).toEqual<LuaError>({
        line: 5,
        column: 1,
        message: 'some error',
        fullMessage: errorMessage,
      })
    })
  })
})
