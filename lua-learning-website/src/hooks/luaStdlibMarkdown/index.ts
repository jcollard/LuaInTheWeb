/**
 * Markdown documentation for Lua standard library and shell library.
 * Used by the docs workspace to provide browsable reference documentation.
 */

import { generateBasicsDocumentation } from './basics'
import { generateStringDocumentation } from './string'
import { generateTableDocumentation } from './table'
import { generateMathDocumentation } from './math'
import { generateIODocumentation } from './io'
import { generateShellDocumentation } from './shell'

export {
  generateBasicsDocumentation,
  generateStringDocumentation,
  generateTableDocumentation,
  generateMathDocumentation,
  generateIODocumentation,
  generateShellDocumentation,
}

/**
 * Get all documentation files for the docs workspace.
 * Returns a record of file paths to content.
 */
export function getAllDocs(): Record<string, string> {
  return {
    'shell.md': generateShellDocumentation(),
    'lua/basics.md': generateBasicsDocumentation(),
    'lua/string.md': generateStringDocumentation(),
    'lua/table.md': generateTableDocumentation(),
    'lua/math.md': generateMathDocumentation(),
    'lua/io.md': generateIODocumentation(),
  }
}
