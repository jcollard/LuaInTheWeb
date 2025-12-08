import { createContext } from 'react'
import type { IDEContextValue } from './types'

/**
 * Context for IDE state management
 */
export const IDEContext = createContext<IDEContextValue | null>(null)
