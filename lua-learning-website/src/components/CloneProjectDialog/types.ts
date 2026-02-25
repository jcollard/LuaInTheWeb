export type CloneTargetType = 'virtual' | 'local'

export interface CloneProjectDialogProps {
  isOpen: boolean
  projectName: string
  isFileSystemAccessSupported: boolean
  onClone: (name: string, type: CloneTargetType, handle?: FileSystemDirectoryHandle) => void
  onCancel: () => void
  isFolderAlreadyMounted?: (handle: FileSystemDirectoryHandle) => Promise<boolean>
  getUniqueWorkspaceName?: (baseName: string) => string
}
