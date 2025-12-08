import { useState } from 'react'
import LuaRepl from '../LuaRepl'
import styles from './BottomPanel.module.css'
import type { BottomPanelProps, BottomPanelTab } from './types'

/**
 * Bottom panel with Terminal and REPL tabs
 */
export function BottomPanel({
  terminalOutput,
  className,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>('terminal')

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
                terminalOutput.map((line, index) => (
                  <div key={index} className={styles.outputLine}>
                    {line}
                  </div>
                ))
              ) : (
                <div className={styles.placeholder}>
                  Run code to see output...
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'repl' && (
          <div className={styles.replContent} id="repl-tabpanel">
            <LuaRepl />
          </div>
        )}
      </div>
    </div>
  )
}
