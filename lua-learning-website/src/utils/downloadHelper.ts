import JSZip from 'jszip'
import type { IFileSystem } from '@lua-learning/shell-core'
import { triggerDownload } from './dataExporter/dataExporter'

/**
 * Extract the filename from a full path.
 */
function extractFilename(path: string): string {
  return path.split('/').pop() || path
}

/**
 * Read a single file from the filesystem, handling binary vs text.
 * Returns { data, isBinary } where data is either a Uint8Array or string.
 */
function readFileContent(
  fs: IFileSystem,
  path: string
): { data: Uint8Array | string; isBinary: boolean } {
  const isBinary = fs.isBinaryFile?.(path) ?? false

  if (isBinary && fs.readBinaryFile) {
    return { data: fs.readBinaryFile(path), isBinary: true }
  }

  return { data: fs.readFile(path), isBinary: false }
}

/**
 * Download a single file from the virtual filesystem.
 */
export async function downloadSingleFile(
  fs: IFileSystem,
  path: string
): Promise<void> {
  const { data, isBinary } = readFileContent(fs, path)
  const blob = isBinary
    ? new Blob([data as BlobPart], { type: 'application/octet-stream' })
    : new Blob([data as string], { type: 'text/plain' })

  triggerDownload(extractFilename(path), blob)
}

/**
 * Recursively collect all files in a directory and add them to a JSZip instance.
 */
function addDirectoryToZip(
  fs: IFileSystem,
  zip: JSZip,
  dirPath: string,
  relativePath: string
): void {
  const entries = fs.listDirectory(dirPath)

  for (const entry of entries) {
    const entryRelative = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name

    if (fs.isDirectory(entry.path)) {
      addDirectoryToZip(fs, zip, entry.path, entryRelative)
    } else {
      const { data, isBinary } = readFileContent(fs, entry.path)
      if (isBinary) {
        zip.file(entryRelative, data as Uint8Array, { binary: true })
      } else {
        zip.file(entryRelative, data as string)
      }
    }
  }
}

/**
 * Download a directory as a ZIP archive.
 */
export async function downloadDirectoryAsZip(
  fs: IFileSystem,
  dirPath: string,
  zipName: string
): Promise<void> {
  const zip = new JSZip()

  addDirectoryToZip(fs, zip, dirPath, '')

  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const blob = new Blob([arrayBuffer], { type: 'application/zip' })

  triggerDownload(`${zipName}.zip`, blob)
}
