import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import styles from '../BashTerminal/BashTerminal.module.css'
import { useTheme } from '../../contexts/useTheme'
import { getTerminalTheme } from '../BashTerminal/terminalTheme'
import { useShell } from '../../hooks/useShell'
import { useProcessManager } from '../../hooks/useProcessManager'
import { useShellTerminal } from './useShellTerminal'
import { createInputHandler, createPasteHandler } from './useTerminalInput'
import { StopButton } from '../StopButton'
import type { ShellTerminalProps } from './types'

/**
 * Terminal component that provides a shell interface using shell-core.
 * Connects to the editor's filesystem for file operations.
 */
export function ShellTerminal({
  fileSystem,
  embedded = false,
  className,
  onFileSystemChange,
}: ShellTerminalProps) {
  const { theme } = useTheme()
  const initialThemeRef = useRef(theme)
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  const { executeCommand, executeCommandWithContext, cwd, history, commandNames, getPathCompletionsForTab } = useShell(fileSystem)

  // Store latest values in refs so handlers can access current data
  const cwdRef = useRef(cwd)
  const executeCommandRef = useRef(executeCommand)
  const executeCommandWithContextRef = useRef(executeCommandWithContext)

  useEffect(() => {
    cwdRef.current = cwd
  }, [cwd])

  useEffect(() => {
    executeCommandRef.current = executeCommand
  }, [executeCommand])

  useEffect(() => {
    executeCommandWithContextRef.current = executeCommandWithContext
  }, [executeCommandWithContext])

  // Store onFileSystemChange in ref for stable callback access
  const onFileSystemChangeRef = useRef(onFileSystemChange)
  useEffect(() => {
    onFileSystemChangeRef.current = onFileSystemChange
  }, [onFileSystemChange])

  // Helper to show prompt - needs to be stable and use refs
  const showPrompt = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.write(`\x1b[32m${cwdRef.current}\x1b[0m \x1b[33m$\x1b[0m `)
    }
  }, [])

  // Handle process output - write to terminal
  // Convert \n to \r\n for proper xterm cursor positioning
  const handleProcessOutput = useCallback((text: string) => {
    if (xtermRef.current) {
      xtermRef.current.write(text.replace(/\n/g, '\r\n'))
    }
  }, [])

  // Handle process errors - write in red to terminal
  // Convert \n to \r\n for proper xterm cursor positioning
  const handleProcessError = useCallback((text: string) => {
    if (xtermRef.current) {
      xtermRef.current.write(`\x1b[31m${text.replace(/\n/g, '\r\n')}\x1b[0m`)
    }
    // Set error marker in editor if available
    const win = window as Window & { __luaSetError?: (msg: string) => void }
    win.__luaSetError?.(text)
  }, [])

  // Character mode state for io.read(n)
  // When charModeCount > 0, we capture exactly that many characters without Enter
  const [charModeCount, setCharModeCount] = useState(0)
  const charBufferRef = useRef('')

  // Handle process requesting input
  // Note: We need a ref to handleProcessInput to avoid circular dependency
  // (handleRequestInput is passed to useProcessManager, but needs to call handleProcessInput)
  const processInputCallbackRef = useRef<(input: string) => boolean>(() => false)

  const handleRequestInput = useCallback((requestedCharCount?: number) => {
    if (requestedCharCount !== undefined && requestedCharCount > 0) {
      // Check if buffer already has enough bytes from previous read
      const existingBuffer = charBufferRef.current
      if (existingBuffer.length >= requestedCharCount) {
        // Buffer has enough - send immediately without waiting for new input
        const input = existingBuffer.slice(0, requestedCharCount)
        charBufferRef.current = existingBuffer.slice(requestedCharCount)
        // Don't set charModeCount - we're satisfying the request immediately
        // Use setTimeout to avoid calling back into process synchronously
        setTimeout(() => {
          processInputCallbackRef.current(input)
        }, 0)
      } else {
        // Not enough in buffer - switch to character mode to wait for more input
        setCharModeCount(requestedCharCount)
        // Don't clear buffer - keep existing bytes for the read
      }
    } else {
      // Line mode - no special handling needed
      setCharModeCount(0)
    }
  }, [])

  // Handle process exit - show prompt again
  const handleProcessExitCallback = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.writeln('')
      showPrompt()
    }
  }, [showPrompt])

  // Process manager for handling long-running processes
  const {
    isProcessRunning,
    startProcess,
    stopProcess,
    handleInput: handleProcessInput,
    supportsRawInput,
    handleKey: handleProcessKey,
  } = useProcessManager({
    onOutput: handleProcessOutput,
    onError: handleProcessError,
    onProcessExit: handleProcessExitCallback,
    onRequestInput: handleRequestInput,
  })

  // Store process manager state in refs for stable terminal event handler
  const isProcessRunningRef = useRef(isProcessRunning)
  const startProcessRef = useRef(startProcess)
  const stopProcessRef = useRef(stopProcess)
  const handleProcessInputRef = useRef(handleProcessInput)
  const supportsRawInputRef = useRef(supportsRawInput)
  const handleProcessKeyRef = useRef(handleProcessKey)
  const charModeCountRef = useRef(charModeCount)
  const setCharModeCountRef = useRef(setCharModeCount)

  useEffect(() => {
    isProcessRunningRef.current = isProcessRunning
    startProcessRef.current = startProcess
    stopProcessRef.current = stopProcess
    handleProcessInputRef.current = handleProcessInput
    // Also update the callback ref used by handleRequestInput
    processInputCallbackRef.current = handleProcessInput
    supportsRawInputRef.current = supportsRawInput
    handleProcessKeyRef.current = handleProcessKey
    charModeCountRef.current = charModeCount
    setCharModeCountRef.current = setCharModeCount
  }, [isProcessRunning, startProcess, stopProcess, handleProcessInput, supportsRawInput, handleProcessKey, charModeCount])

  // Handle command execution
  const handleCommand = useCallback((input: string) => {
    const terminal = xtermRef.current
    if (!terminal) return

    // Move to new line before showing output
    terminal.writeln('')

    // Helper to write text with proper line endings for xterm
    // xterm needs \r\n to return cursor to column 0, not just \n
    const writeOutput = (text: string) => {
      terminal.write(text.replace(/\n/g, '\r\n'))
      terminal.write('\r\n')
    }

    // Clear any existing error markers before execution
    const win = window as Window & { __luaSetError?: (msg: string) => void; __luaClearErrors?: () => void }
    win.__luaClearErrors?.()

    // Execute command using the context-aware method
    // This handles both ICommand (lua) and legacy commands via adapter
    // Output is handled by the callbacks passed to the context
    const contextResult = executeCommandWithContextRef.current(
      input,
      (text) => writeOutput(text),
      (text) => {
        writeOutput(`\x1b[31m${text}\x1b[0m`)
        // Set error marker in editor if available
        win.__luaSetError?.(text)
      }
    )

    // Update cwd ref immediately
    cwdRef.current = contextResult.cwd

    // Notify that filesystem may have changed (for file tree refresh)
    onFileSystemChangeRef.current?.()

    // If a process was returned, start it and don't show prompt yet
    // The prompt will be shown when the process exits via onProcessExit callback
    if (contextResult.process) {
      startProcessRef.current(contextResult.process)
      return
    }

    // For non-process commands, output was already handled via context callbacks
    // Just show the prompt
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

    // Create input handler using extracted function
    const handleInput = createInputHandler({
      terminal,
      handlersRef,
      currentLineRef,
      processRefs: {
        isProcessRunning: isProcessRunningRef,
        handleProcessInput: handleProcessInputRef,
        stopProcess: stopProcessRef,
        supportsRawInput: supportsRawInputRef,
        handleProcessKey: handleProcessKeyRef,
      },
      charModeRefs: {
        charModeCount: charModeCountRef,
        charBuffer: charBufferRef,
        setCharModeCount: setCharModeCountRef,
      },
      showPrompt,
    })

    // Show welcome message and prompt
    terminal.writeln('\x1b[36mLua IDE Shell\x1b[0m')
    terminal.writeln('Type "help" for available commands.\n')
    showPrompt()

    // Expose test API for E2E tests (non-production only)
    if (import.meta.env.MODE !== 'production') {
      ;(window as unknown as { __shellTerminal?: object }).__shellTerminal = {
        getBuffer: () => {
          const buffer = terminal.buffer.active
          const lines: string[] = []
          for (let i = 0; i < buffer.length; i++) {
            const line = buffer.getLine(i)
            if (line) {
              lines.push(line.translateToString().trimEnd())
            }
          }
          return lines
        },
        getVisibleText: () => {
          const buffer = terminal.buffer.active
          const lines: string[] = []
          for (let i = buffer.viewportY; i < buffer.viewportY + terminal.rows; i++) {
            const line = buffer.getLine(i)
            if (line) {
              lines.push(line.translateToString().trimEnd())
            }
          }
          return lines.join('\n')
        },
        getAllText: () => {
          const buffer = terminal.buffer.active
          const lines: string[] = []
          for (let i = 0; i < buffer.length; i++) {
            const line = buffer.getLine(i)
            if (line) {
              lines.push(line.translateToString().trimEnd())
            }
          }
          return lines.join('\n')
        },
      }
    }

    // Handle Ctrl+V paste - xterm.js doesn't handle this automatically
    terminal.attachCustomKeyEventHandler(createPasteHandler(handleInput))

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
      // Clean up test API
      if (import.meta.env.MODE !== 'production') {
        delete (window as unknown as { __shellTerminal?: object }).__shellTerminal
      }
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
          {isProcessRunning && <StopButton onStop={stopProcess} />}
        </div>
      )}
      {embedded && isProcessRunning && (
        <div className={styles.processControls}>
          <StopButton onStop={stopProcess} />
        </div>
      )}
      <div ref={terminalRef} className={styles.terminal} />
    </div>
  )
}
