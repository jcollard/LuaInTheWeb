import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useLuaEngine } from '../../hooks/useLuaEngine'
import { useFileSystem } from '../../hooks/useFileSystem'
import { useRecentFiles } from '../../hooks/useRecentFiles'
import { getFileName, getParentPath } from '../../hooks/fileSystemUtils'
import { useTabBar, useTabBarPersistence } from '../TabBar'
import type { TabInfo } from '../TabBar'
import { useToast } from '../Toast'
import { IDEContext } from './context'
import { useIDEAutoSave } from './useIDEAutoSave'
import type { IDEContextValue, IDEContextProviderProps, ActivityPanelType } from './types'

export function IDEContextProvider({ children, initialCode = '', fileSystem: externalFileSystem, isPathReadOnly }: IDEContextProviderProps) {
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

  const [code, setCodeState] = useState(initialCode)
  const [originalContent, setOriginalContent] = useState<Map<string, string>>(new Map())
  const [unsavedContent, setUnsavedContent] = useState<Map<string, string>>(new Map())
  const [pendingNewFilePath, setPendingNewFilePath] = useState<string | null>(null)
  const [pendingNewFolderPath, setPendingNewFolderPath] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<ActivityPanelType>('explorer')
  const [terminalVisible, setTerminalVisible] = useState(true)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  // Version counter to trigger file tree refresh (incremented when shell modifies filesystem)
  const [fileTreeVersion, setFileTreeVersion] = useState(0)

  const activeTab = tabBar.activeTab
  const tabs = tabBar.tabs
  const activeTabType = tabBar.getActiveTabType()
  const fileName = activeTab ? getFileName(activeTab) : null

  const isDirty = useMemo(() => {
    if (!activeTab) return code !== initialCode
    const original = originalContent.get(activeTab)
    return original !== undefined && code !== original
  }, [activeTab, code, initialCode, originalContent])

  const fileReader = useCallback((path: string): string | null => filesystem.readFile(path), [filesystem])

  const engine = useLuaEngine({
    fileReader,
  })

  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode)
    if (activeTab) {
      const original = originalContent.get(activeTab)
      const isDirtyNow = original !== undefined && newCode !== original
      tabBar.setDirty(activeTab, isDirtyNow)
      if (isDirtyNow) {
        setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, newCode); return next })
      } else {
        setUnsavedContent(prev => { if (prev.has(activeTab)) { const next = new Map(prev); next.delete(activeTab); return next } return prev })
      }
    }
  }, [activeTab, originalContent, tabBar])

  const loadContentForPath = useCallback((path: string) => {
    const savedUnsaved = unsavedContent.get(path)
    if (savedUnsaved !== undefined) { setCodeState(savedUnsaved) }
    else { const content = filesystem.readFile(path); if (content !== null) setCodeState(content) }
  }, [filesystem, unsavedContent])

  // Track if we've loaded the initial content for a restored active tab
  const initialContentLoadedRef = useRef(false)

  const openFile = useCallback((path: string) => {
    const existingTab = tabBar.tabs.find(t => t.path === path)
    if (existingTab) {
      // Convert markdown preview tab to file tab for editing, or make preview permanent
      if (existingTab.type === 'markdown' || existingTab.isPreview) {
        tabBar.convertToFileTab(path)
      }
      if (activeTab && activeTab !== path && code !== originalContent.get(activeTab)) {
        setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
      }
      tabBar.selectTab(path); loadContentForPath(path); addRecentFile(path); return
    }
    if (activeTab && code !== originalContent.get(activeTab)) {
      setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
    }
    const content = filesystem.readFile(path)
    if (content !== null) {
      setCodeState(content)
      setOriginalContent(prev => { const next = new Map(prev); next.set(path, content); return next })
      tabBar.openTab(path, getFileName(path)); addRecentFile(path)
    }
  }, [activeTab, addRecentFile, code, filesystem, loadContentForPath, originalContent, tabBar])

  const openPreviewFile = useCallback((path: string) => {
    const existingTab = tabBar.tabs.find(t => t.path === path)
    if (existingTab) {
      if (activeTab && activeTab !== path && code !== originalContent.get(activeTab)) {
        setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
      }
      tabBar.selectTab(path); loadContentForPath(path); addRecentFile(path); return
    }
    if (activeTab && code !== originalContent.get(activeTab)) {
      setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
    }
    const content = filesystem.readFile(path)
    if (content !== null) {
      setCodeState(content)
      setOriginalContent(prev => { const next = new Map(prev); next.set(path, content); return next })
      tabBar.openPreviewTab(path, getFileName(path)); addRecentFile(path)
    }
  }, [activeTab, addRecentFile, code, filesystem, loadContentForPath, originalContent, tabBar])

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
      filesystem.writeFile(activeTab, code)
      setOriginalContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
      setUnsavedContent(prev => { if (prev.has(activeTab)) { const next = new Map(prev); next.delete(activeTab); return next } return prev })
      tabBar.setDirty(activeTab, false)
    }
  }, [activeTab, code, filesystem, isPathReadOnly, showError, tabBar])

  // Auto-save integration (extracted to separate hook)
  const { autoSaveEnabled, toggleAutoSave, saveAllFiles } = useIDEAutoSave({
    tabs, activeTab, code, unsavedContent, isDirty, isPathReadOnly, filesystem,
    setOriginalContent, setUnsavedContent, setDirty: tabBar.setDirty,
  })

  const selectTab = useCallback((path: string) => {
    if (activeTab && code !== originalContent.get(activeTab)) {
      setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
    }
    tabBar.selectTab(path); loadContentForPath(path)
  }, [activeTab, code, loadContentForPath, originalContent, tabBar])

  const openCanvasTab = useCallback((id: string, name?: string) => {
    // Save current file content if switching away from a file tab
    if (activeTab && code !== originalContent.get(activeTab)) {
      setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
    }
    tabBar.openCanvasTab(id, name)
  }, [activeTab, code, originalContent, tabBar])

  const openMarkdownPreview = useCallback((path: string) => {
    const existingTab = tabBar.tabs.find(t => t.path === path)
    if (existingTab) {
      if (activeTab && activeTab !== path && code !== originalContent.get(activeTab)) {
        setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
      }
      // Convert file tab to markdown preview if it's currently in edit mode
      if (existingTab.type === 'file') {
        tabBar.convertToMarkdownTab(path)
      }
      tabBar.selectTab(path); loadContentForPath(path); addRecentFile(path); return
    }
    if (activeTab && code !== originalContent.get(activeTab)) {
      setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
    }
    const content = filesystem.readFile(path)
    if (content !== null) {
      setCodeState(content)
      setOriginalContent(prev => { const next = new Map(prev); next.set(path, content); return next })
      tabBar.openMarkdownPreviewTab(path, getFileName(path)); addRecentFile(path)
    }
  }, [activeTab, addRecentFile, code, filesystem, loadContentForPath, originalContent, tabBar])

  const openBinaryViewer = useCallback((path: string) => {
    const existingTab = tabBar.tabs.find(t => t.path === path)
    if (existingTab) {
      if (activeTab && activeTab !== path && code !== originalContent.get(activeTab)) {
        setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
      }
      tabBar.selectTab(path); addRecentFile(path); return
    }
    if (activeTab && code !== originalContent.get(activeTab)) {
      setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
    }
    // Binary files don't load content into code state - the viewer reads directly from filesystem
    tabBar.openBinaryPreviewTab(path, getFileName(path)); addRecentFile(path)
  }, [activeTab, addRecentFile, code, originalContent, tabBar])

  const closeTab = useCallback((path: string) => {
    tabBar.closeTab(path)
    setOriginalContent(prev => { const next = new Map(prev); next.delete(path); return next })
    setUnsavedContent(prev => { if (prev.has(path)) { const next = new Map(prev); next.delete(path); return next } return prev })
    const remainingTabs = tabs.filter(t => t.path !== path)
    if (remainingTabs.length > 0 && activeTab === path) {
      const nextTab = remainingTabs[Math.min(tabs.findIndex(t => t.path === path), remainingTabs.length - 1)]
      loadContentForPath(nextTab.path)
    } else if (remainingTabs.length === 0) { setCodeState(initialCode) }
  }, [activeTab, initialCode, loadContentForPath, tabBar, tabs])

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
        setOriginalContent(prev => {
          if (prev.has(oldPath)) {
            const next = new Map(prev); const origContent = next.get(oldPath)!
            next.delete(oldPath); next.set(newPath, origContent); return next
          }
          return prev
        })
        tabBar.renameTab(oldPath, newPath, newName)
      } else { filesystem.renameFile(oldPath, newPath) }
      setFileTreeVersion(v => v + 1)
    } catch (error) { showError(error instanceof Error ? error.message : 'Failed to rename file') }
  }, [filesystem, showError, tabBar, tabs])

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

  const moveFile = useCallback((sourcePath: string, targetFolderPath: string) => {
    try {
      filesystem.moveFile(sourcePath, targetFolderPath)
      setFileTreeVersion(v => v + 1)
    }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to move file') }
  }, [filesystem, showError])

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

  // Handle file/directory moves from shell (mv command)
  // Updates tabs to reflect new paths without losing editor state
  const handleShellFileMove = useCallback((oldPath: string, newPath: string, isDirectory: boolean) => {
    if (isDirectory) {
      // For directories, update all tabs that are children of the old path
      const affectedTabs = tabs.filter(t => t.path.startsWith(oldPath + '/') || t.path === oldPath)
      for (const tab of affectedTabs) {
        const relativePath = tab.path.slice(oldPath.length)
        const newTabPath = newPath + relativePath
        const newName = newTabPath.split('/').pop() || newTabPath
        // Update content maps to preserve dirty state
        setOriginalContent(prev => {
          if (prev.has(tab.path)) {
            const next = new Map(prev)
            const content = next.get(tab.path)!
            next.delete(tab.path)
            next.set(newTabPath, content)
            return next
          }
          return prev
        })
        setUnsavedContent(prev => {
          if (prev.has(tab.path)) {
            const next = new Map(prev)
            const content = next.get(tab.path)!
            next.delete(tab.path)
            next.set(newTabPath, content)
            return next
          }
          return prev
        })
        // Update tab path and name
        tabBar.renameTab(tab.path, newTabPath, newName)
      }
    } else {
      // For files, update the specific tab if it exists
      const tabIndex = tabs.findIndex(t => t.path === oldPath)
      if (tabIndex !== -1) {
        const newName = newPath.split('/').pop() || newPath
        // Update content maps to preserve dirty state
        setOriginalContent(prev => {
          if (prev.has(oldPath)) {
            const next = new Map(prev)
            const content = next.get(oldPath)!
            next.delete(oldPath)
            next.set(newPath, content)
            return next
          }
          return prev
        })
        setUnsavedContent(prev => {
          if (prev.has(oldPath)) {
            const next = new Map(prev)
            const content = next.get(oldPath)!
            next.delete(oldPath)
            next.set(newPath, content)
            return next
          }
          return prev
        })
        // Update tab path and name
        tabBar.renameTab(oldPath, newPath, newName)
      }
    }
  }, [tabs, tabBar])

  // File tree is computed fresh on each render (UI operations cause re-renders naturally)
  // For shell commands, refreshFileTree is called to force a re-render via fileTreeVersion
  // We need to read fileTreeVersion to ensure component re-renders when it changes
  void fileTreeVersion
  const fileTree = filesystem.getTree()

  // Load content for the initial active tab when restored from persistence
  // This runs after the filesystem is ready (when fileTree changes indicate data is loaded)
  useEffect(() => {
    // Only run once, and only if we have a persisted active tab that hasn't been loaded yet
    if (initialContentLoadedRef.current) return
    if (!activeTab) return

    // Check if this is a file tab that needs content loaded
    const tab = tabs.find(t => t.path === activeTab)
    if (!tab || tab.type === 'canvas' || tab.type === 'binary') return

    // Try to load the content - if file doesn't exist yet (async loading), we'll try again
    const content = filesystem.readFile(activeTab)
    if (content !== null) {
      setCodeState(content)
      setOriginalContent(prev => {
        const next = new Map(prev)
        next.set(activeTab, content)
        return next
      })
      initialContentLoadedRef.current = true
    }
  }, [activeTab, tabs, filesystem, fileTree]) // fileTree changes when filesystem loads data

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
    tabs, activeTab, activeTabType, selectTab, closeTab, openCanvasTab, makeTabPermanent,
    pinTab, unpinTab, reorderTab, closeToRight, closeOthers,
    toasts, showError, dismissToast,
    pendingNewFilePath, generateUniqueFileName, createFileWithRename, clearPendingNewFile,
    pendingNewFolderPath, generateUniqueFolderName, createFolderWithRename, clearPendingNewFolder,
    recentFiles, clearRecentFiles, fileSystem: filesystem,
    autoSaveEnabled, toggleAutoSave, saveAllFiles,
  }), [
    engine, code, setCode, fileName, isDirty,
    activePanel, terminalVisible, sidebarVisible, toggleTerminal, toggleSidebar,
    fileTree, refreshFileTree, handleShellFileMove, createFile, createFolder, deleteFile, deleteFolder,
    renameFile, renameFolder, moveFile, copyFile, openFile, openPreviewFile, openMarkdownPreview, openBinaryViewer, saveFile, tabs, activeTab, activeTabType, selectTab, closeTab, openCanvasTab, makeTabPermanent,
    pinTab, unpinTab, reorderTab, closeToRight, closeOthers,
    toasts, showError, dismissToast, pendingNewFilePath, generateUniqueFileName, createFileWithRename,
    clearPendingNewFile, pendingNewFolderPath, generateUniqueFolderName, createFolderWithRename,
    clearPendingNewFolder, recentFiles, clearRecentFiles, filesystem,
    autoSaveEnabled, toggleAutoSave, saveAllFiles,
  ])

  return <IDEContext.Provider value={value}>{children}</IDEContext.Provider>
}
