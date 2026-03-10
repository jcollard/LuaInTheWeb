import type { ICommand, IProcess, ShellContext } from '@lua-learning/shell-core'
import type { ExportOptions } from './types'
import { ProjectConfigParser } from './ProjectConfigParser'
import { AssetCollector } from './AssetCollector'
import { HtmlGenerator } from './HtmlGenerator'
import { ZipBundler } from './ZipBundler'

/**
 * Shell command for exporting projects as standalone HTML packages.
 *
 * Usage: export [path] [--type=canvas|shell] [--init]
 *
 * Export settings are configured in project.lua's export section.
 */
export class ExportCommand implements ICommand {
  // Stryker disable all: Command metadata - string mutations don't affect behavior
  readonly name = 'export'
  readonly description = 'Export project as standalone HTML/ZIP package'
  readonly usage = 'export [path] [--type=canvas|shell|ansi] [--init]'
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
    const singleFile = config.export?.singleFile ?? true
    collector
      .collect(config)
      .then(({ files, assets }) => {
        // Generate HTML
        const htmlGenerator = new HtmlGenerator({ singleFile })
        const html = htmlGenerator.generate(config, files, assets)

        // Create bundle (ZIP or single HTML file)
        const bundler = new ZipBundler()
        return bundler.bundle({ html, luaFiles: files, assets }, { singleFile })
      })
      .then((blob) => {
        // Trigger download with appropriate extension
        const extension = singleFile ? 'html' : 'zip'
        const filename = `${config.name}.${extension}`
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
    const options: ExportOptions = {}
    let projectPath = cwd
    let init = false

    for (const arg of args) {
      if (arg === '--init') {
        init = true
      } else if (arg.startsWith('--type=')) {
        const type = arg.slice(7)
        if (type !== 'canvas' && type !== 'shell' && type !== 'ansi') {
          throw new Error(`Invalid type: ${type}. Must be 'canvas', 'shell', or 'ansi'`)
        }
        options.type = type as 'canvas' | 'shell' | 'ansi'
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
    type: 'canvas' | 'shell' | 'ansi',
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
  private generateProjectTemplate(type: 'canvas' | 'shell' | 'ansi'): string {
    if (type === 'ansi') {
      // Stryker disable all: Template content - string mutations don't affect logic
      return `return {
  name = "My ANSI App",
  main = "main.lua",
  type = "ansi",
  ansi = {
    columns = 80,
    rows = 25,
    font_size = 16,
    scale = "integer",  -- "integer" | "full" | "1x" | "2x" | "3x"
    -- CRT monitor effect
    -- crt = true,
    -- crt_curvature = 0.15,   -- barrel distortion (0-0.5)
    -- crt_scanlines = 0.15,   -- scanline intensity (0-1)
    -- crt_phosphor = 0.5,     -- RGB phosphor mask (0-1)
    -- crt_vignette = 0.3,     -- edge darkening (0-1)
    -- crt_bloom = 0.2,        -- glow on bright areas (0-1)
    -- crt_chromatic = 0.0,    -- color fringing (0-1)
    -- crt_flicker = 0.01,     -- temporal flicker (0-0.15)
    -- crt_brightness = 1.1,   -- brightness boost (0.6-1.8)
  },
  -- Export settings
  export = {
    -- true: embed all assets as data URLs in a single HTML file (works offline)
    -- false: create ZIP with separate assets folder (smaller file size)
    singleFile = true,
  },
  -- Uncomment to include asset directories:
  -- assets = { "images/", "sounds/" },
}
`
      // Stryker restore all
    }

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
  -- Export settings
  export = {
    -- true: embed all assets as data URLs in a single HTML file (works offline)
    -- false: create ZIP with separate assets folder (smaller file size)
    singleFile = true,
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
    scale = "full",  -- "full" | "fit" | "1x"
  },
  -- Export settings
  export = {
    -- true: embed all assets as data URLs in a single HTML file (works offline)
    -- false: create ZIP with separate assets folder (smaller file size)
    singleFile = true,
  },
  -- Uncomment to include asset directories:
  -- assets = { "images/", "sounds/" },
}
`
    // Stryker restore all
  }
}
