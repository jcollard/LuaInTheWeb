import { describe, it, expect } from 'vitest'
import { parseAnsiEscapes } from '../src/ansiEscapeParser'
import type { RGBColor } from '../src/screenTypes'

const WHITE: RGBColor = [255, 255, 255]
const BLACK: RGBColor = [0, 0, 0]

describe('parseAnsiEscapes', () => {
  it('returns plain text unchanged with default colors', () => {
    const result = parseAnsiEscapes('Hello', WHITE)
    expect(result.text).toBe('Hello')
    expect(result.fgColors).toEqual([WHITE, WHITE, WHITE, WHITE, WHITE])
    expect(result.bgColors).toHaveLength(5)
    // bg should be undefined entries (no bg set)
    result.bgColors.forEach(c => expect(c).toBeUndefined())
  })

  it('handles empty string', () => {
    const result = parseAnsiEscapes('', WHITE)
    expect(result.text).toBe('')
    expect(result.fgColors).toEqual([])
    expect(result.bgColors).toEqual([])
  })

  describe('standard SGR foreground colors', () => {
    it('parses \\x1b[31m as red foreground', () => {
      const result = parseAnsiEscapes('\x1b[31mHi', WHITE)
      expect(result.text).toBe('Hi')
      expect(result.fgColors[0]).toEqual([170, 0, 0])  // CGA red
      expect(result.fgColors[1]).toEqual([170, 0, 0])
    })

    it('parses \\x1b[32m as green foreground', () => {
      const result = parseAnsiEscapes('\x1b[32mX', WHITE)
      expect(result.fgColors[0]).toEqual([0, 170, 0])
    })

    it('parses \\x1b[37m as light gray foreground', () => {
      const result = parseAnsiEscapes('\x1b[37mX', WHITE)
      expect(result.fgColors[0]).toEqual([170, 170, 170])
    })
  })

  describe('standard SGR background colors', () => {
    it('parses \\x1b[41m as red background', () => {
      const result = parseAnsiEscapes('\x1b[41mHi', WHITE)
      expect(result.text).toBe('Hi')
      expect(result.bgColors[0]).toEqual([170, 0, 0])
      expect(result.bgColors[1]).toEqual([170, 0, 0])
    })

    it('parses \\x1b[42m as green background', () => {
      const result = parseAnsiEscapes('\x1b[42mX', WHITE)
      expect(result.bgColors[0]).toEqual([0, 170, 0])
    })
  })

  describe('bright colors', () => {
    it('parses \\x1b[91m as bright red foreground', () => {
      const result = parseAnsiEscapes('\x1b[91mX', WHITE)
      expect(result.fgColors[0]).toEqual([255, 85, 85])
    })

    it('parses \\x1b[102m as bright green background', () => {
      const result = parseAnsiEscapes('\x1b[102mX', WHITE)
      expect(result.bgColors[0]).toEqual([85, 255, 85])
    })
  })

  describe('24-bit RGB colors', () => {
    it('parses \\x1b[38;2;R;G;Bm for fg', () => {
      const result = parseAnsiEscapes('\x1b[38;2;255;128;0mX', WHITE)
      expect(result.fgColors[0]).toEqual([255, 128, 0])
    })

    it('parses \\x1b[48;2;R;G;Bm for bg', () => {
      const result = parseAnsiEscapes('\x1b[48;2;0;128;255mX', WHITE)
      expect(result.bgColors[0]).toEqual([0, 128, 255])
    })
  })

  describe('reset', () => {
    it('resets fg and bg on \\x1b[0m', () => {
      const result = parseAnsiEscapes('\x1b[31;42mA\x1b[0mB', WHITE)
      expect(result.text).toBe('AB')
      expect(result.fgColors[0]).toEqual([170, 0, 0])
      expect(result.bgColors[0]).toEqual([0, 170, 0])
      expect(result.fgColors[1]).toEqual(WHITE)  // reset to default
      expect(result.bgColors[1]).toBeUndefined()  // reset to no bg
    })

    it('treats \\x1b[m as reset', () => {
      const result = parseAnsiEscapes('\x1b[31mA\x1b[mB', WHITE)
      expect(result.fgColors[1]).toEqual(WHITE)
    })
  })

  describe('combined parameters', () => {
    it('parses \\x1b[31;42m as red fg + green bg', () => {
      const result = parseAnsiEscapes('\x1b[31;42mX', WHITE)
      expect(result.fgColors[0]).toEqual([170, 0, 0])
      expect(result.bgColors[0]).toEqual([0, 170, 0])
    })
  })

  describe('default fg/bg codes', () => {
    it('resets fg on \\x1b[39m', () => {
      const result = parseAnsiEscapes('\x1b[31mA\x1b[39mB', WHITE)
      expect(result.fgColors[0]).toEqual([170, 0, 0])
      expect(result.fgColors[1]).toEqual(WHITE)
    })

    it('resets bg on \\x1b[49m', () => {
      const result = parseAnsiEscapes('\x1b[42mA\x1b[49mB', WHITE)
      expect(result.bgColors[0]).toEqual([0, 170, 0])
      expect(result.bgColors[1]).toBeUndefined()
    })
  })

  describe('multi-segment text', () => {
    it('handles multiple color changes', () => {
      const result = parseAnsiEscapes('\x1b[31mRed\x1b[32mGreen\x1b[0mNormal', WHITE)
      expect(result.text).toBe('RedGreenNormal')
      expect(result.fgColors[0]).toEqual([170, 0, 0])    // R
      expect(result.fgColors[1]).toEqual([170, 0, 0])    // e
      expect(result.fgColors[2]).toEqual([170, 0, 0])    // d
      expect(result.fgColors[3]).toEqual([0, 170, 0])    // G
      expect(result.fgColors[8]).toEqual(WHITE)           // N
    })
  })

  describe('edge cases', () => {
    it('ignores non-SGR CSI sequences', () => {
      const result = parseAnsiEscapes('\x1b[2JHi', WHITE)
      expect(result.text).toBe('Hi')
      expect(result.fgColors).toEqual([WHITE, WHITE])
    })

    it('handles malformed sequences gracefully', () => {
      const result = parseAnsiEscapes('\x1b[38;2;mHi', WHITE)
      expect(result.text).toBe('Hi')
      // Should not crash, fg stays default
    })

    it('treats bare \\x1b without [ as literal', () => {
      const result = parseAnsiEscapes('\x1bHi', WHITE)
      expect(result.text).toBe('\x1bHi')
      expect(result.fgColors).toHaveLength(3)
    })

    it('uses defaultBg when provided', () => {
      const result = parseAnsiEscapes('Hi', WHITE, BLACK)
      expect(result.bgColors[0]).toEqual(BLACK)
      expect(result.bgColors[1]).toEqual(BLACK)
    })

    it('uses defaultBg after reset when defaultBg provided', () => {
      const result = parseAnsiEscapes('\x1b[42mA\x1b[0mB', WHITE, BLACK)
      expect(result.bgColors[0]).toEqual([0, 170, 0])
      expect(result.bgColors[1]).toEqual(BLACK)
    })
  })
})
