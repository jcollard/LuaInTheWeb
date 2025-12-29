import { describe, it, expect } from 'vitest'
import { AssetCollector } from '../src/AssetCollector'
import type { IFileSystem, FileEntry } from '@lua-learning/shell-core'
import type { ProjectConfig } from '../src/types'

/**
 * Mock filesystem for testing
 */
function createMockFileSystem(
  files: Record<string, string>,
  binaryFiles: Record<string, Uint8Array> = {}
): IFileSystem {
  // Create directory listing from files
  const getDirectoryEntries = (dirPath: string): FileEntry[] => {
    const normalizedDir = dirPath.endsWith('/') ? dirPath : dirPath + '/'
    const entries: FileEntry[] = []
    const seen = new Set<string>()

    for (const path of Object.keys({ ...files, ...binaryFiles })) {
      if (path.startsWith(normalizedDir)) {
        const relativePath = path.slice(normalizedDir.length)
        const firstPart = relativePath.split('/')[0]
        if (firstPart && !seen.has(firstPart)) {
          seen.add(firstPart)
          const fullPath = normalizedDir + firstPart
          const isDir = relativePath.includes('/')
          entries.push({
            name: firstPart,
            path: fullPath,
            type: isDir ? 'directory' : 'file',
          })
        }
      }
    }
    return entries
  }

  return {
    getCurrentDirectory: () => '/',
    setCurrentDirectory: () => {},
    exists: (path: string) => {
      // Check exact file match
      if (path in files || path in binaryFiles) return true
      // Check if it's a directory (any file starts with this path + /)
      const dirPath = path.endsWith('/') ? path : path + '/'
      return Object.keys({ ...files, ...binaryFiles }).some((f) => f.startsWith(dirPath))
    },
    isDirectory: (path: string) => {
      if (path in files || path in binaryFiles) return false
      const dirPath = path.endsWith('/') ? path : path + '/'
      return Object.keys({ ...files, ...binaryFiles }).some((f) => f.startsWith(dirPath))
    },
    isFile: (path: string) => path in files || path in binaryFiles,
    listDirectory: (path: string): FileEntry[] => getDirectoryEntries(path),
    readFile: (path: string) => {
      if (!(path in files)) {
        throw new Error(`File not found: ${path}`)
      }
      return files[path]
    },
    writeFile: () => {},
    createDirectory: () => {},
    delete: () => {},
    isBinaryFile: (path: string) => path in binaryFiles,
    readBinaryFile: (path: string) => {
      if (!(path in binaryFiles)) {
        throw new Error(`Binary file not found: ${path}`)
      }
      return binaryFiles[path]
    },
  }
}

function createConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    name: 'test-project',
    main: 'main.lua',
    type: 'canvas',
    canvas: {
      width: 800,
      height: 600,
      worker_mode: 'postMessage',
    },
    ...overrides,
  }
}

describe('AssetCollector', () => {
  describe('analyzeRequires', () => {
    it('should find require calls with double quotes', () => {
      const files = {
        '/project/main.lua': `
          local utils = require("utils")
          local game = require("game.core")
        `,
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')

      const requires = collector.analyzeRequires('/project/main.lua')

      expect(requires).toContain('utils')
      expect(requires).toContain('game.core')
      expect(requires).toHaveLength(2)
    })

    it('should find require calls with single quotes', () => {
      const files = {
        "/project/main.lua": `
          local utils = require('utils')
        `,
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')

      const requires = collector.analyzeRequires('/project/main.lua')

      expect(requires).toContain('utils')
    })

    it('should return empty array for file with no requires', () => {
      const files = {
        '/project/main.lua': `
          print("Hello World")
        `,
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')

      const requires = collector.analyzeRequires('/project/main.lua')

      expect(requires).toEqual([])
    })

    it('should handle require with variable assignment patterns', () => {
      const files = {
        '/project/main.lua': `
          local a = require("module_a")
          require("module_b")
          local c = require 'module_c'
        `,
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')

      const requires = collector.analyzeRequires('/project/main.lua')

      expect(requires).toContain('module_a')
      expect(requires).toContain('module_b')
      expect(requires).toContain('module_c')
    })
  })

  describe('collect', () => {
    it('should collect the main entry file', async () => {
      const files = {
        '/project/main.lua': 'print("Hello")',
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig()

      const result = await collector.collect(config)

      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe('main.lua')
      expect(result.files[0].content).toBe('print("Hello")')
    })

    it('should recursively collect required modules', async () => {
      const files = {
        '/project/main.lua': 'local utils = require("utils")\nprint("Hello")',
        '/project/utils.lua': 'return { helper = function() end }',
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig()

      const result = await collector.collect(config)

      expect(result.files).toHaveLength(2)
      expect(result.files.map((f) => f.path)).toContain('main.lua')
      expect(result.files.map((f) => f.path)).toContain('utils.lua')
    })

    it('should handle nested module paths', async () => {
      const files = {
        '/project/main.lua': 'local game = require("game.core")',
        '/project/game/core.lua': 'return {}',
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig()

      const result = await collector.collect(config)

      expect(result.files).toHaveLength(2)
      expect(result.files.map((f) => f.path)).toContain('game/core.lua')
    })

    it('should not include duplicate files', async () => {
      const files = {
        '/project/main.lua': `
          local utils = require("utils")
          local other = require("other")
        `,
        '/project/utils.lua': 'return {}',
        '/project/other.lua': 'local utils = require("utils")\nreturn {}',
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig()

      const result = await collector.collect(config)

      expect(result.files).toHaveLength(3)
      const paths = result.files.map((f) => f.path)
      expect(paths.filter((p) => p === 'utils.lua')).toHaveLength(1)
    })

    it('should collect binary assets from asset directories', async () => {
      const files = {
        '/project/main.lua': 'print("Hello")',
      }
      const binaryFiles = {
        '/project/assets/player.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        '/project/assets/font.ttf': new Uint8Array([0x00, 0x01, 0x00, 0x00]),
      }
      const fs = createMockFileSystem(files, binaryFiles)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig({
        canvas: {
          assets: ['assets/'],
        },
      })

      const result = await collector.collect(config)

      expect(result.assets).toHaveLength(2)
      expect(result.assets.map((a) => a.path)).toContain('assets/player.png')
      expect(result.assets.map((a) => a.path)).toContain('assets/font.ttf')
    })

    it('should detect MIME types for common file extensions', async () => {
      const files = {
        '/project/main.lua': 'print("Hello")',
      }
      const binaryFiles = {
        '/project/assets/image.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        '/project/assets/image.jpg': new Uint8Array([0xff, 0xd8, 0xff]),
        '/project/assets/font.ttf': new Uint8Array([0x00, 0x01, 0x00, 0x00]),
        '/project/assets/sound.mp3': new Uint8Array([0x49, 0x44, 0x33]),
      }
      const fs = createMockFileSystem(files, binaryFiles)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig({
        canvas: {
          assets: ['assets/'],
        },
      })

      const result = await collector.collect(config)

      const byPath = Object.fromEntries(result.assets.map((a) => [a.path, a]))
      expect(byPath['assets/image.png'].mimeType).toBe('image/png')
      expect(byPath['assets/image.jpg'].mimeType).toBe('image/jpeg')
      expect(byPath['assets/font.ttf'].mimeType).toBe('font/ttf')
      expect(byPath['assets/sound.mp3'].mimeType).toBe('audio/mpeg')
    })

    it('should handle missing main file gracefully', async () => {
      const files = {}
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig()

      await expect(collector.collect(config)).rejects.toThrow('main.lua')
    })

    it('should handle missing required module gracefully', async () => {
      const files = {
        '/project/main.lua': 'local missing = require("missing")',
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig()

      // Should not throw - just skip missing modules
      const result = await collector.collect(config)
      expect(result.files).toHaveLength(1) // Only main.lua
    })

    it('should use fallback MIME type for unknown extensions', async () => {
      const files = {
        '/project/main.lua': 'print("Hello")',
      }
      const binaryFiles = {
        '/project/assets/data.xyz': new Uint8Array([0x00, 0x01, 0x02]),
      }
      const fs = createMockFileSystem(files, binaryFiles)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig({
        canvas: {
          assets: ['assets/'],
        },
      })

      const result = await collector.collect(config)

      expect(result.assets).toHaveLength(1)
      expect(result.assets[0].mimeType).toBe('application/octet-stream')
    })

    it('should handle shell projects with no canvas assets', async () => {
      const files = {
        '/project/main.lua': 'print("Hello")',
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')
      const config: ProjectConfig = {
        name: 'shell-app',
        main: 'main.lua',
        type: 'shell',
        shell: {
          columns: 80,
          rows: 24,
        },
      }

      const result = await collector.collect(config)

      expect(result.files).toHaveLength(1)
      expect(result.assets).toHaveLength(0)
    })

    it('should handle nested asset directories', async () => {
      const files = {
        '/project/main.lua': 'print("Hello")',
      }
      const binaryFiles = {
        '/project/assets/sprites/player.png': new Uint8Array([0x89, 0x50]),
        '/project/assets/sprites/enemy.png': new Uint8Array([0x89, 0x50]),
      }
      const fs = createMockFileSystem(files, binaryFiles)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig({
        canvas: {
          assets: ['assets/'],
        },
      })

      const result = await collector.collect(config)

      expect(result.assets.map((a) => a.path)).toContain('assets/sprites/player.png')
      expect(result.assets.map((a) => a.path)).toContain('assets/sprites/enemy.png')
    })

    it('should handle non-existent asset directory gracefully', async () => {
      const files = {
        '/project/main.lua': 'print("Hello")',
      }
      const fs = createMockFileSystem(files)
      const collector = new AssetCollector(fs, '/project')
      const config = createConfig({
        canvas: {
          assets: ['nonexistent/'],
        },
      })

      const result = await collector.collect(config)

      expect(result.files).toHaveLength(1)
      expect(result.assets).toHaveLength(0)
    })
  })
})
