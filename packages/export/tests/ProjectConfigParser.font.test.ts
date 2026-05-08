import { describe, it, expect } from 'vitest'
import { ProjectConfigParser } from '../src/ProjectConfigParser'
import type { IFileSystem, FileEntry } from '@lua-learning/shell-core'

function createMockFileSystem(files: Record<string, string>): IFileSystem {
  return {
    getCurrentDirectory: () => '/',
    setCurrentDirectory: () => {},
    exists: (path: string) => path in files || path === '/',
    isDirectory: (path: string) => path === '/' || path.endsWith('/'),
    isFile: (path: string) => path in files,
    listDirectory: (): FileEntry[] => [],
    readFile: (path: string) => {
      if (!(path in files)) throw new Error(`File not found: ${path}`)
      return files[path]
    },
    writeFile: () => {},
    createDirectory: () => {},
    delete: () => {},
  }
}

describe('ProjectConfigParser - use_font_blocks override', () => {
  const parser = new ProjectConfigParser(createMockFileSystem({}))

  describe('validate', () => {
    it('leaves use_font_blocks undefined when omitted (auto / per-screen)', () => {
      const config = parser.validate({
        name: 'test',
        main: 'main.lua',
        type: 'ansi',
      })

      expect(config.ansi?.use_font_blocks).toBeUndefined()
    })

    it('preserves use_font_blocks=true when explicitly set', () => {
      const config = parser.validate({
        name: 'test',
        main: 'main.lua',
        type: 'ansi',
        ansi: { use_font_blocks: true },
      })

      expect(config.ansi?.use_font_blocks).toBe(true)
    })

    it('preserves use_font_blocks=false when explicitly set (not coerced to undefined)', () => {
      const config = parser.validate({
        name: 'test',
        main: 'main.lua',
        type: 'ansi',
        ansi: { use_font_blocks: false },
      })

      expect(config.ansi?.use_font_blocks).toBe(false)
    })
  })

  describe('parseContent (Lua source round-trip)', () => {
    it('round-trips use_font_blocks=true from Lua source', () => {
      const result = ProjectConfigParser.parseContent(`return {
        name = "test",
        main = "main.lua",
        type = "ansi",
        ansi = { use_font_blocks = true }
      }`)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.config.ansi?.use_font_blocks).toBe(true)
      }
    })

    it('round-trips use_font_blocks=false from Lua source', () => {
      const result = ProjectConfigParser.parseContent(`return {
        name = "test",
        main = "main.lua",
        type = "ansi",
        ansi = { use_font_blocks = false }
      }`)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.config.ansi?.use_font_blocks).toBe(false)
      }
    })
  })
})
