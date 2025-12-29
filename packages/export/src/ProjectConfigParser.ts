import * as luaparse from 'luaparse'
import type { IFileSystem } from '@lua-learning/shell-core'
import type { ProjectConfig, ParseOutcome, CanvasConfig, ShellConfig } from './types'

// luaparse AST node types
interface LuaNode {
  type: string
  loc?: { start: { line: number; column: number } }
}

interface LuaChunk extends LuaNode {
  type: 'Chunk'
  body: LuaStatement[]
}

interface LuaStatement extends LuaNode {
  type: string
}

interface LuaReturnStatement extends LuaStatement {
  type: 'ReturnStatement'
  arguments: LuaExpression[]
}

interface LuaExpression extends LuaNode {
  type: string
}

interface LuaTableConstructorExpression extends LuaExpression {
  type: 'TableConstructorExpression'
  fields: LuaTableField[]
}

interface LuaTableField extends LuaNode {
  type: 'TableKey' | 'TableKeyString' | 'TableValue'
  key?: LuaExpression
  value: LuaExpression
}

interface LuaIdentifier extends LuaExpression {
  type: 'Identifier'
  name: string
}

interface LuaStringLiteral extends LuaExpression {
  type: 'StringLiteral'
  value: string
  raw: string
}

interface LuaNumericLiteral extends LuaExpression {
  type: 'NumericLiteral'
  value: number
  raw: string
}

interface LuaBooleanLiteral extends LuaExpression {
  type: 'BooleanLiteral'
  value: boolean
  raw: string
}

/**
 * Default canvas configuration values.
 */
const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  width: 800,
  height: 600,
  worker_mode: 'postMessage',
}

/**
 * Default shell configuration values.
 */
const DEFAULT_SHELL_CONFIG: ShellConfig = {
  columns: 80,
  rows: 24,
}

/**
 * Parses project.lua configuration files.
 *
 * Uses luaparse to safely extract the returned table without
 * executing arbitrary Lua code.
 */
export class ProjectConfigParser {
  constructor(private filesystem: IFileSystem) {}

  /**
   * Parse a project.lua file and return the configuration.
   * @param projectPath - Path to the directory containing project.lua
   * @returns Parse result with config or error details
   */
  parse(projectPath: string): ParseOutcome {
    const configPath = `${projectPath}/project.lua`

    // Check if project.lua exists
    if (!this.filesystem.exists(configPath)) {
      return {
        success: false,
        error: `project.lua not found in ${projectPath}`,
      }
    }

    // Read the file
    let content: string
    try {
      content = this.filesystem.readFile(configPath)
    } catch (err) {
      return {
        success: false,
        error: `Failed to read project.lua: ${(err as Error).message}`,
      }
    }

    // Parse the Lua code
    let ast: LuaChunk
    try {
      ast = luaparse.parse(content, {
        luaVersion: '5.3',
        comments: false,
        scope: false,
        locations: true,
      }) as LuaChunk
    } catch (err) {
      const error = err as Error
      const match = error.message.match(/^\[(\d+):(\d+)\]\s*(.+)$/)
      if (match) {
        return {
          success: false,
          error: match[3],
          line: parseInt(match[1], 10),
          column: parseInt(match[2], 10),
        }
      }
      return {
        success: false,
        error: error.message,
      }
    }

    // Find the return statement
    const returnStatement = ast.body.find(
      (stmt): stmt is LuaReturnStatement => stmt.type === 'ReturnStatement'
    )

    if (!returnStatement || returnStatement.arguments.length === 0) {
      return {
        success: false,
        error: 'project.lua must return a table',
      }
    }

    const returnedExpr = returnStatement.arguments[0]
    if (returnedExpr.type !== 'TableConstructorExpression') {
      return {
        success: false,
        error: 'project.lua must return a table',
      }
    }

    // Convert the Lua table to a JavaScript object
    const rawConfig = this.tableToObject(returnedExpr as LuaTableConstructorExpression)

    // Validate and return
    try {
      const config = this.validate(rawConfig)
      return { success: true, config }
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      }
    }
  }

  /**
   * Convert a Lua table AST node to a JavaScript object.
   */
  private tableToObject(table: LuaTableConstructorExpression): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const field of table.fields) {
      if (field.type === 'TableKeyString') {
        const keyNode = field.key as LuaIdentifier
        const key = keyNode.name
        result[key] = this.valueToJS(field.value)
      }
    }

    return result
  }

  /**
   * Convert a Lua value AST node to a JavaScript value.
   */
  private valueToJS(node: LuaExpression): unknown {
    switch (node.type) {
      case 'StringLiteral': {
        const strNode = node as LuaStringLiteral
        // luaparse stores value as null, use raw and strip quotes
        if (strNode.value !== null) {
          return strNode.value
        }
        // Strip surrounding quotes from raw value
        const raw = strNode.raw
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
          return raw.slice(1, -1)
        }
        return raw
      }
      case 'NumericLiteral':
        return (node as LuaNumericLiteral).value
      case 'BooleanLiteral':
        return (node as LuaBooleanLiteral).value
      case 'TableConstructorExpression':
        return this.tableOrArrayToJS(node as LuaTableConstructorExpression)
      default:
        return undefined
    }
  }

  /**
   * Convert a Lua table to either a JS object or array.
   * Tables with only TableValue fields are converted to arrays.
   */
  private tableOrArrayToJS(table: LuaTableConstructorExpression): unknown {
    // Check if this is an array (all TableValue fields)
    const isArray = table.fields.every((f) => f.type === 'TableValue')

    if (isArray) {
      return table.fields.map((f) => this.valueToJS(f.value))
    }

    return this.tableToObject(table)
  }

  /**
   * Validate a parsed configuration.
   * @param config - Partial config to validate
   * @returns Validated config or throws with details
   */
  validate(config: Partial<ProjectConfig>): ProjectConfig {
    // Check required fields
    if (!config.name) {
      throw new Error("missing required field 'name'")
    }
    if (!config.main) {
      throw new Error("missing required field 'main'")
    }
    if (!config.type) {
      throw new Error("missing required field 'type'")
    }

    // Validate type
    if (config.type !== 'canvas' && config.type !== 'shell') {
      throw new Error("type must be 'canvas' or 'shell'")
    }

    // Apply defaults based on type
    const result: ProjectConfig = {
      name: config.name,
      main: config.main,
      type: config.type,
      version: config.version,
      description: config.description,
      assets: config.assets,
    }

    if (config.type === 'canvas') {
      result.canvas = {
        ...DEFAULT_CANVAS_CONFIG,
        ...config.canvas,
      }
    } else {
      result.shell = {
        ...DEFAULT_SHELL_CONFIG,
        ...config.shell,
      }
    }

    return result
  }
}
