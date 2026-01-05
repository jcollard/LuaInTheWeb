/**
 * Data export utilities for backing up workspace files.
 *
 * Provides functions to export files from virtual workspaces
 * as ZIP archives for backup and recovery.
 */

import JSZip from 'jszip'
import {
  getAllFilesForWorkspace,
} from '../../hooks/virtualFileSystemStorage'
import { loadPersistedWorkspaces } from '../../hooks/workspaceManagerHelpers'
import type {
  ExportOptions,
  ExportMetadata,
  ExportedWorkspaceMetadata,
} from './types'

/**
 * Export format version.
 */
const EXPORT_VERSION = '1.0'

/**
 * Create export metadata for the given workspaces.
 */
export function createExportMetadata(
  workspaces: Array<{ id: string; name: string; mountPath: string }>
): ExportMetadata {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    workspaces: workspaces.map((ws): ExportedWorkspaceMetadata => ({
      id: ws.id,
      name: ws.name,
      mountPath: ws.mountPath,
      exportedAt: new Date().toISOString(),
    })),
  }
}

/**
 * Strip leading slash from a path.
 */
function stripLeadingSlash(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path
}

/**
 * Export a single workspace as a ZIP file.
 *
 * @param workspaceId - ID of the workspace to export
 * @param options - Export options
 * @returns ZIP file as a Blob
 */
export async function exportWorkspace(
  workspaceId: string,
  options: ExportOptions = {}
): Promise<Blob> {
  const { includeMetadata = false, onProgress } = options
  const zip = new JSZip()

  // Notify collecting phase
  onProgress?.({
    phase: 'collecting',
    processed: 0,
    total: 0,
  })

  // Get all files from the workspace
  const files = await getAllFilesForWorkspace(workspaceId)
  const fileEntries = Array.from(files.entries())
  const total = fileEntries.length

  // Add files to zip
  let processed = 0
  for (const [path, file] of fileEntries) {
    const zipPath = stripLeadingSlash(path)

    if (file.isBinary) {
      zip.file(zipPath, file.content as Uint8Array, { binary: true })
    } else {
      zip.file(zipPath, file.content as string)
    }

    processed++
    onProgress?.({
      phase: 'collecting',
      processed,
      total,
      currentFile: path,
    })
  }

  // Add metadata if requested
  if (includeMetadata) {
    const metadata = createExportMetadata([{ id: workspaceId, name: workspaceId, mountPath: '/' }])
    zip.file('metadata.json', JSON.stringify(metadata, null, 2))
  }

  // Generate zip
  onProgress?.({
    phase: 'zipping',
    processed: total,
    total,
  })

  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })

  onProgress?.({
    phase: 'complete',
    processed: total,
    total,
  })

  return new Blob([arrayBuffer], { type: 'application/zip' })
}

/**
 * Export all workspace data as a ZIP file.
 *
 * Creates a backup of all virtual workspaces with the structure:
 * ```
 * workspaces/
 *   WorkspaceName1/
 *     file1.lua
 *   WorkspaceName2/
 *     file2.lua
 * metadata.json
 * ```
 *
 * @param options - Export options
 * @returns ZIP file as a Blob
 */
export async function exportAllData(options: ExportOptions = {}): Promise<Blob> {
  const { onProgress } = options
  const zip = new JSZip()

  // Load all persisted workspaces
  const workspaces = loadPersistedWorkspaces() ?? []

  // Filter to only virtual workspaces (not local folder mounts)
  const virtualWorkspaces = workspaces.filter((ws) => ws.type === 'virtual')

  // Calculate total files across all workspaces
  let totalFiles = 0
  const workspaceFiles: Map<string, Map<string, { content: string | Uint8Array; isBinary: boolean }>> = new Map()

  // Collect all files
  onProgress?.({
    phase: 'collecting',
    processed: 0,
    total: 0,
  })

  for (const workspace of virtualWorkspaces) {
    const files = await getAllFilesForWorkspace(workspace.id)
    workspaceFiles.set(workspace.id, files as Map<string, { content: string | Uint8Array; isBinary: boolean }>)
    totalFiles += files.size
  }

  // Add files to zip
  let processed = 0
  for (const workspace of virtualWorkspaces) {
    const files = workspaceFiles.get(workspace.id)!
    const folder = zip.folder(`workspaces/${workspace.name}`)

    if (folder) {
      for (const [path, file] of files) {
        const zipPath = stripLeadingSlash(path)

        if (file.isBinary) {
          folder.file(zipPath, file.content as Uint8Array, { binary: true })
        } else {
          folder.file(zipPath, file.content as string)
        }

        processed++
        onProgress?.({
          phase: 'collecting',
          processed,
          total: totalFiles,
          currentFile: `${workspace.name}/${path}`,
        })
      }
    }
  }

  // Add metadata
  const metadata = createExportMetadata(
    virtualWorkspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      mountPath: ws.mountPath,
    }))
  )
  zip.file('metadata.json', JSON.stringify(metadata, null, 2))

  // Generate zip
  onProgress?.({
    phase: 'zipping',
    processed: totalFiles,
    total: totalFiles,
  })

  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })

  onProgress?.({
    phase: 'complete',
    processed: totalFiles,
    total: totalFiles,
  })

  return new Blob([arrayBuffer], { type: 'application/zip' })
}

/**
 * Trigger a file download in the browser.
 *
 * @param filename - Name for the downloaded file
 * @param blob - File content as a Blob
 */
export function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  URL.revokeObjectURL(url)
  link.remove()
}
