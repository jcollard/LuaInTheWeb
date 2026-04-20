/**
 * Entry point for bundling xterm.js + its render addons together.
 *
 * Render addons require access to xterm.js internal services (e.g.
 * _coreBrowserService) which are only shared properly when both are
 * loaded from the same module context. Loading them as separate UMD
 * scripts breaks this internal service sharing.
 *
 * This entry point is bundled by esbuild into a single IIFE that
 * exposes Terminal, CanvasAddon, and WebglAddon on globalThis.
 * WebglAddon is the preferred renderer (pixel-perfect block-drawing
 * characters via GPU nearest-neighbor sampling); CanvasAddon is the
 * fallback when WebGL is unavailable or a WebGL context loss occurs.
 */
import { Terminal } from '@xterm/xterm'
import { CanvasAddon } from '@xterm/addon-canvas'
import { WebglAddon } from '@xterm/addon-webgl'

;(globalThis as Record<string, unknown>).Terminal = Terminal
;(globalThis as Record<string, unknown>).CanvasAddon = CanvasAddon
;(globalThis as Record<string, unknown>).WebglAddon = WebglAddon
