import { useContext } from 'react'
import { IDEContext } from './context'
import type { IDEContextValue } from './types'

/**
 * Hook to access IDE context
 * @throws Error if used outside of IDEContextProvider
 */
export function useIDE(): IDEContextValue {
  const context = useContext(IDEContext)

  if (context === null) {
    throw new Error('useIDE must be used within an IDEContextProvider')
  }

  return context
}
