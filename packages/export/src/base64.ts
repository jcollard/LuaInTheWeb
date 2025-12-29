/**
 * Base64 encoding utilities for embedding binary assets in HTML.
 */

/**
 * Encode a Uint8Array to a base64 string.
 * Works in both Node.js and browser environments.
 *
 * @param data - Binary data to encode
 * @returns Base64-encoded string
 */
export function encodeBase64(data: Uint8Array): string {
  // Convert Uint8Array to binary string
  let binary = ''
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i])
  }
  // Use btoa for base64 encoding
  return btoa(binary)
}

/**
 * Create a data URL from binary data and MIME type.
 *
 * @param data - Binary data to embed
 * @param mimeType - MIME type (e.g., "image/png", "audio/mpeg")
 * @returns Data URL string (e.g., "data:image/png;base64,...")
 */
export function toDataUrl(data: Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${encodeBase64(data)}`
}
