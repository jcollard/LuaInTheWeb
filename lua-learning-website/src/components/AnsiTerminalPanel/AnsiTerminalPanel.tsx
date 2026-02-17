import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import styles from './AnsiTerminalPanel.module.css'

const COLS = 80
const ROWS = 25
const FONT_SIZE = 16
const FONT_FAMILY = '"IBM VGA 8x16", monospace'

// 25 lines to fill the full terminal height (last line uses write, not writeln)
const LOREM_TEXT = [
  '\x1b[1;33m=== ANSI Terminal Test ===\x1b[0m',                              // 1
  '',                                                                          // 2
  '\x1b[36mLorem ipsum dolor sit amet,\x1b[0m consectetur adipiscing elit.',  // 3
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',        // 4
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris',        // 5
  'nisi ut aliquip ex ea commodo consequat.',                                  // 6
  '',                                                                          // 7
  '\x1b[32mDuis aute irure dolor\x1b[0m in reprehenderit in voluptate velit', // 8
  'esse cillum dolore eu fugiat nulla pariatur. \x1b[31mExcepteur sint\x1b[0m', // 9
  'occaecat cupidatat non proident, sunt in culpa qui officia',                // 10
  'deserunt mollit anim id est laborum.',                                      // 11
  '',                                                                          // 12
  '\x1b[1;35mColor Palette:\x1b[0m',                                          // 13
  '\x1b[30;47m BLK \x1b[0m \x1b[31m RED \x1b[0m \x1b[32m GRN \x1b[0m \x1b[33m YEL \x1b[0m \x1b[34m BLU \x1b[0m \x1b[35m MAG \x1b[0m \x1b[36m CYN \x1b[0m \x1b[37m WHT \x1b[0m', // 14
  '\x1b[1;30m BLK \x1b[0m \x1b[1;31m RED \x1b[0m \x1b[1;32m GRN \x1b[0m \x1b[1;33m YEL \x1b[0m \x1b[1;34m BLU \x1b[0m \x1b[1;35m MAG \x1b[0m \x1b[1;36m CYN \x1b[0m \x1b[1;37m WHT \x1b[0m', // 15
  '',                                                                          // 16
  '\x1b[44;37m 80 columns x 25 rows \x1b[0m  \x1b[42;30m IBM VGA 8x16 Font \x1b[0m', // 17
  '',                                                                          // 18
  // Full 80-character wide line
  '\x1b[43;30m' + '0123456789'.repeat(8) + '\x1b[0m',                         // 19
  '',                                                                          // 20
  'Pellentesque habitant morbi tristique senectus et netus.',                  // 21
  'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices.',         // 22
  'Maecenas sed diam eget risus varius blandit sit amet non magna.',           // 23
  '',                                                                          // 24
  '\x1b[1;32m> Terminal ready.\x1b[0m',                                       // 25
]

export interface AnsiTerminalPanelProps {
  isActive?: boolean
}

export function AnsiTerminalPanel({ isActive: _isActive }: AnsiTerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)

  // Create terminal and write demo content
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

    // Write all lines; use write (no newline) on the last to avoid scrolling
    for (let i = 0; i < LOREM_TEXT.length; i++) {
      if (i < LOREM_TEXT.length - 1) {
        terminal.writeln(LOREM_TEXT[i])
      } else {
        terminal.write(LOREM_TEXT[i])
      }
    }

    return () => {
      terminal.dispose()
      terminalRef.current = null
    }
  }, [])

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
      <div ref={wrapperRef} className={styles.terminalWrapper} />
    </div>
  )
}
