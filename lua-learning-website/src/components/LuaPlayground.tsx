import { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { StreamLanguage } from '@codemirror/language'
import { lua } from '@codemirror/legacy-modes/mode/lua'
import { LuaFactory, LuaEngine } from 'wasmoon'
import LuaRepl from './LuaRepl'
import BashTerminal from './BashTerminal'
import type { BashTerminalHandle } from './BashTerminal'
import './LuaPlayground.css'

type PlaygroundMode = 'editor' | 'repl'

const defaultCode = `-- Welcome to the Lua Playground!
-- Write your Lua code here and click Run

print("Hello, Lua!")

-- Try some basic operations
local x = 10
local y = 20
print("x + y =", x + y)

-- Functions
function greet(name)
    return "Hello, " .. name .. "!"
end

print(greet("World"))
`

export default function LuaPlayground() {
  const [mode, setMode] = useState<PlaygroundMode>('editor')
  const [code, setCode] = useState(defaultCode)
  const [isRunning, setIsRunning] = useState(false)

  const luaEngineRef = useRef<LuaEngine | null>(null)
  const terminalRef = useRef<BashTerminalHandle>(null)

  // Custom io.read implementation for code editor
  const customIoRead = async (): Promise<string> => {
    if (!terminalRef.current) return ''
    return await terminalRef.current.readLine()
  }

  useEffect(() => {
    // Initialize Lua engine on component mount
    const initLua = async () => {
      try {
        const factory = new LuaFactory()
        const lua = await factory.createEngine()

        luaEngineRef.current = lua

        // Capture print output
        lua.global.set('print', (...args: any[]) => {
          const message = args.map(arg => String(arg)).join('\t')
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
      } catch (error) {
        console.error('Failed to initialize Lua engine:', error)
        terminalRef.current?.writeln('Error: Failed to initialize Lua engine')
      }
    }

    initLua()

    // Cleanup on unmount
    return () => {
      if (luaEngineRef.current) {
        luaEngineRef.current.global.close()
      }
    }
  }, [])

  const runCode = async () => {
    if (!luaEngineRef.current || !terminalRef.current) {
      terminalRef.current?.writeln('Error: Lua engine not initialized')
      return
    }

    setIsRunning(true)
    terminalRef.current.clear() // Clear previous output

    try {
      // Execute the Lua code
      await luaEngineRef.current.doString(code)
    } catch (error: any) {
      // Display error messages
      terminalRef.current.writeln(`Error: ${error.message || String(error)}`)
    } finally {
      setIsRunning(false)
    }
  }

  const clearOutput = () => {
    terminalRef.current?.clear()
  }

  const resetCode = () => {
    setCode(defaultCode)
    terminalRef.current?.clear()
  }

  return (
    <div className="lua-playground">
      <div className="playground-header">
        <h2>Lua Playground</h2>
        <div className="mode-switcher">
          <button
            onClick={() => setMode('editor')}
            className={mode === 'editor' ? 'mode-btn active' : 'mode-btn'}
          >
            Code Editor
          </button>
          <button
            onClick={() => setMode('repl')}
            className={mode === 'repl' ? 'mode-btn active' : 'mode-btn'}
          >
            Interactive REPL
          </button>
        </div>
        {mode === 'editor' && (
          <div className="playground-actions">
            <button onClick={resetCode} className="btn-secondary">
              Reset
            </button>
            <button onClick={clearOutput} className="btn-secondary">
              Clear Output
            </button>
            <button
              onClick={runCode}
              disabled={isRunning}
              className="btn-primary"
            >
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
          </div>
        )}
      </div>

      {mode === 'editor' ? (
        <div className="playground-content">
          <div className="editor-panel">
            <h3>Code Editor</h3>
            <CodeMirror
              value={code}
              height="400px"
              extensions={[StreamLanguage.define(lua)]}
              onChange={(value) => setCode(value)}
              theme="light"
            />
          </div>

          <div className="output-panel">
            <BashTerminal ref={terminalRef} />
          </div>
        </div>
      ) : (
        <div className="repl-container">
          <LuaRepl />
        </div>
      )}
    </div>
  )
}
