/**
 * LuaLinter module for syntax checking using luaparse.
 * Uses pure JavaScript parsing to avoid WASM-related errors.
 */

import * as luaparse from 'luaparse'

/**
 * Error information from syntax checking.
 */
export interface LintError {
  /** Human-readable error message */
  message: string
  /** Line number where the error occurred (1-based) */
  line?: number
  /** Column number where the error occurred (1-based) */
  column?: number
}

/**
 * Result of linting Lua code.
 */
export interface LintResult {
  /** Whether the code is syntactically valid */
  valid: boolean
  /** Error details if the code is invalid */
  error?: LintError
}

/**
 * Parse options for luaparse.
 */
const PARSE_OPTIONS = {
  // Use Lua 5.3 (closest to 5.4 that luaparse supports)
  luaVersion: '5.3' as const,
  // We don't need comments for syntax checking
  comments: false,
  // We don't need scope tracking for syntax checking
  scope: false,
  // Enable locations for error reporting
  locations: true,
  // Enable ranges for error reporting
  ranges: true,
}

/**
 * Extract clean error message from luaparse error.
 * luaparse errors have format: "[line:column] message"
 */
function extractErrorInfo(error: Error): LintError {
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
 * LuaLinter provides syntax checking using luaparse.
 * This avoids WASM-related errors that can occur with wasmoon.
 */
export const LuaLinter = {
  /**
   * Check if Lua code is syntactically valid.
   *
   * @param code - The Lua code to check
   * @returns Result indicating validity and any errors
   */
  lint(code: string): LintResult {
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

        return {
          valid: false,
          error: errorInfo,
        }
      }
    }
  },
}
