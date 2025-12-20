/**
 * Error formatting and asset creation utilities for canvas.
 * Contains helper functions extracted from CanvasController to keep it under line limit.
 */

/**
 * Extract the first user-code location from a Lua traceback.
 * Looks for patterns like "test.lua:5:" or "[string "..."]:5:"
 * Skips internal frames (C functions, canvas API internals).
 */
export function extractLocationFromTraceback(traceback: string): string | null {
  // Look for file:line patterns in the traceback
  // Match patterns like: test.lua:5: or [string "test.lua"]:5: or @test.lua:5:
  const patterns = [
    /@?([^:\s]+\.lua):(\d+)/,           // filename.lua:line
    /\[string "([^"]+)"\]:(\d+)/,        // [string "name"]:line
  ]

  for (const pattern of patterns) {
    const match = traceback.match(pattern)
    if (match) {
      const [, file, line] = match
      // Skip internal frames
      if (!file.includes('canvas') && !file.includes('__')) {
        return `${file}:${line}`
      }
    }
  }

  // Try to find any line number reference
  const lineMatch = traceback.match(/:(\d+):/)
  if (lineMatch) {
    return `line ${lineMatch[1]}`
  }

  return null
}

/**
 * Format an error from the onDraw callback with helpful context.
 * Detects common errors and provides user-friendly explanations.
 */
export function formatOnDrawError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error)

  // Try to extract location from traceback for all errors
  const location = extractLocationFromTraceback(rawMessage)
  const locationInfo = location ? ` (${location})` : ''

  // Strip the location prefix from the message if we extracted it
  // Matches patterns like: "foo.lua:3: message" or "[string "foo.lua"]:3: message"
  let cleanMessage = rawMessage
  if (location) {
    cleanMessage = rawMessage
      .replace(/^@?[^:\s]+\.lua:\d+:\s*/, '')
      .replace(/^\[string "[^"]*"\]:\d+:\s*/, '')
  }

  // Detect "yield across C-call boundary" error from blocking operations
  if (rawMessage.includes('yield across') || rawMessage.includes('C-call boundary')) {
    return (
      `canvas.tick${locationInfo}: Cannot use blocking operations like io.read() inside tick.\n` +
      'The tick callback runs every frame and cannot wait for user input.\n' +
      'Use canvas.is_key_pressed() or canvas.get_keys_pressed() for input instead.'
    )
  }

  // For other errors, include location if found
  return `canvas.tick${locationInfo}: ${cleanMessage}`
}

/**
 * Create an HTMLImageElement from binary data.
 * @param data - The image binary data
 * @param mimeType - The MIME type of the image
 * @returns Promise resolving to the loaded HTMLImageElement
 */
export function createImageFromData(data: ArrayBuffer, mimeType?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], { type: mimeType ?? 'image/png' })
    const url = URL.createObjectURL(blob)

    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    image.src = url
  })
}

/**
 * Create a FontFace from binary data and add to document.
 * @param name - The font family name to use
 * @param data - The font binary data
 * @returns The loaded FontFace
 */
export async function createFontFromData(
  name: string,
  data: ArrayBuffer
): Promise<FontFace> {
  // Create FontFace with the asset name as family name
  const font = new FontFace(name, data)

  // Load the font
  await font.load()

  // Add to document so CSS can use it
  // Note: TypeScript's DOM types may not include FontFaceSet.add()
  ;(document.fonts as unknown as Set<FontFace>).add(font)

  return font
}
