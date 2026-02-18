import { describe, it, expect } from 'vitest'
import { CHAR_PALETTE_CATEGORIES, type CharCategory } from './charPaletteData'

function charsOf(cat: CharCategory): string[] {
  return cat.chars.map(e => e.char)
}

describe('CHAR_PALETTE_CATEGORIES', () => {
  it('should export exactly 6 categories', () => {
    expect(CHAR_PALETTE_CATEGORIES).toHaveLength(6)
  })

  it('should have categories in expected order: ascii, blocks, borders, geometric, arrows, symbols', () => {
    const ids = CHAR_PALETTE_CATEGORIES.map((c: CharCategory) => c.id)
    expect(ids).toEqual(['ascii', 'blocks', 'borders', 'geometric', 'arrows', 'symbols'])
  })

  it('should have unique category ids', () => {
    const ids = CHAR_PALETTE_CATEGORIES.map((c: CharCategory) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have non-empty chars array for each category', () => {
    for (const cat of CHAR_PALETTE_CATEGORIES) {
      expect(cat.chars.length, `${cat.id} should have chars`).toBeGreaterThan(0)
    }
  })

  it('should have every char be exactly length 1', () => {
    for (const cat of CHAR_PALETTE_CATEGORIES) {
      for (const entry of cat.chars) {
        expect(entry.char.length, `"${entry.char}" in ${cat.id} should be length 1`).toBe(1)
      }
    }
  })

  it('should have a non-empty name for every entry', () => {
    for (const cat of CHAR_PALETTE_CATEGORIES) {
      for (const entry of cat.chars) {
        expect(entry.name, `entry "${entry.char}" in ${cat.id} should have a name`).toBeTruthy()
      }
    }
  })

  it('should have no duplicate chars within a category', () => {
    for (const cat of CHAR_PALETTE_CATEGORIES) {
      const chars = charsOf(cat)
      const unique = new Set(chars)
      expect(unique.size, `${cat.id} should have no duplicate chars`).toBe(chars.length)
    }
  })

  it('should have id and label for each category', () => {
    for (const cat of CHAR_PALETTE_CATEGORIES) {
      expect(cat.id).toBeTruthy()
      expect(cat.label).toBeTruthy()
    }
  })

  it('should contain expected ASCII chars', () => {
    const ascii = CHAR_PALETTE_CATEGORIES.find((c: CharCategory) => c.id === 'ascii')!
    const chars = charsOf(ascii)
    expect(chars).toContain('#')
    expect(chars).toContain('@')
    expect(chars).toContain('*')
  })

  it('should contain expected block chars including fractional fills', () => {
    const blocks = CHAR_PALETTE_CATEGORIES.find((c: CharCategory) => c.id === 'blocks')!
    const chars = charsOf(blocks)
    expect(chars).toContain('░')
    expect(chars).toContain('▒')
    expect(chars).toContain('▓')
    expect(chars).toContain('█')
    expect(chars).toContain('▁')
    expect(chars).toContain('▂')
    expect(chars).toContain('▃')
    expect(chars).toContain('▅')
    expect(chars).toContain('▆')
    expect(chars).toContain('▇')
    expect(chars).toContain('▏')
    expect(chars).toContain('▎')
    expect(chars).toContain('▍')
    expect(chars).toContain('▋')
    expect(chars).toContain('▊')
    expect(chars).toContain('▉')
    expect(chars).toContain('▔')
    expect(chars).toContain('▕')
  })

  it('should contain quadrant block chars', () => {
    const blocks = CHAR_PALETTE_CATEGORIES.find((c: CharCategory) => c.id === 'blocks')!
    const chars = charsOf(blocks)
    expect(chars).toContain('▘')
    expect(chars).toContain('▝')
    expect(chars).toContain('▖')
    expect(chars).toContain('▗')
    expect(chars).toContain('▚')
    expect(chars).toContain('▞')
    expect(chars).toContain('▙')
    expect(chars).toContain('▛')
    expect(chars).toContain('▜')
    expect(chars).toContain('▟')
  })

  it('should contain light, heavy, rounded, and double border chars', () => {
    const borders = CHAR_PALETTE_CATEGORIES.find((c: CharCategory) => c.id === 'borders')!
    const chars = charsOf(borders)
    // Light
    expect(chars).toContain('─')
    expect(chars).toContain('│')
    expect(chars).toContain('┌')
    // Heavy
    expect(chars).toContain('━')
    expect(chars).toContain('┃')
    expect(chars).toContain('┏')
    expect(chars).toContain('╋')
    // Rounded
    expect(chars).toContain('╭')
    expect(chars).toContain('╮')
    expect(chars).toContain('╰')
    expect(chars).toContain('╯')
    // Double
    expect(chars).toContain('═')
    expect(chars).toContain('║')
  })

  it('should contain mixed and dashed border chars', () => {
    const borders = CHAR_PALETTE_CATEGORIES.find((c: CharCategory) => c.id === 'borders')!
    const chars = charsOf(borders)
    // Mixed T-pieces
    expect(chars).toContain('╞')
    expect(chars).toContain('╡')
    expect(chars).toContain('╟')
    expect(chars).toContain('╢')
    expect(chars).toContain('╪')
    expect(chars).toContain('╫')
    // Dashed
    expect(chars).toContain('┄')
    expect(chars).toContain('┅')
    expect(chars).toContain('┆')
    expect(chars).toContain('┇')
  })

  it('should contain black and white geometric variants', () => {
    const geo = CHAR_PALETTE_CATEGORIES.find((c: CharCategory) => c.id === 'geometric')!
    const chars = charsOf(geo)
    expect(chars).toContain('■')
    expect(chars).toContain('□')
    expect(chars).toContain('▲')
    expect(chars).toContain('△')
    expect(chars).toContain('◆')
    expect(chars).toContain('◇')
    expect(chars).toContain('◊')
    expect(chars).toContain('◘')
    expect(chars).toContain('◙')
  })

  it('should contain cardinal, diagonal, and double arrows', () => {
    const arrows = CHAR_PALETTE_CATEGORIES.find((c: CharCategory) => c.id === 'arrows')!
    const chars = charsOf(arrows)
    // Cardinal
    expect(chars).toContain('↑')
    expect(chars).toContain('↓')
    expect(chars).toContain('→')
    expect(chars).toContain('←')
    // Diagonal
    expect(chars).toContain('↗')
    expect(chars).toContain('↘')
    expect(chars).toContain('↙')
    expect(chars).toContain('↖')
    // Double
    expect(chars).toContain('⇑')
    expect(chars).toContain('⇒')
    expect(chars).toContain('⇔')
  })

  it('should contain currency, math, and fraction symbols', () => {
    const syms = CHAR_PALETTE_CATEGORIES.find((c: CharCategory) => c.id === 'symbols')!
    const chars = charsOf(syms)
    // Currency
    expect(chars).toContain('¢')
    expect(chars).toContain('£')
    expect(chars).toContain('¥')
    // Math
    expect(chars).toContain('±')
    expect(chars).toContain('×')
    expect(chars).toContain('÷')
    expect(chars).toContain('≈')
    expect(chars).toContain('≠')
    expect(chars).toContain('∞')
    // Fractions
    expect(chars).toContain('¼')
    expect(chars).toContain('½')
    expect(chars).toContain('¾')
    // Other
    expect(chars).toContain('™')
    expect(chars).toContain('★')
    expect(chars).toContain('✓')
    expect(chars).toContain('⌂')
  })
})
