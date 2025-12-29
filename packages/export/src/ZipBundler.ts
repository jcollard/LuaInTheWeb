import * as JSZip from 'jszip'
import type { BundleContents } from './types'

/**
 * Options for bundle output.
 */
export interface BundleOptions {
  /** When true, return HTML blob instead of ZIP */
  singleFile?: boolean
}

/**
 * Creates ZIP files from bundle contents.
 *
 * Uses JSZip to generate downloadable ZIP archives
 * containing the HTML and assets.
 */
export class ZipBundler {
  /**
   * Create a ZIP file or HTML file from bundle contents.
   * @param contents - HTML, Lua files, and assets to bundle
   * @param options - Bundle options (singleFile mode)
   * @returns ZIP file or HTML file as a Blob
   */
  async bundle(contents: BundleContents, options: BundleOptions = {}): Promise<Blob> {
    // Single-file mode: return HTML directly without ZIP
    if (options.singleFile) {
      return new Blob([contents.html], { type: 'text/html' })
    }

    // Standard mode: create ZIP with assets folder
    const zip = new JSZip.default()

    // Add index.html
    zip.file('index.html', contents.html)

    // Add binary assets under assets/ folder
    for (const asset of contents.assets) {
      zip.file(`assets/${asset.path}`, asset.data)
    }

    // Generate ZIP as ArrayBuffer first, then wrap in Blob
    // This ensures compatibility across Node.js and browser environments
    const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })
    return new Blob([arrayBuffer], { type: 'application/zip' })
  }
}
