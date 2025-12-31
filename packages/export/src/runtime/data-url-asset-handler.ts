/**
 * Asset handler for data URL embedded assets.
 *
 * Used by HtmlGenerator for single-file exports where assets
 * are embedded as base64 data URLs.
 */

import type {
  AssetEntry,
  AssetHandler,
  LoadedImage,
  LoadedFont,
} from './canvas-bridge-types.js'

/**
 * Asset handler that loads assets from embedded data URLs or fetches from assets folder.
 */
export class DataUrlAssetHandler implements AssetHandler {
  private loadedImages = new Map<string, LoadedImage>()
  private loadedFonts = new Map<string, LoadedFont>()
  private assetManifest: AssetEntry[]
  private assetErrors: string[] = []
  private fontCounter = 0

  constructor(assetManifest: AssetEntry[]) {
    this.assetManifest = assetManifest
  }

  /**
   * Load an image from the asset manifest.
   */
  async loadImage(name: string, filename: string): Promise<LoadedImage | null> {
    const assetPath = this.assetManifest.find((a) => a.path.endsWith(filename))
    if (!assetPath) {
      this.assetErrors.push(`Image not found: ${filename}`)
      return null
    }

    try {
      const img = new Image()
      const loadPromise = new Promise<LoadedImage>((resolve, reject) => {
        img.onload = () => {
          const loaded: LoadedImage = {
            img,
            width: img.naturalWidth,
            height: img.naturalHeight,
          }
          this.loadedImages.set(name, loaded)
          resolve(loaded)
        }
        img.onerror = () => reject(new Error(`Failed to load image: ${filename}`))
      })

      // Use data URL if available, otherwise fetch from assets folder
      if (assetPath.dataUrl) {
        img.src = assetPath.dataUrl
      } else {
        img.src = 'assets/' + assetPath.path
      }

      return await loadPromise
    } catch (err) {
      this.assetErrors.push(`Failed to load image ${filename}: ${err}`)
      return null
    }
  }

  /**
   * Load a font from the asset manifest.
   */
  async loadFont(name: string, filename: string): Promise<LoadedFont | null> {
    const assetPath = this.assetManifest.find((a) => a.path.endsWith(filename))
    if (!assetPath) {
      this.assetErrors.push(`Font not found: ${filename}`)
      return null
    }

    try {
      // Generate a unique font family name
      const fontFamily = `CustomFont_${this.fontCounter++}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`

      // Get font source (data URL or file URL)
      const fontSrc = assetPath.dataUrl
        ? assetPath.dataUrl
        : 'assets/' + assetPath.path

      // Load font using FontFace API
      const fontFace = new FontFace(fontFamily, `url(${fontSrc})`)
      await fontFace.load()

      // Add to document fonts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(document.fonts as any).add(fontFace)

      const loaded: LoadedFont = { family: fontFamily }
      this.loadedFonts.set(name, loaded)
      return loaded
    } catch (err) {
      this.assetErrors.push(`Failed to load font ${filename}: ${err}`)
      return null
    }
  }

  /**
   * Get a loaded image by name.
   */
  getImage(name: string): LoadedImage | null {
    return this.loadedImages.get(name) ?? null
  }

  /**
   * Get a loaded font by name.
   */
  getFont(name: string): LoadedFont | null {
    return this.loadedFonts.get(name) ?? null
  }

  /**
   * Translate font family name.
   * Returns the custom font family name if the font was loaded,
   * otherwise returns the original name.
   */
  translateFontFamily(family: string): string {
    const fontData = this.loadedFonts.get(family)
    if (fontData && fontData.family) {
      return fontData.family
    }
    return family
  }

  /**
   * Get any asset loading errors that occurred.
   */
  getErrors(): string[] {
    return [...this.assetErrors]
  }

  /**
   * Get the loaded images map (for drawing operations).
   */
  getLoadedImagesMap(): Map<string, LoadedImage> {
    return this.loadedImages
  }
}
