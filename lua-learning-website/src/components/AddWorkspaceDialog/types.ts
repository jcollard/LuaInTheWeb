/**
 * Workspace type selection for the dialog.
 */
export type WorkspaceTypeSelection = 'virtual' | 'local'

/**
 * Props for the AddWorkspaceDialog component.
 */
export interface AddWorkspaceDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Whether the File System Access API is supported */
  isFileSystemAccessSupported: boolean
  /** Callback when a virtual workspace should be created */
  onCreateVirtual: (name: string) => void
  /** Callback when a local workspace should be created (triggers directory picker) */
  onCreateLocal: (name: string) => void
  /** Callback when the dialog is cancelled */
  onCancel: () => void
}
