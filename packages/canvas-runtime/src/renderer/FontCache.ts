/**
 * Cache for storing loaded FontFace objects by asset name.
 * Used by the canvas to efficiently use preloaded custom fonts.
 */
export class FontCache {
  private cache: Map<string, FontFace>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Store a FontFace in the cache by name.
   * @param name - The asset name to store the font under
   * @param font - The FontFace to store
   */
  set(name: string, font: FontFace): void {
    this.cache.set(name, font);
  }

  /**
   * Retrieve a FontFace from the cache by name.
   * @param name - The asset name to look up
   * @returns The stored FontFace, or undefined if not found
   */
  get(name: string): FontFace | undefined {
    return this.cache.get(name);
  }

  /**
   * Check if a font exists in the cache.
   * @param name - The asset name to check
   * @returns true if the asset exists, false otherwise
   */
  has(name: string): boolean {
    return this.cache.has(name);
  }

  /**
   * Get all loaded font names.
   * @returns Array of asset names that have been loaded
   */
  getLoadedFonts(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Remove all fonts from the cache.
   */
  clear(): void {
    this.cache.clear();
  }
}
