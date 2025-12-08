import { useState, useCallback, useMemo, useRef } from 'react'
import { useLuaEngine } from '../../hooks/useLuaEngine'
import { useFileSystem } from '../../hooks/useFileSystem'
import { useTabBar } from '../TabBar'
import { IDEContext } from './context'
import type { IDEContextValue, IDEContextProviderProps, ActivityPanelType } from './types'

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
  initialFileName = 'untitled.lua',
}: IDEContextProviderProps) {
  // Filesystem hook
  const filesystem = useFileSystem()

  // Tab bar hook
  const tabBar = useTabBar()

  // Code state - stores current editor content
  const [code, setCodeState] = useState(initialCode)

  // Track original content per file for dirty detection (state to trigger re-renders)
  const [originalContent, setOriginalContent] = useState<Map<string, string>>(new Map())

  // Terminal state
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])

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

  // fileName derived from active tab or default
  const fileName = activeTab ? getFileName(activeTab) : initialFileName

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
    setTerminalOutput(prev => [...prev, text])
  }, [])

  const handleError = useCallback((error: string) => {
    setTerminalOutput(prev => [...prev, error])
  }, [])

  // Handle io.read() - returns a promise that resolves when user submits input
  const handleReadInput = useCallback((): Promise<string> => {
    setIsAwaitingInput(true)
    setTerminalOutput(prev => [...prev, '> Waiting for input...'])

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
      tabBar.setDirty(activeTab, original !== undefined && newCode !== original)
    }
  }, [activeTab, originalContent, tabBar])

  // Open a file: load content and open tab
  const openFile = useCallback((path: string) => {
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
  }, [filesystem, tabBar])

  // Save current file
  const saveFile = useCallback(() => {
    if (activeTab) {
      filesystem.writeFile(activeTab, code)
      setOriginalContent(prev => {
        const next = new Map(prev)
        next.set(activeTab, code)
        return next
      })
      tabBar.setDirty(activeTab, false)
    }
  }, [activeTab, code, filesystem, tabBar])

  // Select a tab: load its content
  const selectTab = useCallback((path: string) => {
    // Save current content to a temp map before switching
    tabBar.selectTab(path)
    const content = filesystem.readFile(path)
    if (content !== null) {
      setCodeState(content)
    }
  }, [filesystem, tabBar])

  // Close a tab
  const closeTab = useCallback((path: string) => {
    tabBar.closeTab(path)
    setOriginalContent(prev => {
      const next = new Map(prev)
      next.delete(path)
      return next
    })

    // If closing active tab, load next active tab's content
    const remainingTabs = tabs.filter(t => t.path !== path)
    if (remainingTabs.length > 0 && activeTab === path) {
      const nextTab = remainingTabs[Math.min(tabs.findIndex(t => t.path === path), remainingTabs.length - 1)]
      const content = filesystem.readFile(nextTab.path)
      if (content !== null) {
        setCodeState(content)
      }
    } else if (remainingTabs.length === 0) {
      setCodeState(initialCode)
    }
  }, [activeTab, filesystem, initialCode, tabBar, tabs])

  // Create file wrapper
  const createFile = useCallback((path: string, content: string = '') => {
    filesystem.createFile(path, content)
  }, [filesystem])

  // Create folder wrapper
  const createFolder = useCallback((path: string) => {
    filesystem.createFolder(path)
  }, [filesystem])

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

  // Rename file - update tab if open
  const renameFile = useCallback((oldPath: string, newName: string) => {
    const parentPath = getParentPath(oldPath)
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`

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
  }, [filesystem, tabBar, tabs])

  // Rename folder wrapper
  const renameFolder = useCallback((oldPath: string, newName: string) => {
    const parentPath = getParentPath(oldPath)
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`
    filesystem.renameFolder(oldPath, newPath)
  }, [filesystem])

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
      openFile,
      saveFile,
      // Tabs
      tabs,
      activeTab,
      selectTab,
      closeTab,
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
      openFile,
      saveFile,
      tabs,
      activeTab,
      selectTab,
      closeTab,
    ]
  )

  return <IDEContext.Provider value={value}>{children}</IDEContext.Provider>
}
