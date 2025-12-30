/**
 * Binary file extensions - files with these extensions are treated as binary.
 * Shared constant used by filesystem implementations.
 */
export const BINARY_EXTENSIONS = new Set([
  // Images
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
  '.ico',
  '.svg',
  // Audio
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.flac',
  '.aac',
  // Video
  '.mp4',
  '.webm',
  '.avi',
  '.mov',
  '.mkv',
  // Fonts
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  // Archives
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  // Generic binary
  '.bin',
  '.dat',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  // Documents (binary)
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
])

/**
 * Check if a path has a binary file extension.
 */
export function isBinaryExtension(path: string): boolean {
  const ext = path.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''
  return BINARY_EXTENSIONS.has(ext)
}
