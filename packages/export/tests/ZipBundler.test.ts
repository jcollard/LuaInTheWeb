import { describe, it, expect } from 'vitest'
import * as JSZipModule from 'jszip'
import { ZipBundler } from '../src/ZipBundler'
import type { BundleContents } from '../src/types'

const JSZip = JSZipModule.default

// Helper to convert Blob to ArrayBuffer for JSZip loading in Node.js
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer()
}

describe('ZipBundler', () => {
  describe('bundle', () => {
    it('should create a valid ZIP blob', async () => {
      const bundler = new ZipBundler()
      const contents: BundleContents = {
        html: '<!DOCTYPE html><html></html>',
        luaFiles: [],
        assets: [],
      }

      const blob = await bundler.bundle(contents)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/zip')
    })

    it('should include index.html in the ZIP', async () => {
      const bundler = new ZipBundler()
      const contents: BundleContents = {
        html: '<!DOCTYPE html><html><body>Test</body></html>',
        luaFiles: [],
        assets: [],
      }

      const blob = await bundler.bundle(contents)
      const arrayBuffer = await blobToArrayBuffer(blob)
      const zip = await JSZip.loadAsync(arrayBuffer)

      expect(zip.file('index.html')).not.toBeNull()
      const html = await zip.file('index.html')!.async('string')
      expect(html).toBe('<!DOCTYPE html><html><body>Test</body></html>')
    })

    it('should include binary assets in assets/ folder', async () => {
      const bundler = new ZipBundler()
      const contents: BundleContents = {
        html: '<html></html>',
        luaFiles: [],
        assets: [
          {
            path: 'images/player.png',
            data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
            mimeType: 'image/png',
          },
        ],
      }

      const blob = await bundler.bundle(contents)
      const arrayBuffer = await blobToArrayBuffer(blob)
      const zip = await JSZip.loadAsync(arrayBuffer)

      expect(zip.file('assets/images/player.png')).not.toBeNull()
      const data = await zip.file('assets/images/player.png')!.async('uint8array')
      expect(data).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))
    })

    it('should include multiple assets', async () => {
      const bundler = new ZipBundler()
      const contents: BundleContents = {
        html: '<html></html>',
        luaFiles: [],
        assets: [
          { path: 'a.png', data: new Uint8Array([1]), mimeType: 'image/png' },
          { path: 'b.png', data: new Uint8Array([2]), mimeType: 'image/png' },
          { path: 'c.png', data: new Uint8Array([3]), mimeType: 'image/png' },
        ],
      }

      const blob = await bundler.bundle(contents)
      const arrayBuffer = await blobToArrayBuffer(blob)
      const zip = await JSZip.loadAsync(arrayBuffer)

      expect(zip.file('assets/a.png')).not.toBeNull()
      expect(zip.file('assets/b.png')).not.toBeNull()
      expect(zip.file('assets/c.png')).not.toBeNull()
    })

    it('should handle empty contents', async () => {
      const bundler = new ZipBundler()
      const contents: BundleContents = {
        html: '',
        luaFiles: [],
        assets: [],
      }

      const blob = await bundler.bundle(contents)
      const arrayBuffer = await blobToArrayBuffer(blob)
      const zip = await JSZip.loadAsync(arrayBuffer)

      expect(zip.file('index.html')).not.toBeNull()
      const html = await zip.file('index.html')!.async('string')
      expect(html).toBe('')
    })

    it('should create valid ZIP that can be extracted', async () => {
      const bundler = new ZipBundler()
      const contents: BundleContents = {
        html: '<html>content</html>',
        luaFiles: [{ path: 'main.lua', content: 'print("hello")' }],
        assets: [
          { path: 'test.png', data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' },
        ],
      }

      const blob = await bundler.bundle(contents)
      const arrayBuffer = await blobToArrayBuffer(blob)
      const zip = await JSZip.loadAsync(arrayBuffer)

      // Check all expected files are present
      const files = Object.keys(zip.files)
      expect(files).toContain('index.html')
      expect(files).toContain('assets/test.png')
    })
  })
})
