import type { ICommand, IProcess, ShellContext } from '@lua-learning/shell-core'
import type { ExportOptions } from './types'
import { ProjectConfigParser } from './ProjectConfigParser'
import { AssetCollector } from './AssetCollector'
import { HtmlGenerator } from './HtmlGenerator'
import { ZipBundler } from './ZipBundler'

/**
 * Shell command for exporting projects as standalone HTML packages.
 *
 * Usage: export [path] [--type=canvas|shell] [--web-workers=false] [--init]
 */
export class ExportCommand implements ICommand {
  // Stryker disable all: Command metadata - string mutations don't affect behavior
  readonly name = 'export'
  readonly description = 'Export project as standalone HTML/ZIP package'
  readonly usage = 'export [path] [--type=canvas|shell] [--web-workers=false] [--init]'
  // Stryker restore all

  execute(args: string[], context: ShellContext): IProcess | void {
    // Parse arguments
    const { projectPath, options, init } = this.parseArgs(args, context.cwd)

    // Handle --init flag
    if (init) {
      this.initProject(projectPath, options.type || 'canvas', context)
      return
    }

    // Check if download is available (only needed for actual export)
    if (!context.onTriggerDownload) {
      context.error('Export not available: download functionality not supported\n')
      return
    }

    // Parse project config
    const parser = new ProjectConfigParser(context.filesystem)
    const parseResult = parser.parse(projectPath)

    if (!parseResult.success) {
      if (parseResult.error?.includes('not found') || parseResult.error?.includes('does not exist')) {
        context.error(`Error: project.lua not found in ${projectPath}\n`)
      } else {
        context.error(`Error: Invalid project.lua - ${parseResult.error}\n`)
      }
      return
    }

    // Validate config
    let config
    try {
      config = parser.validate(parseResult.config)
    } catch (err) {
      context.error(`Error: Invalid project configuration - ${(err as Error).message}\n`)
      return
    }

    // Override type if specified in command args
    if (options.type) {
      config = { ...config, type: options.type }
    }

    // Collect files and assets
    const collector = new AssetCollector(context.filesystem, projectPath)
    collector
      .collect(config)
      .then(({ files, assets }) => {
        // Generate HTML
        const htmlGenerator = new HtmlGenerator(options)
        const html = htmlGenerator.generate(config, files, assets)

        // Create ZIP bundle
        const bundler = new ZipBundler()
        return bundler.bundle({ html, luaFiles: files, assets })
      })
      .then((blob) => {
        // Trigger download
        const filename = `${config.name}.zip`
        context.onTriggerDownload!(filename, blob)
        context.output(`Project "${config.name}" exported successfully as ${filename}\n`)
      })
      .catch((err) => {
        context.error(`Export failed: ${(err as Error).message}\n`)
      })
  }

  /**
   * Parse command-line arguments.
   * @param args - Command arguments
   * @param cwd - Current working directory
   * @returns Parsed options, project path, and init flag
   */
  parseArgs(
    args: string[],
    cwd: string
  ): { projectPath: string; options: ExportOptions; init: boolean } {
    const options: ExportOptions = { webWorkers: false }
    let projectPath = cwd
    let init = false

    for (const arg of args) {
      if (arg === '--init') {
        init = true
      } else if (arg.startsWith('--type=')) {
        const type = arg.slice(7)
        if (type !== 'canvas' && type !== 'shell') {
          throw new Error(`Invalid type: ${type}. Must be 'canvas' or 'shell'`)
        }
        options.type = type
      } else if (arg === '--web-workers=false') {
        options.webWorkers = false
      } else if (arg === '--web-workers=true') {
        options.webWorkers = true
      } else if (!arg.startsWith('-')) {
        projectPath = arg.startsWith('/') ? arg : `${cwd}/${arg}`
      }
    }

    return { projectPath, options, init }
  }

  /**
   * Initialize a new project by creating a project.lua file.
   * @param projectPath - Directory to create project.lua in
   * @param type - Project type (canvas or shell)
   * @param context - Shell context
   */
  private initProject(
    projectPath: string,
    type: 'canvas' | 'shell',
    context: ShellContext
  ): void {
    const configPath = `${projectPath}/project.lua`

    // Check if project.lua already exists
    if (context.filesystem.exists(configPath)) {
      context.error(`Error: project.lua already exists in ${projectPath}\n`)
      return
    }

    // Generate template content
    const content = this.generateProjectTemplate(type)

    // Write the file
    context.filesystem.writeFile(configPath, content)
    context.output(`Created project.lua in ${projectPath}\n`)

    // Notify filesystem change if available
    if (context.onFileSystemChange) {
      context.onFileSystemChange()
    }
  }

  /**
   * Generate project.lua template content.
   * @param type - Project type
   * @returns Template Lua code
   */
  private generateProjectTemplate(type: 'canvas' | 'shell'): string {
    if (type === 'shell') {
      // Stryker disable all: Template content - string mutations don't affect logic
      return `return {
  name = "My Shell App",
  main = "main.lua",
  type = "shell",
  shell = {
    columns = 80,
    rows = 24,
    font_family = "monospace",
    font_size = 14,
  },
}
`
      // Stryker restore all
    }

    // Canvas template (default)
    // Stryker disable all: Template content - string mutations don't affect logic
    return `return {
  name = "My Game",
  main = "main.lua",
  type = "canvas",
  canvas = {
    width = 800,
    height = 600,
    background_color = "#000000",
  },
  -- Uncomment to include asset directories:
  -- assets = { "images/", "sounds/" },
}
`
    // Stryker restore all
  }
}
