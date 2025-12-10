import { useState, useRef, useEffect } from 'react'
import LuaRepl from '../LuaRepl'
import { ShellTerminal } from '../ShellTerminal'
import styles from './BottomPanel.module.css'
import type { BottomPanelProps, BottomPanelTab } from './types'

/**
 * Bottom panel with Terminal, REPL, and Shell tabs
 */
export function BottomPanel({
  terminalOutput,
  isAwaitingInput = false,
  onSubmitInput,
  filesystem,
  className,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>('terminal')
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when awaiting input
  useEffect(() => {
    if (isAwaitingInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAwaitingInput])

  const handleSubmit = () => {
    if (onSubmitInput) {
      onSubmitInput(inputValue)
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const combinedClassName = className
    ? `${styles.bottomPanel} ${className}`
    : styles.bottomPanel

  return (
    <div className={combinedClassName} data-testid="bottom-panel">
      <div className={styles.tabBar} role="tablist">
        <button
          type="button"
          role="tab"
          className={`${styles.tab} ${activeTab === 'terminal' ? styles.active : ''}`}
          onClick={() => setActiveTab('terminal')}
          aria-selected={activeTab === 'terminal'}
          aria-controls="terminal-tabpanel"
        >
          Terminal
        </button>
        <button
          type="button"
          role="tab"
          className={`${styles.tab} ${activeTab === 'repl' ? styles.active : ''}`}
          onClick={() => setActiveTab('repl')}
          aria-selected={activeTab === 'repl'}
          aria-controls="repl-tabpanel"
        >
          REPL
        </button>
        {filesystem && (
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${activeTab === 'shell' ? styles.active : ''}`}
            onClick={() => setActiveTab('shell')}
            aria-selected={activeTab === 'shell'}
            aria-controls="shell-tabpanel"
          >
            Shell
          </button>
        )}
      </div>
      <div className={styles.content} role="tabpanel">
        {activeTab === 'terminal' && (
          <div
            className={styles.terminalContent}
            data-testid="terminal-content"
            id="terminal-tabpanel"
          >
            <div className={styles.outputContainer}>
              {terminalOutput.length > 0 ? (
                terminalOutput.map((line) => (
                  <div key={line.id} className={styles.outputLine}>
                    {line.text}
                  </div>
                ))
              ) : (
                <div className={styles.placeholder}>
                  Run code to see output...
                </div>
              )}
            </div>
            {isAwaitingInput && (
              <div className={styles.inputContainer}>
                <span className={styles.inputPrompt}>&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.inputField}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Input"
                  data-testid="terminal-input"
                />
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={handleSubmit}
                  aria-label="Submit input"
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        )}
        {activeTab === 'repl' && (
          <div className={styles.replContent} id="repl-tabpanel">
            <LuaRepl embedded />
          </div>
        )}
        {activeTab === 'shell' && filesystem && (
          <div className={styles.shellContent} id="shell-tabpanel">
            <ShellTerminal filesystem={filesystem} embedded />
          </div>
        )}
      </div>
    </div>
  )
}
