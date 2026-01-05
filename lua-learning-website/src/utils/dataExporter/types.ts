/**
 * Types for data export functionality.
 */

/**
 * Progress information during export.
 */
export interface ExportProgress {
  /** Current phase of export (e.g., 'collecting', 'zipping') */
  phase: 'collecting' | 'zipping' | 'complete'
  /** Number of items processed */
  processed: number
  /** Total items to process */
  total: number
  /** Current file being processed (optional) */
  currentFile?: string
}

/**
 * Options for export operations.
 */
export interface ExportOptions {
  /** Include metadata.json with workspace info */
  includeMetadata?: boolean
  /** Progress callback */
  onProgress?: (progress: ExportProgress) => void
}

/**
 * File entry for export.
 */
export interface ExportFileEntry {
  /** Path within the zip */
  path: string
  /** File content */
  content: string | Uint8Array
  /** Whether the content is binary */
  isBinary: boolean
}

/**
 * Workspace metadata for export.
 */
export interface ExportedWorkspaceMetadata {
  /** Workspace ID */
  id: string
  /** Workspace name */
  name: string
  /** Mount path */
  mountPath: string
  /** Export timestamp */
  exportedAt: string
}

/**
 * Full export metadata.
 */
export interface ExportMetadata {
  /** Version of export format */
  version: string
  /** Export timestamp */
  exportedAt: string
  /** Workspaces included */
  workspaces: ExportedWorkspaceMetadata[]
}
