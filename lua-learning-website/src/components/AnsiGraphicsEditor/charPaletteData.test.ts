import { describe, it, expect } from 'vitest'
import { CHAR_PALETTE_CATEGORIES, findCategoryForChar, getCharName } from './charPaletteData'

function charsOfCategory(id: string): string[] {
  const category = CHAR_PALETTE_CATEGORIES.find(c => c.id === id)
  if (!category) throw new Error(`Category "${id}" not found`)
  return category.chars.map(e => e.char)
}

describe('CHAR_PALETTE_CATEGORIES', () => {
  it('should export exactly 7 categories', () => {
    expect(CHAR_PALETTE_CATEGORIES).toHaveLength(7)
  })

  it('should have categories in expected order: alpha, ascii, blocks, borders, geometric, arrows, symbols', () => {
    const ids = CHAR_PALETTE_CATEGORIES.map(c => c.id)
    expect(ids).toEqual(['alpha', 'ascii', 'blocks', 'borders', 'geometric', 'arrows', 'symbols'])
  })

  it('should expose A-Z, a-z, and 0-9 in the alpha category', () => {
    const alphaChars = charsOfCategory('alpha')
    expect(alphaChars).toHaveLength(10 + 26 + 26)
    expect(alphaChars).toContain('0')
    expect(alphaChars).toContain('9')
    expect(alphaChars).toContain('A')
    expect(alphaChars).toContain('Z')
    expect(alphaChars).toContain('a')
    expect(alphaChars).toContain('z')
  })

  it('should have unique category ids', () => {
    const ids = CHAR_PALETTE_CATEGORIES.map(c => c.id)
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
      const chars = cat.chars.map(e => e.char)
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
    const chars = charsOfCategory('ascii')
    expect(chars).toContain('#')
    expect(chars).toContain('@')
    expect(chars).toContain('*')
  })

  it('should contain expected block chars including fractional fills', () => {
    const chars = charsOfCategory('blocks')
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
    const chars = charsOfCategory('blocks')
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
    const chars = charsOfCategory('borders')
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
    const chars = charsOfCategory('borders')
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
    const chars = charsOfCategory('geometric')
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
    const chars = charsOfCategory('arrows')
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
    const chars = charsOfCategory('symbols')
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

describe('findCategoryForChar', () => {
  it('should return "ascii" for an ASCII punctuation char', () => {
    expect(findCategoryForChar('#')).toBe('ascii')
  })

  it('should return "blocks" for a block char', () => {
    expect(findCategoryForChar('█')).toBe('blocks')
  })

  it('should return "borders" for a border char', () => {
    expect(findCategoryForChar('╔')).toBe('borders')
  })

  it('should return "geometric" for a geometric char', () => {
    expect(findCategoryForChar('●')).toBe('geometric')
  })

  it('should return "arrows" for an arrow char', () => {
    expect(findCategoryForChar('→')).toBe('arrows')
  })

  it('should return "symbols" for a symbol char', () => {
    expect(findCategoryForChar('♠')).toBe('symbols')
  })

  it('should return "alpha" for a letter or digit', () => {
    expect(findCategoryForChar('Z')).toBe('alpha')
    expect(findCategoryForChar('0')).toBe('alpha')
  })

  it('should return undefined for a char not in any category', () => {
    expect(findCategoryForChar('¡')).toBeUndefined() // ¡ — not in any palette tab
  })

  it('should return undefined for an empty string', () => {
    expect(findCategoryForChar('')).toBeUndefined()
  })
})

describe('getCharName', () => {
  it('returns the curated name for a char in the palette categories', () => {
    expect(getCharName('▕')).toBe('Right One Eighth')
    expect(getCharName('☺')).toBe('White Smiley')
    expect(getCharName('═')).toBe('Double Horizontal')
  })

  it('returns U+#### for an uncurated codepoint', () => {
    // Hiragana ん — not in any palette category.
    expect(getCharName('ん')).toBe('U+3093')
  })

  it('zero-pads codepoints below 0x1000', () => {
    expect(getCharName('A')).toBe('A') // curated as plain "A" in the alpha tab
    // A codepoint not in the curated set, low value:
    expect(getCharName('þ')).toBe('U+00FE')
  })

  it('returns empty string for the empty input', () => {
    expect(getCharName('')).toBe('')
  })
})
