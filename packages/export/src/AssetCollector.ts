import type { IFileSystem } from '@lua-learning/shell-core'
import type { ProjectConfig, CollectedFile, CollectedAsset } from './types'

/**
 * Result of collecting project files and assets.
 */
export interface CollectionResult {
  files: CollectedFile[]
  assets: CollectedAsset[]
}

/**
 * MIME type mappings for common file extensions.
 */
// Stryker disable all: Configuration data - changing MIME strings doesn't affect logic
const MIME_TYPES: Record<string, string> = {
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  // Fonts
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  // Data
  '.json': 'application/json',
  '.xml': 'application/xml',
}
// Stryker restore all

/**
 * Collects Lua files and binary assets for export.
 *
 * Scans the project directory, analyzes require() calls to find
 * dependencies, and collects all referenced assets.
 */
export class AssetCollector {
  constructor(
    private filesystem: IFileSystem,
    private projectDir: string
  ) {}

  /**
   * Collect all files and assets needed for export.
   * @param config - Project configuration
   * @returns Collected files and assets
   */
  async collect(config: ProjectConfig): Promise<CollectionResult> {
    const files: CollectedFile[] = []
    const assets: CollectedAsset[] = []
    const collectedPaths = new Set<string>()

    // Collect Lua files starting from main entry
    await this.collectLuaFiles(config.main, files, collectedPaths)

    // Collect assets from asset directories (canvas projects only)
    if (config.canvas?.assets) {
      for (const assetDir of config.canvas.assets) {
        await this.collectAssetsFromDir(assetDir, assets)
      }
    }

    return { files, assets }
  }

  /**
   * Recursively collect Lua files starting from an entry point.
   */
  private async collectLuaFiles(
    modulePath: string,
    files: CollectedFile[],
    collected: Set<string>
  ): Promise<void> {
    // Convert module path to file path
    const filePath = this.moduleToFilePath(modulePath)
    const absolutePath = this.resolvePath(filePath)

    // Skip if already collected
    if (collected.has(filePath)) {
      return
    }

    // Check if file exists
    if (!this.filesystem.exists(absolutePath)) {
      // If this is the main entry file, throw an error
      if (collected.size === 0) {
        throw new Error(`Entry file not found: ${modulePath}`)
      }
      // Otherwise, skip missing optional modules
      return
    }

    // Mark as collected
    collected.add(filePath)

    // Read the file
    const content = this.filesystem.readFile(absolutePath)
    files.push({ path: filePath, content })

    // Analyze requires and collect dependencies
    const requires = this.analyzeRequires(absolutePath)
    for (const req of requires) {
      await this.collectLuaFiles(req, files, collected)
    }
  }

  /**
   * Collect binary assets from a directory.
   */
  private async collectAssetsFromDir(dir: string, assets: CollectedAsset[]): Promise<void> {
    const absoluteDir = this.resolvePath(dir)

    if (!this.filesystem.exists(absoluteDir)) {
      return
    }

    const entries = this.filesystem.listDirectory(absoluteDir)

    for (const entry of entries) {
      const relativePath = dir + entry.name
      const absolutePath = this.resolvePath(relativePath)

      if (entry.type === 'directory') {
        // Recursively collect from subdirectory
        await this.collectAssetsFromDir(relativePath + '/', assets)
      } else {
        // Collect binary file
        if (this.filesystem.isBinaryFile?.(absolutePath)) {
          const data = this.filesystem.readBinaryFile!(absolutePath)
          const mimeType = this.getMimeType(entry.name)
          assets.push({ path: relativePath, data, mimeType })
        }
      }
    }
  }

  /**
   * Convert a module path (e.g., "game.core") to a file path (e.g., "game/core.lua").
   */
  private moduleToFilePath(modulePath: string): string {
    // If already ends with .lua, return as-is
    if (modulePath.endsWith('.lua')) {
      return modulePath
    }
    // Convert dots to slashes and add .lua extension
    return modulePath.replace(/\./g, '/') + '.lua'
  }

  /**
   * Resolve a relative path to an absolute path.
   */
  private resolvePath(relativePath: string): string {
    if (relativePath.startsWith('/')) {
      return relativePath
    }
    return this.projectDir + '/' + relativePath
  }

  /**
   * Get MIME type for a file based on its extension.
   */
  private getMimeType(filename: string): string {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
    return MIME_TYPES[ext] || 'application/octet-stream'
  }

  /**
   * Analyze a Lua file for require() calls.
   * @param filePath - Path to the Lua file
   * @returns Array of required module paths
   */
  analyzeRequires(filePath: string): string[] {
    const content = this.filesystem.readFile(filePath)
    const requires: string[] = []

    // Match various require patterns:
    // require("module"), require('module'), require "module", require 'module'
    // Note: We use two regexes to handle both parenthesized and non-parenthesized forms
    const patterns = [
      /require\s*\(\s*["']([^"']+)["']\s*\)/g, // require("module") or require('module')
      /require\s+["']([^"']+)["']/g, // require "module" or require 'module'
    ]

    for (const regex of patterns) {
      let match
      while ((match = regex.exec(content)) !== null) {
        if (!requires.includes(match[1])) {
          requires.push(match[1])
        }
      }
    }

    return requires
  }
}
