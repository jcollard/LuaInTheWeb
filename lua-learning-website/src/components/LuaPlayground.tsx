import { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { StreamLanguage } from '@codemirror/language'
import { lua } from '@codemirror/legacy-modes/mode/lua'
import { LuaFactory, LuaEngine } from 'wasmoon'
import './LuaPlayground.css'

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
  const [code, setCode] = useState(defaultCode)
  const [output, setOutput] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const luaEngineRef = useRef<LuaEngine | null>(null)
  const factoryRef = useRef<LuaFactory | null>(null)

  useEffect(() => {
    // Initialize Lua engine on component mount
    const initLua = async () => {
      try {
        const factory = new LuaFactory()
        const lua = await factory.createEngine()

        factoryRef.current = factory
        luaEngineRef.current = lua

        // Capture print output
        lua.global.set('print', (...args: any[]) => {
          const message = args.map(arg => String(arg)).join('\t')
          setOutput(prev => [...prev, message])
        })
      } catch (error) {
        console.error('Failed to initialize Lua engine:', error)
        setOutput(['Error: Failed to initialize Lua engine'])
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
    if (!luaEngineRef.current) {
      setOutput(['Error: Lua engine not initialized'])
      return
    }

    setIsRunning(true)
    setOutput([]) // Clear previous output

    try {
      // Execute the Lua code
      await luaEngineRef.current.doString(code)
    } catch (error: any) {
      // Display error messages
      setOutput(prev => [...prev, `Error: ${error.message || String(error)}`])
    } finally {
      setIsRunning(false)
    }
  }

  const clearOutput = () => {
    setOutput([])
  }

  const resetCode = () => {
    setCode(defaultCode)
    setOutput([])
  }

  return (
    <div className="lua-playground">
      <div className="playground-header">
        <h2>Lua Playground</h2>
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
      </div>

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
          <h3>Output</h3>
          <div className="output-content">
            {output.length === 0 ? (
              <div className="output-placeholder">
                Run your code to see the output here
              </div>
            ) : (
              output.map((line, index) => (
                <div
                  key={index}
                  className={line.startsWith('Error:') ? 'output-error' : 'output-line'}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
