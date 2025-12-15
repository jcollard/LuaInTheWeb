/**
 * Lua block parser for determining correct indentation levels.
 * Used by the auto-dedent feature in the editor.
 */

/**
 * Keywords that open blocks requiring 'end' to close
 */
const BLOCK_OPENERS = ['function', 'if', 'for', 'while', 'do']

/**
 * Pattern to match block-opening constructs
 * Matches: function, if...then, for...do, while...do, repeat, standalone do
 */
const BLOCK_OPEN_PATTERN =
  /^(\s*)(function\b|if\b.*\bthen|for\b.*\bdo|while\b.*\bdo|repeat\b|do\b)/

/**
 * Pattern to match block-closing keywords
 */
const BLOCK_CLOSE_PATTERN = /^(\s*)(end|until)\b/

/**
 * Pattern to match else/elseif (mid-block keywords for if statements)
 */
const ELSE_PATTERN = /^(\s*)(else|elseif)\b/

/**
 * Represents a block opener with its indentation
 */
interface BlockInfo {
  keyword: string
  indent: string
  indentLength: number
}

/**
 * Get the indentation length, treating tabs as 1 unit each
 */
function getIndentLength(indent: string): number {
  // For simplicity, count each tab as 1 and each space as 1
  // This gives us a comparable unit for matching
  return indent.length
}

/**
 * Strip strings and comments from Lua code, replacing their content with spaces.
 * This preserves line structure and indentation while removing content that
 * should not be parsed for keywords.
 *
 * Handles:
 * - Single-line comments: -- to end of line
 * - Multi-line comments: --[[...]] and --[=[...]=] variants
 * - Double-quoted strings: "..."
 * - Single-quoted strings: '...'
 * - Multi-line strings: [[...]] and [=[...]=] variants
 */
export function stripStringsAndComments(code: string): string {
  let result = ''
  let i = 0

  while (i < code.length) {
    // Check for multi-line comment --[[...]] or --[=[...]=]
    if (code.slice(i, i + 4) === '--[[' || code.slice(i, i + 3) === '--[') {
      const commentStart = i
      i += 2 // Skip --

      // Check for [=*[ pattern
      let equalCount = 0
      if (code[i] === '[') {
        i++ // Skip first [
        while (code[i] === '=') {
          equalCount++
          i++
        }
        if (code[i] === '[') {
          i++ // Skip second [
          // Find closing ]=*]
          const closePattern = ']' + '='.repeat(equalCount) + ']'
          const closeIndex = code.indexOf(closePattern, i)
          if (closeIndex !== -1) {
            // Replace comment content with spaces, preserving newlines
            for (let j = commentStart; j < closeIndex + closePattern.length; j++) {
              result += code[j] === '\n' ? '\n' : ' '
            }
            i = closeIndex + closePattern.length
            continue
          }
        }
      }
      // Not a valid multi-line comment, treat as single-line
      i = commentStart + 2
      // Fall through to single-line comment handling
    }

    // Check for single-line comment --
    if (code.slice(i, i + 2) === '--') {
      // Replace until end of line with spaces
      while (i < code.length && code[i] !== '\n') {
        result += ' '
        i++
      }
      continue
    }

    // Check for multi-line string [[...]] or [=[...]=]
    if (code[i] === '[') {
      const stringStart = i
      i++ // Skip first [
      let equalCount = 0
      while (code[i] === '=') {
        equalCount++
        i++
      }
      if (code[i] === '[') {
        i++ // Skip second [
        // Find closing ]=*]
        const closePattern = ']' + '='.repeat(equalCount) + ']'
        const closeIndex = code.indexOf(closePattern, i)
        if (closeIndex !== -1) {
          // Replace string content with spaces, preserving newlines
          for (let j = stringStart; j < closeIndex + closePattern.length; j++) {
            result += code[j] === '\n' ? '\n' : ' '
          }
          i = closeIndex + closePattern.length
          continue
        }
      }
      // Not a valid multi-line string, restore position and output [
      i = stringStart
      result += code[i]
      i++
      continue
    }

    // Check for double-quoted string
    if (code[i] === '"') {
      result += ' ' // Replace quote
      i++
      while (i < code.length && code[i] !== '"' && code[i] !== '\n') {
        if (code[i] === '\\' && i + 1 < code.length) {
          result += '  ' // Replace escaped char
          i += 2
        } else {
          result += ' '
          i++
        }
      }
      if (code[i] === '"') {
        result += ' ' // Replace closing quote
        i++
      }
      continue
    }

    // Check for single-quoted string
    if (code[i] === "'") {
      result += ' ' // Replace quote
      i++
      while (i < code.length && code[i] !== "'" && code[i] !== '\n') {
        if (code[i] === '\\' && i + 1 < code.length) {
          result += '  ' // Replace escaped char
          i += 2
        } else {
          result += ' '
          i++
        }
      }
      if (code[i] === "'") {
        result += ' ' // Replace closing quote
        i++
      }
      continue
    }

    // Regular character
    result += code[i]
    i++
  }

  return result
}

/**
 * Find the indentation level of the matching block opener for a dedent keyword.
 *
 * @param code - The code above the current line (excluding the line being typed)
 * @param keyword - The dedent keyword being typed ('end', 'else', 'elseif', 'until')
 * @returns The indentation length of the matching opener, or 0 if not found
 */
export function findMatchingBlockIndent(
  code: string,
  keyword: 'end' | 'else' | 'elseif' | 'until'
): number {
  // Strip strings and comments to avoid matching keywords inside them
  const strippedCode = stripStringsAndComments(code)
  const lines = strippedCode.split('\n')
  const blockStack: BlockInfo[] = []

  for (const line of lines) {
    // Check for block openers
    const openMatch = line.match(BLOCK_OPEN_PATTERN)
    if (openMatch) {
      const indent = openMatch[1]
      const openerKeyword = openMatch[2].split(/\s/)[0] // Get first word (function, if, for, while, repeat, do)
      blockStack.push({
        keyword: openerKeyword,
        indent,
        indentLength: getIndentLength(indent),
      })
      continue
    }

    // Check for else/elseif - these don't create new blocks, just mark the if as having else
    const elseMatch = line.match(ELSE_PATTERN)
    if (elseMatch) {
      // else/elseif closes the current if block's body but the if block itself remains open
      // We don't modify the stack - the if is still waiting for 'end'
      continue
    }

    // Check for block closers (end, until)
    const closeMatch = line.match(BLOCK_CLOSE_PATTERN)
    if (closeMatch) {
      const closerKeyword = closeMatch[2]
      if (closerKeyword === 'until') {
        // Until closes the most recent repeat
        for (let i = blockStack.length - 1; i >= 0; i--) {
          if (blockStack[i].keyword === 'repeat') {
            blockStack.splice(i, 1)
            break
          }
        }
      } else {
        // 'end' closes the most recent block (function, if, for, while, do)
        for (let i = blockStack.length - 1; i >= 0; i--) {
          if (BLOCK_OPENERS.includes(blockStack[i].keyword)) {
            blockStack.splice(i, 1)
            break
          }
        }
      }
    }
  }

  // Now find the appropriate opener for the keyword being typed
  if (keyword === 'until') {
    // Find the most recent 'repeat'
    for (let i = blockStack.length - 1; i >= 0; i--) {
      if (blockStack[i].keyword === 'repeat') {
        return blockStack[i].indentLength
      }
    }
  } else if (keyword === 'else' || keyword === 'elseif') {
    // Find the most recent 'if'
    for (let i = blockStack.length - 1; i >= 0; i--) {
      if (blockStack[i].keyword === 'if') {
        return blockStack[i].indentLength
      }
    }
  } else {
    // 'end' - find the most recent block opener
    for (let i = blockStack.length - 1; i >= 0; i--) {
      if (BLOCK_OPENERS.includes(blockStack[i].keyword)) {
        return blockStack[i].indentLength
      }
    }
  }

  return 0
}

/**
 * Calculate the correct indentation level for new code based on block structure.
 *
 * This differs from findMatchingBlockIndent:
 * - findMatchingBlockIndent finds where a CLOSING keyword should go
 * - calculateCorrectIndent finds where NEW code should go (one level deeper than
 *   the innermost open block)
 *
 * @param code - The code above the current line
 * @returns The number of indentation levels for new code (multiply by tab size for spaces)
 */
export function calculateCorrectIndent(code: string): number {
  // Strip strings and comments to avoid matching keywords inside them
  const strippedCode = stripStringsAndComments(code)
  const lines = strippedCode.split('\n')

  // Track the number of open blocks
  let openBlocks = 0

  for (const line of lines) {
    // Check for block openers (function, if...then, for...do, while...do, repeat, do)
    // Note: else and elseif are NOT openers - they continue the existing if block
    const openMatch = line.match(BLOCK_OPEN_PATTERN)
    if (openMatch) {
      openBlocks++
    }

    // Check for block closers (end, until)
    const closeMatch = line.match(BLOCK_CLOSE_PATTERN)
    if (closeMatch) {
      openBlocks = Math.max(0, openBlocks - 1)
    }
  }

  return openBlocks
}
