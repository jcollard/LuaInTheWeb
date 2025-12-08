import { useState, useCallback, useMemo } from 'react'
import { useLuaEngine } from '../../hooks/useLuaEngine'
import { IDEContext } from './context'
import type { IDEContextValue, IDEContextProviderProps, ActivityPanelType } from './types'

/**
 * Provider component for IDE context
 */
export function IDEContextProvider({
  children,
  initialCode = '',
  initialFileName = 'untitled.lua',
}: IDEContextProviderProps) {
  // Code state
  const [code, setCode] = useState(initialCode)
  const [fileName] = useState(initialFileName)

  // Terminal state
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])

  // UI state
  const [activePanel, setActivePanel] = useState<ActivityPanelType>('explorer')
  const [terminalVisible, setTerminalVisible] = useState(true)
  const [sidebarVisible, setSidebarVisible] = useState(true)

  // Computed state
  const isDirty = code !== initialCode

  // Callbacks for terminal output
  const handleOutput = useCallback((text: string) => {
    setTerminalOutput(prev => [...prev, text])
  }, [])

  const handleError = useCallback((error: string) => {
    setTerminalOutput(prev => [...prev, error])
  }, [])

  // Initialize Lua engine
  const engine = useLuaEngine({
    onOutput: handleOutput,
    onError: handleError,
  })

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

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<IDEContextValue>(
    () => ({
      engine,
      code,
      setCode,
      fileName,
      isDirty,
      terminalOutput,
      activePanel,
      setActivePanel,
      terminalVisible,
      toggleTerminal,
      sidebarVisible,
      toggleSidebar,
      runCode,
      clearTerminal,
    }),
    [
      engine,
      code,
      fileName,
      isDirty,
      terminalOutput,
      activePanel,
      terminalVisible,
      sidebarVisible,
      toggleTerminal,
      toggleSidebar,
      runCode,
      clearTerminal,
    ]
  )

  return <IDEContext.Provider value={value}>{children}</IDEContext.Provider>
}
