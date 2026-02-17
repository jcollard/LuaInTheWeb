import { useCallback, useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { CanvasAddon } from '@xterm/addon-canvas'
import '@xterm/xterm/css/xterm.css'
import styles from './AnsiTerminalPanel.module.css'

const COLS = 80
const ROWS = 25
const FONT_SIZE = 16
const FONT_FAMILY = '"IBM VGA 8x16", monospace'

export interface AnsiTerminalHandle {
  /** Write data (including ANSI escape sequences) to the terminal */
  write: (data: string) => void
  /** The container element for keyboard event capture */
  container: HTMLElement
  /** Dispose of the terminal handle */
  dispose: () => void
}

export interface AnsiTerminalPanelProps {
  isActive?: boolean
  /**
   * Callback when the terminal handle becomes available or is disposed.
   * Called with the handle on mount, and with null on unmount.
   */
  onTerminalReady?: (handle: AnsiTerminalHandle | null) => void
}

export function AnsiTerminalPanel({ isActive, onTerminalReady }: AnsiTerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  // Stable proxy handle that survives Strict Mode re-runs via terminalRef indirection
  const handleRef = useRef<AnsiTerminalHandle | null>(null)
  const onTerminalReadyRef = useRef(onTerminalReady)
  onTerminalReadyRef.current = onTerminalReady

  // Wait for the IBM VGA font before opening the terminal so xterm.js
  // measures cell dimensions correctly and the ResizeObserver gets accurate metrics.
  // The handle uses terminalRef indirection to survive Strict Mode re-runs.
  useEffect(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) return

    let disposed = false
    let resizeObserver: ResizeObserver | null = null

    const init = async () => {
      await document.fonts.load(`${FONT_SIZE}px ${FONT_FAMILY}`)
      if (disposed) return

      const terminal = new Terminal({
        cols: COLS,
        rows: ROWS,
        fontSize: FONT_SIZE,
        fontFamily: FONT_FAMILY,
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
      // Use the canvas renderer for pixel-perfect block element rendering.
      // The default DOM renderer rasterizes font glyphs with anti-aliasing,
      // which causes visible tearing at half-block (▀) boundaries.
      terminal.loadAddon(new CanvasAddon())
      terminalRef.current = terminal

      // Capture base terminal dimensions at FONT_SIZE for scale calculations.
      // Instead of CSS transform (which blurs the canvas), we multiply the
      // font size by an integer factor so xterm.js renders at native resolution.
      const baseW = wrapper.scrollWidth
      const baseH = wrapper.scrollHeight
      let currentScale = 1

      const updateScale = () => {
        if (baseW === 0 || baseH === 0) return
        const containerW = container.clientWidth
        const containerH = container.clientHeight
        const newScale = Math.max(1, Math.floor(Math.min(containerW / baseW, containerH / baseH)))
        if (newScale === currentScale) return
        currentScale = newScale
        terminal.options.fontSize = FONT_SIZE * newScale
      }

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
        }
      }

      onTerminalReadyRef.current?.(handleRef.current)
    }

    init()

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
      }
      // Don't null handleRef -- proxy survives re-runs via terminalRef indirection
    }
  }, [])

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
    <div ref={containerRef} className={styles.container} onMouseDown={handleMouseDown}>
      <div ref={wrapperRef} className={styles.terminalWrapper} tabIndex={0} />
    </div>
  )
}
