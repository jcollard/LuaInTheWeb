/**
 * LuaParser utility module.
 * Uses luaparse (pure JavaScript) for syntax checking to avoid WASM-related errors.
 * This module can be shared by syntax checking, autocomplete, and rename symbol features.
 */

import * as luaparse from 'luaparse'

/**
 * Error information from syntax checking.
 */
export interface SyntaxError {
  /** Human-readable error message */
  message: string
  /** Line number where the error occurred (1-based) */
  line?: number
  /** Column number where the error occurred (1-based) */
  column?: number
}

/**
 * Result of syntax checking.
 */
export interface SyntaxCheckResult {
  /** Whether the code is syntactically valid */
  valid: boolean
  /** Error details if the code is invalid */
  error?: SyntaxError
  /** Whether the code is incomplete (e.g., unclosed block) vs having a real syntax error */
  incomplete?: boolean
}

/**
 * Parse options for luaparse.
 */
// Stryker disable all: Configuration options - changing these doesn't affect error detection behavior
const PARSE_OPTIONS = {
  luaVersion: '5.3' as const,
  comments: false,
  scope: false,
  locations: true,
  ranges: true,
}
// Stryker restore all

/**
 * Extract clean error message from luaparse error.
 * luaparse errors have format: "[line:column] message"
 */
function extractErrorInfo(error: Error): SyntaxError {
  const message = error.message

  // Try to extract line and column from "[line:column] message" format
  const match = message.match(/^\[(\d+):(\d+)\]\s*(.+)$/)
  if (match) {
    return {
      message: match[3],
      line: parseInt(match[1], 10),
      column: parseInt(match[2], 10),
    }
  }

  // Fallback: return message as-is
  return { message }
}

/**
 * Check if an error indicates incomplete code (vs a real syntax error).
 * Incomplete code errors typically mention "<eof>" (end of file).
 */
function isIncompleteCode(errorMessage: string): boolean {
  return errorMessage.toLowerCase().includes('<eof>')
}

/**
 * LuaParser provides syntax checking using luaparse.
 * This avoids WASM-related errors that can occur with wasmoon.
 */
export const LuaParser = {
  /**
   * Check if Lua code is syntactically valid.
   *
   * @param code - The Lua code to check
   * @returns Result indicating validity and any errors
   */
  checkSyntax(code: string): SyntaxCheckResult {
    // Empty or whitespace-only code is valid
    if (!code.trim()) {
      return { valid: true }
    }

    try {
      // Try to parse as a statement/chunk first
      luaparse.parse(code, PARSE_OPTIONS)
      return { valid: true }
    } catch (statementError) {
      // If statement parsing fails, try as an expression (with return prefix)
      // This handles cases like "1 + 2" which are valid expressions
      try {
        luaparse.parse(`return (${code})`, PARSE_OPTIONS)
        return { valid: true }
      } catch {
        // Expression parsing also failed - report the original error
        const error = statementError as Error
        const errorInfo = extractErrorInfo(error)
        const incomplete = isIncompleteCode(error.message)

        return {
          valid: false,
          error: errorInfo,
          incomplete,
        }
      }
    }
  },
}
