/**
 * Project configuration parsed from project.lua
 */
export interface ProjectConfig {
  /** Project name (used for ZIP filename and HTML title) */
  name: string

  /** Entry point Lua file (relative to project root) */
  main: string

  /** Runtime type */
  type: 'canvas' | 'shell' | 'ansi'

  /** Project version */
  version?: string

  /** Project description */
  description?: string

  /** Asset directories to include (relative to project root) */
  assets?: string[]

  /** Canvas-specific settings */
  canvas?: CanvasConfig

  /** Shell-specific settings */
  shell?: ShellConfig

  /** ANSI terminal-specific settings */
  ansi?: AnsiConfig

  /** Export settings */
  export?: ExportConfig
}

/**
 * Canvas runtime configuration
 */
export interface CanvasConfig {
  /** Canvas width in pixels (default: 800) */
  width?: number

  /** Canvas height in pixels (default: 600) */
  height?: number

  /** Asset directories to include (relative to project root) */
  assets?: string[]

  /** Web worker mode (default: 'postMessage' for compatibility) */
  worker_mode?: 'auto' | 'postMessage' | 'sharedArrayBuffer'

  /** Background color (CSS color string) */
  background_color?: string

  /**
   * Canvas scaling mode (default: 'full')
   * - 'full': Scale to fill window while maintaining aspect ratio
   * - 'fit': Shrink if needed but don't grow beyond native size
   * - '1x': Always use native size, add scrollbars if needed
   */
  scale?: 'full' | 'fit' | '1x'
}

/**
 * Shell runtime configuration
 */
export interface ShellConfig {
  /** Terminal columns (default: 80) */
  columns?: number

  /** Terminal rows (default: 24) */
  rows?: number

  /** Font family */
  font_family?: string

  /** Font size in pixels */
  font_size?: number

  /** Color theme */
  theme?: 'dark' | 'light'
}

/**
 * ANSI terminal runtime configuration
 */
export interface AnsiConfig {
  /** Terminal columns (default: 80) */
  columns?: number

  /** Terminal rows (default: 25) */
  rows?: number

  /** Font size in pixels (default: 16) */
  font_size?: number

  /**
   * Terminal scaling mode (default: 'integer')
   * - 'integer': Largest integer scale that fits the viewport
   * - 'full': Scale to fill viewport (may use fractional scaling)
   * - '1x': Fixed 1x scale
   * - '2x': Fixed 2x scale
   * - '3x': Fixed 3x scale
   */
  scale?: 'integer' | 'full' | '1x' | '2x' | '3x'

  /** Enable CRT monitor effect (scanlines, vignette, phosphor glow). Default: false */
  crt?: boolean

  /** CRT effect intensity 0-1 (default: 0.7). Only used when crt is true */
  crt_intensity?: number
}

/**
 * Export configuration (from project.lua)
 */
export interface ExportConfig {
  /**
   * Embed all assets as data URLs in a single HTML file (default: true)
   * - true: Single self-contained HTML file that works offline
   * - false: ZIP archive with separate assets folder (smaller file size)
   */
  singleFile?: boolean
}

/**
 * Export command options (used internally for HTML generation)
 */
export interface ExportOptions {
  /** Override runtime type */
  type?: 'canvas' | 'shell' | 'ansi'

  /** Output filename (without extension) */
  outputName?: string

  /** Export as single self-contained HTML file with embedded assets */
  singleFile?: boolean
}

/**
 * Collected Lua file for bundling
 */
export interface CollectedFile {
  /** Path within the project (e.g., "main.lua", "lib/utils.lua") */
  path: string

  /** File content as string */
  content: string
}

/**
 * Collected binary asset for bundling
 */
export interface CollectedAsset {
  /** Path within the assets folder (e.g., "images/player.png") */
  path: string

  /** Binary content */
  data: Uint8Array

  /** MIME type (e.g., "image/png") */
  mimeType: string
}

/**
 * Bundle contents ready for ZIP creation
 */
export interface BundleContents {
  /** Generated HTML content */
  html: string

  /** Lua source files */
  luaFiles: CollectedFile[]

  /** Binary assets */
  assets: CollectedAsset[]
}

/**
 * Result of parsing project.lua
 */
export interface ParseResult {
  success: true
  config: ProjectConfig
}

/**
 * Error from parsing project.lua
 */
export interface ParseError {
  success: false
  error: string
  line?: number
  column?: number
}

export type ParseOutcome = ParseResult | ParseError
