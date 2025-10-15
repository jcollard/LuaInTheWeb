import { useState, useEffect, useRef } from 'react'
import { LuaFactory, LuaEngine } from 'wasmoon'
import './LuaRepl.css'

interface ReplLine {
  type: 'input' | 'output' | 'error' | 'stdin-prompt'
  content: string
}

export default function LuaRepl() {
  const [lines, setLines] = useState<ReplLine[]>([
    { type: 'output', content: 'Lua 5.4 REPL - Ready' },
    { type: 'output', content: 'Type Lua code and press Enter to execute' },
  ])
  const [currentInput, setCurrentInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isReady, setIsReady] = useState(false)
  const [waitingForInput, setWaitingForInput] = useState(false)
  const [inputResolve, setInputResolve] = useState<((value: string) => void) | null>(null)

  const luaEngineRef = useRef<LuaEngine | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputQueueRef = useRef<string[]>([])

  // Custom io.read implementation
  const customIoRead = async (): Promise<string> => {
    return new Promise((resolve) => {
      setWaitingForInput(true)
      setLines(prev => [...prev, { type: 'stdin-prompt', content: '(waiting for input...)' }])
      setInputResolve(() => resolve)
    })
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

          setLines(prev => [...prev, { type: 'output', content: message }])
        })

        // Create custom io table with read function
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

        setIsReady(true)
      } catch (error) {
        console.error('Failed to initialize Lua engine:', error)
        setLines(prev => [...prev, {
          type: 'error',
          content: 'Error: Failed to initialize Lua engine'
        }])
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

  useEffect(() => {
    // Auto-scroll to bottom when new lines are added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  const executeCode = async (code: string) => {
    if (!code.trim() || !luaEngineRef.current) return

    // Add input to display
    setLines(prev => [...prev, { type: 'input', content: `> ${code}` }])

    try {
      // Try to execute as a statement first
      await luaEngineRef.current.doString(code)
    } catch (error: any) {
      // If it fails, try to evaluate as an expression and print the result
      try {
        const result = await luaEngineRef.current.doString(`return ${code}`)
        if (result !== undefined && result !== null) {
          setLines(prev => [...prev, {
            type: 'output',
            content: formatLuaValue(result)
          }])
        }
      } catch (exprError: any) {
        // Show the original error
        const errorMsg = error.message || String(error)
        setLines(prev => [...prev, {
          type: 'error',
          content: errorMsg
        }])
      }
    }

    // Add to history
    setHistory(prev => [...prev, code])
    setHistoryIndex(-1)
    setCurrentInput('')
  }

  const formatLuaValue = (value: any): string => {
    if (value === null || value === undefined) return 'nil'
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `table: ${JSON.stringify(value)}`
      }
      return `table: ${JSON.stringify(value)}`
    }
    return String(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()

      // If waiting for input from io.read(), provide it
      if (waitingForInput && inputResolve) {
        const inputValue = currentInput
        setLines(prev => [...prev, { type: 'output', content: inputValue }])
        setCurrentInput('')
        setWaitingForInput(false)
        inputResolve(inputValue)
        setInputResolve(null)
      } else {
        // Normal REPL command execution
        executeCode(currentInput)
      }
    } else if (e.key === 'ArrowUp' && !waitingForInput) {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = historyIndex === -1
          ? history.length - 1
          : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setCurrentInput(history[newIndex])
      }
    } else if (e.key === 'ArrowDown' && !waitingForInput) {
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
    setLines([
      { type: 'output', content: 'Lua 5.4 REPL - Ready' },
      { type: 'output', content: 'Type Lua code and press Enter to execute' },
    ])
  }

  const handleTerminalClick = () => {
    inputRef.current?.focus()
  }

  return (
    <div className="lua-repl">
      <div className="repl-header">
        <h3>Interactive REPL</h3>
        <button onClick={clearRepl} className="btn-clear">
          Clear
        </button>
      </div>

      <div
        className="repl-terminal"
        ref={terminalRef}
        onClick={handleTerminalClick}
      >
        {lines.map((line, index) => (
          <div key={index} className={`repl-line repl-${line.type}`}>
            {line.content}
          </div>
        ))}

        <div className="repl-input-line">
          <span className={waitingForInput ? "repl-prompt waiting" : "repl-prompt"}>
            {waitingForInput ? '?' : '>'}
          </span>
          <input
            ref={inputRef}
            type="text"
            className="repl-input"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isReady}
            placeholder={
              !isReady
                ? "Loading..."
                : waitingForInput
                  ? "Enter input for io.read()..."
                  : "Enter Lua code..."
            }
            autoFocus
          />
        </div>
      </div>

      <div className="repl-help">
        <strong>Tips:</strong> Press ↑/↓ to navigate history • Enter to execute • Type expressions or statements • io.read() prompts for inline input
      </div>
    </div>
  )
}
