/**
 * Shared types for the AnsiTerminalPanel and its two renderer variants.
 */

import type { CrtConfig } from '@lua-learning/lua-runtime'
import type { ScaleMode } from '../AnsiGraphicsEditor/types'

export interface AnsiTerminalHandle {
  /** Write data (including ANSI escape sequences) to the terminal. */
  write: (data: string) => void
  /** The wrapper element holding the canvas. Cell-coord math uses this
   *  as `container` (the post-transform/post-scroll rect basis). */
  container: HTMLElement
  /** The scrollable outer element (overflow: auto). The editor attaches
   *  pan / Ctrl+wheel-zoom listeners here. Same element as `container`
   *  on consumers that don't need a separate scroll surface. */
  scrollContainer: HTMLElement
  /** Dispose of the terminal handle (lifecycle is component-managed; no-op for external callers). */
  dispose: () => void
  /** Enable/disable the CRT monitor effect with optional intensity or per-effect config. */
  setCrt: (enabled: boolean, intensity?: number, config?: Partial<CrtConfig>) => void
  /** Resize the underlying renderer to the given cell dimensions. */
  resize?: (cols: number, rows: number) => void
  /** Swap to a different registered bitmap font. */
  setFontFamily?: (fontId: string) => void | Promise<void>
  /**
   * Toggle whether block elements come from the font (true) or from
   * hand-coded reference patterns (false). The outer panel also remounts
   * on this change, so this is informational on the current variant.
   */
  setUseFontBlocks?: (useFontBlocks: boolean) => void
}

export interface AnsiTerminalPanelProps {
  isActive?: boolean
  scaleMode?: ScaleMode
  /** Initial terminal width in cells. Defaults to 80. */
  cols?: number
  /** Initial terminal height in cells. Defaults to 25. */
  rows?: number
  /** Registered bitmap font ID. Defaults to DEFAULT_FONT_ID. */
  fontId?: string
  /**
   * When true (default), mount the pixel-perfect bitmap renderer; when
   * false, mount the legacy xterm.js + CanvasAddon path. Toggling
   * forces a clean remount of the inner variant via React `key`.
   */
  useFontBlocks?: boolean
  /**
   * When true, snap the chosen integer scale UP to the smallest
   * multiple where `scale × devicePixelRatio` is integer, producing
   * uniform device-pixel mapping (no 1-2-1-2 browser nearest-neighbor
   * artifact at fractional DPRs). Falls back to nominal scale when the
   * snapped value would overflow the container. No effect on fit / fill
   * modes or at integer DPRs.
   */
  dprCompensate?: boolean
  /**
   * Numeric zoom multiplier (1 = 1x, 2 = 2x, 2.5 = 2.5x, etc.). When
   * present, takes precedence over `scaleMode` and is fed directly into
   * the renderer's CSS sizing path. `dprCompensate` still applies to snap
   * the value up to a DPR-clean multiple. Used by the ANSI editor for
   * user-driven viewport zoom; runtime callers continue using `scaleMode`.
   */
  zoom?: number
  /**
   * Callback when the terminal handle becomes available or is disposed.
   * Called with the handle on mount and with null on unmount.
   */
  onTerminalReady?: (handle: AnsiTerminalHandle | null) => void
}
