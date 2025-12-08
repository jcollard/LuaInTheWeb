import type { UseLuaEngineReturn } from '../../hooks/types'

/**
 * Activity bar panel options
 */
export type ActivityPanelType = 'explorer' | 'search' | 'extensions'

/**
 * Value provided by IDEContext
 */
export interface IDEContextValue {
  // Lua engine (shared)
  engine: UseLuaEngineReturn

  // Current editor state
  code: string
  setCode: (code: string) => void
  fileName: string
  isDirty: boolean

  // Terminal output
  terminalOutput: string[]

  // UI state
  activePanel: ActivityPanelType
  setActivePanel: (panel: ActivityPanelType) => void
  terminalVisible: boolean
  toggleTerminal: () => void
  sidebarVisible: boolean
  toggleSidebar: () => void

  // Actions
  runCode: () => Promise<void>
  clearTerminal: () => void
}

/**
 * Props for IDEContextProvider
 */
export interface IDEContextProviderProps {
  /** Child components */
  children: React.ReactNode
  /** Initial code (defaults to empty string) */
  initialCode?: string
  /** Initial file name (defaults to 'untitled.lua') */
  initialFileName?: string
}
