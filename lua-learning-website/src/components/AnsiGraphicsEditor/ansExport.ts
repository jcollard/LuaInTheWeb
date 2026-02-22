import type { AnsiGrid, RGBColor } from './types'
import { CGA_PALETTE } from './types'

/**
 * Full CP437 character table — 256 Unicode entries indexed by CP437 byte value.
 */
export const CP437_TABLE: string[] = [
  // 0x00–0x0F
  '\u0000', '\u263A', '\u263B', '\u2665', '\u2666', '\u2663', '\u2660', '\u2022',
  '\u25D8', '\u25CB', '\u25D9', '\u2642', '\u2640', '\u266A', '\u266B', '\u263C',
  // 0x10–0x1F
  '\u25BA', '\u25C4', '\u2195', '\u203C', '\u00B6', '\u00A7', '\u25AC', '\u21A8',
  '\u2191', '\u2193', '\u2192', '\u2190', '\u221F', '\u2194', '\u25B2', '\u25BC',
  // 0x20–0x7E: printable ASCII
  ' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?',
  '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
  'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', '\\', ']', '^', '_',
  '`', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
  'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '{', '|', '}', '~',
  // 0x7F
  '\u2302',
  // 0x80–0x8F
  '\u00C7', '\u00FC', '\u00E9', '\u00E2', '\u00E4', '\u00E0', '\u00E5', '\u00E7',
  '\u00EA', '\u00EB', '\u00E8', '\u00EF', '\u00EE', '\u00EC', '\u00C4', '\u00C5',
  // 0x90–0x9F
  '\u00C9', '\u00E6', '\u00C6', '\u00F4', '\u00F6', '\u00F2', '\u00FB', '\u00F9',
  '\u00FF', '\u00D6', '\u00DC', '\u00A2', '\u00A3', '\u00A5', '\u20A7', '\u0192',
  // 0xA0–0xAF
  '\u00E1', '\u00ED', '\u00F3', '\u00FA', '\u00F1', '\u00D1', '\u00AA', '\u00BA',
  '\u00BF', '\u2310', '\u00AC', '\u00BD', '\u00BC', '\u00A1', '\u00AB', '\u00BB',
  // 0xB0–0xBF
  '\u2591', '\u2592', '\u2593', '\u2502', '\u2524', '\u2561', '\u2562', '\u2556',
  '\u2555', '\u2563', '\u2551', '\u2557', '\u255D', '\u255C', '\u255B', '\u2510',
  // 0xC0–0xCF
  '\u2514', '\u2534', '\u252C', '\u251C', '\u2500', '\u253C', '\u255E', '\u255F',
  '\u255A', '\u2554', '\u2569', '\u2566', '\u2560', '\u2550', '\u256C', '\u2567',
  // 0xD0–0xDF
  '\u2568', '\u2564', '\u2565', '\u2559', '\u2558', '\u2552', '\u2553', '\u256B',
  '\u256A', '\u2518', '\u250C', '\u2588', '\u2584', '\u258C', '\u2590', '\u2580',
  // 0xE0–0xEF
  '\u03B1', '\u00DF', '\u0393', '\u03C0', '\u03A3', '\u03C3', '\u00B5', '\u03C4',
  '\u03A6', '\u0398', '\u03A9', '\u03B4', '\u221E', '\u03C6', '\u03B5', '\u2229',
  // 0xF0–0xFF
  '\u2261', '\u00B1', '\u2265', '\u2264', '\u2320', '\u2321', '\u00F7', '\u2248',
  '\u00B0', '\u2219', '\u00B7', '\u221A', '\u207F', '\u00B2', '\u25A0', '\u00A0',
]

/** Reverse lookup: Unicode char → CP437 byte value. Built lazily on first use. */
let cp437Reverse: Map<string, number> | null = null

function getCp437Reverse(): Map<string, number> {
  if (cp437Reverse) return cp437Reverse
  cp437Reverse = new Map<string, number>()
  for (let i = 0; i < 256; i++) {
    cp437Reverse.set(CP437_TABLE[i], i)
  }
  return cp437Reverse
}

export function unicodeToCp437(char: string): number {
  if (char.length === 0) return 0x20
  const code = char.charCodeAt(0)
  // Fast path: printable ASCII
  if (code >= 0x20 && code <= 0x7e) return code
  const byte = getCp437Reverse().get(char)
  return byte ?? 0x20
}

/** CGA palette RGB values for nearest-color matching. */
const CGA_COLORS: RGBColor[] = CGA_PALETTE.map(e => e.rgb)

/**
 * CGA index → SGR foreground code.
 * Indices 0-7 map to SGR 30-37; indices 8-15 reuse 30-37 with bold attribute.
 */
const CGA_FG_SGR = [30, 34, 32, 36, 31, 35, 33, 37, 30, 34, 32, 36, 31, 35, 33, 37]

/**
 * CGA index → SGR background code.
 * Indices 0-7 map to SGR 40-47; indices 8-15 reuse 40-47 with blink/iCE attribute.
 */
const CGA_BG_SGR = [40, 44, 42, 46, 41, 45, 43, 47, 40, 44, 42, 46, 41, 45, 43, 47]

/** Map an RGB color to the nearest CGA 16-color palette index. */
export function nearestCgaIndex(color: RGBColor): number {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < 16; i++) {
    const c = CGA_COLORS[i]
    const dr = color[0] - c[0]
    const dg = color[1] - c[1]
    const db = color[2] - c[2]
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return bestIdx
}

/** Map an RGB color to the nearest CGA palette RGB value. */
export function cgaQuantize(color: RGBColor): RGBColor {
  return CGA_COLORS[nearestCgaIndex(color)]
}

export function gridToAnsBytes(grid: AnsiGrid): Uint8Array {
  const bytes: number[] = []
  const ESC = 0x1b

  function pushString(s: string): void {
    for (let i = 0; i < s.length; i++) {
      bytes.push(s.charCodeAt(i))
    }
  }

  function pushReset(): void {
    bytes.push(ESC)
    pushString('[0m')
  }

  /** Emit a combined SGR: \x1b[0;{bold?};{blink?};{fg};{bg}m */
  function pushSgr(fgIdx: number, bgIdx: number): void {
    const parts: number[] = [0] // reset
    if (fgIdx >= 8) parts.push(1)  // bold for bright fg
    if (bgIdx >= 8) parts.push(5)  // blink/iCE for bright bg
    parts.push(CGA_FG_SGR[fgIdx])
    parts.push(CGA_BG_SGR[bgIdx])
    bytes.push(ESC)
    pushString(`[${parts.join(';')}m`)
  }

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]
    pushReset()
    let curFgIdx = -1
    let curBgIdx = -1

    for (let c = 0; c < row.length; c++) {
      const cell = row[c]
      const fgIdx = nearestCgaIndex(cell.fg)
      const bgIdx = nearestCgaIndex(cell.bg)
      if (fgIdx !== curFgIdx || bgIdx !== curBgIdx) {
        pushSgr(fgIdx, bgIdx)
        curFgIdx = fgIdx
        curBgIdx = bgIdx
      }
      bytes.push(unicodeToCp437(cell.char))
    }

    bytes.push(0x0d, 0x0a) // \r\n
  }

  pushReset()
  return new Uint8Array(bytes)
}

export function buildSauceRecord(title: string, fileSize: number): Uint8Array {
  const record = new Uint8Array(128)
  const view = new DataView(record.buffer)

  function writeAscii(offset: number, str: string, len: number, pad = ' '): void {
    const truncated = str.slice(0, len)
    for (let i = 0; i < len; i++) {
      record[offset + i] = i < truncated.length ? truncated.charCodeAt(i) : pad.charCodeAt(0)
    }
  }

  // Magic
  writeAscii(0, 'SAUCE', 5)
  // Version
  writeAscii(5, '00', 2)
  // Title (35 bytes, space-padded)
  writeAscii(7, title, 35)
  // Author (20 bytes, space-padded)
  writeAscii(42, '', 20)
  // Group (20 bytes, space-padded)
  writeAscii(62, '', 20)
  // Date YYYYMMDD (8 bytes)
  const now = new Date()
  const yyyy = now.getFullYear().toString()
  const mm = (now.getMonth() + 1).toString().padStart(2, '0')
  const dd = now.getDate().toString().padStart(2, '0')
  writeAscii(82, `${yyyy}${mm}${dd}`, 8)
  // FileSize (4 bytes, LE)
  view.setUint32(90, fileSize, true)
  // DataType = 1 (Character)
  record[94] = 1
  // FileType = 1 (ANSi)
  record[95] = 1
  // TInfo1 = 80 (width, LE 16-bit)
  view.setUint16(96, 80, true)
  // TInfo2 = 25 (height, LE 16-bit)
  view.setUint16(98, 25, true)
  // TInfo3/4 = 0 (already zero)
  // Comments = 0 (already zero at offset 104)
  // TFlags = 0x01 (iCE colors)
  record[105] = 0x01
  // TInfoS = "IBM VGA" (22 bytes, null-padded — already zero-initialized)
  writeAscii(106, 'IBM VGA', 7, '\0')

  return record
}

export function exportAnsFile(grid: AnsiGrid, title?: string): Uint8Array {
  const ansData = gridToAnsBytes(grid)
  const sauceTitle = title ?? 'untitled'
  const sauce = buildSauceRecord(sauceTitle, ansData.byteLength)

  const result = new Uint8Array(ansData.byteLength + 1 + 128)
  result.set(ansData, 0)
  result[ansData.byteLength] = 0x1a // EOF marker
  result.set(sauce, ansData.byteLength + 1)

  return result
}
