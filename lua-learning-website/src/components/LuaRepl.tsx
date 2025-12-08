import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializedRef.current) return
    initializedRef.current = true

    // Initialize Lua engine
    const initLua = async () => {
      try {
        const factory = new LuaFactory()
        const lua = await factory.createEngine()
        luaEngineRef.current = lua

        // Redirect print to capture output
        lua.global.set('print', (...args: any[]) => {
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

        // Display welcome message
        terminalRef.current?.writeln('Lua 5.4 REPL - Ready')
        terminalRef.current?.writeln('Type Lua code and press Enter to execute')
        terminalRef.current?.writeln('')
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
  }, [])

  const executeCode = async (code: string) => {
    if (!code.trim() || !luaEngineRef.current || !terminalRef.current) return

    try {
      // Try to execute as a statement first
      await luaEngineRef.current.doString(code)
    } catch (error: any) {
      // If it fails, try to evaluate as an expression and display the result
      try {
        const result = await luaEngineRef.current.doString(`return ${code}`)
        // Display the result if it's not nil
        if (result !== null && result !== undefined) {
          terminalRef.current?.writeln(String(result))
        }
      } catch (exprError: any) {
        // Show the error in terminal
        const errorMsg = exprError.message || String(exprError)
        terminalRef.current?.writeln(`\x1b[31mError: ${errorMsg}\x1b[0m`)
      }
    }

    // Show prompt for next command
    terminalRef.current?.showPrompt()
  }

  const clearRepl = () => {
    terminalRef.current?.clear()
    terminalRef.current?.writeln('Lua 5.4 REPL - Ready')
    terminalRef.current?.writeln('Type Lua code and press Enter to execute')
    terminalRef.current?.writeln('')
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
      {embedded && (
        <div className="repl-header repl-header--embedded">
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
