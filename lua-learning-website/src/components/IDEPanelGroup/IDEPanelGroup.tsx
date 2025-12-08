import { forwardRef, useRef, useImperativeHandle } from 'react'
import { PanelGroup, type ImperativePanelGroupHandle } from 'react-resizable-panels'
import type { IDEPanelGroupProps, IDEPanelGroupHandle } from './types'
import styles from './IDEPanelGroup.module.css'

export const IDEPanelGroup = forwardRef<IDEPanelGroupHandle, IDEPanelGroupProps>(
  function IDEPanelGroup(
    { direction, persistId, children, className },
    ref
  ) {
    const panelGroupRef = useRef<ImperativePanelGroupHandle>(null)

    useImperativeHandle(ref, () => ({
      getLayout: () => panelGroupRef.current?.getLayout() ?? [],
      setLayout: (sizes: number[]) => panelGroupRef.current?.setLayout(sizes),
    }))

    const combinedClassName = className
      ? `${styles.panelGroup} ${className}`
      : styles.panelGroup

    return (
      <PanelGroup
        ref={panelGroupRef}
        direction={direction}
        autoSaveId={persistId}
        className={combinedClassName}
      >
        {children}
      </PanelGroup>
    )
  }
)
