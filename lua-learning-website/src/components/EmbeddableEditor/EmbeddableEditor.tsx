import { CodeEditor } from '../CodeEditor'
import { useEmbeddableEditor } from './useEmbeddableEditor'
import type { EmbeddableEditorProps } from './types'
import styles from './EmbeddableEditor.module.css'

/**
 * A self-contained code editor with optional execution and output display.
 * Designed for embedding in tutorials, examples, and coding challenges.
 */
export function EmbeddableEditor({
  code: initialCode,
  language = 'lua',
  height = '200px',
  runnable = true,
  showOutput,
  readOnly = false,
  showReset,
  showToolbar,
  outputHeight = '150px',
  onChange,
  onRun,
  className,
}: EmbeddableEditorProps) {
  const {
    code,
    output,
    isRunning,
    error,
    setCode,
    run,
    reset,
  } = useEmbeddableEditor({
    initialCode,
    onRun,
    onChange,
  })

  // Compute defaults
  const shouldShowToolbar = showToolbar ?? runnable
  const shouldShowOutput = showOutput ?? runnable
  const shouldShowReset = showReset ?? (!readOnly && runnable)

  const handleChange = (newCode: string) => {
    setCode(newCode)
  }

  const handleRun = () => {
    run()
  }

  const handleReset = () => {
    reset()
  }

  const containerClasses = [styles.container, className].filter(Boolean).join(' ')

  return (
    <div className={containerClasses} data-testid="embeddable-editor">
      {shouldShowToolbar && (
        <div className={styles.toolbar}>
          <button
            className={styles.runButton}
            onClick={handleRun}
            disabled={isRunning}
            aria-label="Run code"
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
          {shouldShowReset && (
            <button
              className={styles.resetButton}
              onClick={handleReset}
              aria-label="Reset code"
            >
              Reset
            </button>
          )}
        </div>
      )}

      <div className={styles.editorWrapper}>
        <CodeEditor
          value={code}
          onChange={handleChange}
          language={language}
          height={height}
          readOnly={readOnly}
          onRun={handleRun}
        />
      </div>

      {shouldShowOutput && (
        <div
          className={styles.outputPanel}
          style={{ height: outputHeight }}
          data-testid="output-panel"
        >
          <div className={styles.outputHeader}>Output</div>
          <pre className={styles.outputContent}>
            {error && <span className={styles.error}>{error}</span>}
            {output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {!error && output.length === 0 && (
              <span className={styles.placeholder}>Run code to see output...</span>
            )}
          </pre>
        </div>
      )}
    </div>
  )
}
