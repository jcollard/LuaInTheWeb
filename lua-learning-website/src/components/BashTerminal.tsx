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
  const multiLineRef = useRef<boolean>(false)
  const multiLineBufferRef = useRef<string[]>([])
  const multiLineCursorLineRef = useRef<number>(0)  // Current line index in multi-line mode
  const multiLineStartRowRef = useRef<number>(0)  // Terminal row where multi-line input starts

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

    // Handle custom key events (for Shift+Enter detection)
    terminal.attachCustomKeyEventHandler((event) => {
      // Detect Shift+Enter
      if (event.key === 'Enter' && event.shiftKey && event.type === 'keydown') {
        event.preventDefault()
        handleShiftEnter()
        return false
      }
      return true
    })

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

  const handleShiftEnter = () => {
    const term = xtermRef.current
    if (!term) return

    if (!multiLineRef.current) {
      // Enter multi-line mode
      multiLineRef.current = true
      const firstLine = currentLineRef.current
      multiLineBufferRef.current = [firstLine]
      multiLineCursorLineRef.current = 0
      multiLineStartRowRef.current = term.buffer.active.cursorY
      
      term.writeln(' \x1b[33m(multi-line mode - Shift+Enter to execute)\x1b[0m')
      term.write('  ')
      
      // Keep cursor on same line
      currentLineRef.current = firstLine
      cursorPositionRef.current = firstLine.length
      term.write(firstLine)
    } else {
      // Exit multi-line mode and execute
      // Save current line
      multiLineBufferRef.current[multiLineCursorLineRef.current] = currentLineRef.current
      const fullCommand = multiLineBufferRef.current.join('\n')
      term.writeln('')
      
      // Reset multi-line state
      multiLineRef.current = false
      multiLineBufferRef.current = []
      multiLineCursorLineRef.current = 0
      currentLineRef.current = ''
      cursorPositionRef.current = 0
      
      // Execute the command
      if (onCommand && fullCommand.trim()) {
        historyRef.current.push(fullCommand.trim())
        historyIndexRef.current = historyRef.current.length
        onCommand(fullCommand.trim())
      }
    }
  }

  const handleInput = (data: string) => {
    const term = xtermRef.current
    if (!term) return

    const code = data.charCodeAt(0)

    // Check for Shift+Enter (escape sequence varies by terminal)
    // We'll detect it by checking for specific escape sequences
    if (data === '\r' || data === '\n') {
      // This is a regular Enter without Shift
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

      // If in multi-line mode, add new line
      if (multiLineRef.current) {
        // Save current line
        multiLineBufferRef.current[multiLineCursorLineRef.current] = input
        // Add new line and move to it
        multiLineCursorLineRef.current++
        multiLineBufferRef.current.push('')
        currentLineRef.current = ''
        cursorPositionRef.current = 0
        term.write('  ')  // Continuation prompt
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

    // Handle Enter key (code 13 - this catches some terminals)
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

      // If in multi-line mode, add new line
      if (multiLineRef.current) {
        // Save current line
        multiLineBufferRef.current[multiLineCursorLineRef.current] = input
        // Add new line and move to it
        multiLineCursorLineRef.current++
        multiLineBufferRef.current.push('')
        currentLineRef.current = ''
        cursorPositionRef.current = 0
        term.write('  ')  // Continuation prompt
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

    // Handle Arrow Up
    if (data === '\x1b[A') {
      // In multi-line mode, move cursor to previous line
      if (multiLineRef.current) {
        if (multiLineCursorLineRef.current > 0) {
          // Save current line content
          multiLineBufferRef.current[multiLineCursorLineRef.current] = currentLineRef.current
          
          // Move cursor up one line
          term.write('\x1b[A')  // Move cursor up
          term.write('\r')       // Move to start of line
          term.write('  ')       // Position after prompt
          
          // Move to previous line in buffer
          multiLineCursorLineRef.current--
          currentLineRef.current = multiLineBufferRef.current[multiLineCursorLineRef.current]
          
          // Position cursor at same column or end of line
          const targetPos = Math.min(cursorPositionRef.current, currentLineRef.current.length)
          cursorPositionRef.current = targetPos
          term.write(currentLineRef.current.substring(0, targetPos))
        }
        return
      }
      
      // Navigate history only when NOT in multi-line mode
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

    // Handle Arrow Down
    if (data === '\x1b[B') {
      // In multi-line mode, move cursor to next line
      if (multiLineRef.current) {
        if (multiLineCursorLineRef.current < multiLineBufferRef.current.length - 1) {
          // Save current line content
          multiLineBufferRef.current[multiLineCursorLineRef.current] = currentLineRef.current
          
          // Move cursor down one line
          term.write('\x1b[B')  // Move cursor down
          term.write('\r')       // Move to start of line
          term.write('  ')       // Position after prompt
          
          // Move to next line in buffer
          multiLineCursorLineRef.current++
          currentLineRef.current = multiLineBufferRef.current[multiLineCursorLineRef.current]
          
          // Position cursor at same column or end of line
          const targetPos = Math.min(cursorPositionRef.current, currentLineRef.current.length)
          cursorPositionRef.current = targetPos
          term.write(currentLineRef.current.substring(0, targetPos))
        }
        return
      }
      
      // Navigate history only when NOT in multi-line mode
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

    // Handle Arrow Left (move cursor left)
    if (data === '\x1b[D') {
      if (cursorPositionRef.current > 0) {
        cursorPositionRef.current--
        term.write('\x1b[D')  // Move cursor left
      }
      return
    }

    // Handle Arrow Right (move cursor right)
    if (data === '\x1b[C') {
      if (cursorPositionRef.current < currentLineRef.current.length) {
        cursorPositionRef.current++
        term.write('\x1b[C')  // Move cursor right
      }
      return
    }

    // Handle Backspace
    if (code === 127) {
      if (cursorPositionRef.current > 0) {
        const line = currentLineRef.current
        const beforeCursor = line.slice(0, cursorPositionRef.current - 1)
        const afterCursor = line.slice(cursorPositionRef.current)
        currentLineRef.current = beforeCursor + afterCursor
        cursorPositionRef.current--

        // Redraw the line from cursor position
        const remaining = afterCursor + ' '
        term.write('\b' + remaining)
        // Move cursor back to correct position
        for (let i = 0; i < afterCursor.length + 1; i++) {
          term.write('\b')
        }
      }
      return
    }

    // Handle Ctrl+C
    if (code === 3) {
      term.write('^C')
      term.writeln('')
      
      // Exit multi-line mode if active
      if (multiLineRef.current) {
        multiLineRef.current = false
        multiLineBufferRef.current = []
        multiLineCursorLineRef.current = 0
      }
      
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
      const beforeCursor = line.slice(0, cursorPositionRef.current)
      const afterCursor = line.slice(cursorPositionRef.current)
      currentLineRef.current = beforeCursor + data + afterCursor
      
      // Write the new character and any text after it
      term.write(data + afterCursor)
      
      // Move cursor back to correct position (after the newly inserted character)
      for (let i = 0; i < afterCursor.length; i++) {
        term.write('\b')
      }
      
      cursorPositionRef.current++
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
