import { describe, it, expect } from 'vitest'
import { ProjectConfigParser } from '../src/ProjectConfigParser'

describe('ProjectConfigParser - ansi.use_font_blocks', () => {
  describe('validate', () => {
    it('applies "auto" as the default when not specified', () => {
      const config = ProjectConfigParser.validateConfig({
        name: 'test',
        main: 'main.lua',
        type: 'ansi',
      })
      expect(config.ansi?.use_font_blocks).toBe('auto')
    })

    it('preserves "auto" when explicitly set', () => {
      const config = ProjectConfigParser.validateConfig({
        name: 'test',
        main: 'main.lua',
        type: 'ansi',
        ansi: { use_font_blocks: 'auto' },
      })
      expect(config.ansi?.use_font_blocks).toBe('auto')
    })

    it('accepts "on"', () => {
      const config = ProjectConfigParser.validateConfig({
        name: 'test',
        main: 'main.lua',
        type: 'ansi',
        ansi: { use_font_blocks: 'on' },
      })
      expect(config.ansi?.use_font_blocks).toBe('on')
    })

    it('accepts "off"', () => {
      const config = ProjectConfigParser.validateConfig({
        name: 'test',
        main: 'main.lua',
        type: 'ansi',
        ansi: { use_font_blocks: 'off' },
      })
      expect(config.ansi?.use_font_blocks).toBe('off')
    })

    it('rejects an invalid value', () => {
      expect(() =>
        ProjectConfigParser.validateConfig({
          name: 'test',
          main: 'main.lua',
          type: 'ansi',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ansi: { use_font_blocks: 'maybe' as any },
        })
      ).toThrow("ansi.use_font_blocks must be 'on', 'off', or 'auto'")
    })
  })

  describe('parseContent', () => {
    it('parses use_font_blocks from project.lua', () => {
      const content = `return {
        name = "test",
        main = "main.lua",
        type = "ansi",
        ansi = { use_font_blocks = "off" }
      }`
      const result = ProjectConfigParser.parseContent(content)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.config.ansi?.use_font_blocks).toBe('off')
      }
    })

    it('rejects an invalid use_font_blocks value from project.lua', () => {
      const content = `return {
        name = "test",
        main = "main.lua",
        type = "ansi",
        ansi = { use_font_blocks = "yes" }
      }`
      const result = ProjectConfigParser.parseContent(content)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('use_font_blocks')
      }
    })
  })
})
