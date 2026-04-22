import { useCallback, useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { CanvasAddon } from '@xterm/addon-canvas'
import {
  CrtShader,
  DEFAULT_FONT_ID,
  getFontById,
  type BitmapFontRegistryEntry,
} from '@lua-learning/lua-runtime'
import '@xterm/xterm/css/xterm.css'
import type { AnsiTerminalHandle, AnsiTerminalPanelProps } from './types'
import { computeScale, makeSetCrt, patchFillRect } from './panelHelpers'
import styles from './AnsiTerminalPanel.module.css'

function fontSpec(entry: BitmapFontRegistryEntry): { family: string; size: number } {
  return { family: `"${entry.fontFamily}", monospace`, size: entry.cellH }
}

/**
 * AnsiTerminalPanel variant backed by xterm.js + CanvasAddon. Active
 * when `useFontBlocks` is false. Kept as a fallback for users who
 * prefer the classic rendering (the pixel renderer fixes block-drawing
 * seams but users authoring against the old behavior can opt out).
 *
 * Parameterized by the registered `fontId`: reads `fontFamily` and
 * `cellH` from the registry entry at mount and on font changes.
 * Scaling applies via font-size multiplication (not CSS transform) so
 * the canvas stays at native resolution at 2×/3×.
 */
export function AnsiTerminalPanelXterm({
  isActive,
  scaleMode = 'integer-auto',
  cols = 80,
  rows = 25,
  fontId = DEFAULT_FONT_ID,
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
  const fontRef = useRef<BitmapFontRegistryEntry>(
    getFontById(fontId) ?? getFontById(DEFAULT_FONT_ID)!,
  )

  const initialColsRef = useRef(cols)
  const initialRowsRef = useRef(rows)

  useEffect(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) return

    let disposed = false
    let resizeObserver: ResizeObserver | null = null
    let canvasObserver: MutationObserver | null = null

    const init = async () => {
      const { family, size } = fontSpec(fontRef.current)
      await document.fonts.load(`${size}px ${family}`)
      if (disposed) return

      const terminal = new Terminal({
        cols: initialColsRef.current,
        rows: initialRowsRef.current,
        fontSize: size,
        fontFamily: family,
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
        wrapper.querySelectorAll('canvas').forEach(patchFillRect),
      )
      canvasObserver.observe(wrapper, { childList: true, subtree: true })

      terminal.attachCustomKeyEventHandler(() => false)
      terminalRef.current = terminal

      let baseW = wrapper.scrollWidth
      let baseH = wrapper.scrollHeight
      const remeasureBase = () => {
        baseW = wrapper.scrollWidth
        baseH = wrapper.scrollHeight
      }
      const updateScale = () => {
        const t = terminalRef.current
        if (!t) return
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
        t.options.fontSize = fontRef.current.cellH * newScale
      }
      updateScaleRef.current = updateScale
      resizeObserver = new ResizeObserver(updateScale)
      resizeObserver.observe(container)
      updateScale()

      if (!handleRef.current) {
        const handle: AnsiTerminalHandle = {
          write: (data: string) => terminalRef.current?.write(data),
          container: wrapper,
          dispose: () => { /* lifecycle is component-managed */ },
          resize: (c: number, r: number) => {
            const t = terminalRef.current
            if (!t) return
            try { t.resize(c, r) } catch (e) {
              console.warn('[AnsiTerminalPanel] resize failed:', e)
            }
            requestAnimationFrame(() => {
              remeasureBase()
              currentScaleRef.current = -1
              updateScale()
            })
          },
          setCrt: makeSetCrt({
            getContainer: () => containerRef.current,
            getCanvas: () => wrapperRef.current?.querySelector('canvas') ?? null,
            crtEnabledClass: styles.crtEnabled,
            shaderRef: crtShaderRef,
          }),
          setFontFamily: async (nextId: string) => {
            const next = getFontById(nextId)
            const t = terminalRef.current
            if (!next || !t) return
            fontRef.current = next
            const { family: nextFamily, size: nextSize } = fontSpec(next)
            try { await document.fonts.load(`${nextSize}px ${nextFamily}`) } catch { /* best-effort */ }
            t.options.fontFamily = nextFamily
            t.options.fontSize = nextSize
            requestAnimationFrame(() => {
              remeasureBase()
              currentScaleRef.current = -1
              updateScale()
            })
          },
          setUseFontBlocks: () => {
            // The outer chooser remounts on useFontBlocks change;
            // nothing for this variant to do internally.
          },
        }
        handleRef.current = handle
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
