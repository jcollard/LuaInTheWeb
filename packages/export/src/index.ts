/**
 * @lua-learning/export
 *
 * Export Lua projects as standalone HTML packages that can run
 * independently in any browser.
 */

// Types
export type {
  ProjectConfig,
  CanvasConfig,
  ShellConfig,
  ExportOptions,
  CollectedFile,
  CollectedAsset,
  BundleContents,
  ParseResult,
  ParseError,
  ParseOutcome,
} from './types'

// Core components
export { ProjectConfigParser } from './ProjectConfigParser'
export { AssetCollector } from './AssetCollector'
export { HtmlGenerator } from './HtmlGenerator'
export { ZipBundler } from './ZipBundler'

// Command
export { ExportCommand } from './ExportCommand'
