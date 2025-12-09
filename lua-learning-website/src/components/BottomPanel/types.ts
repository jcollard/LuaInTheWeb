import type { BashTerminalHandle } from '../BashTerminal'

/**
 * Tab types for the bottom panel
 */
export type BottomPanelTab = 'terminal' | 'repl'

/**
 * A single terminal output line with a stable unique ID
 */
export interface TerminalLine {
  /** Unique identifier for React key */
  id: string
  /** The text content of the line */
  text: string
}

/**
 * Props for the BottomPanel component
 */
export interface BottomPanelProps {
  /** Terminal output lines to display */
  terminalOutput: TerminalLine[]
  /** Callback when terminal needs to clear */
  onClearTerminal?: () => void
  /** Reference to the terminal for programmatic control */
  terminalRef?: React.RefObject<BashTerminalHandle>
  /** Whether the terminal is waiting for user input */
  isAwaitingInput?: boolean
  /** Callback when user submits input */
  onSubmitInput?: (input: string) => void
  /** Optional additional className */
  className?: string
}

/**
 * Options for the useBottomPanel hook
 */
export interface UseBottomPanelOptions {
  /** Initial active tab */
  initialTab?: BottomPanelTab
}

/**
 * Return type for the useBottomPanel hook
 */
export interface UseBottomPanelReturn {
  /** Currently active tab */
  activeTab: BottomPanelTab
  /** Set the active tab */
  setActiveTab: (tab: BottomPanelTab) => void
}
