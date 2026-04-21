import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import type { ScaleMode } from '../AnsiGraphicsEditor/types'
import { Terminal } from '@xterm/xterm'
import { CanvasAddon } from '@xterm/addon-canvas'
import { CrtShader, PixelAnsiRenderer, CELL_W, CELL_H, type CrtConfig } from '@lua-learning/lua-runtime'
import { DEFAULT_USE_FONT_BLOCKS, getFontFamily } from '@lua-learning/ansi-shared'
import '@xterm/xterm/css/xterm.css'
import styles from './AnsiTerminalPanel.module.css'

const DEFAULT_COLS = 80
const DEFAULT_ROWS = 25
const DEFAULT_FONT_FAMILY = getFontFamily(undefined)
const XTERM_FONT_SIZE = 16

export interface AnsiTerminalHandle {
  /** Write data (including ANSI escape sequences) to the terminal */
  write: (data: string) => void
  /** The container element for keyboard event capture */
  container: HTMLElement
  /** Dispose of the terminal handle */
  dispose: () => void
  /** Enable/disable CRT monitor effect with optional intensity or per-effect config */
  setCrt: (enabled: boolean, intensity?: number, config?: Partial<CrtConfig>) => void
  /** Resize the underlying terminal to the given cell dimensions. */
  resize?: (cols: number, rows: number) => void
  /** Update the rasterization font family. */
  setFontFamily?: (fontFamily: string) => void
  /**
   * Toggle between the pixel-perfect bitmap renderer (true) and the
   * default xterm.js + CanvasAddon renderer (false). The panel handles
   * this at the React level by remounting a different implementation,
   * so this method is a hint at the handle layer only.
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
  /** Font family. Defaults to IBM VGA 8x16 from the shared font registry. */
  fontFamily?: string
  /**
   * When true (default), use the pixel-perfect `PixelAnsiRenderer`
   * (binary masks from the font's bitmap strike / hand-coded references).
   * When false, use the default xterm.js + CanvasAddon renderer that
   * shipped before PR #763. Changing this prop remounts the inner
   * implementation — the caller gets a fresh handle.
   */
  useFontBlocks?: boolean
  /**
   * Callback when the terminal handle becomes available or is disposed.
   * Called with the handle on mount, and with null on unmount.
   */
  onTerminalReady?: (handle: AnsiTerminalHandle | null) => void
}

/**
 * Top-level panel. Chooses between the two renderer implementations
 * based on `useFontBlocks`. The `key` prop forces a remount when the
 * toggle flips so the previous renderer's lifecycle (including disposal
 * and onTerminalReady(null)) runs cleanly before the new one starts.
 */
export function AnsiTerminalPanel(props: AnsiTerminalPanelProps) {
  const useFontBlocks = props.useFontBlocks ?? DEFAULT_USE_FONT_BLOCKS
  return useFontBlocks
    ? <AnsiTerminalPanelPixel key="pixel" {...props} />
    : <AnsiTerminalPanelXterm key="xterm" {...props} />
}

/**
 * Snap an xterm-owned canvas's `fillRect` to integer device pixels so
 * per-cell draws don't bleed across boundaries at most DPRs. Marks the
 * context with a flag so re-invocation on the same canvas is a no-op.
 */
function patchFillRect(canvas: Element): void {
  const ctx = (canvas as HTMLCanvasElement).getContext('2d')
  if (!ctx || (ctx as unknown as Record<string, unknown>).__patchedFR) return
  const orig = ctx.fillRect.bind(ctx)
  ctx.fillRect = (x: number, y: number, w: number, h: number) => {
    const x1 = Math.round(x), y1 = Math.round(y)
    orig(x1, y1, Math.round(x + w) - x1, Math.round(y + h) - y1)
  }
  ;(ctx as unknown as Record<string, unknown>).__patchedFR = true
}

/**
 * Shared CRT toggle wiring — both renderer variants build their handle's
 * `setCrt` method from this. They differ only in how they locate the
 * canvas element they own, so the helper takes that as a callback.
 */
function makeSetCrt(
  getCanvas: () => HTMLCanvasElement | null,
  getContainer: () => HTMLElement | null,
  crtShaderRef: MutableRefObject<CrtShader | null>,
): AnsiTerminalHandle['setCrt'] {
  return (enabled, intensity, config) => {
    const el = getContainer()
    if (!el) return
    const canvas = getCanvas()
    if (enabled) {
      if (canvas) {
        crtShaderRef.current ??= new CrtShader(canvas, el, {
          fallbackCssClass: styles.crtEnabled,
        })
        if (config) crtShaderRef.current.enable(config)
        else crtShaderRef.current.enable(intensity ?? undefined)
      } else {
        el.classList.add(styles.crtEnabled)
        el.style.setProperty('--crt-intensity', String(intensity ?? 0.7))
      }
    } else {
      if (crtShaderRef.current) crtShaderRef.current.disable()
      else {
        el.classList.remove(styles.crtEnabled)
        el.style.removeProperty('--crt-intensity')
      }
    }
  }
}

// --------------------------------------------------------------------------
// Pixel renderer variant (PR #763 and later).
// --------------------------------------------------------------------------

function AnsiTerminalPanelPixel({
  isActive,
  scaleMode = 'integer-auto',
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
  fontFamily = DEFAULT_FONT_FAMILY,
  onTerminalReady,
}: AnsiTerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<PixelAnsiRenderer | null>(null)
  const crtShaderRef = useRef<CrtShader | null>(null)
  const handleRef = useRef<AnsiTerminalHandle | null>(null)
  const onTerminalReadyRef = useRef(onTerminalReady)
  onTerminalReadyRef.current = onTerminalReady
  const scaleModeRef = useRef(scaleMode)
  scaleModeRef.current = scaleMode
  const currentScaleRef = useRef(-1)
  const updateScaleRef = useRef<(() => void) | null>(null)
  const initialColsRef = useRef(cols)
  const initialRowsRef = useRef(rows)
  const initialFontFamilyRef = useRef(fontFamily)

  useEffect(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) return

    let disposed = false
    let resizeObserver: ResizeObserver | null = null

    const renderer = new PixelAnsiRenderer({
      cols: initialColsRef.current,
      rows: initialRowsRef.current,
      fontFamily: initialFontFamilyRef.current,
    })
    if (disposed) { renderer.dispose(); return }

    rendererRef.current = renderer

    wrapper.replaceChildren(renderer.canvas)
    renderer.canvas.style.transformOrigin = '0 0'
    renderer.canvas.style.imageRendering = 'pixelated'
    ;(renderer.canvas.style as unknown as Record<string, string>)['imageRendering'] = 'pixelated'

    const updateScale = (): void => {
      const r = rendererRef.current
      if (!r) return
      const baseW = r.cols * CELL_W
      const baseH = r.rows * CELL_H
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
      if (newScale <= 0) return
      if (newScale === currentScaleRef.current) return
      currentScaleRef.current = newScale
      renderer.canvas.style.transform = `scale(${newScale})`
      wrapper.style.width = `${baseW * newScale}px`
      wrapper.style.height = `${baseH * newScale}px`
    }
    updateScaleRef.current = updateScale

    resizeObserver = new ResizeObserver(updateScale)
    resizeObserver.observe(container)
    updateScale()

    if (!handleRef.current) {
      handleRef.current = {
        write: (data: string) => rendererRef.current?.write(data),
        container: wrapper,
        dispose: () => {
          // Lifecycle managed by this component's cleanup below.
        },
        resize: (c: number, r: number) => {
          const rnd = rendererRef.current
          if (!rnd) return
          rnd.resize(c, r)
          requestAnimationFrame(() => {
            currentScaleRef.current = -1
            updateScale()
          })
        },
        setFontFamily: (family: string) => {
          void rendererRef.current?.setFontFamily(family)
        },
        // In pixel mode the hand-coded reference swap stays available on
        // the renderer itself — but the top-level panel handles the main
        // toggle by remounting, so this is a best-effort hint only.
        setUseFontBlocks: (value: boolean) => {
          void rendererRef.current?.setUseFontBlocks(value)
        },
        setCrt: makeSetCrt(
          () => rendererRef.current?.canvas ?? null,
          () => containerRef.current,
          crtShaderRef,
        ),
      }
    }

    onTerminalReadyRef.current?.(handleRef.current)

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      onTerminalReadyRef.current?.(null)
      crtShaderRef.current?.dispose()
      crtShaderRef.current = null
      rendererRef.current?.dispose()
      rendererRef.current = null
      handleRef.current = null
    }
  }, [])

  useEffect(() => {
    currentScaleRef.current = -1
    updateScaleRef.current?.()
  }, [scaleMode])

  useEffect(() => {
    handleRef.current?.resize?.(cols, rows)
  }, [cols, rows])

  useEffect(() => {
    handleRef.current?.setFontFamily?.(fontFamily)
  }, [fontFamily])

  useEffect(() => {
    if (isActive && wrapperRef.current) wrapperRef.current.focus()
  }, [isActive])

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

// --------------------------------------------------------------------------
// xterm.js + CanvasAddon variant — the pre-PR behavior. Used when
// `useFontBlocks` is false. Block-drawing chars here go through the
// font's outline renderer with the fillText path and may show
// sub-pixel AA seams; that's expected and the reason to toggle back
// on for crisp bitmap rendering.
// --------------------------------------------------------------------------

function AnsiTerminalPanelXterm({
  isActive,
  scaleMode = 'integer-auto',
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
  fontFamily = DEFAULT_FONT_FAMILY,
  onTerminalReady,
}: AnsiTerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const crtShaderRef = useRef<CrtShader | null>(null)
  const handleRef = useRef<AnsiTerminalHandle | null>(null)
  const onTerminalReadyRef = useRef(onTerminalReady)
  onTerminalReadyRef.current = onTerminalReady
  const scaleModeRef = useRef(scaleMode)
  scaleModeRef.current = scaleMode
  const currentScaleRef = useRef(-1)
  const updateScaleRef = useRef<(() => void) | null>(null)
  const initialColsRef = useRef(cols)
  const initialRowsRef = useRef(rows)
  const initialFontFamilyRef = useRef(fontFamily)

  useEffect(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) return

    let disposed = false
    let resizeObserver: ResizeObserver | null = null
    let canvasObserver: MutationObserver | null = null

    const init = async () => {
      await document.fonts.load(`${XTERM_FONT_SIZE}px ${initialFontFamilyRef.current}`)
      if (disposed) return

      const terminal = new Terminal({
        cols: initialColsRef.current,
        rows: initialRowsRef.current,
        fontSize: XTERM_FONT_SIZE,
        fontFamily: initialFontFamilyRef.current,
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

      wrapper.replaceChildren()
      terminal.open(wrapper)
      terminal.loadAddon(new CanvasAddon())

      wrapper.querySelectorAll('canvas').forEach(patchFillRect)
      canvasObserver = new MutationObserver(() =>
        wrapper.querySelectorAll('canvas').forEach(patchFillRect))
      canvasObserver.observe(wrapper, { childList: true, subtree: true })

      // Display-only terminal — don't swallow keyboard events.
      terminal.attachCustomKeyEventHandler(() => false)
      terminalRef.current = terminal

      // Scale via font-size multiplication so the canvas stays at native
      // resolution at 2×/3× rather than CSS-transforming a raster.
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
        terminal.options.fontSize = XTERM_FONT_SIZE * newScale
      }
      updateScaleRef.current = updateScale

      resizeObserver = new ResizeObserver(updateScale)
      resizeObserver.observe(container)
      updateScale()

      if (!handleRef.current) {
        handleRef.current = {
          write: (data: string) => terminalRef.current?.write(data),
          container: wrapper,
          dispose: () => {
            // Lifecycle managed by this component's cleanup.
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
            void document.fonts.load(`${XTERM_FONT_SIZE}px ${family}`).then(() => {
              if (terminalRef.current) {
                terminalRef.current.options.fontFamily = family
                requestAnimationFrame(() => {
                  remeasureBase()
                  currentScaleRef.current = -1
                  updateScale()
                })
              }
            })
          },
          // Mode switch is handled by the top-level chooser remounting to
          // the pixel variant. Keep as a no-op so the handle contract is
          // uniform between the two implementations.
          setUseFontBlocks: () => {},
          setCrt: makeSetCrt(
            () => wrapperRef.current?.querySelector('canvas') ?? null,
            () => containerRef.current,
            crtShaderRef,
          ),
        }
      }

      onTerminalReadyRef.current?.(handleRef.current)
    }

    void init()

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
      handleRef.current = null
    }
  }, [])

  useEffect(() => {
    currentScaleRef.current = -1
    updateScaleRef.current?.()
  }, [scaleMode])

  useEffect(() => {
    handleRef.current?.resize?.(cols, rows)
  }, [cols, rows])

  useEffect(() => {
    handleRef.current?.setFontFamily?.(fontFamily)
  }, [fontFamily])

  useEffect(() => {
    if (isActive && wrapperRef.current) wrapperRef.current.focus()
  }, [isActive])

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
