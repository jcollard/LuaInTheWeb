import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import styles from './BashTerminal/BashTerminal.module.css'
import { useTheme } from '../contexts/useTheme'
import { getTerminalTheme } from './BashTerminal/terminalTheme'
import {
  handleEnterKey,
  handleArrowUp,
  handleArrowDown,
  handleBackspace,
  handleCharacter,
  type InputState,
} from './BashTerminal/inputKeyHandlers'

export interface BashTerminalHandle {
  writeln: (text: string) => void
  write: (text: string) => void
  clear: () => void
  readLine: () => Promise<string>
  /**
   * Read exactly `count` characters without waiting for Enter.
   * Characters are echoed as typed. Returns immediately after count chars received.
   */
  readChars: (count: number) => Promise<string>
  showPrompt: () => void
}

interface BashTerminalProps {
  onCommand?: (command: string) => void
  embedded?: boolean
}

const BashTerminal = forwardRef<BashTerminalHandle, BashTerminalProps>(({ onCommand, embedded = false }, ref) => {
  const { theme } = useTheme()
  const initialThemeRef = useRef(theme)
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const currentLineRef = useRef<string>('')
  const cursorPositionRef = useRef<number>(0)
  const inputResolveRef = useRef<((value: string) => void) | null>(null)
  const isReadingRef = useRef<boolean>(false)
  const charModeCountRef = useRef<number>(0) // 0 = line mode, >0 = character mode
  const charBufferRef = useRef<string>('') // Buffer for character-mode input
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)
  const multiLineRef = useRef<boolean>(false)
  const multiLineBufferRef = useRef<string[]>([])
  const multiLineCursorLineRef = useRef<number>(0)
  const multiLineStartRowRef = useRef<number>(0)
  const collapsedHistoryItemRef = useRef<string | null>(null)

  const getInputState = useCallback((): InputState => ({
    currentLine: currentLineRef.current,
    cursorPosition: cursorPositionRef.current,
    history: historyRef.current,
    historyIndex: historyIndexRef.current,
    isMultiLineMode: multiLineRef.current,
    multiLineBuffer: multiLineBufferRef.current,
    multiLineCursorLine: multiLineCursorLineRef.current,
    collapsedHistoryItem: collapsedHistoryItemRef.current,
  }), [])

  const applyStateUpdate = useCallback((update: Partial<InputState>) => {
    if (update.currentLine !== undefined) currentLineRef.current = update.currentLine
    if (update.cursorPosition !== undefined) cursorPositionRef.current = update.cursorPosition
    if (update.history !== undefined) historyRef.current = update.history
    if (update.historyIndex !== undefined) historyIndexRef.current = update.historyIndex
    if (update.isMultiLineMode !== undefined) multiLineRef.current = update.isMultiLineMode
    if (update.multiLineBuffer !== undefined) multiLineBufferRef.current = update.multiLineBuffer
    if (update.multiLineCursorLine !== undefined) multiLineCursorLineRef.current = update.multiLineCursorLine
    if (update.collapsedHistoryItem !== undefined) collapsedHistoryItemRef.current = update.collapsedHistoryItem
  }, [])

  const redrawMultiLineFrom = useCallback((startLine: number) => {
    const term = xtermRef.current
    if (!term || !multiLineRef.current) return

    const linesToRedraw = multiLineBufferRef.current.slice(startLine)
    const currentLineIndex = multiLineCursorLineRef.current - startLine
    const savedCursorPos = cursorPositionRef.current

    term.write('\x1b[J\r\x1b[K')
    term.write('  ')
    term.write(linesToRedraw[0])

    for (let i = 1; i < linesToRedraw.length; i++) {
      term.writeln('')
      term.write('  ')
      term.write(linesToRedraw[i])
    }

    const linesToGoUp = linesToRedraw.length - 1 - currentLineIndex
    if (linesToGoUp > 0) term.write(`\x1b[${linesToGoUp}A`)

    term.write('\r  ')
    if (savedCursorPos > 0) term.write(currentLineRef.current.substring(0, savedCursorPos))
  }, [])

  const handleShiftEnter = useCallback(() => {
    const term = xtermRef.current
    if (!term) return

    if (!multiLineRef.current) {
      if (collapsedHistoryItemRef.current) {
        const originalText = collapsedHistoryItemRef.current
        collapsedHistoryItemRef.current = null
        multiLineRef.current = true
        multiLineBufferRef.current = originalText.split('\n')
        multiLineCursorLineRef.current = 0
        multiLineStartRowRef.current = term.buffer.active.cursorY

        term.write('\r\x1b[K')
        term.writeln(' \x1b[33m(multi-line mode - Shift+Enter to execute)\x1b[0m')

        for (let i = 0; i < multiLineBufferRef.current.length; i++) {
          term.write('  ')
          term.write(multiLineBufferRef.current[i])
          if (i < multiLineBufferRef.current.length - 1) term.writeln('')
        }

        const lastLineIndex = multiLineBufferRef.current.length - 1
        multiLineCursorLineRef.current = lastLineIndex
        currentLineRef.current = multiLineBufferRef.current[lastLineIndex]
        cursorPositionRef.current = currentLineRef.current.length
        return
      }

      multiLineRef.current = true
      const firstLine = currentLineRef.current
      multiLineBufferRef.current = [firstLine]
      multiLineCursorLineRef.current = 0
      multiLineStartRowRef.current = term.buffer.active.cursorY

      term.writeln(' \x1b[33m(multi-line mode - Shift+Enter to execute)\x1b[0m')
      term.write('  ')
      currentLineRef.current = firstLine
      cursorPositionRef.current = firstLine.length
      term.write(firstLine)
    } else {
      multiLineBufferRef.current[multiLineCursorLineRef.current] = currentLineRef.current
      const fullCommand = multiLineBufferRef.current.join('\n')
      const lastLineIndex = multiLineBufferRef.current.length - 1
      const linesToMove = lastLineIndex - multiLineCursorLineRef.current

      if (linesToMove > 0) term.write(`\x1b[${linesToMove}B`)
      else if (linesToMove < 0) term.write(`\x1b[${Math.abs(linesToMove)}A`)

      const lastLine = multiLineBufferRef.current[lastLineIndex]
      term.write('\r  ')
      term.write(lastLine)
      term.writeln('')

      multiLineRef.current = false
      multiLineBufferRef.current = []
      multiLineCursorLineRef.current = 0
      currentLineRef.current = ''
      cursorPositionRef.current = 0

      if (onCommand && fullCommand.trim()) {
        historyRef.current.push(fullCommand.trim())
        historyIndexRef.current = historyRef.current.length
        onCommand(fullCommand.trim())
      }
    }
  }, [onCommand])

  const handleInput = useCallback((data: string) => {
    const term = xtermRef.current
    if (!term) return

    const code = data.charCodeAt(0)

    // Handle Enter key
    if (data === '\r' || data === '\n' || code === 13) {
      if (isReadingRef.current && inputResolveRef.current) {
        term.writeln('')
        inputResolveRef.current(currentLineRef.current)
        inputResolveRef.current = null
        isReadingRef.current = false
        currentLineRef.current = ''
        cursorPositionRef.current = 0
        return
      }

      const result = handleEnterKey(getInputState())
      applyStateUpdate(result.stateUpdate)

      if (result.isMultiLineNewLine && result.lineBeforeSplit !== undefined) {
        redrawMultiLineFrom(result.lineBeforeSplit)
      } else {
        term.writeln('')
        if (result.commandToExecute && onCommand) {
          onCommand(result.commandToExecute)
        }
      }
      return
    }

    // Handle Arrow Up
    if (data === '\x1b[A') {
      const result = handleArrowUp(getInputState())
      applyStateUpdate(result.stateUpdate)

      if (multiLineRef.current && result.stateUpdate.multiLineCursorLine !== undefined) {
        term.write('\x1b[A\r  ')
        const targetPos = result.stateUpdate.cursorPosition ?? 0
        term.write((result.stateUpdate.currentLine ?? '').substring(0, targetPos))
      } else if (result.displayCommand !== undefined) {
        term.write('\r\x1b[K\x1b[32m> \x1b[0m' + result.displayCommand)
      }
      return
    }

    // Handle Arrow Down
    if (data === '\x1b[B') {
      const result = handleArrowDown(getInputState())
      applyStateUpdate(result.stateUpdate)

      if (multiLineRef.current && result.stateUpdate.multiLineCursorLine !== undefined) {
        term.write('\x1b[B\r  ')
        const targetPos = result.stateUpdate.cursorPosition ?? 0
        term.write((result.stateUpdate.currentLine ?? '').substring(0, targetPos))
      } else if (result.displayCommand !== undefined) {
        term.write('\r\x1b[K\x1b[32m> \x1b[0m' + result.displayCommand)
      }
      return
    }

    // Handle Arrow Left
    if (data === '\x1b[D') {
      if (cursorPositionRef.current > 0) {
        cursorPositionRef.current--
        term.write('\x1b[D')
      }
      return
    }

    // Handle Arrow Right
    if (data === '\x1b[C') {
      if (cursorPositionRef.current < currentLineRef.current.length) {
        cursorPositionRef.current++
        term.write('\x1b[C')
      }
      return
    }

    // Handle Home key
    if (data === '\x1b[H' || data === '\x1b[1~' || data === '\x1bOH') {
      const pos = cursorPositionRef.current
      if (pos > 0) {
        cursorPositionRef.current = 0
        term.write(`\x1b[${pos}D`)
      }
      return
    }

    // Handle End key
    if (data === '\x1b[F' || data === '\x1b[4~' || data === '\x1bOF') {
      const pos = cursorPositionRef.current
      const lineLength = currentLineRef.current.length
      if (pos < lineLength) {
        cursorPositionRef.current = lineLength
        term.write(`\x1b[${lineLength - pos}C`)
      }
      return
    }

    // Handle Backspace
    if (code === 127) {
      const result = handleBackspace(getInputState())

      if (result.shouldMergeLines && result.previousLineIndex !== undefined) {
        applyStateUpdate(result)
        term.write('\r\x1b[K\x1b[A\r')
        redrawMultiLineFrom(result.previousLineIndex)
      } else if (result.currentLine !== undefined) {
        const afterCursor = currentLineRef.current.slice(cursorPositionRef.current)
        applyStateUpdate(result)
        term.write('\b' + afterCursor + ' ')
        for (let i = 0; i < afterCursor.length + 1; i++) term.write('\b')
      }
      return
    }

    // Handle Ctrl+C
    if (code === 3) {
      term.write('^C')
      term.writeln('')
      if (multiLineRef.current) {
        multiLineRef.current = false
        multiLineBufferRef.current = []
        multiLineCursorLineRef.current = 0
      }
      currentLineRef.current = ''
      cursorPositionRef.current = 0
      return
    }

    // Handle Ctrl+L
    if (code === 12) {
      term.clear()
      return
    }

    // Handle printable characters
    if (code >= 32 && code < 127) {
      // Character-mode input: capture characters without waiting for Enter
      if (isReadingRef.current && charModeCountRef.current > 0) {
        charBufferRef.current += data
        term.write(data) // Echo character

        // Check if we have enough characters
        if (charBufferRef.current.length >= charModeCountRef.current) {
          const result = charBufferRef.current.slice(0, charModeCountRef.current)
          charBufferRef.current = ''
          charModeCountRef.current = 0
          isReadingRef.current = false
          if (inputResolveRef.current) {
            inputResolveRef.current(result)
            inputResolveRef.current = null
          }
        }
        return
      }

      const afterCursor = currentLineRef.current.slice(cursorPositionRef.current)
      const result = handleCharacter(getInputState(), data)
      applyStateUpdate(result)
      term.write(data + afterCursor)
      for (let i = 0; i < afterCursor.length; i++) term.write('\b')
    }
  }, [onCommand, getInputState, applyStateUpdate, redrawMultiLineFrom])

  useEffect(() => {
    if (!terminalRef.current) return

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Cascadia Code", Menlo, Monaco, "Courier New", monospace',
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(terminalRef.current)
    terminal.options.theme = getTerminalTheme(initialThemeRef.current)
    fitAddon.fit()

    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.key === 'Enter' && event.shiftKey && event.type === 'keydown') {
        event.preventDefault()
        handleShiftEnter()
        return false
      }
      return true
    })

    terminal.onData((data) => handleInput(data))

    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      terminal.dispose()
    }
  }, [handleInput, handleShiftEnter])

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = getTerminalTheme(theme)
      xtermRef.current.refresh(0, xtermRef.current.rows)
    }
  }, [theme])

  useImperativeHandle(ref, () => ({
    writeln: (text: string) => xtermRef.current?.writeln(text),
    write: (text: string) => xtermRef.current?.write(text),
    clear: () => xtermRef.current?.clear(),
    readLine: async () => {
      return new Promise<string>((resolve) => {
        isReadingRef.current = true
        charModeCountRef.current = 0 // Line mode
        inputResolveRef.current = resolve
        xtermRef.current?.write('> ')
        currentLineRef.current = ''
        cursorPositionRef.current = 0
      })
    },
    readChars: async (count: number) => {
      return new Promise<string>((resolve) => {
        isReadingRef.current = true
        charModeCountRef.current = count // Character mode
        charBufferRef.current = ''
        inputResolveRef.current = resolve
        // No prompt in character mode - characters capture immediately
      })
    },
    showPrompt: () => xtermRef.current?.write('\x1b[32m> \x1b[0m'),
  }))

  const containerClassName = `${styles.container}${embedded ? ` ${styles.containerEmbedded}` : ''}`

  return (
    <div className={containerClassName} data-testid="bash-terminal-container">
      {!embedded && (
        <div className={styles.header}>
          <h3>Output</h3>
        </div>
      )}
      <div ref={terminalRef} className={styles.terminal} />
    </div>
  )
})

BashTerminal.displayName = 'BashTerminal'

export default BashTerminal
