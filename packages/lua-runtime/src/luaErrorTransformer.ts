/**
 * Transforms cryptic Lua error messages into user-friendly messages with hints.
 * Preserves line number prefixes while making error messages more helpful.
 */

/**
 * Error pattern definition for transformation.
 */
interface ErrorPattern {
  /** Pattern to match in the error message (after the line number prefix) */
  pattern: RegExp
  /** Replacement message with hint */
  replacement: string
}

/**
 * Known cryptic error patterns and their user-friendly replacements.
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  {
    // "o is not a function" - occurs when using for...in on a non-iterator
    // The "o" is the second return value expected from an iterator function
    pattern: /^o is not a function$/,
    replacement:
      'attempt to iterate over a non-iterator value. Hint: use pairs() or ipairs() for tables',
  },
]

/**
 * Regex to match Lua error prefix with line number.
 * Matches:
 * - [string "..."]:N: message
 * - filename.lua:N: message
 */
const LINE_PREFIX_PATTERN = /^(\[string "[^"]*"\]:\d+:|[^:\s]+\.lua:\d+:)\s*/

/**
 * Transform a Lua error message to be more user-friendly.
 * Preserves line number prefixes while replacing cryptic messages with helpful ones.
 *
 * @param error - The raw error message from Lua
 * @returns Transformed error message with hints, or original if no transformation applies
 */
export function transformLuaError(error: string): string {
  if (!error) return error

  // Extract line prefix if present
  const prefixMatch = error.match(LINE_PREFIX_PATTERN)
  const prefix = prefixMatch ? prefixMatch[1] + ' ' : ''
  const message = prefixMatch ? error.slice(prefixMatch[0].length) : error

  // Try to match against known patterns
  for (const { pattern, replacement } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return prefix + replacement
    }
  }

  // No transformation - return original
  return error
}
