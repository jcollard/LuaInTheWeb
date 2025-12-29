/**
 * Workspace content fetcher for loading read-only workspaces from public assets.
 *
 * Fetches a manifest.json and all referenced files from a given base path.
 * Supports both text files and binary files (images).
 */

export interface WorkspaceManifest {
  name: string
  files: string[]
}

export interface WorkspaceContent {
  text: Record<string, string>
  binary: Record<string, Uint8Array>
}

/**
 * Binary file extensions - files with these extensions are fetched as binary.
 */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.ico',  // Images
  '.ttf', '.otf', '.woff', '.woff2',  // Fonts
  '.mp3', '.wav', '.ogg'  // Audio
])

/**
 * Check if a filename has a binary extension.
 */
function isBinaryFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

/**
 * Fetch workspace content from a public assets directory.
 *
 * @param basePath - Base path to the workspace directory (e.g., '/examples')
 * @returns WorkspaceContent with text and binary file maps, or empty maps on failure
 */
export async function fetchWorkspaceContent(basePath: string): Promise<WorkspaceContent> {
  const emptyContent: WorkspaceContent = { text: {}, binary: {} }

  try {
    const manifestResponse = await fetch(`${basePath}/manifest.json`)
    if (!manifestResponse.ok) {
      return emptyContent
    }

    const manifest: WorkspaceManifest = await manifestResponse.json()

    if (!manifest.files || manifest.files.length === 0) {
      return emptyContent
    }

    const result: WorkspaceContent = { text: {}, binary: {} }

    await Promise.all(
      manifest.files.map(async (filename) => {
        try {
          const response = await fetch(`${basePath}/${filename}`)
          if (response.ok) {
            if (isBinaryFile(filename)) {
              const buffer = await response.arrayBuffer()
              result.binary[filename] = new Uint8Array(buffer)
            } else {
              result.text[filename] = await response.text()
            }
          }
        } catch {
          // Skip files that fail to fetch
        }
      })
    )

    return result
  } catch {
    return emptyContent
  }
}
