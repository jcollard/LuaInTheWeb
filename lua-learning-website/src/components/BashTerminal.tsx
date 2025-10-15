import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import './BashTerminal.css'

export interface BashTerminalHandle {
  writeln: (text: string) => void
  write: (text: string) => void
  clear: () => void
  readLine: () => Promise<string>
  showPrompt: () => void
}

interface BashTerminalProps {
  onCommand?: (command: string) => void
}

const BashTerminal = forwardRef<BashTerminalHandle, BashTerminalProps>(({ onCommand }, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const currentLineRef = useRef<string>('')
  const cursorPositionRef = useRef<number>(0)
  const inputResolveRef = useRef<((value: string) => void) | null>(null)
  const isReadingRef = useRef<boolean>(false)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)

  useEffect(() => {
    if (!terminalRef.current) return

    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Cascadia Code", Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
    })

    // Create and load fit addon
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    // Open terminal in the container
    terminal.open(terminalRef.current)
    fitAddon.fit()

    // Store references
    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    // Handle terminal input
    terminal.onData((data) => {
      handleInput(data)
    })

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      terminal.dispose()
    }
  }, [])

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    writeln: (text: string) => {
      xtermRef.current?.writeln(text)
    },
    write: (text: string) => {
      xtermRef.current?.write(text)
    },
    clear: () => {
      xtermRef.current?.clear()
    },
    readLine: async () => {
      return new Promise<string>((resolve) => {
        isReadingRef.current = true
        inputResolveRef.current = resolve
        xtermRef.current?.write('> ')
        currentLineRef.current = ''
        cursorPositionRef.current = 0
      })
    },
    showPrompt: () => {
      xtermRef.current?.write('\x1b[32m> \x1b[0m')
    },
  }))

  const handleInput = (data: string) => {
    const term = xtermRef.current
    if (!term) return

    const code = data.charCodeAt(0)

    // Handle Enter key
    if (code === 13) {
      const input = currentLineRef.current
      term.writeln('')

      // If waiting for input (io.read), resolve the promise
      if (isReadingRef.current && inputResolveRef.current) {
        inputResolveRef.current(input)
        inputResolveRef.current = null
        isReadingRef.current = false
        currentLineRef.current = ''
        cursorPositionRef.current = 0
        return
      }

      // Otherwise, if onCommand is provided, call it
      if (onCommand && input.trim()) {
        // Add to history
        historyRef.current.push(input.trim())
        historyIndexRef.current = historyRef.current.length
        onCommand(input.trim())
      }

      currentLineRef.current = ''
      cursorPositionRef.current = 0
      return
    }

    // Handle Arrow Up (navigate history)
    if (data === '\x1b[A') {
      if (historyRef.current.length > 0 && historyIndexRef.current > 0) {
        historyIndexRef.current--
        const historyCommand = historyRef.current[historyIndexRef.current]
        
        // Clear current line
        term.write('\r\x1b[K')
        term.write('\x1b[32m> \x1b[0m' + historyCommand)
        
        currentLineRef.current = historyCommand
        cursorPositionRef.current = historyCommand.length
      }
      return
    }

    // Handle Arrow Down (navigate history)
    if (data === '\x1b[B') {
      if (historyIndexRef.current < historyRef.current.length) {
        historyIndexRef.current++
        
        // Clear current line
        term.write('\r\x1b[K')
        term.write('\x1b[32m> \x1b[0m')
        
        if (historyIndexRef.current < historyRef.current.length) {
          const historyCommand = historyRef.current[historyIndexRef.current]
          term.write(historyCommand)
          currentLineRef.current = historyCommand
          cursorPositionRef.current = historyCommand.length
        } else {
          currentLineRef.current = ''
          cursorPositionRef.current = 0
        }
      }
      return
    }

    // Handle Backspace
    if (code === 127) {
      if (cursorPositionRef.current > 0) {
        const line = currentLineRef.current
        currentLineRef.current =
          line.slice(0, cursorPositionRef.current - 1) +
          line.slice(cursorPositionRef.current)
        cursorPositionRef.current--

        // Redraw the line
        term.write('\b \b')
      }
      return
    }

    // Handle Ctrl+C
    if (code === 3) {
      term.write('^C')
      term.writeln('')
      currentLineRef.current = ''
      cursorPositionRef.current = 0
      return
    }

    // Handle Ctrl+L (clear screen)
    if (code === 12) {
      term.clear()
      return
    }

    // Handle printable characters
    if (code >= 32 && code < 127) {
      const line = currentLineRef.current
      currentLineRef.current =
        line.slice(0, cursorPositionRef.current) +
        data +
        line.slice(cursorPositionRef.current)
      cursorPositionRef.current++
      term.write(data)
    }
  }

  return (
    <div className="bash-terminal-container">
      <div className="bash-terminal-header">
        <h3>Output</h3>
      </div>
      <div ref={terminalRef} className="bash-terminal" />
    </div>
  )
})

BashTerminal.displayName = 'BashTerminal'

export default BashTerminal
