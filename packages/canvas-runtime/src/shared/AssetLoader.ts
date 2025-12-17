import type { IFileSystem } from '@lua-learning/shell-core';
import type { AssetDefinition } from './types.js';

/**
 * Result of loading an asset, containing the image data and metadata.
 */
export interface LoadedAsset {
  /** The asset name from the definition */
  name: string;
  /** The raw image data */
  data: ArrayBuffer;
  /** The MIME type of the image */
  mimeType: string;
  /** The width of the image in pixels */
  width: number;
  /** The height of the image in pixels */
  height: number;
}

/**
 * Supported image formats and their MIME types.
 */
const SUPPORTED_FORMATS: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * PNG file signature bytes.
 */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Extract dimensions from PNG data.
 * PNG stores width/height in the IHDR chunk right after the signature.
 */
function extractPngDimensions(
  data: Uint8Array
): { width: number; height: number } | null {
  // Minimum PNG size: 8 (sig) + 4 (length) + 4 (type) + 8 (width+height)
  if (data.length < 24) return null;

  // Verify PNG signature
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) return null;
  }

  // Width is at bytes 16-19 (big endian)
  const width =
    (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
  // Height is at bytes 20-23 (big endian)
  const height =
    (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];

  return { width, height };
}

/**
 * Extract dimensions from JPEG data.
 * JPEG stores dimensions in SOF (Start of Frame) markers.
 */
function extractJpegDimensions(
  data: Uint8Array
): { width: number; height: number } | null {
  // Minimum JPEG size: SOI (2) + some markers
  if (data.length < 4) return null;

  // Verify JPEG SOI marker
  if (data[0] !== 0xff || data[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < data.length - 1) {
    if (data[offset] !== 0xff) return null;

    const marker = data[offset + 1];

    // SOF markers (C0-CF, except C4, C8, CC)
    if (
      (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
    ) {
      // SOF structure: marker (2) + length (2) + precision (1) + height (2) + width (2)
      if (offset + 9 > data.length) return null;
      const height = (data[offset + 5] << 8) | data[offset + 6];
      const width = (data[offset + 7] << 8) | data[offset + 8];
      return { width, height };
    }

    // Skip this marker segment
    if (marker === 0xd8 || marker === 0xd9) {
      // SOI or EOI - no length
      offset += 2;
    } else if (marker >= 0xd0 && marker <= 0xd7) {
      // RST markers - no length
      offset += 2;
    } else {
      // Other markers have length field
      if (offset + 4 > data.length) return null;
      const length = (data[offset + 2] << 8) | data[offset + 3];
      offset += 2 + length;
    }
  }

  return null;
}

/**
 * Extract dimensions from GIF data.
 * GIF stores dimensions in the Logical Screen Descriptor (bytes 6-9).
 */
function extractGifDimensions(
  data: Uint8Array
): { width: number; height: number } | null {
  // Minimum GIF size: 6 (header) + 4 (dimensions)
  if (data.length < 10) return null;

  // Verify GIF header (GIF87a or GIF89a)
  const header = String.fromCharCode(data[0], data[1], data[2]);
  const version = String.fromCharCode(data[3], data[4], data[5]);
  if (header !== 'GIF' || (version !== '87a' && version !== '89a')) return null;

  // Width and height are little-endian
  const width = data[6] | (data[7] << 8);
  const height = data[8] | (data[9] << 8);

  return { width, height };
}

/**
 * Extract dimensions from WebP data.
 * WebP has RIFF header followed by VP8/VP8L/VP8X chunks.
 */
function extractWebpDimensions(
  data: Uint8Array
): { width: number; height: number } | null {
  // Minimum WebP size: RIFF (4) + size (4) + WEBP (4) + VP8 header
  if (data.length < 20) return null;

  // Verify RIFF header
  if (
    data[0] !== 0x52 || // R
    data[1] !== 0x49 || // I
    data[2] !== 0x46 || // F
    data[3] !== 0x46    // F
  ) {
    return null;
  }

  // Verify WEBP signature
  if (
    data[8] !== 0x57 ||  // W
    data[9] !== 0x45 ||  // E
    data[10] !== 0x42 || // B
    data[11] !== 0x50    // P
  ) {
    return null;
  }

  // Check chunk type at offset 12
  const chunkType = String.fromCharCode(data[12], data[13], data[14], data[15]);

  if (chunkType === 'VP8 ') {
    // Lossy VP8: width/height at offset 26-29
    if (data.length < 30) return null;
    const width = (data[26] | (data[27] << 8)) & 0x3fff;
    const height = (data[28] | (data[29] << 8)) & 0x3fff;
    return { width, height };
  } else if (chunkType === 'VP8L') {
    // Lossless VP8L: width/height encoded in signature at offset 21
    if (data.length < 25) return null;
    const bits =
      data[21] | (data[22] << 8) | (data[23] << 16) | (data[24] << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  } else if (chunkType === 'VP8X') {
    // Extended VP8X: width/height at specific offsets
    if (data.length < 30) return null;
    const width = 1 + (data[24] | (data[25] << 8) | (data[26] << 16));
    const height = 1 + (data[27] | (data[28] << 8) | (data[29] << 16));
    return { width, height };
  }

  return null;
}

/**
 * Loads image assets from the filesystem with path resolution and format validation.
 * Used to preload images before canvas.start() is called.
 */
export class AssetLoader {
  constructor(
    private fileSystem: IFileSystem,
    private scriptDirectory: string
  ) {}

  /**
   * Resolve a path relative to the script directory, or return absolute paths unchanged.
   * Matches require() behavior for path resolution.
   *
   * @param path - The path to resolve (relative or absolute)
   * @returns The resolved absolute path
   * @throws Error if path is empty or whitespace-only
   */
  resolvePath(path: string): string {
    const trimmedPath = path.trim();

    if (trimmedPath === '') {
      throw new Error('Path cannot be empty');
    }

    // Absolute paths (starting with /) are returned unchanged
    if (trimmedPath.startsWith('/')) {
      return trimmedPath;
    }

    // Handle ./ prefix - treat as relative
    const relativePath = trimmedPath.startsWith('./')
      ? trimmedPath.slice(2)
      : trimmedPath;

    // Normalize script directory - remove trailing slash if present
    const normalizedDir = this.scriptDirectory.endsWith('/')
      ? this.scriptDirectory.slice(0, -1)
      : this.scriptDirectory;

    // Handle root directory case
    if (normalizedDir === '') {
      return '/' + relativePath;
    }

    return normalizedDir + '/' + relativePath;
  }

  /**
   * Validate that a file path has a supported image format.
   * Returns the MIME type if valid, throws if not.
   *
   * @param path - The file path to validate
   * @returns The MIME type for the file format
   * @throws Error if the format is not supported
   */
  validateFormat(path: string): string {
    // Extract filename from path
    const filename = path.includes('/') ? path.split('/').pop()! : path;

    // Find the last dot to get the extension
    const lastDotIndex = filename.lastIndexOf('.');

    // No extension or dot at start (hidden file)
    if (lastDotIndex <= 0) {
      throw new Error(
        `Cannot load '${filename}': unsupported format (expected PNG, JPG, GIF, or WebP)`
      );
    }

    const extension = filename.slice(lastDotIndex).toLowerCase();
    const mimeType = SUPPORTED_FORMATS[extension];

    if (!mimeType) {
      throw new Error(
        `Cannot load '${filename}': unsupported format (expected PNG, JPG, GIF, or WebP)`
      );
    }

    return mimeType;
  }

  /**
   * Load an asset from the filesystem.
   *
   * @param definition - The asset definition specifying name, path, and type
   * @returns Promise resolving to the loaded asset with data and dimensions
   * @throws Error if file not found, format invalid, or image corrupted
   */
  async loadAsset(definition: AssetDefinition): Promise<LoadedAsset> {
    const { name, path } = definition;

    // Validate format first (throws if invalid)
    const mimeType = this.validateFormat(path);

    // Resolve the path
    const resolvedPath = this.resolvePath(path);

    // Check if file exists
    if (!this.fileSystem.exists(resolvedPath)) {
      throw new Error(`Asset '${name}' not found: ${path}`);
    }

    // Check if it's a file
    if (!this.fileSystem.isFile(resolvedPath)) {
      throw new Error(`Asset '${name}' not found: ${path}`);
    }

    // Ensure binary file reading is supported
    if (!this.fileSystem.readBinaryFile) {
      throw new Error('Filesystem does not support binary file reading');
    }

    // Read binary data
    const binaryData = this.fileSystem.readBinaryFile(resolvedPath);

    // Extract filename for error messages
    const filename = path.includes('/') ? path.split('/').pop()! : path;

    // Extract dimensions based on format
    const dimensions = this.extractDimensions(binaryData, mimeType, filename);

    // Convert Uint8Array to ArrayBuffer, handling both ArrayBuffer and SharedArrayBuffer
    const arrayBuffer = new ArrayBuffer(binaryData.byteLength);
    new Uint8Array(arrayBuffer).set(binaryData);

    return {
      name,
      data: arrayBuffer,
      mimeType,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  /**
   * Extract dimensions from image data based on MIME type.
   *
   * @param data - The raw image data
   * @param mimeType - The MIME type of the image
   * @param filename - The filename for error messages
   * @returns The extracted width and height
   * @throws Error if image data is invalid
   */
  private extractDimensions(
    data: Uint8Array,
    mimeType: string,
    filename: string
  ): { width: number; height: number } {
    let dimensions: { width: number; height: number } | null = null;

    switch (mimeType) {
      case 'image/png':
        dimensions = extractPngDimensions(data);
        break;
      case 'image/jpeg':
        dimensions = extractJpegDimensions(data);
        break;
      case 'image/gif':
        dimensions = extractGifDimensions(data);
        break;
      case 'image/webp':
        dimensions = extractWebpDimensions(data);
        break;
    }

    if (!dimensions) {
      throw new Error(`Failed to load '${filename}': invalid image data`);
    }

    return dimensions;
  }
}
