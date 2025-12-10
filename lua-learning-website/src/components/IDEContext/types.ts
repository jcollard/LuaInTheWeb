import type { UseLuaEngineReturn } from '../../hooks/types'
import type { TreeNode, UseFileSystemReturn } from '../../hooks/useFileSystem'
import type { RecentFile } from '../../hooks/useRecentFiles'
import type { TabInfo } from '../TabBar'
import type { ToastData } from '../Toast'
import type { TerminalLine } from '../BottomPanel/types'

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
  fileName: string | null
  isDirty: boolean

  // Terminal output
  terminalOutput: TerminalLine[]

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
  filesystem: UseFileSystemReturn
  fileTree: TreeNode[]
  createFile: (path: string, content?: string) => void
  createFolder: (path: string) => void
  deleteFile: (path: string) => void
  deleteFolder: (path: string) => void
  renameFile: (oldPath: string, newName: string) => void
  renameFolder: (oldPath: string, newName: string) => void
  moveFile: (sourcePath: string, targetFolderPath: string) => void
  openFile: (path: string) => void
  saveFile: () => void

  // Tabs
  tabs: TabInfo[]
  activeTab: string | null
  selectTab: (path: string) => void
  closeTab: (path: string) => void

  // Toast notifications
  toasts: ToastData[]
  showError: (message: string) => void
  dismissToast: (id: string) => void

  // New file creation
  pendingNewFilePath: string | null
  generateUniqueFileName: (parentPath?: string) => string
  createFileWithRename: (parentPath?: string) => void
  clearPendingNewFile: () => void

  // Recent files
  recentFiles: RecentFile[]
  clearRecentFiles: () => void
}

/**
 * Props for IDEContextProvider
 */
export interface IDEContextProviderProps {
  /** Child components */
  children: React.ReactNode
  /** Initial code (defaults to empty string) */
  initialCode?: string
}
