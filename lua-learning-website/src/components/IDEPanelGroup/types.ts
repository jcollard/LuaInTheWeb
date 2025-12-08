import type { ReactNode } from 'react'

export interface IDEPanelGroupProps {
  /** Direction of the panel split */
  direction: 'horizontal' | 'vertical'
  /** localStorage key for persistence (react-resizable-panels uses this) */
  persistId?: string
  /** Child panels and resize handles */
  children: ReactNode
  /** Additional CSS class */
  className?: string
}
