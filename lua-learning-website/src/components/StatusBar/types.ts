/**
 * Props for the StatusBar component
 */
export interface StatusBarProps {
  /** Current line number (1-indexed) */
  line: number
  /** Current column number (1-indexed) */
  column: number
  /** Language mode (e.g., 'Lua', 'JavaScript') */
  language: string
  /** File encoding (e.g., 'UTF-8') */
  encoding: string
  /** Indentation setting (e.g., 'Spaces: 2') */
  indentation: string
  /** Optional additional className */
  className?: string
}
