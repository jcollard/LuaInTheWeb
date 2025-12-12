import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import styles from '../BashTerminal/BashTerminal.module.css'
import { useTheme } from '../../contexts/useTheme'
import { getTerminalTheme } from '../BashTerminal/terminalTheme'
import { useShell } from '../../hooks/useShell'
import { useShellTerminal, type TerminalCommand } from './useShellTerminal'
import type { ShellTerminalProps } from './types'

/**
 * Executes terminal commands on xterm.js terminal.
 * Converts TerminalCommand[] to ANSI escape sequences.
 */
function executeTerminalCommands(
  terminal: Terminal,
  commands: TerminalCommand[]
): void {
  const cursorDirectionCodes: Record<string, string> = {
    up: 'A',
    down: 'B',
    right: 'C',
    left: 'D',
  }

  for (const command of commands) {
    switch (command.type) {
      case 'write':
        terminal.write(command.data ?? '')
        break
      case 'writeln':
        terminal.writeln(command.data ?? '')
        break
      case 'moveCursor': {
        const direction = command.direction
        if (direction) {
          const code = cursorDirectionCodes[direction]
          const count = command.count ?? 1
          terminal.write(`\x1b[${count}${code}`)
        }
        break
      }
      case 'clearLine':
        terminal.write('\r\x1b[K')
        break
      case 'clearToEnd':
        terminal.write('\x1b[K')
        break
      case 'clear':
        terminal.clear()
        break
    }
  }
}

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

  const { executeCommand, cwd, history, commandNames, getPathCompletionsForTab } = useShell(fileSystem)

  // Store latest values in refs so handlers can access current data
  const cwdRef = useRef(cwd)
  const executeCommandRef = useRef(executeCommand)

  useEffect(() => {
    cwdRef.current = cwd
  }, [cwd])

  useEffect(() => {
    executeCommandRef.current = executeCommand
  }, [executeCommand])

  // Helper to show prompt - needs to be stable and use refs
  const showPrompt = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.write(`\x1b[32m${cwdRef.current}\x1b[0m \x1b[33m$\x1b[0m `)
    }
  }, [])

  // Handle command execution
  const handleCommand = useCallback((input: string) => {
    const terminal = xtermRef.current
    if (!terminal) return

    // Move to new line before showing output
    terminal.writeln('')

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

    // Update cwd ref immediately so prompt shows correct directory
    cwdRef.current = result.cwd

    showPrompt()
  }, [showPrompt])

  // Use the shell terminal hook for input handling
  const {
    currentLine,
    handleCharacter,
    handleBackspace,
    handleEnter,
    handleArrowUp,
    handleArrowDown,
    handleArrowLeft,
    handleArrowRight,
    handleCtrlC,
    handleCtrlL,
    handleTab,
  } = useShellTerminal({
    history,
    onCommand: handleCommand,
    commandNames,
    getPathCompletions: getPathCompletionsForTab,
  })

  // Store current line in ref for access in input handler
  const currentLineRef = useRef(currentLine)
  useEffect(() => {
    currentLineRef.current = currentLine
  }, [currentLine])

  // Store hook handlers in refs for stable terminal event handler
  const handlersRef = useRef({
    handleCharacter,
    handleBackspace,
    handleEnter,
    handleArrowUp,
    handleArrowDown,
    handleArrowLeft,
    handleArrowRight,
    handleCtrlC,
    handleCtrlL,
    handleTab,
  })

  useEffect(() => {
    handlersRef.current = {
      handleCharacter,
      handleBackspace,
      handleEnter,
      handleArrowUp,
      handleArrowDown,
      handleArrowLeft,
      handleArrowRight,
      handleCtrlC,
      handleCtrlL,
      handleTab,
    }
  }, [
    handleCharacter,
    handleBackspace,
    handleEnter,
    handleArrowUp,
    handleArrowDown,
    handleArrowLeft,
    handleArrowRight,
    handleCtrlC,
    handleCtrlL,
    handleTab,
  ])

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

    // Handle terminal input - dispatch to hook handlers
    const handleInput = (data: string) => {
      const code = data.charCodeAt(0)
      const handlers = handlersRef.current
      let commands: TerminalCommand[] = []

      // Handle Enter
      if (data === '\r' || data === '\n' || code === 13) {
        commands = handlers.handleEnter()
        executeTerminalCommands(terminal, commands)
        // Show prompt for empty input (commands include writeln)
        if (commands.length > 0) {
          showPrompt()
        }
        return
      }

      // Handle Arrow Up (history)
      if (data === '\x1b[A') {
        commands = handlers.handleArrowUp()
        if (commands.length > 0) {
          // Clear line, show prompt, then write history command
          terminal.write('\r\x1b[K')
          showPrompt()
          const writeCmd = commands.find((c) => c.type === 'write')
          if (writeCmd?.data) {
            terminal.write(writeCmd.data)
          }
        }
        return
      }

      // Handle Arrow Down (history)
      if (data === '\x1b[B') {
        commands = handlers.handleArrowDown()
        // Clear line, show prompt, then write history command (if any)
        terminal.write('\r\x1b[K')
        showPrompt()
        const writeCmd = commands.find((c) => c.type === 'write')
        if (writeCmd?.data) {
          terminal.write(writeCmd.data)
        }
        return
      }

      // Handle Arrow Left
      if (data === '\x1b[D') {
        commands = handlers.handleArrowLeft()
        executeTerminalCommands(terminal, commands)
        return
      }

      // Handle Arrow Right
      if (data === '\x1b[C') {
        commands = handlers.handleArrowRight()
        executeTerminalCommands(terminal, commands)
        return
      }

      // Handle Backspace
      if (code === 127) {
        commands = handlers.handleBackspace()
        executeTerminalCommands(terminal, commands)
        return
      }

      // Handle Ctrl+C
      if (code === 3) {
        commands = handlers.handleCtrlC()
        executeTerminalCommands(terminal, commands)
        showPrompt()
        return
      }

      // Handle Ctrl+L (clear screen)
      if (code === 12) {
        commands = handlers.handleCtrlL()
        executeTerminalCommands(terminal, commands)
        showPrompt()
        return
      }

      // Handle Tab (completion)
      if (code === 9) {
        const tabResult = handlers.handleTab()
        executeTerminalCommands(terminal, tabResult.commands)

        // Show suggestions if multiple matches
        if (tabResult.suggestions.length > 0) {
          terminal.writeln('')
          if (tabResult.truncatedCount) {
            terminal.writeln(`${tabResult.truncatedCount} options available`)
          } else {
            // Display suggestions in columns
            terminal.writeln(tabResult.suggestions.join('  '))
          }
          showPrompt()
          // Re-show current input after suggestions
          terminal.write(currentLineRef.current)
        }
        return
      }

      // Handle printable characters
      if (code >= 32 && code < 127) {
        commands = handlers.handleCharacter(data)
        executeTerminalCommands(terminal, commands)
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

    // Use ResizeObserver to detect container size changes (e.g., panel resize)
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(terminalRef.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      terminal.dispose()
    }
  }, [showPrompt])

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
