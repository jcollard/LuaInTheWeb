/**
 * LuaDoc Parser
 * Parses doc comments (--- style) from Lua code to extract function documentation
 */

export interface UserFunctionParam {
  name: string
  description: string
}

export interface UserFunctionDoc {
  name: string
  signature: string
  description: string
  params?: UserFunctionParam[]
  returns?: string
}

/**
 * Parses a doc comment block and extracts structured documentation
 */
function parseDocComment(lines: string[]): {
  description: string
  params: UserFunctionParam[]
  returns?: string
} {
  const descriptionLines: string[] = []
  const params: UserFunctionParam[] = []
  let returns: string | undefined

  for (const line of lines) {
    // Remove leading --- or -- and trim
    const content = line.replace(/^---?/, '').trim()

    // Check for @param annotation
    // Supports: @param name description OR @param name type description
    const paramMatch = content.match(/^@param\s+(\w+)\s+(.+)/)
    if (paramMatch) {
      let description = paramMatch[2]
      // If the description starts with a known type followed by a space, skip the type
      const typeMatch = description.match(/^(number|string|boolean|table|function|nil|any|integer)\s+(.+)/)
      if (typeMatch) {
        description = typeMatch[2]
      }
      params.push({ name: paramMatch[1], description })
      continue
    }

    // Check for @return annotation
    // Supports: @return description OR @return type description
    const returnMatch = content.match(/^@return\s+(.+)/)
    if (returnMatch) {
      let returnDesc = returnMatch[1]
      // If the description starts with a known type followed by a space, skip the type
      const typeMatch = returnDesc.match(/^(number|string|boolean|table|function|nil|any|integer)\s+(.+)/)
      if (typeMatch) {
        returnDesc = typeMatch[2]
      }
      returns = returnDesc
      continue
    }

    // Skip other annotations
    if (content.startsWith('@')) {
      continue
    }

    // Add to description if not empty
    if (content) {
      descriptionLines.push(content)
    }
  }

  return {
    description: descriptionLines.join(' '),
    params,
    returns,
  }
}

/**
 * Parses Lua code and extracts function definitions with their doc comments
 *
 * Recognizes:
 * - Global functions: `function name(...)`
 * - Local functions: `local function name(...)`
 * - Method-style: `function Class:method(...)`
 *
 * Doc comments must start with `---` (three dashes) to be recognized
 *
 * @param code The Lua source code to parse
 * @returns Array of parsed function documentation
 */
export function parseLuaDocComments(code: string): UserFunctionDoc[] {
  if (!code) {
    return []
  }

  const results: UserFunctionDoc[] = []
  const lines = code.split('\n')

  // Track doc comment lines
  let docCommentLines: string[] = []
  let inDocComment = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Check if this is a doc comment line (starts with ---)
    if (trimmed.startsWith('---')) {
      if (!inDocComment) {
        docCommentLines = []
        inDocComment = true
      }
      docCommentLines.push(trimmed)
      continue
    }

    // Check if this is a continuation comment (starts with -- but not ---)
    if (inDocComment && trimmed.startsWith('--') && !trimmed.startsWith('---')) {
      docCommentLines.push(trimmed)
      continue
    }

    // Check if this line is a function definition
    // Match: function name(...) or local function name(...) or function Class:method(...)
    const funcMatch = trimmed.match(
      /^(?:local\s+)?function\s+([\w:]+)\s*\(([^)]*)\)/
    )

    if (funcMatch && inDocComment && docCommentLines.length > 0) {
      const name = funcMatch[1]
      const params = funcMatch[2]
      const signature = `${name}(${params})`

      const parsed = parseDocComment(docCommentLines)

      results.push({
        name,
        signature,
        description: parsed.description,
        params: parsed.params.length > 0 ? parsed.params : undefined,
        returns: parsed.returns,
      })
    }

    // Reset doc comment tracking when we hit a non-comment, non-empty line
    if (trimmed && !trimmed.startsWith('--')) {
      inDocComment = false
      docCommentLines = []
    }
  }

  return results
}
