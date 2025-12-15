/**
 * Parsed Lua error information
 */
export interface LuaError {
  /** Line number where the error occurred (1-based) */
  line: number
  /** Column number where the error occurred (1-based), defaults to 1 if not available */
  column: number
  /** The error message without location info */
  message: string
  /** The full original error message */
  fullMessage: string
}

/**
 * Regular expression to match Lua error message format:
 * - [string "...source..."]:line: message
 * - filename.lua:line: message
 * - [error] [string "..."]:line: message (with optional prefix)
 */
const LUA_ERROR_PATTERN = /(?:\[string ".*?"\]|[^:\s]+\.lua):(\d+):\s*(.*)$/

/**
 * Parse a Lua error message to extract line number and message
 *
 * Lua errors typically have the format:
 * - [string "code"]:1: unexpected symbol near 'in'
 * - main.lua:5: attempt to call a nil value
 *
 * @param errorMessage - The raw error message from Lua
 * @returns Parsed error information with line number and message
 */
export function parseLuaError(errorMessage: string): LuaError {
  // Handle empty or null messages
  if (!errorMessage) {
    return {
      line: 1,
      column: 1,
      message: '',
      fullMessage: '',
    }
  }

  // Take only the first line for multiline error messages (stack traces)
  const firstLine = errorMessage.split('\n')[0]

  // Try to match the Lua error pattern
  const match = firstLine.match(LUA_ERROR_PATTERN)

  if (match) {
    const line = parseInt(match[1], 10)
    const message = match[2]

    return {
      line,
      column: 1, // Lua doesn't typically provide column info
      message,
      fullMessage: errorMessage,
    }
  }

  // If pattern doesn't match, return with defaults
  return {
    line: 1,
    column: 1,
    message: errorMessage,
    fullMessage: errorMessage,
  }
}
