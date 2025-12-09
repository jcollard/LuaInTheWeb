import { useState, useCallback, useMemo, useRef } from 'react'
import { useLuaEngine } from '../../hooks/useLuaEngine'
import { useFileSystem } from '../../hooks/useFileSystem'
import { useTabBar } from '../TabBar'
import { useToast } from '../Toast'
import { IDEContext } from './context'
import type { IDEContextValue, IDEContextProviderProps, ActivityPanelType } from './types'
import type { TerminalLine } from '../BottomPanel/types'

// Helper to extract file name from path
function getFileName(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

// Helper to get parent path
function getParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.length === 0 ? '/' : '/' + parts.join('/')
}

/**
 * Provider component for IDE context
 */
export function IDEContextProvider({
  children,
  initialCode = '',
}: IDEContextProviderProps) {
  // Filesystem hook
  const filesystem = useFileSystem()

  // Tab bar hook
  const tabBar = useTabBar()

  // Toast hook for error notifications
  const { toasts, showToast, dismissToast } = useToast()

  // Helper to show error messages
  const showError = useCallback((message: string) => {
    showToast({ message, type: 'error' })
  }, [showToast])

  // Code state - stores current editor content
  const [code, setCodeState] = useState(initialCode)

  // Track original content per file for dirty detection (state to trigger re-renders)
  const [originalContent, setOriginalContent] = useState<Map<string, string>>(new Map())

  // Track unsaved content per tab (content that differs from filesystem)
  const [unsavedContent, setUnsavedContent] = useState<Map<string, string>>(new Map())

  // Track pending new file that needs renaming
  const [pendingNewFilePath, setPendingNewFilePath] = useState<string | null>(null)

  // Terminal state
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([])
  const lineCounterRef = useRef(0)

  // Input state
  const [isAwaitingInput, setIsAwaitingInput] = useState(false)
  const inputResolverRef = useRef<((value: string) => void) | null>(null)

  // UI state
  const [activePanel, setActivePanel] = useState<ActivityPanelType>('explorer')
  const [terminalVisible, setTerminalVisible] = useState(true)
  const [sidebarVisible, setSidebarVisible] = useState(true)

  // Derived state
  const activeTab = tabBar.activeTab
  const tabs = tabBar.tabs

  // fileName derived from active tab (null when no file is open)
  const fileName = activeTab ? getFileName(activeTab) : null

  // isDirty: compare current code to original content
  const isDirty = useMemo(() => {
    if (!activeTab) {
      return code !== initialCode
    }
    const original = originalContent.get(activeTab)
    return original !== undefined && code !== original
  }, [activeTab, code, initialCode, originalContent])

  // Callbacks for terminal output
  const handleOutput = useCallback((text: string) => {
    const id = `line-${++lineCounterRef.current}`
    setTerminalOutput(prev => [...prev, { id, text }])
  }, [])

  const handleError = useCallback((error: string) => {
    const id = `line-${++lineCounterRef.current}`
    setTerminalOutput(prev => [...prev, { id, text: error }])
  }, [])

  // Handle io.read() - returns a promise that resolves when user submits input
  const handleReadInput = useCallback((): Promise<string> => {
    setIsAwaitingInput(true)
    const id = `line-${++lineCounterRef.current}`
    setTerminalOutput(prev => [...prev, { id, text: '> Waiting for input...' }])

    return new Promise<string>((resolve) => {
      inputResolverRef.current = resolve
    })
  }, [])

  // Submit input to resolve the pending io.read()
  const submitInput = useCallback((input: string) => {
    if (inputResolverRef.current) {
      inputResolverRef.current(input)
      inputResolverRef.current = null
      setIsAwaitingInput(false)
    }
  }, [])

  // File reader for Lua require() - use filesystem hook
  const fileReader = useCallback((path: string): string | null => {
    return filesystem.readFile(path)
  }, [filesystem])

  // Initialize Lua engine with filesystem access for require()
  const engine = useLuaEngine({
    onOutput: handleOutput,
    onError: handleError,
    onReadInput: handleReadInput,
    fileReader,
  })

  // Set code and update tab dirty state
  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode)
    if (activeTab) {
      const original = originalContent.get(activeTab)
      const isDirtyNow = original !== undefined && newCode !== original
      tabBar.setDirty(activeTab, isDirtyNow)

      // Track unsaved content for tab switching
      if (isDirtyNow) {
        setUnsavedContent(prev => {
          const next = new Map(prev)
          next.set(activeTab, newCode)
          return next
        })
      } else {
        // Clear unsaved content if back to original
        setUnsavedContent(prev => {
          if (prev.has(activeTab)) {
            const next = new Map(prev)
            next.delete(activeTab)
            return next
          }
          return prev
        })
      }
    }
  }, [activeTab, originalContent, tabBar])

  // Helper to load content for a path - checks unsavedContent first, then filesystem
  const loadContentForPath = useCallback((path: string) => {
    const savedUnsaved = unsavedContent.get(path)
    if (savedUnsaved !== undefined) {
      setCodeState(savedUnsaved)
    } else {
      const content = filesystem.readFile(path)
      if (content !== null) {
        setCodeState(content)
      }
    }
  }, [filesystem, unsavedContent])

  // Open a file: load content and open tab
  const openFile = useCallback((path: string) => {
    // If file is already open as a tab, just select it (preserving unsaved changes)
    const existingTab = tabBar.tabs.find(t => t.path === path)
    if (existingTab) {
      // Save current unsaved content before switching
      if (activeTab && activeTab !== path && code !== originalContent.get(activeTab)) {
        setUnsavedContent(prev => {
          const next = new Map(prev)
          next.set(activeTab, code)
          return next
        })
      }

      tabBar.selectTab(path)
      loadContentForPath(path)
      return
    }

    // Save current unsaved content before switching
    if (activeTab && code !== originalContent.get(activeTab)) {
      setUnsavedContent(prev => {
        const next = new Map(prev)
        next.set(activeTab, code)
        return next
      })
    }

    const content = filesystem.readFile(path)
    if (content !== null) {
      setCodeState(content)
      setOriginalContent(prev => {
        const next = new Map(prev)
        next.set(path, content)
        return next
      })
      tabBar.openTab(path, getFileName(path))
    }
  }, [activeTab, code, filesystem, loadContentForPath, originalContent, tabBar])

  // Save current file
  const saveFile = useCallback(() => {
    if (activeTab) {
      filesystem.writeFile(activeTab, code)
      setOriginalContent(prev => {
        const next = new Map(prev)
        next.set(activeTab, code)
        return next
      })
      // Clear unsaved content since file is now saved
      setUnsavedContent(prev => {
        if (prev.has(activeTab)) {
          const next = new Map(prev)
          next.delete(activeTab)
          return next
        }
        return prev
      })
      tabBar.setDirty(activeTab, false)
    }
  }, [activeTab, code, filesystem, tabBar])

  // Select a tab: load its content (preserving unsaved edits)
  const selectTab = useCallback((path: string) => {
    // Save current unsaved content before switching
    if (activeTab && code !== originalContent.get(activeTab)) {
      setUnsavedContent(prev => {
        const next = new Map(prev)
        next.set(activeTab, code)
        return next
      })
    }

    tabBar.selectTab(path)
    loadContentForPath(path)
  }, [activeTab, code, loadContentForPath, originalContent, tabBar])

  // Close a tab
  const closeTab = useCallback((path: string) => {
    tabBar.closeTab(path)
    setOriginalContent(prev => {
      const next = new Map(prev)
      next.delete(path)
      return next
    })
    // Clean up unsaved content for closed tab
    setUnsavedContent(prev => {
      if (prev.has(path)) {
        const next = new Map(prev)
        next.delete(path)
        return next
      }
      return prev
    })

    // If closing active tab, load next active tab's content
    const remainingTabs = tabs.filter(t => t.path !== path)
    if (remainingTabs.length > 0 && activeTab === path) {
      const nextTab = remainingTabs[Math.min(tabs.findIndex(t => t.path === path), remainingTabs.length - 1)]
      loadContentForPath(nextTab.path)
    } else if (remainingTabs.length === 0) {
      setCodeState(initialCode)
    }
  }, [activeTab, initialCode, loadContentForPath, tabBar, tabs])

  // Create file wrapper with error handling
  const createFile = useCallback((path: string, content: string = '') => {
    try {
      filesystem.createFile(path, content)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create file')
    }
  }, [filesystem, showError])

  // Create folder wrapper
  const createFolder = useCallback((path: string) => {
    filesystem.createFolder(path)
  }, [filesystem])

  // Generate unique filename for new files
  const generateUniqueFileName = useCallback((parentPath: string = '/'): string => {
    const baseName = 'untitled'
    const extension = '.lua'
    let counter = 1

    // Check existing files in parent directory
    const prefix = parentPath === '/' ? '/' : `${parentPath}/`

    while (filesystem.exists(`${prefix}${baseName}-${counter}${extension}`)) {
      counter++
    }

    return `${baseName}-${counter}${extension}`
  }, [filesystem])

  // Create new file with rename mode
  const createFileWithRename = useCallback((parentPath: string = '/') => {
    const fileName = generateUniqueFileName(parentPath)
    const fullPath = parentPath === '/' ? `/${fileName}` : `${parentPath}/${fileName}`

    try {
      filesystem.createFile(fullPath, '')
      setPendingNewFilePath(fullPath)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create file')
    }
  }, [filesystem, generateUniqueFileName, showError])

  // Clear pending new file
  const clearPendingNewFile = useCallback(() => {
    setPendingNewFilePath(null)
  }, [])

  // Delete file - also close tab if open
  const deleteFile = useCallback((path: string) => {
    // Close tab if open
    if (tabs.some(t => t.path === path)) {
      closeTab(path)
    }
    filesystem.deleteFile(path)
  }, [closeTab, filesystem, tabs])

  // Delete folder wrapper
  const deleteFolder = useCallback((path: string) => {
    filesystem.deleteFolder(path)
  }, [filesystem])

  // Rename file - update tab if open, with error handling
  const renameFile = useCallback((oldPath: string, newName: string) => {
    const parentPath = getParentPath(oldPath)
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`

    // Skip if the path hasn't changed (same name)
    if (oldPath === newPath) {
      return
    }

    try {
      // Update tab if open
      const tabIndex = tabs.findIndex(t => t.path === oldPath)
      if (tabIndex !== -1) {
        filesystem.renameFile(oldPath, newPath)

        // Update original content map
        setOriginalContent(prev => {
          if (prev.has(oldPath)) {
            const next = new Map(prev)
            const origContent = next.get(oldPath)!
            next.delete(oldPath)
            next.set(newPath, origContent)
            return next
          }
          return prev
        })

        // Rename the tab in place
        tabBar.renameTab(oldPath, newPath, newName)
      } else {
        filesystem.renameFile(oldPath, newPath)
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to rename file')
    }
  }, [filesystem, showError, tabBar, tabs])

  // Rename folder wrapper
  const renameFolder = useCallback((oldPath: string, newName: string) => {
    const parentPath = getParentPath(oldPath)
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`
    filesystem.renameFolder(oldPath, newPath)
  }, [filesystem])

  // Move file wrapper with error handling
  const moveFile = useCallback((sourcePath: string, targetFolderPath: string) => {
    try {
      filesystem.moveFile(sourcePath, targetFolderPath)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to move file')
    }
  }, [filesystem, showError])

  // Actions
  const runCode = useCallback(async () => {
    await engine.execute(code)
  }, [engine, code])

  const clearTerminal = useCallback(() => {
    setTerminalOutput([])
  }, [])

  const toggleTerminal = useCallback(() => {
    setTerminalVisible(prev => !prev)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev)
  }, [])

  // Get file tree
  const fileTree = filesystem.getTree()

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<IDEContextValue>(
    () => ({
      engine,
      code,
      setCode,
      fileName,
      isDirty,
      terminalOutput,
      isAwaitingInput,
      submitInput,
      activePanel,
      setActivePanel,
      terminalVisible,
      toggleTerminal,
      sidebarVisible,
      toggleSidebar,
      runCode,
      clearTerminal,
      // Filesystem
      fileTree,
      createFile,
      createFolder,
      deleteFile,
      deleteFolder,
      renameFile,
      renameFolder,
      moveFile,
      openFile,
      saveFile,
      // Tabs
      tabs,
      activeTab,
      selectTab,
      closeTab,
      // Toasts
      toasts,
      showError,
      dismissToast,
      // New file creation
      pendingNewFilePath,
      generateUniqueFileName,
      createFileWithRename,
      clearPendingNewFile,
    }),
    [
      engine,
      code,
      setCode,
      fileName,
      isDirty,
      terminalOutput,
      isAwaitingInput,
      submitInput,
      activePanel,
      terminalVisible,
      sidebarVisible,
      toggleTerminal,
      toggleSidebar,
      runCode,
      clearTerminal,
      fileTree,
      createFile,
      createFolder,
      deleteFile,
      deleteFolder,
      renameFile,
      renameFolder,
      moveFile,
      openFile,
      saveFile,
      tabs,
      activeTab,
      selectTab,
      closeTab,
      toasts,
      showError,
      dismissToast,
      pendingNewFilePath,
      generateUniqueFileName,
      createFileWithRename,
      clearPendingNewFile,
    ]
  )

  return <IDEContext.Provider value={value}>{children}</IDEContext.Provider>
}
