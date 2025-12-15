import { useRef, useCallback, useEffect } from 'react'
import BashTerminal from '../BashTerminal'
import type { BashTerminalHandle } from '../BashTerminal'
import { useLuaRepl } from './useLuaRepl'
import styles from './LuaRepl.module.css'

interface LuaReplProps {
  /** When true, hides header and tips for embedded IDE context */
  embedded?: boolean
}

export default function LuaRepl({ embedded = false }: LuaReplProps) {
  const terminalRef = useRef<BashTerminalHandle>(null)

  // Display welcome message
  const showWelcome = useCallback(() => {
    terminalRef.current?.writeln('Lua 5.4 REPL - Ready')
    terminalRef.current?.writeln('Type help() for available commands')
    terminalRef.current?.writeln('')
  }, [])

  // Display help text
  const showHelp = useCallback(() => {
    terminalRef.current?.writeln('')
    terminalRef.current?.writeln('\x1b[1;36m=== Lua REPL Help ===\x1b[0m')
    terminalRef.current?.writeln('')
    terminalRef.current?.writeln('\x1b[1;33mCommands:\x1b[0m')
    terminalRef.current?.writeln('  \x1b[32mclear()\x1b[0m   - Clear the terminal screen')
    terminalRef.current?.writeln('  \x1b[32mreset()\x1b[0m   - Reset REPL state (clears all variables)')
    terminalRef.current?.writeln('  \x1b[32mhelp()\x1b[0m    - Show this help message')
    terminalRef.current?.writeln('')
    terminalRef.current?.writeln('\x1b[1;33mKeyboard shortcuts:\x1b[0m')
    terminalRef.current?.writeln('  \x1b[32m↑/↓\x1b[0m         - Navigate command history')
    terminalRef.current?.writeln('  \x1b[32m←/→\x1b[0m         - Move cursor')
    terminalRef.current?.writeln('  \x1b[32mHome/End\x1b[0m    - Jump to start/end of line')
    terminalRef.current?.writeln('  \x1b[32mEnter\x1b[0m       - Execute command')
    terminalRef.current?.writeln('  \x1b[32mShift+Enter\x1b[0m - Multi-line input mode')
    terminalRef.current?.writeln('')
    terminalRef.current?.writeln('\x1b[1;33mFeatures:\x1b[0m')
    terminalRef.current?.writeln('  - Full Lua 5.4 support')
    terminalRef.current?.writeln('  - io.read() for interactive input')
    terminalRef.current?.writeln('  - print() outputs to terminal')
    terminalRef.current?.writeln('')
  }, [])

  const { isReady, executeCode, reset } = useLuaRepl({
    onOutput: (message) => {
      terminalRef.current?.writeln(message)
    },
    onError: (message) => {
      terminalRef.current?.writeln(`\x1b[31mError: ${message}\x1b[0m`)
    },
    onReadInput: async (charCount?: number) => {
      if (!terminalRef.current) return ''
      // Use character mode or line mode based on charCount
      if (charCount !== undefined && charCount > 0) {
        return await terminalRef.current.readChars(charCount)
      }
      return await terminalRef.current.readLine()
    },
    onClear: () => {
      terminalRef.current?.clear()
      showWelcome()
    },
    onShowHelp: showHelp,
    onResetRequest: () => {
      // Defer reset until after current Lua execution completes
      setTimeout(async () => {
        terminalRef.current?.clear()
        await reset()
        showWelcome()
        terminalRef.current?.writeln('\x1b[32mREPL state has been reset.\x1b[0m')
        terminalRef.current?.writeln('')
        terminalRef.current?.showPrompt()
      }, 0)
    },
  })

  // Show welcome and prompt when ready
  useEffect(() => {
    if (isReady) {
      showWelcome()
      terminalRef.current?.showPrompt()
    }
  }, [isReady, showWelcome])

  const handleCommand = useCallback(async (code: string) => {
    await executeCode(code)
    terminalRef.current?.showPrompt()
  }, [executeCode])

  const clearRepl = useCallback(() => {
    terminalRef.current?.clear()
    showWelcome()
    terminalRef.current?.showPrompt()
  }, [showWelcome])

  return (
    <div className={`${styles.repl}${embedded ? ` ${styles.replEmbedded}` : ''}`}>
      {!embedded && (
        <div className={styles.header}>
          <h3>Interactive REPL</h3>
          <button onClick={clearRepl} className={styles.btnClear}>
            Clear
          </button>
        </div>
      )}

      <div className={styles.terminalContainer}>
        <BashTerminal ref={terminalRef} onCommand={handleCommand} embedded={embedded} />
      </div>

      {!embedded && (
        <div className={styles.help}>
          <strong>Tips:</strong> Press ↑/↓ to navigate history (or lines in multi-line mode) • ←/→ to move cursor • Home/End to jump to start/end • Enter to execute • Shift+Enter for multi-line mode • io.read() prompts in terminal
        </div>
      )}
    </div>
  )
}
