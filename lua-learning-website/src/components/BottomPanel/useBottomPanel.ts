import { useState } from 'react'
import type { BottomPanelTab, UseBottomPanelOptions, UseBottomPanelReturn } from './types'

/**
 * Hook for managing bottom panel tab state
 */
export function useBottomPanel(options?: UseBottomPanelOptions): UseBottomPanelReturn {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>(
    options?.initialTab ?? 'terminal'
  )

  return {
    activeTab,
    setActiveTab,
  }
}
