import { describe, it, expect, beforeEach } from 'vitest'
import { ProjectConfigParser } from '../src/ProjectConfigParser'
import type { IFileSystem, FileEntry } from '@lua-learning/shell-core'

/**
 * Mock filesystem for testing
 */
function createMockFileSystem(
  files: Record<string, string>,
  options?: { readFileError?: Error }
): IFileSystem {
  return {
    getCurrentDirectory: () => '/',
    setCurrentDirectory: () => {},
    exists: (path: string) => path in files || path === '/',
    isDirectory: (path: string) => path === '/' || path.endsWith('/'),
    isFile: (path: string) => path in files,
    listDirectory: (): FileEntry[] => [],
    readFile: (path: string) => {
      if (options?.readFileError) {
        throw options.readFileError
      }
      if (!(path in files)) {
        throw new Error(`File not found: ${path}`)
      }
      return files[path]
    },
    writeFile: () => {},
    createDirectory: () => {},
    delete: () => {},
  }
}

describe('ProjectConfigParser', () => {
  describe('parse', () => {
    it('should parse a minimal valid project.lua', () => {
      const files = {
        '/myproject/project.lua': `return {
          name = "my-game",
          main = "main.lua",
          type = "canvas"
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.config.name).toBe('my-game')
        expect(result.config.main).toBe('main.lua')
        expect(result.config.type).toBe('canvas')
      }
    })

    it('should parse shell type projects', () => {
      const files = {
        '/myproject/project.lua': `return {
          name = "my-repl",
          main = "main.lua",
          type = "shell"
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.config.type).toBe('shell')
      }
    })

    it('should parse full config with all options', () => {
      const files = {
        '/myproject/project.lua': `return {
          name = "Space Shooter",
          main = "game.lua",
          type = "canvas",
          version = "1.0.0",
          description = "A fun space game",
          canvas = {
            width = 800,
            height = 600,
            assets = { "images/", "fonts/" },
            worker_mode = "postMessage",
            background_color = "#000000"
          }
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.config.name).toBe('Space Shooter')
        expect(result.config.version).toBe('1.0.0')
        expect(result.config.description).toBe('A fun space game')
        expect(result.config.canvas?.width).toBe(800)
        expect(result.config.canvas?.height).toBe(600)
        expect(result.config.canvas?.assets).toEqual(['images/', 'fonts/'])
        expect(result.config.canvas?.worker_mode).toBe('postMessage')
        expect(result.config.canvas?.background_color).toBe('#000000')
      }
    })

    it('should parse shell config options', () => {
      const files = {
        '/myproject/project.lua': `return {
          name = "terminal",
          main = "main.lua",
          type = "shell",
          shell = {
            columns = 120,
            rows = 40,
            font_family = "monospace",
            font_size = 14,
            theme = "dark"
          }
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.config.shell?.columns).toBe(120)
        expect(result.config.shell?.rows).toBe(40)
        expect(result.config.shell?.font_family).toBe('monospace')
        expect(result.config.shell?.font_size).toBe(14)
        expect(result.config.shell?.theme).toBe('dark')
      }
    })

    it('should handle single-quoted strings', () => {
      const files = {
        '/myproject/project.lua': `return {
          name = 'my-game',
          main = 'main.lua',
          type = 'canvas'
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.config.name).toBe('my-game')
      }
    })

    it('should handle mixed table with both array elements and key-value pairs', () => {
      const files = {
        '/myproject/project.lua': `return {
          name = "test",
          main = "main.lua",
          type = "canvas",
          canvas = {
            assets = { "images/", "fonts/" },
            width = 800
          }
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(true)
      if (result.success) {
        // Array should be parsed correctly even with other key-value pairs
        expect(result.config.canvas?.assets).toEqual(['images/', 'fonts/'])
        expect(result.config.canvas?.width).toBe(800)
      }
    })

    it('should ignore unsupported value types gracefully', () => {
      const files = {
        '/myproject/project.lua': `return {
          name = "test",
          main = "main.lua",
          type = "canvas",
          unsupported = function() end
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.config.name).toBe('test')
        // Unsupported value should be undefined
        expect((result.config as Record<string, unknown>).unsupported).toBeUndefined()
      }
    })

    it('should return error when return value is not a table', () => {
      const files = {
        '/myproject/project.lua': `return "not a table"`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('must return a table')
      }
    })

    it('should return error when return has no arguments', () => {
      const files = {
        '/myproject/project.lua': `return`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('must return a table')
      }
    })

    it('should correctly distinguish array tables from object tables', () => {
      // Test that a table with only TableKeyString fields is parsed as an object
      // not as an array (which would happen if we used .some instead of .every)
      const files = {
        '/myproject/project.lua': `return {
          name = "test",
          main = "main.lua",
          type = "canvas",
          canvas = {
            width = 800,
            height = 600
          }
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(true)
      if (result.success) {
        // canvas should be an object with width/height, not an array
        expect(result.config.canvas?.width).toBe(800)
        expect(result.config.canvas?.height).toBe(600)
        expect(Array.isArray(result.config.canvas)).toBe(false)
      }
    })

    it('should parse pure array tables correctly', () => {
      const files = {
        '/myproject/project.lua': `return {
          name = "test",
          main = "main.lua",
          type = "canvas",
          canvas = {
            assets = { "a", "b", "c" }
          }
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(true)
      if (result.success) {
        // assets should be an array
        expect(Array.isArray(result.config.canvas?.assets)).toBe(true)
        expect(result.config.canvas?.assets).toEqual(['a', 'b', 'c'])
      }
    })

    it('should return error when file read fails', () => {
      const files = { '/myproject/project.lua': '' }
      const fs = createMockFileSystem(files, {
        readFileError: new Error('Permission denied'),
      })
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Failed to read project.lua')
        expect(result.error).toContain('Permission denied')
      }
    })

    it('should extract line and column from Lua syntax error', () => {
      const files = {
        '/myproject/project.lua': `return {
          name = "test
          main = "main.lua"
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.line).toBeDefined()
        expect(result.column).toBeDefined()
        expect(typeof result.line).toBe('number')
        expect(typeof result.column).toBe('number')
      }
    })

    it('should return error when project.lua does not exist', () => {
      const fs = createMockFileSystem({})
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('project.lua not found')
      }
    })

    it('should return error on Lua syntax error', () => {
      const files = {
        '/myproject/project.lua': `return {
          name = "broken
        }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.line).toBeDefined()
      }
    })

    it('should return error when return statement is missing', () => {
      const files = {
        '/myproject/project.lua': `local x = { name = "test" }`,
      }
      const fs = createMockFileSystem(files)
      const parser = new ProjectConfigParser(fs)

      const result = parser.parse('/myproject')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('must return a table')
      }
    })
  })

  describe('validate', () => {
    let parser: ProjectConfigParser

    beforeEach(() => {
      const fs = createMockFileSystem({})
      parser = new ProjectConfigParser(fs)
    })

    it('should validate a complete config', () => {
      const config = parser.validate({
        name: 'test',
        main: 'main.lua',
        type: 'canvas',
      })

      expect(config.name).toBe('test')
      expect(config.main).toBe('main.lua')
      expect(config.type).toBe('canvas')
    })

    it('should throw error when name is missing', () => {
      expect(() =>
        parser.validate({
          main: 'main.lua',
          type: 'canvas',
        })
      ).toThrow("missing required field 'name'")
    })

    it('should throw error when main is missing', () => {
      expect(() =>
        parser.validate({
          name: 'test',
          type: 'canvas',
        })
      ).toThrow("missing required field 'main'")
    })

    it('should throw error when type is missing', () => {
      expect(() =>
        parser.validate({
          name: 'test',
          main: 'main.lua',
        })
      ).toThrow("missing required field 'type'")
    })

    it('should throw error when type is invalid', () => {
      expect(() =>
        parser.validate({
          name: 'test',
          main: 'main.lua',
          type: 'invalid' as 'canvas',
        })
      ).toThrow("type must be 'canvas' or 'shell'")
    })

    it('should apply default canvas config for canvas type', () => {
      const config = parser.validate({
        name: 'test',
        main: 'main.lua',
        type: 'canvas',
      })

      expect(config.canvas).toBeDefined()
      expect(config.canvas?.width).toBe(800)
      expect(config.canvas?.height).toBe(600)
      expect(config.canvas?.worker_mode).toBe('postMessage')
    })

    it('should apply default shell config for shell type', () => {
      const config = parser.validate({
        name: 'test',
        main: 'main.lua',
        type: 'shell',
      })

      expect(config.shell).toBeDefined()
      expect(config.shell?.columns).toBe(80)
      expect(config.shell?.rows).toBe(24)
    })

    it('should merge provided canvas config with defaults', () => {
      const config = parser.validate({
        name: 'test',
        main: 'main.lua',
        type: 'canvas',
        canvas: {
          width: 1024,
        },
      })

      expect(config.canvas?.width).toBe(1024)
      expect(config.canvas?.height).toBe(600) // default
    })
  })
})
