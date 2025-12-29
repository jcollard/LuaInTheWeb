/**
 * Project configuration parsed from project.lua
 */
export interface ProjectConfig {
  /** Project name (used for ZIP filename and HTML title) */
  name: string

  /** Entry point Lua file (relative to project root) */
  main: string

  /** Runtime type */
  type: 'canvas' | 'shell'

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
 * Export command options (from CLI flags)
 */
export interface ExportOptions {
  /** Override runtime type */
  type?: 'canvas' | 'shell'

  /** Enable/disable web workers (default: false for compatibility) */
  webWorkers?: boolean

  /** Output filename (without extension) */
  outputName?: string
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
