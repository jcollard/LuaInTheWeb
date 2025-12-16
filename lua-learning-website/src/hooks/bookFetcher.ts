/**
 * Book content fetcher for loading read-only book workspaces from public assets.
 *
 * Fetches a manifest.json and all referenced files from a given base path.
 */

export interface BookManifest {
  name: string
  files: string[]
}

/**
 * Fetch book content from a public assets directory.
 *
 * @param basePath - Base path to the book directory (e.g., '/adventures-in-lua-book')
 * @returns Record of filename to content, or empty object on failure
 */
export async function fetchBookContent(basePath: string): Promise<Record<string, string>> {
  try {
    const manifestResponse = await fetch(`${basePath}/manifest.json`)
    if (!manifestResponse.ok) {
      return {}
    }

    const manifest: BookManifest = await manifestResponse.json()

    if (!manifest.files || manifest.files.length === 0) {
      return {}
    }

    const fileContents: Record<string, string> = {}

    await Promise.all(
      manifest.files.map(async (filename) => {
        try {
          const response = await fetch(`${basePath}/${filename}`)
          if (response.ok) {
            fileContents[filename] = await response.text()
          }
        } catch {
          // Skip files that fail to fetch
        }
      })
    )

    return fileContents
  } catch {
    return {}
  }
}
