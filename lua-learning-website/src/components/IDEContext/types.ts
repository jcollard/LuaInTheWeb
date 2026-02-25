import type { UseLuaEngineReturn } from '../../hooks/types'
import type { TreeNode, UseFileSystemReturn } from '../../hooks/useFileSystem'
import type { AdaptedFileSystem } from '../../hooks/compositeFileSystemAdapter'
import type { RecentFile } from '../../hooks/useRecentFiles'
import type { UseTabEditorManagerReturn } from '../../hooks/useTabEditorManager'
import type { TabInfo, TabType } from '../TabBar'
import type { ToastData } from '../Toast'

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

  // UI state
  activePanel: ActivityPanelType
  setActivePanel: (panel: ActivityPanelType) => void
  terminalVisible: boolean
  toggleTerminal: () => void
  sidebarVisible: boolean
  toggleSidebar: () => void

  // Filesystem
  fileTree: TreeNode[]
  createFile: (path: string, content?: string) => void
  createFolder: (path: string) => void
  deleteFile: (path: string) => void
  deleteFolder: (path: string) => void
  renameFile: (oldPath: string, newName: string) => void
  renameFolder: (oldPath: string, newName: string) => void
  moveFile: (sourcePath: string, targetFolderPath: string) => void
  copyFile: (sourcePath: string, targetFolderPath: string) => void
  openFile: (path: string) => void
  openPreviewFile: (path: string) => void
  openMarkdownPreview: (path: string) => void
  openHtmlPreview: (path: string) => void
  openHtmlInBrowser: (path: string) => void
  openBinaryViewer: (path: string) => void
  saveFile: () => void

  // Tabs
  tabs: TabInfo[]
  activeTab: string | null
  activeTabType: TabType | null
  selectTab: (path: string) => void
  closeTab: (path: string) => void
  openCanvasTab: (id: string, name?: string) => void
  openAnsiTab: (id: string, name?: string) => void
  openAnsiEditorTab: () => void
  openAnsiEditorFile: (path: string) => void
  updateAnsiEditorTabPath: (oldPath: string, newPath: string) => void
  makeTabPermanent: (path: string) => void
  pinTab: (path: string) => void
  unpinTab: (path: string) => void
  reorderTab: (path: string, newIndex: number) => void
  closeToRight: (path: string) => void
  closeOthers: (path: string) => void
  setTabDirty: (path: string, isDirty: boolean) => void

  // Toast notifications
  toasts: ToastData[]
  showError: (message: string) => void
  dismissToast: (id: string) => void

  // New file creation
  pendingNewFilePath: string | null
  generateUniqueFileName: (parentPath?: string) => string
  createFileWithRename: (parentPath?: string) => void
  clearPendingNewFile: () => void

  // New folder creation
  pendingNewFolderPath: string | null
  generateUniqueFolderName: (parentPath?: string) => string
  createFolderWithRename: (parentPath?: string) => void
  clearPendingNewFolder: () => void

  // Recent files
  recentFiles: RecentFile[]
  clearRecentFiles: () => void

  // Raw filesystem access (for shell integration)
  fileSystem: UseFileSystemReturn | AdaptedFileSystem

  // File tree refresh (for shell integration - triggers re-render after shell modifies filesystem)
  refreshFileTree: () => void

  // Shell file move handler (for shell integration - updates tabs when mv command is used)
  handleShellFileMove: (oldPath: string, newPath: string, isDirectory: boolean) => void

  // Auto-save
  autoSaveEnabled: boolean
  toggleAutoSave: () => void

  // Save all files
  saveAllFiles: () => void

  // File upload
  uploadFiles: (files: FileList, targetFolderPath: string) => Promise<void>

  // Folder upload
  uploadFolder: (files: FileList, targetFolderPath: string) => Promise<void>

  // Tab editor manager (for virtualized editor panel)
  tabEditorManager: UseTabEditorManagerReturn
}

/**
 * Props for IDEContextProvider
 */
export interface IDEContextProviderProps {
  /** Child components */
  children: React.ReactNode
  /** Initial code (defaults to empty string) */
  initialCode?: string
  /** External filesystem to use instead of built-in useFileSystem (for workspace integration) */
  fileSystem?: AdaptedFileSystem
  /** Optional callback to check if a path is in a read-only workspace */
  isPathReadOnly?: (path: string) => boolean
}
