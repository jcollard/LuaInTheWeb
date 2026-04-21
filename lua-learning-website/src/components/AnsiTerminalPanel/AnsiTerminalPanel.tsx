import { useCallback, useEffect, useRef } from 'react'
import type { ScaleMode } from '../AnsiGraphicsEditor/types'
import { CrtShader, PixelAnsiRenderer, CELL_W, CELL_H, type CrtConfig } from '@lua-learning/lua-runtime'
import { DEFAULT_USE_FONT_BLOCKS, getFontFamily } from '@lua-learning/ansi-shared'
import styles from './AnsiTerminalPanel.module.css'

const DEFAULT_COLS = 80
const DEFAULT_ROWS = 25
const DEFAULT_FONT_FAMILY = getFontFamily(undefined)

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
  /** Update the rasterization font family. Rebuilds glyph masks. */
  setFontFamily?: (fontFamily: string) => void
  /**
   * Toggle whether block-drawing characters are rendered via the font's
   * glyphs. In the pixel-perfect renderer this is always effectively true
   * (binary-thresholded masks from the font), so this is a no-op kept for
   * backward-compat with the file-format field.
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
  /** File-format toggle; no effect on rendering (kept for backward compat). */
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
  useFontBlocks: _useFontBlocks = DEFAULT_USE_FONT_BLOCKS,
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

    // Mount the renderer's canvas into the wrapper.
    wrapper.replaceChildren(renderer.canvas)
    renderer.canvas.style.transformOrigin = '0 0'
    renderer.canvas.style.imageRendering = 'pixelated'
    // Some browsers honor both; include the older hint too.
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
      // Keep the wrapper sized so the scaled canvas' bounds are correct.
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
        // Kept as a no-op: our pixel renderer always produces crisp block
        // chars from the font via binary-thresholded masks.
        setUseFontBlocks: () => {},
        setCrt: (enabled: boolean, intensity?: number, config?: Partial<CrtConfig>) => {
          const el = containerRef.current
          if (!el) return
          const canvas = rendererRef.current?.canvas ?? null
          if (enabled) {
            if (canvas) {
              crtShaderRef.current ??= new CrtShader(canvas, el, {
                fallbackCssClass: styles.crtEnabled,
              })
              if (config) {
                crtShaderRef.current.enable(config)
              } else {
                crtShaderRef.current.enable(intensity ?? undefined)
              }
            } else {
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

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      onTerminalReadyRef.current?.(null)
      crtShaderRef.current?.dispose()
      crtShaderRef.current = null
      rendererRef.current?.dispose()
      rendererRef.current = null
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

  // Re-apply font family when it changes.
  useEffect(() => {
    handleRef.current?.setFontFamily?.(fontFamily)
  }, [fontFamily])

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
