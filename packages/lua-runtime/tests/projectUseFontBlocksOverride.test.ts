import { describe, it, expect } from 'vitest'
import { extractUseFontBlocksOverride } from '../src/projectCrtConfig'

describe('extractUseFontBlocksOverride', () => {
  it('returns null when ansi section is missing', () => {
    const content = `return { name = "t", main = "m.lua", type = "ansi" }`
    expect(extractUseFontBlocksOverride(content)).toBeNull()
  })

  it('returns null when use_font_blocks is "auto"', () => {
    const content = `return {
      name = "t", main = "m.lua", type = "ansi",
      ansi = { use_font_blocks = "auto" }
    }`
    expect(extractUseFontBlocksOverride(content)).toBeNull()
  })

  it('returns null when use_font_blocks is unset', () => {
    const content = `return {
      name = "t", main = "m.lua", type = "ansi",
      ansi = { crt = false }
    }`
    expect(extractUseFontBlocksOverride(content)).toBeNull()
  })

  it('returns true when use_font_blocks is "on"', () => {
    const content = `return {
      name = "t", main = "m.lua", type = "ansi",
      ansi = { use_font_blocks = "on" }
    }`
    expect(extractUseFontBlocksOverride(content)).toBe(true)
  })

  it('returns false when use_font_blocks is "off"', () => {
    const content = `return {
      name = "t", main = "m.lua", type = "ansi",
      ansi = { use_font_blocks = "off" }
    }`
    expect(extractUseFontBlocksOverride(content)).toBe(false)
  })

  it('returns null for invalid values', () => {
    const content = `return {
      name = "t", main = "m.lua", type = "ansi",
      ansi = { use_font_blocks = "yes" }
    }`
    expect(extractUseFontBlocksOverride(content)).toBeNull()
  })

  it('returns null for unparseable input', () => {
    expect(extractUseFontBlocksOverride('return {')).toBeNull()
  })
})
