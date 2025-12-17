import type { IFileSystem } from '@lua-learning/shell-core';
import type { AssetDefinition } from './types.js';
import imageSize from 'image-size';

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

    // Extract dimensions using image-size library
    const dimensions = this.extractDimensions(binaryData, filename);

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
   * Extract dimensions from image data using the image-size library.
   *
   * @param data - The raw image data
   * @param filename - The filename for error messages
   * @returns The extracted width and height
   * @throws Error if image data is invalid
   */
  private extractDimensions(
    data: Uint8Array,
    filename: string
  ): { width: number; height: number } {
    try {
      const result = imageSize(data);

      if (!result.width || !result.height) {
        throw new Error(`Failed to load '${filename}': invalid image data`);
      }

      return { width: result.width, height: result.height };
    } catch {
      throw new Error(`Failed to load '${filename}': invalid image data`);
    }
  }
}
