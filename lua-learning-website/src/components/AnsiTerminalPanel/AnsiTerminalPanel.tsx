import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
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

export function AnsiTerminalPanel({ isActive: _isActive, onTerminalReady }: AnsiTerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  // Stable proxy handle — delegates write through terminalRef so it survives
  // React Strict Mode's effect cleanup/re-run cycle. The DOM element (wrapper)
  // is the same across strict mode re-runs since React doesn't recreate DOM nodes.
  const handleRef = useRef<AnsiTerminalHandle | null>(null)
  const onTerminalReadyRef = useRef(onTerminalReady)
  onTerminalReadyRef.current = onTerminalReady

  // Create terminal on mount. In React Strict Mode, effects run, clean up,
  // and re-run. The handle uses terminalRef indirection so it automatically
  // delegates to whichever terminal instance is currently alive.
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const terminal = new Terminal({
      cols: COLS,
      rows: ROWS,
      fontSize: FONT_SIZE,
      fontFamily: FONT_FAMILY,
      cursorBlink: false,
      disableStdin: true,
      scrollback: 0,
      overviewRulerWidth: 0,
      theme: {
        background: '#000000',
        foreground: '#AAAAAA',
        cursor: '#AAAAAA',
      },
    })

    terminal.open(wrapper)
    terminalRef.current = terminal

    // Create the stable proxy handle on first mount only.
    // The write method delegates through terminalRef, so even if the terminal
    // is disposed and recreated (strict mode), the handle remains valid.
    if (!handleRef.current) {
      handleRef.current = {
        write: (data: string) => terminalRef.current?.write(data),
        container: wrapper,
        dispose: () => {
          // No-op - terminal lifecycle managed by this component's cleanup
        },
      }
    }

    // Notify parent that handle is available
    onTerminalReadyRef.current?.(handleRef.current)

    return () => {
      terminal.dispose()
      terminalRef.current = null
      // Don't null handleRef — the proxy handle survives strict mode re-runs.
      // It becomes a no-op (terminalRef is null) until the next terminal is created.
    }
  }, [])

  // Notify parent when callback changes (e.g., new tab request triggers re-render)
  // This follows the same pattern as CanvasGamePanel's onCanvasReady effect.
  useEffect(() => {
    if (handleRef.current && onTerminalReady) {
      onTerminalReady(handleRef.current)
    }
  }, [onTerminalReady])

  // Scale terminal to fit container
  useEffect(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) return

    const observer = new ResizeObserver(() => {
      const containerW = container.clientWidth
      const containerH = container.clientHeight
      // Get the terminal's natural rendered size
      const terminalW = wrapper.scrollWidth
      const terminalH = wrapper.scrollHeight
      if (terminalW === 0 || terminalH === 0) return

      const scale = Math.min(containerW / terminalW, containerH / terminalH)
      wrapper.style.transform = `scale(${scale})`
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className={styles.container}>
      <div ref={wrapperRef} className={styles.terminalWrapper} tabIndex={0} />
    </div>
  )
}
