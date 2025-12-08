import type { UseLuaEngineReturn } from '../../hooks/types'
import type { TreeNode } from '../../hooks/useFileSystem'
import type { TabInfo } from '../TabBar'

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

  // Input state
  isAwaitingInput: boolean
  submitInput: (input: string) => void

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

  // Filesystem
  fileTree: TreeNode[]
  createFile: (path: string, content?: string) => void
  createFolder: (path: string) => void
  deleteFile: (path: string) => void
  deleteFolder: (path: string) => void
  renameFile: (oldPath: string, newName: string) => void
  renameFolder: (oldPath: string, newName: string) => void
  openFile: (path: string) => void
  saveFile: () => void

  // Tabs
  tabs: TabInfo[]
  activeTab: string | null
  selectTab: (path: string) => void
  closeTab: (path: string) => void
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
