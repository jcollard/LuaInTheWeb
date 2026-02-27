import { useState, useCallback } from 'react'
import type { CloneTargetType } from '../CloneProjectDialog'

interface CloneDialogState {
  isOpen: boolean
  projectPath: string
  projectName: string
}

interface UseCloneDialogReturn {
  cloneDialogState: CloneDialogState
  openCloneDialog: (targetPath: string) => void
  handleCloneDialogCancel: () => void
  handleCloneProject: (
    name: string,
    type: CloneTargetType,
    handle?: FileSystemDirectoryHandle
  ) => void
}

const CLOSED_STATE: CloneDialogState = { isOpen: false, projectPath: '', projectName: '' }

export function useCloneDialog(
  onCloneProject?: (
    projectPath: string,
    workspaceName: string,
    type: 'virtual' | 'local',
    handle?: FileSystemDirectoryHandle
  ) => void
): UseCloneDialogReturn {
  const [cloneDialogState, setCloneDialogState] = useState<CloneDialogState>(CLOSED_STATE)

  const openCloneDialog = useCallback((targetPath: string) => {
    const projectName = targetPath.split('/').pop() || targetPath
    setCloneDialogState({ isOpen: true, projectPath: targetPath, projectName })
  }, [])

  const handleCloneDialogCancel = useCallback(() => {
    setCloneDialogState(CLOSED_STATE)
  }, [])

  const handleCloneProject = useCallback(
    (name: string, type: CloneTargetType, handle?: FileSystemDirectoryHandle) => {
      onCloneProject?.(cloneDialogState.projectPath, name, type, handle)
      setCloneDialogState(CLOSED_STATE)
    },
    [onCloneProject, cloneDialogState.projectPath]
  )

  return { cloneDialogState, openCloneDialog, handleCloneDialogCancel, handleCloneProject }
}
