/**
 * Type for images that can be drawn on a canvas.
 * Includes HTMLImageElement (from <img> tags) and ImageBitmap (from createImageBitmap).
 */
export type CachedImage = HTMLImageElement | ImageBitmap;

/**
 * Cache for storing loaded images by asset name.
 * Used by the canvas renderer to efficiently draw preloaded images.
 * Supports both HTMLImageElement and ImageBitmap.
 */
export class ImageCache {
  private cache: Map<string, CachedImage>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Store an image in the cache by name.
   * @param name - The asset name to store the image under
   * @param image - The HTMLImageElement or ImageBitmap to store
   */
  set(name: string, image: CachedImage): void {
    this.cache.set(name, image);
  }

  /**
   * Retrieve an image from the cache by name.
   * @param name - The asset name to look up
   * @returns The stored image, or undefined if not found
   */
  get(name: string): CachedImage | undefined {
    return this.cache.get(name);
  }

  /**
   * Check if an image exists in the cache.
   * @param name - The asset name to check
   * @returns true if the asset exists, false otherwise
   */
  has(name: string): boolean {
    return this.cache.has(name);
  }

  /**
   * Remove all images from the cache.
   */
  clear(): void {
    this.cache.clear();
  }
}
