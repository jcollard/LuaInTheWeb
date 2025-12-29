import type { IFileSystem } from '@lua-learning/shell-core';
import type { AssetDefinition, DiscoveredFile } from './types.js';
import { classifyFileType } from './types.js';
import imageSize from 'image-size';

/**
 * Result of loading an asset, containing the binary data and optional metadata.
 */
export interface LoadedAsset {
  /** The asset name from the definition */
  name: string;
  /** The raw binary data */
  data: ArrayBuffer;
  /** The MIME type (inferred from extension, if recognized) */
  mimeType?: string;
  /** The width in pixels (only for image files) */
  width?: number;
  /** The height in pixels (only for image files) */
  height?: number;
}

/**
 * Common MIME types by extension (for convenience, not validation).
 */
const MIME_TYPES: Record<string, string> = {
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  // Fonts
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  // Text/Data
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

/**
 * Loads assets from the filesystem with path resolution.
 * This is a generic binary loader - format validation should be done
 * at the API layer (e.g., canvas.assets.image()).
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
   * Scan a directory and discover all asset files (images and fonts).
   * Recursively scans subdirectories by default.
   *
   * @param path - The path to scan (relative to script directory or absolute)
   * @param recursive - Whether to scan subdirectories (default: true)
   * @returns Array of discovered files with their metadata
   * @throws Error if path doesn't exist or isn't a directory
   */
  scanDirectory(path: string, recursive: boolean = true): DiscoveredFile[] {
    const resolvedPath = this.resolvePath(path);

    // Check if path exists
    if (!this.fileSystem.exists(resolvedPath)) {
      throw new Error(`Asset path not found: ${path} (resolved to ${resolvedPath})`);
    }

    // Check if it's a directory
    if (this.fileSystem.isFile(resolvedPath)) {
      throw new Error(`Asset path is not a directory: ${path}`);
    }

    return this.scanDirectoryRecursive(resolvedPath, path, '', recursive);
  }

  /**
   * Internal recursive directory scanner.
   *
   * @param absolutePath - The absolute path of the directory to scan
   * @param basePath - The original base path passed to scanDirectory
   * @param relativePrefix - The relative path from basePath to the current directory
   * @param recursive - Whether to scan subdirectories
   */
  private scanDirectoryRecursive(
    absolutePath: string,
    basePath: string,
    relativePrefix: string,
    recursive: boolean
  ): DiscoveredFile[] {
    const discovered: DiscoveredFile[] = [];

    // Get directory entries
    const entries = this.fileSystem.listDirectory(absolutePath);

    for (const entry of entries) {
      if (entry.type === 'file') {
        // Classify the file by extension
        const fileType = classifyFileType(entry.name);

        // Only include image, font, and audio files
        if (fileType === 'image' || fileType === 'font' || fileType === 'audio') {
          // Compute relative path from base: prefix/filename or just filename
          const relativePath = relativePrefix
            ? `${relativePrefix}/${entry.name}`
            : entry.name;

          discovered.push({
            filename: entry.name,
            fullPath: entry.path,
            type: fileType,
            basePath: basePath,
            relativePath: relativePath,
          });
        }
      } else if (entry.type === 'directory' && recursive) {
        // Compute the new relative prefix for this subdirectory
        const newPrefix = relativePrefix
          ? `${relativePrefix}/${entry.name}`
          : entry.name;
        // Recursively scan subdirectories
        const subFiles = this.scanDirectoryRecursive(entry.path, basePath, newPrefix, true);
        discovered.push(...subFiles);
      }
    }

    return discovered;
  }

  /**
   * Get the MIME type for a file based on its extension.
   * Returns undefined for unrecognized extensions.
   *
   * @param path - The file path
   * @returns The MIME type or undefined
   */
  getMimeType(path: string): string | undefined {
    const filename = path.includes('/') ? path.split('/').pop()! : path;
    const lastDotIndex = filename.lastIndexOf('.');

    if (lastDotIndex <= 0) {
      return undefined;
    }

    const extension = filename.slice(lastDotIndex).toLowerCase();
    return MIME_TYPES[extension];
  }

  /**
   * Check if a path is an HTTP(S) URL.
   */
  private isHttpUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  /**
   * Load an asset from the filesystem or via HTTP URL.
   *
   * @param definition - The asset definition specifying name, path, and type
   * @returns Promise resolving to the loaded asset with data and optional metadata
   * @throws Error if file not found or cannot be read
   */
  async loadAsset(definition: AssetDefinition): Promise<LoadedAsset> {
    const { name, path } = definition;

    // Handle HTTP URLs separately
    if (this.isHttpUrl(path)) {
      return this.loadAssetFromUrl(name, path);
    }

    // Resolve filesystem path (absolute paths like /examples/canvas/images/ship.png work)
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

    // Convert Uint8Array to ArrayBuffer, handling both ArrayBuffer and SharedArrayBuffer
    const arrayBuffer = new ArrayBuffer(binaryData.byteLength);
    new Uint8Array(arrayBuffer).set(binaryData);

    // Build result with optional metadata
    const result: LoadedAsset = {
      name,
      data: arrayBuffer,
    };

    // Try to infer MIME type from extension
    const mimeType = this.getMimeType(path);
    if (mimeType) {
      result.mimeType = mimeType;
    }

    // Try to extract image dimensions (best effort, don't fail)
    const dimensions = this.tryExtractDimensions(binaryData);
    if (dimensions) {
      result.width = dimensions.width;
      result.height = dimensions.height;
    }

    return result;
  }

  /**
   * Load an asset from an HTTP URL.
   * Uses fetch API and browser's image loading for dimensions.
   *
   * @param name - The asset name
   * @param url - The URL to fetch from
   * @returns Promise resolving to the loaded asset
   * @throws Error if fetch fails
   */
  private async loadAssetFromUrl(name: string, url: string): Promise<LoadedAsset> {
    // Ensure fetch is available (browser or Node 18+)
    if (typeof fetch === 'undefined') {
      throw new Error('HTTP URL loading requires fetch API (browser environment)');
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Asset '${name}' not found: ${url} (HTTP ${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const binaryData = new Uint8Array(arrayBuffer);

    // Build result
    const result: LoadedAsset = {
      name,
      data: arrayBuffer,
    };

    // Try to get MIME type from response headers or extension
    const contentType = response.headers.get('content-type');
    if (contentType) {
      result.mimeType = contentType.split(';')[0].trim();
    } else {
      const mimeType = this.getMimeType(url);
      if (mimeType) {
        result.mimeType = mimeType;
      }
    }

    // Try to extract image dimensions (best effort)
    const dimensions = this.tryExtractDimensions(binaryData);
    if (dimensions) {
      result.width = dimensions.width;
      result.height = dimensions.height;
    }

    return result;
  }

  /**
   * Try to extract dimensions from image data using the image-size library.
   * Returns null if the data is not a recognized image format.
   *
   * @param data - The raw binary data
   * @returns The dimensions if extractable, or null
   */
  private tryExtractDimensions(
    data: Uint8Array
  ): { width: number; height: number } | null {
    try {
      const result = imageSize(data);

      if (result.width && result.height) {
        return { width: result.width, height: result.height };
      }

      return null;
    } catch {
      return null;
    }
  }
}
