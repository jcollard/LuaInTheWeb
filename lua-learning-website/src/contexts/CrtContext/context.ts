import { createContext } from 'react'
import type { CrtContextValue } from './types'

export const CrtContext = createContext<CrtContextValue | null>(null)
