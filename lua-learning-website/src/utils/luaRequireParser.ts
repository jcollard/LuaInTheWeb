/**
 * Parser for Lua require statements.
 *
 * Extracts require statements from Lua code to map local variable names
 * to their corresponding module names. This is used to resolve qualified
 * names like `shell.foreground` to library documentation.
 */

/**
 * Represents a mapping from a local variable to a required module.
 */
export interface RequireMapping {
  /** The local variable name (e.g., 'shell' in `local shell = require('shell')`) */
  localName: string
  /** The module name being required (e.g., 'shell') */
  moduleName: string
  /** The line number where the require statement appears (1-based) */
  lineNumber: number
}

/**
 * Pattern to match require statements in Lua code.
 * Captures: local <localName> = require(<quotes><moduleName><quotes>)
 */
const REQUIRE_PATTERN = /local\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g

/**
 * Parse require statements from Lua code.
 *
 * Extracts all `local x = require('module')` statements and returns
 * mappings from the local variable name to the module name.
 *
 * @param code - The Lua source code to parse
 * @returns Array of require mappings found in the code
 */
export function parseRequireStatements(code: string): RequireMapping[] {
  if (!code) {
    return []
  }

  const mappings: RequireMapping[] = []
  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Reset regex lastIndex for each line
    REQUIRE_PATTERN.lastIndex = 0

    const match = REQUIRE_PATTERN.exec(line)
    if (match) {
      mappings.push({
        localName: match[1],
        moduleName: match[2],
        lineNumber: i + 1,
      })
    }
  }

  return mappings
}
