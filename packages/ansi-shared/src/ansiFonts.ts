/**
 * Registry of available terminal fonts for ANSI screens.
 *
 * The font ID is persisted in `.ansi.lua` files; the editor and runtime
 * resolve it to an xterm.js `fontFamily` string via {@link getFontFamily}.
 * To add a font: add an entry here, register a `@font-face` for it in the
 * editor (`AnsiTerminalPanel`) and the export template (`AnsiHtmlGenerator`).
 */

export type AnsiFontId = 'IBM_VGA'

export const DEFAULT_ANSI_FONT: AnsiFontId = 'IBM_VGA'

/** When true, xterm.js renders block-drawing chars via the font glyphs. */
export const DEFAULT_USE_FONT_BLOCKS = true

export interface AnsiFontDescriptor {
  /** xterm.js `fontFamily` value, including fallbacks. */
  fontFamily: string
  /** Human-readable name shown in UI. */
  displayName: string
}

export const ANSI_FONTS: Record<AnsiFontId, AnsiFontDescriptor> = {
  IBM_VGA: { fontFamily: '"IBM VGA 8x16", monospace', displayName: 'IBM VGA 8×16' },
}

export function isAnsiFontId(value: unknown): value is AnsiFontId {
  return typeof value === 'string' && value in ANSI_FONTS
}

export function getFontFamily(id: AnsiFontId | string | undefined): string {
  const key = isAnsiFontId(id) ? id : DEFAULT_ANSI_FONT
  return ANSI_FONTS[key].fontFamily
}

export function normalizeAnsiFont(id: unknown): AnsiFontId {
  return isAnsiFontId(id) ? id : DEFAULT_ANSI_FONT
}
