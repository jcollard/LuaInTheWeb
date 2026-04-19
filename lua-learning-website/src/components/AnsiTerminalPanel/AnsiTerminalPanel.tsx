import { useCallback, useEffect, useRef } from 'react'
import type { ScaleMode } from '../AnsiGraphicsEditor/types'
import { Terminal } from '@xterm/xterm'
import { CanvasAddon } from '@xterm/addon-canvas'
import { CrtShader, type CrtConfig } from '@lua-learning/lua-runtime'
import { DEFAULT_USE_FONT_BLOCKS, getFontFamily } from '@lua-learning/ansi-shared'
import '@xterm/xterm/css/xterm.css'
import styles from './AnsiTerminalPanel.module.css'

const DEFAULT_COLS = 80
const DEFAULT_ROWS = 25
const FONT_SIZE = 16
const DEFAULT_FONT_FAMILY = getFontFamily(undefined)

/**
 * With customGlyphs=false, xterm rasterizes each glyph into an off-screen
 * texture-atlas canvas via fillText, then drawImages to each cell. Default
 * fillText sub-pixel positioning leaves a 1-px AA edge baked into the atlas
 * bitmap that shows up as a black seam between stacked half-blocks (▀).
 * Snap glyph rasterization to integer pixels and disable smoothing on the
 * atlas itself so the cached bitmap is crisp.
 */
function patchAtlasCanvas(atlas: HTMLCanvasElement): void {
  const ctx = atlas.getContext('2d')
  type Patched = CanvasRenderingContext2D & { __patchedAtlas?: boolean; textRendering?: string }
  const pctx = ctx as Patched | null
  if (!pctx || pctx.__patchedAtlas) return
  pctx.imageSmoothingEnabled = false
  try { pctx.textRendering = 'geometricPrecision' } catch { /* unsupported */ }
  const orig = pctx.fillText.bind(pctx)
  pctx.fillText = (text: string, x: number, y: number, maxWidth?: number) => {
    const xs = Math.round(x), ys = Math.round(y)
    if (maxWidth === undefined) orig(text, xs, ys)
    else orig(text, xs, ys, maxWidth)
  }
  pctx.__patchedAtlas = true
}

/** Hook a CanvasAddon's atlas events so each new atlas page gets patched. */
function setupAtlasPatching(addon: CanvasAddon): void {
  if (typeof addon.onAddTextureAtlasCanvas === 'function') {
    addon.onAddTextureAtlasCanvas(patchAtlasCanvas)
  }
  if (typeof addon.onChangeTextureAtlas === 'function') {
    addon.onChangeTextureAtlas(patchAtlasCanvas)
  }
  if (addon.textureAtlas) patchAtlasCanvas(addon.textureAtlas)
}

export interface AnsiTerminalHandle {
  /** Write data (including ANSI escape sequences) to the terminal */
  write: (data: string) => void
  /** The container element for keyboard event capture */
  container: HTMLElement
  /** Dispose of the terminal handle */
  dispose: () => void
  /** Enable/disable CRT monitor effect with optional intensity or per-effect config */
  setCrt: (enabled: boolean, intensity?: number, config?: Partial<CrtConfig>) => void
  /** Resize the underlying xterm.js instance to the given cell dimensions. */
  resize?: (cols: number, rows: number) => void
  /** Update the xterm.js `fontFamily` option at runtime. */
  setFontFamily?: (fontFamily: string) => void
  /** Toggle font-glyph block rendering: true => `customGlyphs: false`. */
  setUseFontBlocks?: (useFontBlocks: boolean) => void
}

export interface AnsiTerminalPanelProps {
  isActive?: boolean
  scaleMode?: ScaleMode
  /** Initial terminal width in cells. Defaults to 80. */
  cols?: number
  /** Initial terminal height in cells. Defaults to 25. */
  rows?: number
  /** xterm.js font family. Defaults to IBM VGA 8x16 from the shared font registry. */
  fontFamily?: string
  /**
   * When true (default), xterm uses the font's glyphs for block-drawing
   * characters (xterm `customGlyphs: false`). When false, xterm rasterizes
   * its own rectangles (xterm `customGlyphs: true`, the legacy behavior).
   */
  useFontBlocks?: boolean
  /**
   * Callback when the terminal handle becomes available or is disposed.
   * Called with the handle on mount, and with null on unmount.
   */
  onTerminalReady?: (handle: AnsiTerminalHandle | null) => void
}

export function AnsiTerminalPanel({
  isActive,
  scaleMode = 'fit',
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
  fontFamily = DEFAULT_FONT_FAMILY,
  useFontBlocks = DEFAULT_USE_FONT_BLOCKS,
  onTerminalReady,
}: AnsiTerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const crtShaderRef = useRef<CrtShader | null>(null)
  // Stable proxy handle that survives Strict Mode re-runs via terminalRef indirection
  const handleRef = useRef<AnsiTerminalHandle | null>(null)
  const onTerminalReadyRef = useRef(onTerminalReady)
  onTerminalReadyRef.current = onTerminalReady
  const scaleModeRef = useRef(scaleMode)
  scaleModeRef.current = scaleMode
  const currentScaleRef = useRef(-1)
  const updateScaleRef = useRef<(() => void) | null>(null)
  // Track the initial dims passed at mount so the Terminal is constructed at
  // the right size. Subsequent changes go through the `resize` handle method.
  const initialColsRef = useRef(cols)
  const initialRowsRef = useRef(rows)
  const initialFontFamilyRef = useRef(fontFamily)
  const initialUseFontBlocksRef = useRef(useFontBlocks)

  // Wait for the IBM VGA font before opening the terminal so xterm.js
  // measures cell dimensions correctly and the ResizeObserver gets accurate metrics.
  // The handle uses terminalRef indirection to survive Strict Mode re-runs.
  useEffect(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) return

    let disposed = false
    let resizeObserver: ResizeObserver | null = null
    let canvasObserver: MutationObserver | null = null

    const init = async () => {
      const initialFontFamily = initialFontFamilyRef.current
      await document.fonts.load(`${FONT_SIZE}px ${initialFontFamily}`)
      if (disposed) return

      const terminal = new Terminal({
        cols: initialColsRef.current,
        rows: initialRowsRef.current,
        fontSize: FONT_SIZE,
        fontFamily: initialFontFamily,
        // useFontBlocks=true => use font glyphs => xterm customGlyphs=false.
        customGlyphs: !initialUseFontBlocksRef.current,
        lineHeight: 1,
        letterSpacing: 0,
        cursorBlink: false,
        disableStdin: true,
        scrollback: 0,
        overviewRulerWidth: 0,
        allowTransparency: false,
        theme: {
          background: '#000000',
          foreground: '#AAAAAA',
          cursor: '#AAAAAA',
        },
      })

      // Clear residual DOM from Strict Mode double-mount
      wrapper.replaceChildren()
      terminal.open(wrapper)
      // Canvas renderer avoids anti-aliasing artifacts at half-block (▀) boundaries.
      const canvasAddon = new CanvasAddon()
      terminal.loadAddon(canvasAddon)
      setupAtlasPatching(canvasAddon)

      // Snap fillRect to integer device pixels on xterm's canvases to prevent
      // antialiasing seams between cells (custom glyph renderer divides cells
      // into 8ths which produces fractional coordinates at most DPR values).
      const patchFillRect = (canvas: Element) => {
        const ctx = (canvas as HTMLCanvasElement).getContext('2d')
        if (!ctx || (ctx as unknown as Record<string, unknown>).__patchedFR) return
        const orig = ctx.fillRect.bind(ctx)
        ctx.fillRect = (x: number, y: number, w: number, h: number) => {
          const x1 = Math.round(x), y1 = Math.round(y)
          orig(x1, y1, Math.round(x + w) - x1, Math.round(y + h) - y1)
        }
        ;(ctx as unknown as Record<string, unknown>).__patchedFR = true
      }
      wrapper.querySelectorAll('canvas').forEach(patchFillRect)
      // Re-patch when xterm recreates canvases (e.g. on font size change)
      canvasObserver = new MutationObserver(() =>
        wrapper.querySelectorAll('canvas').forEach(patchFillRect))
      canvasObserver.observe(wrapper, { childList: true, subtree: true })

      // Prevent xterm.js from processing keyboard events (and calling preventDefault).
      // This terminal is display-only; input capture is handled separately by InputCapture.
      terminal.attachCustomKeyEventHandler(() => false)
      terminalRef.current = terminal

      // Scale by integer font-size multiples instead of CSS transform to keep
      // the canvas at native resolution (no blur at 2x/3x).
      let baseW = wrapper.scrollWidth
      let baseH = wrapper.scrollHeight
      const remeasureBase = () => {
        baseW = wrapper.scrollWidth
        baseH = wrapper.scrollHeight
      }
      const updateScale = () => {
        if (baseW === 0 || baseH === 0) return
        const containerW = container.clientWidth
        const containerH = container.clientHeight
        const mode = scaleModeRef.current
        let newScale: number
        switch (mode) {
          case 'integer-1x': newScale = 1; break
          case 'integer-2x': newScale = 2; break
          case 'integer-3x': newScale = 3; break
          case 'fit': newScale = Math.min(containerW / baseW, containerH / baseH); break
          case 'fill': newScale = Math.max(containerW / baseW, containerH / baseH); break
          default: // 'integer-auto'
            newScale = Math.max(1, Math.floor(Math.min(containerW / baseW, containerH / baseH)))
        }
        if (newScale === currentScaleRef.current) return
        currentScaleRef.current = newScale
        terminal.options.fontSize = FONT_SIZE * newScale
      }
      updateScaleRef.current = updateScale

      resizeObserver = new ResizeObserver(updateScale)
      resizeObserver.observe(container)
      updateScale()

      // Create stable proxy handle on first mount; delegates through terminalRef
      // so it survives Strict Mode disposal/recreation.
      if (!handleRef.current) {
        handleRef.current = {
          write: (data: string) => terminalRef.current?.write(data),
          container: wrapper,
          dispose: () => {
            // No-op - terminal lifecycle managed by this component's cleanup
          },
          resize: (c: number, r: number) => {
            const t = terminalRef.current
            if (!t) return
            try { t.resize(c, r) } catch (e) { console.warn('[AnsiTerminalPanel] resize failed:', e) }
            requestAnimationFrame(() => {
              remeasureBase()
              currentScaleRef.current = -1
              updateScale()
            })
          },
          setFontFamily: (family: string) => {
            const t = terminalRef.current
            if (!t) return
            // Wait for the font to load so xterm re-measures cells against the
            // new face on its next render — otherwise the canvas keeps the old
            // metrics until the next reflow.
            document.fonts.load(`${FONT_SIZE}px ${family}`).finally(() => {
              if (terminalRef.current !== t) return
              t.options.fontFamily = family
              requestAnimationFrame(() => {
                remeasureBase()
                currentScaleRef.current = -1
                updateScale()
              })
            })
          },
          setUseFontBlocks: (enabled: boolean) => {
            const t = terminalRef.current
            if (!t) return
            t.options.customGlyphs = !enabled
          },
          setCrt: (enabled: boolean, intensity?: number, config?: Partial<CrtConfig>) => {
            const el = containerRef.current
            const xtermCanvas = wrapperRef.current?.querySelector('canvas')
            if (!el) return
            if (enabled) {
              if (xtermCanvas) {
                crtShaderRef.current ??= new CrtShader(xtermCanvas, el, {
                  fallbackCssClass: styles.crtEnabled,
                })
                if (config) {
                  crtShaderRef.current.enable(config)
                } else {
                  crtShaderRef.current.enable(intensity ?? undefined)
                }
              } else {
                // No canvas yet — CSS-only fallback
                el.classList.add(styles.crtEnabled)
                el.style.setProperty('--crt-intensity', String(intensity ?? 0.7))
              }
            } else {
              if (crtShaderRef.current) {
                crtShaderRef.current.disable()
              } else {
                el.classList.remove(styles.crtEnabled)
                el.style.removeProperty('--crt-intensity')
              }
            }
          },
        }
      }

      onTerminalReadyRef.current?.(handleRef.current)
    }

    init()

    return () => {
      disposed = true
      canvasObserver?.disconnect()
      resizeObserver?.disconnect()
      onTerminalReadyRef.current?.(null)
      crtShaderRef.current?.dispose()
      crtShaderRef.current = null
      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
      }
      // Don't null handleRef -- proxy survives re-runs via terminalRef indirection
    }
  }, [])

  // Re-evaluate scale when scaleMode prop changes
  useEffect(() => {
    currentScaleRef.current = -1
    updateScaleRef.current?.()
  }, [scaleMode])

  // Resize the terminal when the cols/rows props change (e.g. a project of
  // different dimensions is loaded).
  useEffect(() => {
    handleRef.current?.resize?.(cols, rows)
  }, [cols, rows])

  // Re-apply font / block-glyph settings when the corresponding props change.
  useEffect(() => {
    handleRef.current?.setFontFamily?.(fontFamily)
  }, [fontFamily])

  useEffect(() => {
    handleRef.current?.setUseFontBlocks?.(useFontBlocks)
  }, [useFontBlocks])

  // Notify parent when callback identity changes
  useEffect(() => {
    if (handleRef.current && onTerminalReady) {
      onTerminalReady(handleRef.current)
    }
  }, [onTerminalReady])

  // Auto-focus wrapper when tab becomes active
  useEffect(() => {
    if (isActive && wrapperRef.current) {
      wrapperRef.current.focus()
    }
  }, [isActive])

  // Re-focus wrapper on click
  const handleMouseDown = useCallback(() => {
    wrapperRef.current?.focus()
  }, [])

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onMouseDown={handleMouseDown}
    >
      <div ref={wrapperRef} className={styles.terminalWrapper} tabIndex={0} />
    </div>
  )
}
