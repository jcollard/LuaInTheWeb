import { useState, useCallback, useMemo, useEffect } from 'react'
import { useLuaEngine } from '../../hooks/useLuaEngine'
import { useFileSystem } from '../../hooks/useFileSystem'
import { useRecentFiles } from '../../hooks/useRecentFiles'
import { useTabEditorManager } from '../../hooks/useTabEditorManager'
import { getFileName, getParentPath } from '../../hooks/fileSystemUtils'
import { useTabBar, useTabBarPersistence } from '../TabBar'
import type { TabInfo } from '../TabBar'
import { useToast } from '../Toast'
import { IDEContext } from './context'
import { useIDEAutoSave } from './useIDEAutoSave'
import { useUploadHandler } from './useUploadHandler'
import { useShellFileMove } from './useShellFileMove'
import { UploadConflictDialog } from '../UploadConflictDialog'
import { LoadingModal } from '../LoadingModal'
import type { IDEContextValue, IDEContextProviderProps, ActivityPanelType } from './types'

export function IDEContextProvider({ children, initialCode: _initialCode = '', fileSystem: externalFileSystem, isPathReadOnly }: IDEContextProviderProps) {
  const internalFilesystem = useFileSystem()
  // Use external filesystem if provided (for workspace integration), otherwise use internal
  const filesystem = externalFileSystem ?? internalFilesystem
  const { recentFiles, addRecentFile, clearRecentFiles } = useRecentFiles()

  // Tab persistence - load saved state and convert to TabInfo[]
  // Note: We don't pass fileExists because the filesystem loads asynchronously.
  // Missing file tabs will show an error when opened, which is a better UX than losing tabs.
  const tabPersistence = useTabBarPersistence()

  // Convert persisted tabs to TabInfo (adding isDirty: false)
  const initialTabs: TabInfo[] = useMemo(() => {
    if (!tabPersistence.savedState) return []
    return tabPersistence.savedState.tabs.map((tab) => ({
      ...tab,
      isDirty: false,
    }))
  }, [tabPersistence.savedState])

  const tabBar = useTabBar({
    initialTabs,
    initialActiveTab: tabPersistence.savedState?.activeTab ?? null,
  })
  const { toasts, showToast, dismissToast } = useToast()

  const showError = useCallback((message: string) => {
    showToast({ message, type: 'error' })
  }, [showToast])

  const [pendingNewFilePath, setPendingNewFilePath] = useState<string | null>(null)
  const [pendingNewFolderPath, setPendingNewFolderPath] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<ActivityPanelType>('explorer')
  const [terminalVisible, setTerminalVisible] = useState(true)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  // Version counter to trigger file tree refresh (incremented when shell modifies filesystem)
  const [fileTreeVersion, setFileTreeVersion] = useState(0)

  // Upload handling (extracted to separate hook)
  const uploadHandler = useUploadHandler({
    filesystem,
    externalFileSystem,
    internalFilesystem,
    showToast,
    showError,
    onTreeRefresh: useCallback(() => setFileTreeVersion(v => v + 1), []),
  })

  const activeTab = tabBar.activeTab
  const tabs = tabBar.tabs
  const activeTabType = tabBar.getActiveTabType()
  const fileName = activeTab ? getFileName(activeTab) : null

  // Per-tab editor content management
  const tabEditorManager = useTabEditorManager({
    tabs,
    activeTab,
    filesystem,
    isPathReadOnly,
    onDirtyChange: tabBar.setDirty,
  })

  // Get code from tabEditorManager (for backward compatibility with engine, format, etc.)
  const code = tabEditorManager.getActiveContent()

  const isDirty = activeTab ? tabEditorManager.isDirty(activeTab) : false

  const fileReader = useCallback((path: string): string | null => filesystem.readFile(path), [filesystem])

  const engine = useLuaEngine({
    fileReader,
  })

  const setCode = useCallback((newCode: string) => {
    if (activeTab) {
      tabEditorManager.updateContent(activeTab, newCode)
    }
  }, [activeTab, tabEditorManager])

  const openFile = useCallback((path: string) => {
    const existingTab = tabBar.tabs.find(t => t.path === path)
    if (existingTab) {
      // Convert markdown preview tab to file tab for editing, or make preview permanent
      if (existingTab.type === 'markdown' || existingTab.isPreview) {
        tabBar.convertToFileTab(path)
      }
      tabBar.selectTab(path)
      addRecentFile(path)
      return
    }
    // Check if file exists before opening
    const content = filesystem.readFile(path)
    if (content !== null) {
      tabBar.openTab(path, getFileName(path))
      addRecentFile(path)
    }
  }, [addRecentFile, filesystem, tabBar])

  const openPreviewFile = useCallback((path: string) => {
    const existingTab = tabBar.tabs.find(t => t.path === path)
    if (existingTab) {
      tabBar.selectTab(path)
      addRecentFile(path)
      return
    }
    // Check if file exists before opening
    const content = filesystem.readFile(path)
    if (content !== null) {
      tabBar.openPreviewTab(path, getFileName(path))
      addRecentFile(path)
    }
  }, [addRecentFile, filesystem, tabBar])

  const makeTabPermanent = useCallback((path: string) => {
    tabBar.makeTabPermanent(path)
  }, [tabBar])

  const saveFile = useCallback(() => {
    if (activeTab) {
      // Check if file is in a read-only workspace (e.g., library files)
      if (isPathReadOnly?.(activeTab)) {
        showError('This file is read-only and cannot be saved')
        return
      }
      const success = tabEditorManager.saveTab(activeTab)
      // Dispatch event when a .lua file is saved successfully
      // This allows canvas windows with --hot-reload=auto to auto-reload
      if (success && activeTab.endsWith('.lua')) {
        window.dispatchEvent(new CustomEvent('lua-file-saved'))
      }
    }
  }, [activeTab, isPathReadOnly, showError, tabEditorManager])

  // Auto-save integration (extracted to separate hook)
  const { autoSaveEnabled, toggleAutoSave, saveAllFiles } = useIDEAutoSave({
    tabs, isDirty, tabEditorManager,
  })

  const selectTab = useCallback((path: string) => {
    // Just switch tabs - tabEditorManager handles content management
    tabBar.selectTab(path)
  }, [tabBar])

  const openCanvasTab = useCallback((id: string, name?: string) => {
    tabBar.openCanvasTab(id, name)
  }, [tabBar])

  const openAnsiTab = useCallback((id: string, name?: string) => {
    tabBar.openAnsiTab(id, name)
  }, [tabBar])

  const openAnsiEditorTab = useCallback(() => {
    tabBar.openAnsiEditorTab()
  }, [tabBar])

  const updateAnsiEditorTabPath = useCallback((oldPath: string, newPath: string) => {
    tabBar.renameTab(oldPath, newPath, getFileName(newPath))
  }, [tabBar])

  const openAnsiEditorFile = useCallback((path: string) => {
    const existingTab = tabBar.tabs.find(t => t.path === path)
    if (existingTab) {
      tabBar.selectTab(path)
      return
    }
    const content = filesystem.readFile(path)
    if (content !== null) {
      tabBar.openTab(path, getFileName(path), 'ansi-editor')
    }
  }, [filesystem, tabBar])

  const openMarkdownPreview = useCallback((path: string) => {
    const existingTab = tabBar.tabs.find(t => t.path === path)
    if (existingTab) {
      // Convert file tab to markdown preview if it's currently in edit mode
      if (existingTab.type === 'file') {
        tabBar.convertToMarkdownTab(path)
      }
      tabBar.selectTab(path)
      addRecentFile(path)
      return
    }
    // Check if file exists before opening
    const content = filesystem.readFile(path)
    if (content !== null) {
      tabBar.openMarkdownPreviewTab(path, getFileName(path))
      addRecentFile(path)
    }
  }, [addRecentFile, filesystem, tabBar])

  const openBinaryViewer = useCallback((path: string) => {
    const existingTab = tabBar.tabs.find(t => t.path === path)
    if (existingTab) {
      tabBar.selectTab(path)
      addRecentFile(path)
      return
    }
    // Binary files don't load content into code state - the viewer reads directly from filesystem
    tabBar.openBinaryPreviewTab(path, getFileName(path))
    addRecentFile(path)
  }, [addRecentFile, tabBar])

  const closeTab = useCallback((path: string) => {
    tabBar.closeTab(path)
    tabEditorManager.disposeTab(path)
    // tabEditorManager automatically handles content for the new activeTab
  }, [tabBar, tabEditorManager])

  const createFile = useCallback((path: string, content: string = '') => {
    try { filesystem.createFile(path, content) }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to create file') }
  }, [filesystem, showError])

  const createFolder = useCallback((path: string) => { filesystem.createFolder(path) }, [filesystem])

  // Helper to get default workspace path when at root
  const getDefaultWorkspacePath = useCallback((): string => {
    // Get the first writable workspace (folder with isWorkspace: true and not read-only)
    // This only applies when using compositeFileSystem with workspaces
    const tree = filesystem.getTree()
    const firstWritableWorkspace = tree.find(
      (node) => node.type === 'folder' && node.isWorkspace && !node.isReadOnly
    )
    return firstWritableWorkspace?.path ?? '/'
  }, [filesystem])

  const generateUniqueFileName = useCallback((parentPath: string = '/'): string => {
    // If at root, use first workspace
    const effectivePath = parentPath === '/' ? getDefaultWorkspacePath() : parentPath
    const baseName = 'untitled', extension = '.lua'
    let counter = 1
    const prefix = effectivePath === '/' ? '/' : `${effectivePath}/`
    while (filesystem.exists(`${prefix}${baseName}-${counter}${extension}`)) counter++
    return `${baseName}-${counter}${extension}`
  }, [filesystem, getDefaultWorkspacePath])

  const createFileWithRename = useCallback((parentPath: string = '/') => {
    // If at root, use first workspace (can't create files at root level in workspace mode)
    const effectivePath = parentPath === '/' ? getDefaultWorkspacePath() : parentPath
    const fName = generateUniqueFileName(effectivePath)
    const fullPath = effectivePath === '/' ? `/${fName}` : `${effectivePath}/${fName}`
    try { filesystem.createFile(fullPath, ''); setPendingNewFilePath(fullPath) }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to create file') }
  }, [filesystem, generateUniqueFileName, getDefaultWorkspacePath, showError])

  const clearPendingNewFile = useCallback(() => { setPendingNewFilePath(null) }, [])

  const generateUniqueFolderName = useCallback((parentPath: string = '/'): string => {
    // If at root, use first workspace
    const effectivePath = parentPath === '/' ? getDefaultWorkspacePath() : parentPath
    const baseName = 'new-folder'
    const prefix = effectivePath === '/' ? '/' : `${effectivePath}/`
    if (!filesystem.exists(`${prefix}${baseName}`)) return baseName
    let counter = 1
    while (filesystem.exists(`${prefix}${baseName}-${counter}`)) counter++
    return `${baseName}-${counter}`
  }, [filesystem, getDefaultWorkspacePath])

  const createFolderWithRename = useCallback((parentPath: string = '/') => {
    // If at root, use first workspace (can't create folders at root level in workspace mode)
    const effectivePath = parentPath === '/' ? getDefaultWorkspacePath() : parentPath
    const folderName = generateUniqueFolderName(effectivePath)
    const fullPath = effectivePath === '/' ? `/${folderName}` : `${effectivePath}/${folderName}`
    try { filesystem.createFolder(fullPath); setPendingNewFolderPath(fullPath) }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to create folder') }
  }, [filesystem, generateUniqueFolderName, getDefaultWorkspacePath, showError])

  const clearPendingNewFolder = useCallback(() => { setPendingNewFolderPath(null) }, [])

  const deleteFile = useCallback((path: string) => {
    if (tabs.some(t => t.path === path)) closeTab(path)
    filesystem.deleteFile(path)
    setFileTreeVersion(v => v + 1)
  }, [closeTab, filesystem, tabs])

  const deleteFolder = useCallback((path: string) => {
    filesystem.deleteFolder(path)
    setFileTreeVersion(v => v + 1)
  }, [filesystem])

  const renameFile = useCallback((oldPath: string, newName: string) => {
    const parentPath = getParentPath(oldPath)
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`
    if (oldPath === newPath) return
    try {
      const tabIndex = tabs.findIndex(t => t.path === oldPath)
      if (tabIndex !== -1) {
        filesystem.renameFile(oldPath, newPath)
        // Dispose old path content - new content will be loaded from filesystem at new path
        tabEditorManager.disposeTab(oldPath)
        tabBar.renameTab(oldPath, newPath, newName)
      } else { filesystem.renameFile(oldPath, newPath) }
      setFileTreeVersion(v => v + 1)
    } catch (error) { showError(error instanceof Error ? error.message : 'Failed to rename file') }
  }, [filesystem, showError, tabBar, tabEditorManager, tabs])

  const renameFolder = useCallback((oldPath: string, newName: string) => {
    const parentPath = getParentPath(oldPath)
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`
    if (oldPath === newPath) return
    try {
      filesystem.renameFolder(oldPath, newPath)
      setFileTreeVersion(v => v + 1)
    }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to rename folder') }
  }, [filesystem, showError])

  // Handle file/directory moves - updates tabs when files are moved (used by shell mv and drag-drop)
  const handleShellFileMove = useShellFileMove({ tabs, tabBar, tabEditorManager })

  const moveFile = useCallback((sourcePath: string, targetFolderPath: string) => {
    try {
      // Calculate the new path for tab updates
      const fileName = sourcePath.split('/').filter(Boolean).pop() || ''
      const newPath = targetFolderPath === '/' ? `/${fileName}` : `${targetFolderPath}/${fileName}`
      const isDirectory = filesystem.isDirectory(sourcePath)

      // Move on filesystem
      filesystem.moveFile(sourcePath, targetFolderPath)

      // Update tabs (same as shell mv)
      handleShellFileMove(sourcePath, newPath, isDirectory)

      setFileTreeVersion(v => v + 1)
    }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to move file') }
  }, [filesystem, handleShellFileMove, showError])

  const copyFile = useCallback((sourcePath: string, targetFolderPath: string) => {
    try {
      filesystem.copyFile(sourcePath, targetFolderPath)
      setFileTreeVersion(v => v + 1)
    }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to copy file') }
  }, [filesystem, showError])

  const toggleTerminal = useCallback(() => { setTerminalVisible(prev => !prev) }, [])
  const toggleSidebar = useCallback(() => { setSidebarVisible(prev => !prev) }, [])

  // Refresh file tree by incrementing version counter (triggers re-render for shell commands)
  const refreshFileTree = useCallback(() => { setFileTreeVersion(v => v + 1) }, [])

  // File tree is memoized to prevent expensive rebuilds on unrelated re-renders
  // Only recalculate when filesystem.version changes (increments on each filesystem operation)
  // fileTreeVersion is kept for external refresh requests (e.g., shell commands)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- version props are intentional cache-busters
  const fileTree = useMemo(() => filesystem.getTree(), [filesystem, filesystem.version, fileTreeVersion])

  // Note: Initial content loading for persisted tabs is now handled automatically
  // by useTabEditorManager when tabs/activeTab change

  const pinTab = useCallback((path: string) => { tabBar.pinTab(path) }, [tabBar])
  const unpinTab = useCallback((path: string) => { tabBar.unpinTab(path) }, [tabBar])
  const reorderTab = useCallback((path: string, newIndex: number) => { tabBar.reorderTab(path, newIndex) }, [tabBar])
  const closeToRight = useCallback((path: string) => { tabBar.closeToRight(path) }, [tabBar])
  const closeOthers = useCallback((path: string) => { tabBar.closeOthers(path) }, [tabBar])

  // Persist tab state whenever tabs or activeTab changes
  useEffect(() => {
    tabPersistence.saveState(tabs, activeTab)
  }, [tabs, activeTab, tabPersistence])

  const value = useMemo<IDEContextValue>(() => ({
    engine, code, setCode, fileName, isDirty,
    activePanel, setActivePanel,
    terminalVisible, toggleTerminal, sidebarVisible, toggleSidebar,
    fileTree, refreshFileTree, handleShellFileMove,
    createFile, createFolder, deleteFile, deleteFolder, renameFile, renameFolder, moveFile, copyFile, openFile, openPreviewFile, openMarkdownPreview, openBinaryViewer, saveFile,
    tabs, activeTab, activeTabType, selectTab, closeTab, openCanvasTab, openAnsiTab, openAnsiEditorTab, openAnsiEditorFile, updateAnsiEditorTabPath, makeTabPermanent,
    pinTab, unpinTab, reorderTab, closeToRight, closeOthers,
    toasts, showError, dismissToast,
    pendingNewFilePath, generateUniqueFileName, createFileWithRename, clearPendingNewFile,
    pendingNewFolderPath, generateUniqueFolderName, createFolderWithRename, clearPendingNewFolder,
    recentFiles, clearRecentFiles, fileSystem: filesystem,
    autoSaveEnabled, toggleAutoSave, saveAllFiles,
    uploadFiles: uploadHandler.uploadFiles,
    uploadFolder: uploadHandler.uploadFolder,
    tabEditorManager,
  }), [
    engine, code, setCode, fileName, isDirty,
    activePanel, terminalVisible, sidebarVisible, toggleTerminal, toggleSidebar,
    fileTree, refreshFileTree, handleShellFileMove, createFile, createFolder, deleteFile, deleteFolder,
    renameFile, renameFolder, moveFile, copyFile, openFile, openPreviewFile, openMarkdownPreview, openBinaryViewer, saveFile, tabs, activeTab, activeTabType, selectTab, closeTab, openCanvasTab, openAnsiTab, openAnsiEditorTab, openAnsiEditorFile, updateAnsiEditorTabPath, makeTabPermanent,
    pinTab, unpinTab, reorderTab, closeToRight, closeOthers,
    toasts, showError, dismissToast, pendingNewFilePath, generateUniqueFileName, createFileWithRename,
    clearPendingNewFile, pendingNewFolderPath, generateUniqueFolderName, createFolderWithRename,
    clearPendingNewFolder, recentFiles, clearRecentFiles, filesystem,
    autoSaveEnabled, toggleAutoSave, saveAllFiles, uploadHandler, tabEditorManager,
  ])

  return (
    <IDEContext.Provider value={value}>
      {children}
      <UploadConflictDialog
        isOpen={uploadHandler.uploadConflictDialogOpen}
        conflictingFiles={uploadHandler.conflictingFileNames}
        onConfirm={uploadHandler.handleUploadConflictConfirm}
        onCancel={uploadHandler.handleUploadConflictCancel}
      />
      <LoadingModal
        isOpen={uploadHandler.folderUploadModalOpen}
        title="Uploading Folder"
        progress={uploadHandler.folderUploadProgress}
        onCancel={uploadHandler.handleFolderUploadCancel}
      />
    </IDEContext.Provider>
  )
}
