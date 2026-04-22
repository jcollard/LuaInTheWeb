import { useCallback, useEffect, useRef } from 'react'
import {
  CrtShader,
  PixelAnsiRenderer,
  DEFAULT_FONT_ID,
} from '@lua-learning/lua-runtime'
import type { AnsiTerminalHandle, AnsiTerminalPanelProps } from './types'
import { computeScale, makeSetCrt } from './panelHelpers'
import styles from './AnsiTerminalPanel.module.css'

/**
 * AnsiTerminalPanel variant backed by the pixel-perfect bitmap renderer.
 * Active when `useFontBlocks` is true (the default). Mounts a
 * `PixelAnsiRenderer` whose canvas is sized in source pixels; scaling
 * for display is applied via a CSS transform so the browser upscales
 * the canvas via `image-rendering: pixelated`.
 */
export function AnsiTerminalPanelPixel({
  isActive,
  scaleMode = 'integer-auto',
  cols = 80,
  rows = 25,
  fontId = DEFAULT_FONT_ID,
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
  const initialFontIdRef = useRef(fontId)

  useEffect(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) return

    let disposed = false
    let resizeObserver: ResizeObserver | null = null

    const renderer = new PixelAnsiRenderer({
      cols: initialColsRef.current,
      rows: initialRowsRef.current,
      fontId: initialFontIdRef.current,
    })
    rendererRef.current = renderer

    wrapper.replaceChildren()
    wrapper.appendChild(renderer.canvas)
    // Apply the same "crisp pixels" hint as the xterm path for parity.
    renderer.canvas.style.imageRendering = 'pixelated'
    renderer.canvas.style.transformOrigin = '0 0'
    renderer.canvas.style.display = 'block'

    const updateScale = () => {
      const r = rendererRef.current
      if (!r) return
      const baseW = r.canvas.width
      const baseH = r.canvas.height
      if (baseW === 0 || baseH === 0) return
      const newScale = computeScale(
        scaleModeRef.current,
        container.clientWidth,
        container.clientHeight,
        baseW,
        baseH,
      )
      if (newScale === currentScaleRef.current) return
      currentScaleRef.current = newScale
      r.canvas.style.transform = `scale(${newScale})`
      // Reserve layout space for the scaled canvas so the wrapper sizes to
      // the visible area and flex centering works.
      wrapper.style.width = `${baseW * newScale}px`
      wrapper.style.height = `${baseH * newScale}px`
    }
    updateScaleRef.current = updateScale
    resizeObserver = new ResizeObserver(updateScale)
    resizeObserver.observe(container)
    updateScale()

    const recomputeAfterRendererChange = () => {
      currentScaleRef.current = -1
      updateScale()
    }

    if (!handleRef.current) {
      const handle: AnsiTerminalHandle = {
        write: (data: string) => rendererRef.current?.write(data),
        container: wrapper,
        dispose: () => { /* lifecycle is component-managed */ },
        resize: (c: number, r: number) => {
          rendererRef.current?.resize(c, r)
          requestAnimationFrame(recomputeAfterRendererChange)
        },
        setCrt: makeSetCrt({
          getContainer: () => containerRef.current,
          getCanvas: () => rendererRef.current?.canvas ?? null,
          crtEnabledClass: styles.crtEnabled,
          shaderRef: crtShaderRef,
        }),
        setFontFamily: async (nextId: string) => {
          const r = rendererRef.current
          if (!r) return
          await r.setFontFamily(nextId)
          requestAnimationFrame(recomputeAfterRendererChange)
        },
        setUseFontBlocks: (flag: boolean) => {
          // The outer chooser swaps the whole renderer on useFontBlocks
          // change, so this is informational within the pixel variant
          // itself. Still forward it to the renderer for state queries.
          void rendererRef.current?.setUseFontBlocks(flag)
        },
      }
      handleRef.current = handle
    }

    onTerminalReadyRef.current?.(handleRef.current)

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      onTerminalReadyRef.current?.(null)
      crtShaderRef.current?.dispose()
      crtShaderRef.current = null
      if (rendererRef.current) {
        rendererRef.current.dispose()
        rendererRef.current = null
      }
      if (disposed) { /* noop — keeps `disposed` referenced */ }
    }
  }, [])

  // React to prop changes after the initial mount.
  useEffect(() => { handleRef.current?.resize?.(cols, rows) }, [cols, rows])
  useEffect(() => {
    currentScaleRef.current = -1
    updateScaleRef.current?.()
  }, [scaleMode])
  useEffect(() => {
    handleRef.current?.setFontFamily?.(fontId)
  }, [fontId])
  useEffect(() => {
    if (handleRef.current && onTerminalReady) onTerminalReady(handleRef.current)
  }, [onTerminalReady])

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
