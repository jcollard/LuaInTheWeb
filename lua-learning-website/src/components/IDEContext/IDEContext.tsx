import { useState, useCallback, useMemo } from 'react'
import { useLuaEngine } from '../../hooks/useLuaEngine'
import { useFileSystem } from '../../hooks/useFileSystem'
import { useRecentFiles } from '../../hooks/useRecentFiles'
import { getFileName, getParentPath } from '../../hooks/fileSystemUtils'
import { useTabBar } from '../TabBar'
import { useToast } from '../Toast'
import { IDEContext } from './context'
import { useIDETerminal } from './useIDETerminal'
import type { IDEContextValue, IDEContextProviderProps, ActivityPanelType } from './types'

export function IDEContextProvider({ children, initialCode = '' }: IDEContextProviderProps) {
  const filesystem = useFileSystem()
  const { recentFiles, addRecentFile, clearRecentFiles } = useRecentFiles()
  const tabBar = useTabBar()
  const { toasts, showToast, dismissToast } = useToast()
  const terminal = useIDETerminal()

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

  const activeTab = tabBar.activeTab
  const tabs = tabBar.tabs
  const fileName = activeTab ? getFileName(activeTab) : null

  const isDirty = useMemo(() => {
    if (!activeTab) return code !== initialCode
    const original = originalContent.get(activeTab)
    return original !== undefined && code !== original
  }, [activeTab, code, initialCode, originalContent])

  const fileReader = useCallback((path: string): string | null => filesystem.readFile(path), [filesystem])

  const engine = useLuaEngine({
    onOutput: terminal.handleOutput,
    onError: terminal.handleError,
    onReadInput: terminal.handleReadInput,
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

  const openFile = useCallback((path: string) => {
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
      tabBar.openTab(path, getFileName(path)); addRecentFile(path)
    }
  }, [activeTab, addRecentFile, code, filesystem, loadContentForPath, originalContent, tabBar])

  const saveFile = useCallback(() => {
    if (activeTab) {
      filesystem.writeFile(activeTab, code)
      setOriginalContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
      setUnsavedContent(prev => { if (prev.has(activeTab)) { const next = new Map(prev); next.delete(activeTab); return next } return prev })
      tabBar.setDirty(activeTab, false)
    }
  }, [activeTab, code, filesystem, tabBar])

  const selectTab = useCallback((path: string) => {
    if (activeTab && code !== originalContent.get(activeTab)) {
      setUnsavedContent(prev => { const next = new Map(prev); next.set(activeTab, code); return next })
    }
    tabBar.selectTab(path); loadContentForPath(path)
  }, [activeTab, code, loadContentForPath, originalContent, tabBar])

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

  const generateUniqueFileName = useCallback((parentPath: string = '/'): string => {
    const baseName = 'untitled', extension = '.lua'
    let counter = 1
    const prefix = parentPath === '/' ? '/' : `${parentPath}/`
    while (filesystem.exists(`${prefix}${baseName}-${counter}${extension}`)) counter++
    return `${baseName}-${counter}${extension}`
  }, [filesystem])

  const createFileWithRename = useCallback((parentPath: string = '/') => {
    const fName = generateUniqueFileName(parentPath)
    const fullPath = parentPath === '/' ? `/${fName}` : `${parentPath}/${fName}`
    try { filesystem.createFile(fullPath, ''); setPendingNewFilePath(fullPath) }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to create file') }
  }, [filesystem, generateUniqueFileName, showError])

  const clearPendingNewFile = useCallback(() => { setPendingNewFilePath(null) }, [])

  const generateUniqueFolderName = useCallback((parentPath: string = '/'): string => {
    const baseName = 'new-folder'
    const prefix = parentPath === '/' ? '/' : `${parentPath}/`
    if (!filesystem.exists(`${prefix}${baseName}`)) return baseName
    let counter = 1
    while (filesystem.exists(`${prefix}${baseName}-${counter}`)) counter++
    return `${baseName}-${counter}`
  }, [filesystem])

  const createFolderWithRename = useCallback((parentPath: string = '/') => {
    const folderName = generateUniqueFolderName(parentPath)
    const fullPath = parentPath === '/' ? `/${folderName}` : `${parentPath}/${folderName}`
    try { filesystem.createFolder(fullPath); setPendingNewFolderPath(fullPath) }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to create folder') }
  }, [filesystem, generateUniqueFolderName, showError])

  const clearPendingNewFolder = useCallback(() => { setPendingNewFolderPath(null) }, [])

  const deleteFile = useCallback((path: string) => {
    if (tabs.some(t => t.path === path)) closeTab(path)
    filesystem.deleteFile(path)
  }, [closeTab, filesystem, tabs])

  const deleteFolder = useCallback((path: string) => { filesystem.deleteFolder(path) }, [filesystem])

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
    } catch (error) { showError(error instanceof Error ? error.message : 'Failed to rename file') }
  }, [filesystem, showError, tabBar, tabs])

  const renameFolder = useCallback((oldPath: string, newName: string) => {
    const parentPath = getParentPath(oldPath)
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`
    if (oldPath === newPath) return
    try { filesystem.renameFolder(oldPath, newPath) }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to rename folder') }
  }, [filesystem, showError])

  const moveFile = useCallback((sourcePath: string, targetFolderPath: string) => {
    try { filesystem.moveFile(sourcePath, targetFolderPath) }
    catch (error) { showError(error instanceof Error ? error.message : 'Failed to move file') }
  }, [filesystem, showError])

  const runCode = useCallback(async () => { await engine.execute(code) }, [engine, code])
  const toggleTerminal = useCallback(() => { setTerminalVisible(prev => !prev) }, [])
  const toggleSidebar = useCallback(() => { setSidebarVisible(prev => !prev) }, [])

  const fileTree = filesystem.getTree()

  const value = useMemo<IDEContextValue>(() => ({
    engine, code, setCode, fileName, isDirty,
    terminalOutput: terminal.terminalOutput, isAwaitingInput: terminal.isAwaitingInput,
    submitInput: terminal.submitInput, activePanel, setActivePanel,
    terminalVisible, toggleTerminal, sidebarVisible, toggleSidebar,
    runCode, clearTerminal: terminal.clearTerminal, fileTree,
    createFile, createFolder, deleteFile, deleteFolder, renameFile, renameFolder, moveFile, openFile, saveFile,
    tabs, activeTab, selectTab, closeTab, toasts, showError, dismissToast,
    pendingNewFilePath, generateUniqueFileName, createFileWithRename, clearPendingNewFile,
    pendingNewFolderPath, generateUniqueFolderName, createFolderWithRename, clearPendingNewFolder,
    recentFiles, clearRecentFiles, fileSystem: filesystem,
  }), [
    engine, code, setCode, fileName, isDirty, terminal.terminalOutput, terminal.isAwaitingInput,
    terminal.submitInput, activePanel, terminalVisible, sidebarVisible, toggleTerminal, toggleSidebar,
    runCode, terminal.clearTerminal, fileTree, createFile, createFolder, deleteFile, deleteFolder,
    renameFile, renameFolder, moveFile, openFile, saveFile, tabs, activeTab, selectTab, closeTab,
    toasts, showError, dismissToast, pendingNewFilePath, generateUniqueFileName, createFileWithRename,
    clearPendingNewFile, pendingNewFolderPath, generateUniqueFolderName, createFolderWithRename,
    clearPendingNewFolder, recentFiles, clearRecentFiles, filesystem,
  ])

  return <IDEContext.Provider value={value}>{children}</IDEContext.Provider>
}
