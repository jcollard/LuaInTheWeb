import type { TabBarProps } from '../TabBar'

/**
 * Props for the EditorPanel component
 */
export interface EditorPanelProps {
  /** Current code value */
  code: string
  /** Called when code changes */
  onChange: (code: string) => void
  /** File name to show in tab (null when no file open, used when tabBarProps not provided) */
  fileName: string | null
  /** Whether the file has unsaved changes (used when tabBarProps not provided) */
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
  /** Props for TabBar when multi-file mode is active */
  tabBarProps?: Omit<TabBarProps, 'className'>
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
