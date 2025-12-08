/**
 * Props for the EmbeddableEditor component
 */
export interface EmbeddableEditorProps {
  /** Initial code to display */
  code: string

  /** Language for syntax highlighting (default: 'lua') */
  language?: string

  /** Height of the editor (default: '200px') */
  height?: string

  /** Show run button and allow execution (default: true) */
  runnable?: boolean

  /** Show output panel (default: true when runnable) */
  showOutput?: boolean

  /** Make editor read-only (default: false) */
  readOnly?: boolean

  /** Show reset button (default: true when not readOnly) */
  showReset?: boolean

  /** Show toolbar (default: true when runnable) */
  showToolbar?: boolean

  /** Output panel height (default: '150px') */
  outputHeight?: string

  /** Callback when code changes */
  onChange?: (code: string) => void

  /** Callback when code is executed */
  onRun?: (code: string, output: string) => void

  /** Custom className for styling */
  className?: string
}

/**
 * Options for the useEmbeddableEditor hook
 */
export interface UseEmbeddableEditorOptions {
  /** Initial code to display */
  initialCode: string

  /** Callback when code is executed */
  onRun?: (code: string, output: string) => void

  /** Callback when code changes */
  onChange?: (code: string) => void
}

/**
 * Return type for the useEmbeddableEditor hook
 */
export interface UseEmbeddableEditorReturn {
  /** Current code in the editor */
  code: string

  /** Output lines from execution */
  output: string[]

  /** Whether code is currently executing */
  isRunning: boolean

  /** Error message if execution failed */
  error: string | null

  /** Update the code */
  setCode: (code: string) => void

  /** Execute the current code */
  run: () => Promise<void>

  /** Reset code to initial value */
  reset: () => void

  /** Clear the output */
  clearOutput: () => void
}
