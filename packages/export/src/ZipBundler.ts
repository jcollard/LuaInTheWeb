import * as JSZip from 'jszip'
import type { BundleContents } from './types'

/**
 * Creates ZIP files from bundle contents.
 *
 * Uses JSZip to generate downloadable ZIP archives
 * containing the HTML and assets.
 */
export class ZipBundler {
  /**
   * Create a ZIP file from bundle contents.
   * @param contents - HTML, Lua files, and assets to bundle
   * @returns ZIP file as a Blob
   */
  async bundle(contents: BundleContents): Promise<Blob> {
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
