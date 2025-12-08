import { PanelGroup } from 'react-resizable-panels'
import type { IDEPanelGroupProps } from './types'
import styles from './IDEPanelGroup.module.css'

export function IDEPanelGroup({
  direction,
  persistId,
  children,
  className,
}: IDEPanelGroupProps) {
  const combinedClassName = className
    ? `${styles.panelGroup} ${className}`
    : styles.panelGroup

  return (
    <PanelGroup
      direction={direction}
      autoSaveId={persistId}
      className={combinedClassName}
    >
      {children}
    </PanelGroup>
  )
}
