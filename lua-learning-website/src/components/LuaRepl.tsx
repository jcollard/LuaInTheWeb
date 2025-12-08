import { useEffect, useRef, useCallback } from 'react'
import { LuaFactory, LuaEngine } from 'wasmoon'
import BashTerminal from './BashTerminal'
import type { BashTerminalHandle } from './BashTerminal'
import './LuaRepl.css'

interface LuaReplProps {
  /** When true, hides header and tips for embedded IDE context */
  embedded?: boolean
}

export default function LuaRepl({ embedded = false }: LuaReplProps) {
  const luaEngineRef = useRef<LuaEngine | null>(null)
  const terminalRef = useRef<BashTerminalHandle>(null)
  const initializedRef = useRef(false)

  // Custom io.read implementation
  const customIoRead = async (): Promise<string> => {
    if (!terminalRef.current) return ''
    return await terminalRef.current.readLine()
  }

  // Display welcome message
  const showWelcome = useCallback(() => {
    terminalRef.current?.writeln('Lua 5.4 REPL - Ready')
    terminalRef.current?.writeln('Type help() for available commands')
    terminalRef.current?.writeln('')
  }, [])

  // Initialize Lua engine with all custom functions
  const initLuaEngine = useCallback(async (): Promise<LuaEngine> => {
    const factory = new LuaFactory()
    const lua = await factory.createEngine()

    // Redirect print to capture output
    lua.global.set('print', (...args: unknown[]) => {
      const message = args.map(arg => {
        if (arg === null) return 'nil'
        if (arg === undefined) return 'nil'
        return String(arg)
      }).join('\t')

      terminalRef.current?.writeln(message)
    })

    // Create custom io table with read and write functions
    await lua.doString(`
      io = io or {}
      io.write = function(...)
        local args = {...}
        local output = ""
        for i, v in ipairs(args) do
          output = output .. tostring(v)
        end
        print(output)
      end
    `)

    // Override io.read with custom implementation
    lua.global.set('__js_read_input', customIoRead)

    await lua.doString(`
      io.read = function(format)
        local input = __js_read_input():await()
        if format == "*n" or format == "*number" then
          return tonumber(input)
        elseif format == "*a" or format == "*all" then
          return input
        else
          -- Default is "*l" or "*line"
          return input
        end
      end
    `)

    // Add clear() function to clear the terminal
    lua.global.set('clear', () => {
      terminalRef.current?.clear()
      showWelcome()
    })

    // Add help() function to display available commands
    lua.global.set('help', () => {
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
    })

    // Add reset() function to reset REPL state
    // Uses setTimeout to defer engine reset until after current Lua execution completes
    lua.global.set('reset', () => {
      setTimeout(async () => {
        // Close current engine
        if (luaEngineRef.current) {
          luaEngineRef.current.global.close()
          luaEngineRef.current = null
        }

        // Clear terminal
        terminalRef.current?.clear()

        // Reinitialize engine
        try {
          const newLua = await initLuaEngine()
          luaEngineRef.current = newLua
          showWelcome()
          terminalRef.current?.writeln('\x1b[32mREPL state has been reset.\x1b[0m')
          terminalRef.current?.writeln('')
          terminalRef.current?.showPrompt()
        } catch (error) {
          console.error('Failed to reset Lua engine:', error)
          terminalRef.current?.writeln('\x1b[31mError: Failed to reset REPL\x1b[0m')
          terminalRef.current?.showPrompt()
        }
      }, 0)
    })

    return lua
  }, [showWelcome])

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializedRef.current) return
    initializedRef.current = true

    // Initialize Lua engine
    const initLua = async () => {
      try {
        const lua = await initLuaEngine()
        luaEngineRef.current = lua

        showWelcome()
        terminalRef.current?.showPrompt()
      } catch (error) {
        console.error('Failed to initialize Lua engine:', error)
        terminalRef.current?.writeln('Error: Failed to initialize Lua engine')
      }
    }

    initLua()

    // Cleanup
    return () => {
      if (luaEngineRef.current) {
        luaEngineRef.current.global.close()
      }
    }
  }, [initLuaEngine, showWelcome])

  const executeCode = async (code: string) => {
    if (!code.trim() || !luaEngineRef.current || !terminalRef.current) return

    try {
      // Try to execute as a statement first
      await luaEngineRef.current.doString(code)
    } catch {
      // If it fails, try to evaluate as an expression and display the result
      try {
        const result = await luaEngineRef.current.doString(`return ${code}`)
        // Display the result if it's not nil
        if (result !== null && result !== undefined) {
          terminalRef.current?.writeln(String(result))
        }
      } catch (exprError: unknown) {
        // Show the error in terminal
        const errorMsg = exprError instanceof Error ? exprError.message : String(exprError)
        terminalRef.current?.writeln(`\x1b[31mError: ${errorMsg}\x1b[0m`)
      }
    }

    // Show prompt for next command
    terminalRef.current?.showPrompt()
  }

  const clearRepl = () => {
    terminalRef.current?.clear()
    showWelcome()
    terminalRef.current?.showPrompt()
  }

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
        <BashTerminal ref={terminalRef} onCommand={executeCode} embedded={embedded} />
      </div>

      {!embedded && (
        <div className="repl-help">
          <strong>Tips:</strong> Press ↑/↓ to navigate history (or lines in multi-line mode) • ←/→ to move cursor • Enter to execute • Shift+Enter for multi-line mode • Type expressions or statements • io.read() prompts in terminal
        </div>
      )}
    </div>
  )
}
