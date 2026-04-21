/**
 * Entry point for bundling xterm.js + CanvasAddon together.
 *
 * The CanvasAddon requires access to xterm.js internal services
 * (e.g. _coreBrowserService) which are only shared properly when
 * both are loaded from the same module context. Loading them as
 * separate UMD scripts breaks this internal service sharing.
 *
 * This entry point is bundled by esbuild into a single IIFE that
 * exposes both Terminal and CanvasAddon on globalThis. The ANSI
 * export uses PixelAnsiRenderer (bundled via ansi-inline-entry) for
 * its rendering; this bundle is retained for the shell export and
 * any legacy callers that still rely on the `Terminal` / `CanvasAddon`
 * globals.
 */
import { Terminal } from '@xterm/xterm'
import { CanvasAddon } from '@xterm/addon-canvas'

;(globalThis as Record<string, unknown>).Terminal = Terminal
;(globalThis as Record<string, unknown>).CanvasAddon = CanvasAddon
