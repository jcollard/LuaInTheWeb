/**
 * Parses ANSI escape sequences from text and extracts per-character
 * foreground and background colors.
 */

import type { RGBColor } from './screenTypes'

export interface AnsiParseResult {
  text: string
  fgColors: RGBColor[]
  bgColors: (RGBColor | undefined)[]
}

/** Standard CGA palette (indices 0-7). */
const CGA_COLORS: RGBColor[] = [
  [0, 0, 0],         // 0 black
  [170, 0, 0],       // 1 red
  [0, 170, 0],       // 2 green
  [170, 85, 0],      // 3 yellow/brown
  [0, 0, 170],       // 4 blue
  [170, 0, 170],     // 5 magenta
  [0, 170, 170],     // 6 cyan
  [170, 170, 170],   // 7 white/light gray
]

/** Bright CGA palette (indices 8-15). */
const CGA_BRIGHT: RGBColor[] = [
  [85, 85, 85],      // 8 dark gray
  [255, 85, 85],     // 9 bright red
  [85, 255, 85],     // 10 bright green
  [255, 255, 85],    // 11 bright yellow
  [85, 85, 255],     // 12 bright blue
  [255, 85, 255],    // 13 bright magenta
  [85, 255, 255],    // 14 bright cyan
  [255, 255, 255],   // 15 bright white
]

/**
 * Parse ANSI escape sequences in the input string and extract per-character colors.
 *
 * Supported SGR codes:
 * - 0: reset
 * - 30-37: standard fg, 40-47: standard bg
 * - 38;2;R;G;B: 24-bit fg, 48;2;R;G;B: 24-bit bg
 * - 39: default fg, 49: default bg
 * - 90-97: bright fg, 100-107: bright bg
 */
export function parseAnsiEscapes(
  input: string,
  defaultFg: RGBColor,
  defaultBg?: RGBColor,
): AnsiParseResult {
  const chars: string[] = []
  const fgColors: RGBColor[] = []
  const bgColors: (RGBColor | undefined)[] = []

  let currentFg: RGBColor = defaultFg
  let currentBg: RGBColor | undefined = defaultBg

  let i = 0
  while (i < input.length) {
    // Check for ESC
    if (input[i] === '\x1b') {
      // Must be followed by '[' for CSI
      if (i + 1 < input.length && input[i + 1] === '[') {
        i += 2 // skip ESC [
        // Consume the CSI sequence: params + final byte
        let paramStr = ''
        while (i < input.length && input[i] >= '\x20' && input[i] <= '\x3f') {
          paramStr += input[i]
          i++
        }
        // Final byte
        const finalByte = i < input.length ? input[i] : ''
        i++ // skip final byte

        // Only process SGR (final byte 'm')
        if (finalByte === 'm') {
          applySgr(paramStr, defaultFg, defaultBg)
        }
      } else {
        // Bare ESC without [, treat as literal
        chars.push(input[i])
        fgColors.push([...currentFg] as RGBColor)
        bgColors.push(currentBg ? [...currentBg] as RGBColor : undefined)
        i++
      }
    } else {
      chars.push(input[i])
      fgColors.push([...currentFg] as RGBColor)
      bgColors.push(currentBg ? [...currentBg] as RGBColor : undefined)
      i++
    }
  }

  return { text: chars.join(''), fgColors, bgColors }

  function applySgr(paramStr: string, defFg: RGBColor, defBg: RGBColor | undefined): void {
    // Empty params = reset
    if (paramStr === '') {
      currentFg = defFg
      currentBg = defBg
      return
    }

    const params = paramStr.split(';').map(s => {
      const n = parseInt(s, 10)
      return isNaN(n) ? 0 : n
    })

    let j = 0
    while (j < params.length) {
      const code = params[j]
      if (code === 0) {
        currentFg = defFg
        currentBg = defBg
      } else if (code >= 30 && code <= 37) {
        currentFg = CGA_COLORS[code - 30]
      } else if (code === 38) {
        // Extended fg
        if (j + 1 < params.length && params[j + 1] === 2) {
          // 24-bit: 38;2;R;G;B
          if (j + 4 < params.length) {
            const r = Math.min(255, Math.max(0, params[j + 2]))
            const g = Math.min(255, Math.max(0, params[j + 3]))
            const b = Math.min(255, Math.max(0, params[j + 4]))
            currentFg = [r, g, b]
            j += 4
          }
        }
      } else if (code === 39) {
        currentFg = defFg
      } else if (code >= 40 && code <= 47) {
        currentBg = CGA_COLORS[code - 40]
      } else if (code === 48) {
        // Extended bg
        if (j + 1 < params.length && params[j + 1] === 2) {
          if (j + 4 < params.length) {
            const r = Math.min(255, Math.max(0, params[j + 2]))
            const g = Math.min(255, Math.max(0, params[j + 3]))
            const b = Math.min(255, Math.max(0, params[j + 4]))
            currentBg = [r, g, b]
            j += 4
          }
        }
      } else if (code === 49) {
        currentBg = defBg
      } else if (code >= 90 && code <= 97) {
        currentFg = CGA_BRIGHT[code - 90]
      } else if (code >= 100 && code <= 107) {
        currentBg = CGA_BRIGHT[code - 100]
      }
      j++
    }
  }
}
