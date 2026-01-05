import type { Terminal } from '@xterm/xterm'
import type { MutableRefObject } from 'react'
import type { TerminalCommand } from './useShellTerminal'
import { hasModifierKey } from '../../utils/platformShortcuts'

/**
 * Executes terminal commands on xterm.js terminal.
 * Converts TerminalCommand[] to ANSI escape sequences.
 */
export function executeTerminalCommands(
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

interface TerminalInputHandlers {
  handleCharacter: (char: string) => TerminalCommand[]
  handleBackspace: () => TerminalCommand[]
  handleEnter: () => TerminalCommand[]
  handleArrowUp: () => TerminalCommand[]
  handleArrowDown: () => TerminalCommand[]
  handleArrowLeft: () => TerminalCommand[]
  handleArrowRight: () => TerminalCommand[]
  handleCtrlC: () => TerminalCommand[]
  handleCtrlL: () => TerminalCommand[]
  handleTab: () => { commands: TerminalCommand[]; suggestions: string[]; truncatedCount?: number }
}

interface ProcessRefs {
  isProcessRunning: MutableRefObject<boolean>
  handleProcessInput: MutableRefObject<(input: string) => void>
  stopProcess: MutableRefObject<() => void>
  supportsRawInput: MutableRefObject<() => boolean>
  handleProcessKey: MutableRefObject<(key: string, modifiers: { ctrl: boolean; alt: boolean; shift: boolean }) => void>
}

/**
 * Refs for character mode input (io.read(n)).
 * When charModeCount > 0, terminal captures exactly that many characters
 * without waiting for Enter.
 */
interface CharModeRefs {
  charModeCount: MutableRefObject<number>
  charBuffer: MutableRefObject<string>
  setCharModeCount: MutableRefObject<(count: number) => void>
}

interface InputHandlerDeps {
  terminal: Terminal
  handlersRef: MutableRefObject<TerminalInputHandlers>
  currentLineRef: MutableRefObject<string>
  processRefs: ProcessRefs
  charModeRefs?: CharModeRefs
  showPrompt: () => void
}

/**
 * Creates the input handler function for terminal data events.
 * Processes single characters, escape sequences, and multi-character paste.
 */
export function createInputHandler(deps: InputHandlerDeps): (data: string) => void {
  const { terminal, handlersRef, currentLineRef, processRefs, charModeRefs, showPrompt } = deps
  const {
    isProcessRunning: isProcessRunningRef,
    handleProcessInput: handleProcessInputRef,
    stopProcess: stopProcessRef,
    supportsRawInput: supportsRawInputRef,
    handleProcessKey: handleProcessKeyRef,
  } = processRefs

  /**
   * Check if currently in character mode (io.read(n)).
   */
  const isInCharMode = (): boolean => {
    return !!charModeRefs && charModeRefs.charModeCount.current > 0
  }

  /**
   * Handle character mode input (io.read(n)).
   * Buffers ALL input as raw bytes (including escape sequences).
   * No echo - the program controls what gets displayed.
   * Returns true if input was handled in char mode, false otherwise.
   */
  const handleCharModeInput = (data: string): boolean => {
    if (!charModeRefs) return false
    const charCount = charModeRefs.charModeCount.current
    if (charCount <= 0) return false

    // Add all bytes to buffer (raw input, including escape sequences)
    charModeRefs.charBuffer.current += data

    // No echo in character mode - program controls display via io.write/print

    // Check if we have enough bytes
    if (charModeRefs.charBuffer.current.length >= charCount) {
      const input = charModeRefs.charBuffer.current.slice(0, charCount)
      // Keep remaining bytes in buffer for subsequent reads
      charModeRefs.charBuffer.current = charModeRefs.charBuffer.current.slice(charCount)
      // Reset character mode (process will request again if needed)
      charModeRefs.setCharModeCount.current(0)
      // Send input to process
      handleProcessInputRef.current(input)
    }

    return true
  }

  // Process a single character or escape sequence
  const processSingleInput = (data: string) => {
    const code = data.charCodeAt(0)
    const handlers = handlersRef.current
    let commands: TerminalCommand[] = []

    // In character mode, intercept ALL input as raw bytes
    // Exception: Ctrl+C (code 3) still stops the process
    if (isInCharMode() && isProcessRunningRef.current && code !== 3) {
      handleCharModeInput(data)
      return
    }

    // Handle Enter
    if (data === '\r' || data === '\n' || code === 13) {
      // If a process is running, route input to it
      if (isProcessRunningRef.current) {
        const currentInput = currentLineRef.current
        terminal.writeln('')
        handleProcessInputRef.current(currentInput)
        // Clear the input state
        handlers.handleCtrlC() // Reuse to clear line state
        return
      }
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
      // If a process is running and supports raw input, forward the key
      if (isProcessRunningRef.current && supportsRawInputRef.current()) {
        handleProcessKeyRef.current('ArrowUp', { ctrl: false, alt: false, shift: false })
        return
      }
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
      // If a process is running and supports raw input, forward the key
      if (isProcessRunningRef.current && supportsRawInputRef.current()) {
        handleProcessKeyRef.current('ArrowDown', { ctrl: false, alt: false, shift: false })
        return
      }
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
    // Note: In character mode, backspace is handled as a raw byte (ASCII 127)
    // by the early return above, matching standard terminal raw mode behavior
    if (code === 127) {
      commands = handlers.handleBackspace()
      executeTerminalCommands(terminal, commands)
      return
    }

    // Handle Ctrl+C
    if (code === 3) {
      // If a process is running, stop it
      if (isProcessRunningRef.current) {
        // Reset character mode state
        if (charModeRefs) {
          charModeRefs.charBuffer.current = ''
          charModeRefs.setCharModeCount.current(0)
        }
        stopProcessRef.current()
        terminal.write('^C')
        terminal.writeln('')
        showPrompt()
        return
      }
      commands = handlers.handleCtrlC()
      executeTerminalCommands(terminal, commands)
      showPrompt()
      return
    }

    // Handle Ctrl+D (EOF - exit process if line is empty)
    if (code === 4) {
      // If a process is running and line is empty, stop it (standard EOF behavior)
      if (isProcessRunningRef.current && currentLineRef.current === '') {
        stopProcessRef.current()
        terminal.writeln('')
        showPrompt()
        return
      }
      // Otherwise ignore Ctrl+D
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
        // Display suggestions in columns
        terminal.writeln(tabResult.suggestions.join('  '))
        // Show truncation message if more options exist
        if (tabResult.truncatedCount) {
          terminal.writeln(`... and ${tabResult.truncatedCount - tabResult.suggestions.length} more`)
        }
        showPrompt()
        // Re-show current input after suggestions
        terminal.write(currentLineRef.current)
      }
      return
    }

    // Handle printable characters
    // Note: In character mode, these are handled as raw bytes by the early return above
    if (code >= 32 && code < 127) {
      commands = handlers.handleCharacter(data)
      executeTerminalCommands(terminal, commands)
    }
  }

  // Handle terminal input - dispatch to hook handlers
  // Handles multi-character paste by processing each character/sequence
  const handleInput = (data: string) => {
    // Check for escape sequences (arrow keys, etc.) - process as single unit
    if (data.startsWith('\x1b[')) {
      processSingleInput(data)
      return
    }

    // For single characters or control characters, process directly
    if (data.length === 1) {
      processSingleInput(data)
      return
    }

    // Multi-character input (paste) - handle specially for multi-line content
    // Normalize line endings: \r\n -> \n, standalone \r -> \n
    const normalizedData = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // Check if this is multi-line paste (contains newlines)
    if (normalizedData.includes('\n')) {
      // If a process is running, send all content at once
      // The process (e.g., REPL) handles multi-line input internally
      if (isProcessRunningRef.current) {
        // Display the pasted content
        terminal.write(normalizedData.replace(/\n/g, '\r\n'))
        terminal.writeln('')

        // Send all content to the process at once (without trailing newline)
        const contentToSend = normalizedData.endsWith('\n')
          ? normalizedData.slice(0, -1)
          : normalizedData
        handleProcessInputRef.current(contentToSend)

        // Clear shell's input state
        handlersRef.current.handleCtrlC()
        return
      }

      // For shell commands (no process running), process line by line
      const lines = normalizedData.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const isLastLine = i === lines.length - 1

        // Skip empty last line (from trailing newline)
        if (isLastLine && line === '') {
          continue
        }

        // Type out the line character by character (for display)
        for (const char of line) {
          processSingleInput(char)
        }

        // Send Enter after each line to submit it
        processSingleInput('\r')
      }
    } else {
      // Single line paste - process each character
      for (const char of normalizedData) {
        processSingleInput(char)
      }
    }
  }

  return handleInput
}

/**
 * Creates a custom key event handler for Cmd/Ctrl+V paste support.
 * Uses platform-appropriate modifier key (Cmd on Mac, Ctrl on Windows/Linux).
 */
export function createPasteHandler(handleInput: (data: string) => void): (event: KeyboardEvent) => boolean {
  return (event: KeyboardEvent) => {
    if (hasModifierKey(event) && (event.key === 'v' || event.key === 'V') && event.type === 'keydown') {
      navigator.clipboard.readText().then((text) => {
        if (text) {
          handleInput(text)
        }
      }).catch(() => {
        // Clipboard access denied - ignore silently
      })
      return false // Prevent default xterm handling
    }
    return true
  }
}
