/**
 * Lua code formatter using StyLua WASM library.
 *
 * Note: Uses dynamic import to work around verbatimModuleSyntax issues
 * with the stylua package's type definitions.
 */

let initialized = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let styluaModule: any = null

/**
 * Result of a Lua code formatting operation
 */
export interface FormatResult {
  success: boolean
  code?: string
  error?: string
}

/**
 * Initialize the StyLua WASM formatter.
 * Must be called before formatLuaCode can be used.
 */
export async function initFormatter(): Promise<void> {
  if (initialized) return
  styluaModule = await import('@johnnymorganz/stylua')
  await styluaModule.default()
  initialized = true
}

/**
 * Check if the formatter has been initialized.
 */
export function isFormatterReady(): boolean {
  return initialized
}

/**
 * Create a StyLua Config with default settings.
 */
function createConfig() {
  const config = styluaModule.Config.new()
  config.column_width = 80
  config.line_endings = styluaModule.LineEndings.Unix
  config.indent_type = styluaModule.IndentType.Tabs
  config.indent_width = 2
  config.quote_style = styluaModule.QuoteStyle.AutoPreferDouble
  config.call_parentheses = styluaModule.CallParenType.Always
  config.collapse_simple_statement = styluaModule.CollapseSimpleStatement.Never
  return config
}

/**
 * Format Lua code using StyLua.
 *
 * @param code - The Lua code to format
 * @returns FormatResult with success status and formatted code or error
 */
export function formatLuaCode(code: string): FormatResult {
  if (!initialized || !styluaModule) {
    return {
      success: false,
      error: 'Formatter not initialized. Call initFormatter() first.',
    }
  }

  // Handle empty input
  if (code.trim() === '') {
    return {
      success: true,
      code: '',
    }
  }

  try {
    const config = createConfig()
    const formatted = styluaModule.formatCode(
      code,
      config,
      undefined,
      styluaModule.OutputVerification.Full
    )
    return {
      success: true,
      code: formatted,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
