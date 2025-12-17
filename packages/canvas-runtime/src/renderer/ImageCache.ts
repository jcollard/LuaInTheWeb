/**
 * Cache for storing loaded HTMLImageElement instances by asset name.
 * Used by the canvas renderer to efficiently draw preloaded images.
 */
export class ImageCache {
  private cache: Map<string, HTMLImageElement>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Store an image in the cache by name.
   * @param name - The asset name to store the image under
   * @param image - The HTMLImageElement to store
   */
  set(name: string, image: HTMLImageElement): void {
    this.cache.set(name, image);
  }

  /**
   * Retrieve an image from the cache by name.
   * @param name - The asset name to look up
   * @returns The stored HTMLImageElement, or undefined if not found
   */
  get(name: string): HTMLImageElement | undefined {
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
