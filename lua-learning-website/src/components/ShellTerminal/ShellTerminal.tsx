import { useEffect, useRef } from 'react'
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

  // Store latest values in refs so the terminal event handler always has current data
  const cwdRef = useRef(cwd)
  const historyRef = useRef(history)
  const executeCommandRef = useRef(executeCommand)

  // Keep refs up to date
  useEffect(() => {
    cwdRef.current = cwd
  }, [cwd])

  useEffect(() => {
    historyRef.current = history
  }, [history])

  useEffect(() => {
    executeCommandRef.current = executeCommand
  }, [executeCommand])

  // Initialize terminal once
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

    // Helper to show prompt with current directory
    const showPrompt = () => {
      terminal.write(`\x1b[32m${cwdRef.current}\x1b[0m \x1b[33m$\x1b[0m `)
    }

    // Handle enter key - execute command
    const handleEnter = () => {
      const input = currentLineRef.current.trim()
      terminal.writeln('')

      if (input) {
        const result = executeCommandRef.current(input)
        // Display stdout
        if (result.stdout) {
          const lines = result.stdout.split('\n')
          lines.forEach((line: string) => {
            terminal.writeln(line)
          })
        }
        // Display stderr in red
        if (result.stderr) {
          const lines = result.stderr.split('\n')
          lines.forEach((line: string) => {
            terminal.writeln(`\x1b[31m${line}\x1b[0m`)
          })
        }
      }

      currentLineRef.current = ''
      cursorPositionRef.current = 0
      historyIndexRef.current = -1
      showPrompt()
    }

    // Handle all terminal input
    const handleInput = (data: string) => {
      const code = data.charCodeAt(0)

      // Handle Enter
      if (data === '\r' || data === '\n' || code === 13) {
        handleEnter()
        return
      }

      // Handle Arrow Up (history)
      if (data === '\x1b[A') {
        const hist = historyRef.current
        if (hist.length > 0) {
          const newIndex =
            historyIndexRef.current === -1
              ? hist.length - 1
              : Math.max(0, historyIndexRef.current - 1)

          if (newIndex !== historyIndexRef.current || historyIndexRef.current === -1) {
            historyIndexRef.current = newIndex
            const historyCommand = hist[newIndex]

            // Clear current line
            terminal.write('\r\x1b[K')
            showPrompt()
            terminal.write(historyCommand)

            currentLineRef.current = historyCommand
            cursorPositionRef.current = historyCommand.length
          }
        }
        return
      }

      // Handle Arrow Down (history)
      if (data === '\x1b[B') {
        const hist = historyRef.current
        if (historyIndexRef.current !== -1) {
          const newIndex = historyIndexRef.current + 1

          terminal.write('\r\x1b[K')
          showPrompt()

          if (newIndex >= hist.length) {
            historyIndexRef.current = -1
            currentLineRef.current = ''
            cursorPositionRef.current = 0
          } else {
            historyIndexRef.current = newIndex
            const historyCommand = hist[newIndex]
            terminal.write(historyCommand)
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
          terminal.write('\x1b[D')
        }
        return
      }

      // Handle Arrow Right
      if (data === '\x1b[C') {
        if (cursorPositionRef.current < currentLineRef.current.length) {
          cursorPositionRef.current++
          terminal.write('\x1b[C')
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
          terminal.write('\b' + remaining)
          for (let i = 0; i < afterCursor.length + 1; i++) {
            terminal.write('\b')
          }
        }
        return
      }

      // Handle Ctrl+C
      if (code === 3) {
        terminal.write('^C')
        terminal.writeln('')
        currentLineRef.current = ''
        cursorPositionRef.current = 0
        showPrompt()
        return
      }

      // Handle Ctrl+L (clear screen)
      if (code === 12) {
        terminal.clear()
        showPrompt()
        return
      }

      // Handle printable characters
      if (code >= 32 && code < 127) {
        const line = currentLineRef.current
        const beforeCursor = line.slice(0, cursorPositionRef.current)
        const afterCursor = line.slice(cursorPositionRef.current)
        currentLineRef.current = beforeCursor + data + afterCursor

        terminal.write(data + afterCursor)
        for (let i = 0; i < afterCursor.length; i++) {
          terminal.write('\b')
        }

        cursorPositionRef.current++
      }
    }

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
  }, []) // Empty dependency array - only run once

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
