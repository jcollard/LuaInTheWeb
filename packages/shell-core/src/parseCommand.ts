/**
 * Command parsing utilities for shell-core.
 */

import type { ParsedCommand } from './types'

/**
 * Parse a command string into its components.
 * Handles:
 * - Simple commands with whitespace-separated arguments (spaces and tabs)
 * - Quoted arguments (single and double quotes)
 * - Escaped characters (backslash) - note: escapes are literal inside single quotes (bash-compatible)
 * - Unclosed quotes (returns partial token)
 * - Trailing backslash (preserved in output)
 */
export function parseCommand(input: string): ParsedCommand {
  const raw = input
  const trimmed = input.trim()

  if (!trimmed) {
    return { command: '', args: [], raw }
  }

  const tokens: string[] = []
  let current = ''
  let inDoubleQuote = false
  let inSingleQuote = false
  let escaped = false
  let hasQuotedContent = false // Track if current token included quotes

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]

    // Handle escape sequences
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    // Start escape sequence
    if (char === '\\' && !inSingleQuote) {
      escaped = true
      continue
    }

    // Handle double quotes
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      hasQuotedContent = true
      continue
    }

    // Handle single quotes
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      hasQuotedContent = true
      continue
    }

    // Handle whitespace (token separator when not in quotes)
    if ((char === ' ' || char === '\t') && !inDoubleQuote && !inSingleQuote) {
      if (current !== '' || hasQuotedContent) {
        tokens.push(current)
        current = ''
        hasQuotedContent = false
      }
      continue
    }

    // Regular character
    current += char
  }

  // Handle trailing backslash (preserve it)
  if (escaped) {
    current += '\\'
  }

  // Don't forget the last token
  if (current !== '' || hasQuotedContent) {
    tokens.push(current)
  }

  const command = tokens[0] || ''
  const args = tokens.slice(1)

  return { command, args, raw }
}
