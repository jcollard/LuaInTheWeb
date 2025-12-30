/**
 * Props for UploadConflictDialog component
 */
export interface UploadConflictDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** List of file names that already exist */
  conflictingFiles: string[]
  /** Called when user confirms to replace files */
  onConfirm: () => void
  /** Called when user cancels the upload */
  onCancel: () => void
}
