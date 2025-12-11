import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import styles from '../BashTerminal/BashTerminal.module.css'
import { useTheme } from '../../contexts/useTheme'
import { getTerminalTheme } from '../BashTerminal/terminalTheme'
import { useShell } from '../../hooks/useShell'
import type { ShellTerminalProps } from './types'

/**
 * Terminal component that provides a shell interface using shell-core.
 * Connects to the editor's filesystem for file operations.
 */
export function ShellTerminal({
  fileSystem,
  embedded = false,
  className,
}: ShellTerminalProps) {
  const { theme } = useTheme()
  const initialThemeRef = useRef(theme)
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const currentLineRef = useRef<string>('')
  const cursorPositionRef = useRef<number>(0)
  const historyIndexRef = useRef<number>(-1)

  const { executeCommand, cwd, history } = useShell(fileSystem)

  const showPrompt = useCallback(() => {
    const term = xtermRef.current
    if (!term) return
    // Show prompt with current directory
    term.write(`\x1b[32m${cwd}\x1b[0m \x1b[33m$\x1b[0m `)
  }, [cwd])

  const handleEnter = useCallback(() => {
    const term = xtermRef.current
    if (!term) return

    const input = currentLineRef.current.trim()
    term.writeln('')

    if (input) {
      const result = executeCommand(input)
      // Display stdout
      if (result.stdout) {
        const lines = result.stdout.split('\n')
        lines.forEach((line: string) => {
          term.writeln(line)
        })
      }
      // Display stderr in red
      if (result.stderr) {
        const lines = result.stderr.split('\n')
        lines.forEach((line: string) => {
          term.writeln(`\x1b[31m${line}\x1b[0m`)
        })
      }
    }

    currentLineRef.current = ''
    cursorPositionRef.current = 0
    historyIndexRef.current = -1
    showPrompt()
  }, [executeCommand, showPrompt])

  const handleInput = useCallback(
    (data: string) => {
      const term = xtermRef.current
      if (!term) return

      const code = data.charCodeAt(0)

      // Handle Enter
      if (data === '\r' || data === '\n' || code === 13) {
        handleEnter()
        return
      }

      // Handle Arrow Up (history)
      if (data === '\x1b[A') {
        if (history.length > 0) {
          const newIndex =
            historyIndexRef.current === -1
              ? history.length - 1
              : Math.max(0, historyIndexRef.current - 1)

          if (newIndex !== historyIndexRef.current || historyIndexRef.current === -1) {
            historyIndexRef.current = newIndex
            const historyCommand = history[newIndex]

            // Clear current line
            term.write('\r\x1b[K')
            showPrompt()
            term.write(historyCommand)

            currentLineRef.current = historyCommand
            cursorPositionRef.current = historyCommand.length
          }
        }
        return
      }

      // Handle Arrow Down (history)
      if (data === '\x1b[B') {
        if (historyIndexRef.current !== -1) {
          const newIndex = historyIndexRef.current + 1

          term.write('\r\x1b[K')
          showPrompt()

          if (newIndex >= history.length) {
            historyIndexRef.current = -1
            currentLineRef.current = ''
            cursorPositionRef.current = 0
          } else {
            historyIndexRef.current = newIndex
            const historyCommand = history[newIndex]
            term.write(historyCommand)
            currentLineRef.current = historyCommand
            cursorPositionRef.current = historyCommand.length
          }
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

      // Handle Backspace
      if (code === 127) {
        if (cursorPositionRef.current > 0) {
          const line = currentLineRef.current
          const beforeCursor = line.slice(0, cursorPositionRef.current - 1)
          const afterCursor = line.slice(cursorPositionRef.current)
          currentLineRef.current = beforeCursor + afterCursor
          cursorPositionRef.current--

          const remaining = afterCursor + ' '
          term.write('\b' + remaining)
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
        currentLineRef.current = ''
        cursorPositionRef.current = 0
        showPrompt()
        return
      }

      // Handle Ctrl+L (clear screen)
      if (code === 12) {
        term.clear()
        showPrompt()
        return
      }

      // Handle printable characters
      if (code >= 32 && code < 127) {
        const line = currentLineRef.current
        const beforeCursor = line.slice(0, cursorPositionRef.current)
        const afterCursor = line.slice(cursorPositionRef.current)
        currentLineRef.current = beforeCursor + data + afterCursor

        term.write(data + afterCursor)
        for (let i = 0; i < afterCursor.length; i++) {
          term.write('\b')
        }

        cursorPositionRef.current++
      }
    },
    [handleEnter, history, showPrompt]
  )

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

    // Show welcome message and prompt
    terminal.writeln('\x1b[36mLua IDE Shell\x1b[0m')
    terminal.writeln('Type "help" for available commands.\n')
    showPrompt()

    terminal.onData(handleInput)

    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      terminal.dispose()
    }
  }, [handleInput, showPrompt])

  // Update terminal theme when theme changes
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = getTerminalTheme(theme)
      xtermRef.current.refresh(0, xtermRef.current.rows)
    }
  }, [theme])

  const containerClassName = `${styles.container}${embedded ? ` ${styles.containerEmbedded}` : ''}${className ? ` ${className}` : ''}`

  return (
    <div className={containerClassName} data-testid="shell-terminal-container">
      {!embedded && (
        <div className={styles.header}>
          <h3>Shell</h3>
        </div>
      )}
      <div ref={terminalRef} className={styles.terminal} />
    </div>
  )
}
