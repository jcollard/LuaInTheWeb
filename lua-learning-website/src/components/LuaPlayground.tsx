import { useState, useRef } from 'react'
import { CodeEditor } from './CodeEditor'
import { useLuaEngine } from '../hooks'
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

  const terminalRef = useRef<BashTerminalHandle>(null)

  // Custom io.read implementation for code editor
  const customIoRead = async (): Promise<string> => {
    if (!terminalRef.current) return ''
    return await terminalRef.current.readLine()
  }

  const { isReady, execute, reset } = useLuaEngine({
    onOutput: (text) => {
      terminalRef.current?.writeln(text)
    },
    onError: (error) => {
      terminalRef.current?.writeln(`Error: ${error}`)
    },
    onReadInput: customIoRead,
    onCleanup: () => {
      // Optional cleanup logic if needed
    },
  })

  const runCode = async () => {
    if (!isReady || !terminalRef.current) {
      terminalRef.current?.writeln('Error: Lua engine not initialized')
      return
    }

    setIsRunning(true)
    terminalRef.current.clear() // Clear previous output

    await execute(code)
    setIsRunning(false)
  }

  const clearOutput = () => {
    terminalRef.current?.clear()
  }

  const resetCode = async () => {
    setCode(defaultCode)
    terminalRef.current?.clear()
    await reset()
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
              disabled={isRunning || !isReady}
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
            <CodeEditor
              value={code}
              onChange={setCode}
              onRun={runCode}
              height="400px"
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
