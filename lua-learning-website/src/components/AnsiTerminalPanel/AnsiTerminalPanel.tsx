import { DEFAULT_USE_FONT_BLOCKS } from '@lua-learning/ansi-shared'
import { AnsiTerminalPanelPixel } from './AnsiTerminalPanelPixel'
import { AnsiTerminalPanelXterm } from './AnsiTerminalPanelXterm'
import type { AnsiTerminalHandle, AnsiTerminalPanelProps } from './types'

export type { AnsiTerminalHandle, AnsiTerminalPanelProps }

/**
 * Outer chooser: picks the pixel-perfect bitmap renderer (default) or
 * the legacy xterm.js + CanvasAddon renderer based on `useFontBlocks`.
 *
 * The two variants do NOT share state. Toggling `useFontBlocks` is a
 * render-mode change — we force a clean remount via React `key` so the
 * previous variant fully tears down before the new one starts. Consumers
 * observe a new handle via `onTerminalReady(newHandle)` after the swap.
 */
export function AnsiTerminalPanel(props: AnsiTerminalPanelProps) {
  const useFontBlocks = props.useFontBlocks ?? DEFAULT_USE_FONT_BLOCKS
  if (useFontBlocks) {
    return <AnsiTerminalPanelPixel key="pixel" {...props} />
  }
  return <AnsiTerminalPanelXterm key="xterm" {...props} />
}
