import type { BashTerminalHandle } from '../BashTerminal'

/**
 * Tab types for the bottom panel
 */
export type BottomPanelTab = 'terminal' | 'repl'

/**
 * Props for the BottomPanel component
 */
export interface BottomPanelProps {
  /** Terminal output lines to display */
  terminalOutput: string[]
  /** Callback when terminal needs to clear */
  onClearTerminal?: () => void
  /** Reference to the terminal for programmatic control */
  terminalRef?: React.RefObject<BashTerminalHandle>
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
