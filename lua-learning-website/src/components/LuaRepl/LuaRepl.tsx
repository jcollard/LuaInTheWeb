import { useRef, useCallback, useEffect } from 'react'
import BashTerminal from '../BashTerminal'
import type { BashTerminalHandle } from '../BashTerminal'
import { useLuaRepl } from './useLuaRepl'
import './LuaRepl.css'

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
    onReadInput: async () => {
      if (!terminalRef.current) return ''
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
    <div className={`lua-repl${embedded ? ' lua-repl--embedded' : ''}`}>
      {!embedded && (
        <div className="repl-header">
          <h3>Interactive REPL</h3>
          <button onClick={clearRepl} className="btn-clear">
            Clear
          </button>
        </div>
      )}

      <div className="repl-terminal-container">
        <BashTerminal ref={terminalRef} onCommand={handleCommand} embedded={embedded} />
      </div>

      {!embedded && (
        <div className="repl-help">
          <strong>Tips:</strong> Press ↑/↓ to navigate history (or lines in multi-line mode) • ←/→ to move cursor • Enter to execute • Shift+Enter for multi-line mode • Type expressions or statements • io.read() prompts in terminal
        </div>
      )}
    </div>
  )
}
