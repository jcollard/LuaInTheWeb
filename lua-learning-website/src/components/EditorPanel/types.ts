/**
 * Props for the EditorPanel component
 */
export interface EditorPanelProps {
  /** Current code value */
  code: string
  /** Called when code changes */
  onChange: (code: string) => void
  /** File name to show in tab */
  fileName: string
  /** Whether the file has unsaved changes */
  isDirty: boolean
  /** Called when run button is clicked */
  onRun: () => void
  /** Whether the code is currently running */
  isRunning?: boolean
  /** Current cursor line (1-indexed) */
  cursorLine?: number
  /** Current cursor column (1-indexed) */
  cursorColumn?: number
  /** Called when cursor position changes */
  onCursorChange?: (line: number, column: number) => void
  /** Optional additional className */
  className?: string
}

/**
 * Options for the useEditorPanel hook
 */
export interface UseEditorPanelOptions {
  /** Called when cursor position changes */
  onCursorChange?: (line: number, column: number) => void
}

/**
 * Return type for the useEditorPanel hook
 */
export interface UseEditorPanelReturn {
  /** Current cursor line (1-indexed) */
  cursorLine: number
  /** Current cursor column (1-indexed) */
  cursorColumn: number
  /** Handle cursor position change from editor */
  handleCursorChange: (line: number, column: number) => void
}
