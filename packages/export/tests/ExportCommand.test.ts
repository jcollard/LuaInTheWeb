import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExportCommand } from '../src/ExportCommand'
import type { ShellContext } from '@lua-learning/shell-core'
import type { IFileSystem } from '@lua-learning/shell-core'

// Helper to create a mock filesystem
function createMockFilesystem(files: Record<string, string | Uint8Array> = {}): IFileSystem {
  return {
    exists: vi.fn((path: string) => path in files),
    readFile: vi.fn((path: string) => {
      const content = files[path]
      if (typeof content === 'string') return content
      throw new Error(`File not found: ${path}`)
    }),
    readBinaryFile: vi.fn((path: string) => {
      const content = files[path]
      if (content instanceof Uint8Array) return content
      throw new Error(`File not found: ${path}`)
    }),
    isBinaryFile: vi.fn((path: string) => files[path] instanceof Uint8Array),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    createDirectory: vi.fn(),
    deleteDirectory: vi.fn(),
    listDirectory: vi.fn(() => []),
    isDirectory: vi.fn(() => false),
    getAbsolutePath: vi.fn((path: string) => path),
    getWorkingDirectory: vi.fn(() => '/'),
    setWorkingDirectory: vi.fn(),
    stat: vi.fn(() => ({ size: 0, mtime: new Date() })),
  }
}

// Helper to create a mock shell context
function createMockContext(filesystem?: IFileSystem): ShellContext & {
  outputs: string[]
  errors: string[]
  downloads: Array<{ filename: string; blob: Blob }>
} {
  const outputs: string[] = []
  const errors: string[] = []
  const downloads: Array<{ filename: string; blob: Blob }> = []

  return {
    cwd: '/project',
    filesystem: filesystem || createMockFilesystem(),
    output: vi.fn((text: string) => outputs.push(text)),
    error: vi.fn((text: string) => errors.push(text)),
    onTriggerDownload: vi.fn((filename: string, blob: Blob) => {
      downloads.push({ filename, blob })
    }),
    outputs,
    errors,
    downloads,
  }
}

describe('ExportCommand', () => {
  describe('parseArgs', () => {
    it('should use current directory when no path specified', () => {
      const command = new ExportCommand()
      const result = command.parseArgs([], '/project')

      expect(result.projectPath).toBe('/project')
    })

    it('should use absolute path when provided', () => {
      const command = new ExportCommand()
      const result = command.parseArgs(['/other/project'], '/project')

      expect(result.projectPath).toBe('/other/project')
    })

    it('should resolve relative path against cwd', () => {
      const command = new ExportCommand()
      const result = command.parseArgs(['subdir'], '/project')

      expect(result.projectPath).toBe('/project/subdir')
    })

    it('should parse --type=canvas option', () => {
      const command = new ExportCommand()
      const result = command.parseArgs(['--type=canvas'], '/project')

      expect(result.options.type).toBe('canvas')
    })

    it('should parse --type=shell option', () => {
      const command = new ExportCommand()
      const result = command.parseArgs(['--type=shell'], '/project')

      expect(result.options.type).toBe('shell')
    })

    it('should throw on invalid type', () => {
      const command = new ExportCommand()

      expect(() => command.parseArgs(['--type=invalid'], '/project')).toThrow(
        "Invalid type: invalid. Must be 'canvas' or 'shell'"
      )
    })

    it('should default webWorkers to false', () => {
      const command = new ExportCommand()
      const result = command.parseArgs([], '/project')

      expect(result.options.webWorkers).toBe(false)
    })

    it('should parse --web-workers=true option', () => {
      const command = new ExportCommand()
      const result = command.parseArgs(['--web-workers=true'], '/project')

      expect(result.options.webWorkers).toBe(true)
    })

    it('should parse --web-workers=false option explicitly', () => {
      const command = new ExportCommand()
      const result = command.parseArgs(['--web-workers=false'], '/project')

      expect(result.options.webWorkers).toBe(false)
    })

    it('should handle multiple options together', () => {
      const command = new ExportCommand()
      const result = command.parseArgs(
        ['--type=canvas', '--web-workers=true', '/my/project'],
        '/project'
      )

      expect(result.projectPath).toBe('/my/project')
      expect(result.options.type).toBe('canvas')
      expect(result.options.webWorkers).toBe(true)
    })

    it('should default singleFile to undefined', () => {
      const command = new ExportCommand()
      const result = command.parseArgs([], '/project')

      expect(result.options.singleFile).toBeUndefined()
    })

    it('should parse --single-file flag', () => {
      const command = new ExportCommand()
      const result = command.parseArgs(['--single-file'], '/project')

      expect(result.options.singleFile).toBe(true)
    })

    it('should handle --single-file with other options', () => {
      const command = new ExportCommand()
      const result = command.parseArgs(
        ['--single-file', '--type=canvas', '/my/project'],
        '/project'
      )

      expect(result.projectPath).toBe('/my/project')
      expect(result.options.singleFile).toBe(true)
      expect(result.options.type).toBe('canvas')
    })
  })

  describe('execute', () => {
    it('should error when project.lua is missing', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({})
      const context = createMockContext(filesystem)

      command.execute([], context)

      expect(context.errors.join('')).toContain('project.lua')
    })

    it('should error when project config is invalid', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': 'return { name = "Test" }', // Missing required fields
      })
      const context = createMockContext(filesystem)

      command.execute([], context)

      expect(context.errors.join('')).toContain('Invalid')
    })

    it('should export canvas project successfully', async () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': `return {
          name = "My Game",
          main = "main.lua",
          type = "canvas",
          canvas = {
            width = 800,
            height = 600
          }
        }`,
        '/project/main.lua': 'print("Hello")',
      })
      const context = createMockContext(filesystem)

      const process = command.execute([], context)

      // Wait for async operation to complete
      if (process && 'then' in process) {
        await process
      }
      // Give a tick for async operations
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(context.downloads.length).toBe(1)
      expect(context.downloads[0].filename).toBe('My Game.zip')
      expect(context.downloads[0].blob.type).toBe('application/zip')
    })

    it('should export shell project successfully', async () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': `return {
          name = "My App",
          main = "main.lua",
          type = "shell",
          shell = {
            columns = 80,
            rows = 24
          }
        }`,
        '/project/main.lua': 'io.write("Hello")',
      })
      const context = createMockContext(filesystem)

      const process = command.execute([], context)

      if (process && 'then' in process) {
        await process
      }
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(context.downloads.length).toBe(1)
      expect(context.downloads[0].filename).toBe('My App.zip')
    })

    it('should output success message after export', async () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': `return {
          name = "Test",
          main = "main.lua",
          type = "shell"
        }`,
        '/project/main.lua': 'print("test")',
      })
      const context = createMockContext(filesystem)

      const process = command.execute([], context)

      if (process && 'then' in process) {
        await process
      }
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(context.outputs.join('')).toContain('exported')
    })

    it('should error when onTriggerDownload is not available', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': `return {
          name = "Test",
          main = "main.lua",
          type = "shell"
        }`,
        '/project/main.lua': 'print("test")',
      })
      const context = createMockContext(filesystem)
      context.onTriggerDownload = undefined

      command.execute([], context)

      expect(context.errors.join('')).toContain('download')
    })

    it('should use custom project path from args', async () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/other/project.lua': `return {
          name = "Other",
          main = "main.lua",
          type = "canvas"
        }`,
        '/other/main.lua': 'print("other")',
      })
      const context = createMockContext(filesystem)
      context.cwd = '/home'

      const process = command.execute(['/other'], context)

      if (process && 'then' in process) {
        await process
      }
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(context.downloads.length).toBe(1)
      expect(context.downloads[0].filename).toBe('Other.zip')
    })

    it('should override project type when --type is specified', async () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': `return {
          name = "Mixed",
          main = "main.lua",
          type = "canvas"
        }`,
        '/project/main.lua': 'print("test")',
      })
      const context = createMockContext(filesystem)

      const process = command.execute(['--type=shell'], context)

      if (process && 'then' in process) {
        await process
      }
      await new Promise((resolve) => setTimeout(resolve, 10))

      // The export should succeed (we can verify by checking download happened)
      expect(context.downloads.length).toBe(1)
    })

    it('should handle syntax errors in project.lua', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': 'return { name = ',
      })
      const context = createMockContext(filesystem)

      command.execute([], context)

      expect(context.errors.join('')).toContain('Invalid')
    })

    it('should handle validation errors for missing required fields', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': 'return { name = "Test" }',
      })
      const context = createMockContext(filesystem)

      command.execute([], context)

      expect(context.errors.join('')).toContain('Invalid')
    })

    it('should handle asset collection errors', async () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': `return {
          name = "Test",
          main = "main.lua",
          type = "canvas"
        }`,
        // main.lua is missing, which will cause an error
      })
      const context = createMockContext(filesystem)

      command.execute([], context)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(context.errors.join('')).toContain('failed')
    })

    it('should handle "does not exist" error message', () => {
      const command = new ExportCommand()
      // Create a filesystem mock that returns "does not exist" error
      const filesystem = createMockFilesystem({})
      // Override exists to return true but readFile to throw "does not exist"
      filesystem.exists = vi.fn((path: string) => path.endsWith('project.lua'))
      filesystem.readFile = vi.fn(() => {
        throw new Error('File does not exist')
      })
      const context = createMockContext(filesystem)

      command.execute([], context)

      expect(context.errors.join('')).toContain('project.lua')
    })
  })

  describe('--init flag', () => {
    it('should create project.lua when it does not exist', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({})
      const context = createMockContext(filesystem)

      command.execute(['--init'], context)

      expect(filesystem.writeFile).toHaveBeenCalledWith(
        '/project/project.lua',
        expect.stringContaining('return {')
      )
      expect(context.outputs.join('')).toContain('Created project.lua')
    })

    it('should error when project.lua already exists', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': 'return { name = "existing" }',
      })
      const context = createMockContext(filesystem)

      command.execute(['--init'], context)

      expect(filesystem.writeFile).not.toHaveBeenCalled()
      expect(context.errors.join('')).toContain('already exists')
    })

    it('should create project.lua in specified directory', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({})
      const context = createMockContext(filesystem)

      command.execute(['--init', '/other/path'], context)

      expect(filesystem.writeFile).toHaveBeenCalledWith(
        '/other/path/project.lua',
        expect.stringContaining('return {')
      )
    })

    it('should create canvas project template by default', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({})
      const context = createMockContext(filesystem)

      command.execute(['--init'], context)

      const writeCall = (filesystem.writeFile as ReturnType<typeof vi.fn>).mock.calls[0]
      const content = writeCall[1] as string
      expect(content).toContain('type = "canvas"')
      expect(content).toContain('width = 800')
      expect(content).toContain('height = 600')
    })

    it('should create shell project template when --type=shell is specified', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({})
      const context = createMockContext(filesystem)

      command.execute(['--init', '--type=shell'], context)

      const writeCall = (filesystem.writeFile as ReturnType<typeof vi.fn>).mock.calls[0]
      const content = writeCall[1] as string
      expect(content).toContain('type = "shell"')
      expect(content).toContain('columns = 80')
      expect(content).toContain('rows = 24')
    })

    it('should not require onTriggerDownload for --init', () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({})
      const context = createMockContext(filesystem)
      context.onTriggerDownload = undefined

      command.execute(['--init'], context)

      expect(filesystem.writeFile).toHaveBeenCalled()
      expect(context.errors.length).toBe(0)
    })
  })

  describe('--single-file export', () => {
    it('should export as single HTML file with .html extension', async () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': `return {
          name = "My Game",
          main = "main.lua",
          type = "canvas",
          canvas = { width = 800, height = 600 }
        }`,
        '/project/main.lua': 'print("Hello")',
      })
      const context = createMockContext(filesystem)

      command.execute(['--single-file'], context)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(context.downloads.length).toBe(1)
      expect(context.downloads[0].filename).toBe('My Game.html')
      expect(context.downloads[0].blob.type).toBe('text/html')
    })

    it('should export as ZIP when --single-file is not specified', async () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': `return {
          name = "My Game",
          main = "main.lua",
          type = "canvas"
        }`,
        '/project/main.lua': 'print("Hello")',
      })
      const context = createMockContext(filesystem)

      command.execute([], context)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(context.downloads.length).toBe(1)
      expect(context.downloads[0].filename).toBe('My Game.zip')
      expect(context.downloads[0].blob.type).toBe('application/zip')
    })

    it('should work with --single-file and other options', async () => {
      const command = new ExportCommand()
      const filesystem = createMockFilesystem({
        '/project/project.lua': `return {
          name = "Shell App",
          main = "main.lua",
          type = "shell"
        }`,
        '/project/main.lua': 'io.write("Hello")',
      })
      const context = createMockContext(filesystem)

      command.execute(['--single-file', '--type=shell'], context)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(context.downloads.length).toBe(1)
      expect(context.downloads[0].filename).toBe('Shell App.html')
      expect(context.downloads[0].blob.type).toBe('text/html')
    })
  })
})
