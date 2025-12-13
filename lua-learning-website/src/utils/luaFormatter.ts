/**
 * Lua code formatter using StyLua WASM library.
 *
 * Uses stylua-wasm package with Vite's ?url import for WASM file loading.
 * In tests, the styluaWasmLoader module is mocked to avoid ?url import issues.
 */
import { loadStyluaWasm } from './styluaWasmLoader'

/**
 * Minimal type interface for stylua-wasm module.
 * Defines only the properties and methods used by this formatter.
 */
interface StyluaModule {
  default: (wasmUrl: string) => Promise<unknown>
  format: (code: string, config: StyluaConfig, verification: number) => string
  LineEndings: { Unix: number; Windows: number }
  IndentType: { Tabs: number; Spaces: number }
  QuoteStyle: { AutoPreferDouble: number; AutoPreferSingle: number }
  OutputVerification: { Full: number; None: number }
}

interface StyluaConfig {
  column_width: number
  line_endings: number
  indent_type: number
  indent_width: number
  quote_style: number
  no_call_parentheses: boolean
}

let styluaModule: StyluaModule | null = null
let initialized = false

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

  // Import stylua-wasm dynamically and cast to our interface
  styluaModule = (await import('stylua-wasm')) as StyluaModule

  // Load WASM URL (mocked in tests via vitest alias)
  const wasmUrl = await loadStyluaWasm()

  await styluaModule.default(wasmUrl)
  initialized = true
}

/**
 * Check if the formatter has been initialized.
 */
export function isFormatterReady(): boolean {
  return initialized
}

/**
 * Create default StyLua configuration.
 * Only called from formatLuaCode after initialization check.
 */
function createConfig(): StyluaConfig {
  return {
    column_width: 80,
    line_endings: styluaModule!.LineEndings.Unix,
    indent_type: styluaModule!.IndentType.Tabs,
    indent_width: 2,
    quote_style: styluaModule!.QuoteStyle.AutoPreferDouble,
    no_call_parentheses: false,
  }
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
    const formatted = styluaModule.format(
      code,
      config,
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
