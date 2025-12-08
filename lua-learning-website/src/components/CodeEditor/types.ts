/**
 * Props for the CodeEditor component
 */
export interface CodeEditorProps {
  /** The current code value */
  value: string
  /** Called when the code changes */
  onChange: (value: string) => void
  /** The programming language (default: 'lua') */
  language?: string
  /** The height of the editor (default: '400px') */
  height?: string
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Called when Ctrl+Enter is pressed */
  onRun?: () => void
}
