import { useState, useEffect, useRef } from 'react'
import { LuaFactory, LuaEngine } from 'wasmoon'
import BashTerminal from './BashTerminal'
import type { BashTerminalHandle } from './BashTerminal'
import './LuaRepl.css'

export default function LuaRepl() {
  const [currentInput, setCurrentInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isReady, setIsReady] = useState(false)

  const luaEngineRef = useRef<LuaEngine | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<BashTerminalHandle>(null)

  // Custom io.read implementation
  const customIoRead = async (): Promise<string> => {
    if (!terminalRef.current) return ''
    return await terminalRef.current.readLine()
  }

  useEffect(() => {
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

        setIsReady(true)
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
      // If it fails, try to evaluate as an expression (but don't display the result)
      try {
        await luaEngineRef.current.doString(`return ${code}`)
        // Expression evaluated successfully, but we don't display the result
      } catch (exprError: any) {
        // Silently fail - don't show errors in terminal
      }
    }

    // Add to history
    setHistory(prev => [...prev, code])
    setHistoryIndex(-1)
    setCurrentInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      executeCode(currentInput)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = historyIndex === -1
          ? history.length - 1
          : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setCurrentInput(history[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1
        if (newIndex >= history.length) {
          setHistoryIndex(-1)
          setCurrentInput('')
        } else {
          setHistoryIndex(newIndex)
          setCurrentInput(history[newIndex])
        }
      }
    }
  }

  const clearRepl = () => {
    terminalRef.current?.clear()
    terminalRef.current?.writeln('Lua 5.4 REPL - Ready')
    terminalRef.current?.writeln('Type Lua code and press Enter to execute')
    terminalRef.current?.writeln('')
  }

  return (
    <div className="lua-repl">
      <div className="repl-header">
        <h3>Interactive REPL</h3>
        <button onClick={clearRepl} className="btn-clear">
          Clear
        </button>
      </div>

      <div className="repl-terminal-container">
        <BashTerminal ref={terminalRef} />
      </div>

      <div className="repl-input-section">
        <div className="repl-input-line">
          <span className="repl-prompt">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            className="repl-input"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isReady}
            placeholder={!isReady ? "Loading..." : "Enter Lua code..."}
            autoFocus
          />
        </div>

        <div className="repl-help">
          <strong>Tips:</strong> Press ↑/↓ to navigate history • Enter to execute • Type expressions or statements • io.read() prompts in terminal
        </div>
      </div>
    </div>
  )
}
