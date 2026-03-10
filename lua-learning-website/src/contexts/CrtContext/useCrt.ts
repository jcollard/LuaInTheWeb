import { useContext } from 'react'
import { CrtContext } from './context'
import type { CrtContextValue } from './types'

export function useCrt(): CrtContextValue {
  const context = useContext(CrtContext)
  if (!context) {
    throw new Error('useCrt must be used within a CrtProvider')
  }
  return context
}
