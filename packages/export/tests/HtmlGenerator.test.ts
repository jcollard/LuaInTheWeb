import { describe, it, expect } from 'vitest'
import { HtmlGenerator } from '../src/HtmlGenerator'
import type { ProjectConfig, ExportOptions, CollectedFile, CollectedAsset } from '../src/types'
import { encodeBase64 } from '../src/base64'

function createConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    name: 'Test Project',
    main: 'main.lua',
    type: 'canvas',
    canvas: {
      width: 800,
      height: 600,
      worker_mode: 'postMessage',
    },
    ...overrides,
  }
}

function createOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
  return {
    ...overrides,
  }
}

describe('HtmlGenerator', () => {
  describe('generate', () => {
    it('should call generateCanvas for canvas type projects', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({ type: 'canvas' })
      const luaFiles: CollectedFile[] = [{ path: 'main.lua', content: 'print("hi")' }]
      const assets: CollectedAsset[] = []

      const html = generator.generate(config, luaFiles, assets)

      // Canvas-specific elements should be present
      expect(html).toContain('<canvas')
    })

    it('should call generateShell for shell type projects', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        type: 'shell',
        shell: { columns: 80, rows: 24 },
        canvas: undefined,
      })
      const luaFiles: CollectedFile[] = [{ path: 'main.lua', content: 'print("hi")' }]
      const assets: CollectedAsset[] = []

      const html = generator.generate(config, luaFiles, assets)

      // Shell-specific elements should be present
      expect(html).toContain('xterm')
    })
  })

  describe('generateCanvas', () => {
    it('should generate valid HTML document', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      const assets: CollectedAsset[] = []

      const html = generator.generateCanvas(config, luaFiles, assets)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html')
      expect(html).toContain('</html>')
      expect(html).toContain('<head>')
      expect(html).toContain('<body>')
    })

    it('should include project name in title', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({ name: 'My Cool Game' })
      const luaFiles: CollectedFile[] = []
      const assets: CollectedAsset[] = []

      const html = generator.generateCanvas(config, luaFiles, assets)

      expect(html).toContain('<title>My Cool Game</title>')
    })

    it('should include canvas element with correct dimensions', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        canvas: {
          width: 1024,
          height: 768,
        },
      })
      const luaFiles: CollectedFile[] = []
      const assets: CollectedAsset[] = []

      const html = generator.generateCanvas(config, luaFiles, assets)

      expect(html).toContain('width="1024"')
      expect(html).toContain('height="768"')
    })

    it('should embed Lua files as JSON', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig()
      const luaFiles: CollectedFile[] = [
        { path: 'main.lua', content: 'print("hello")' },
        { path: 'utils.lua', content: 'return {}' },
      ]
      const assets: CollectedAsset[] = []

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Lua files should be embedded as JSON
      expect(html).toContain('"main.lua"')
      expect(html).toContain('"utils.lua"')
      expect(html).toContain('print(\\"hello\\")')
    })

    it('should include asset manifest', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      const assets: CollectedAsset[] = [
        { path: 'player.png', data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' },
      ]

      const html = generator.generateCanvas(config, luaFiles, assets)

      expect(html).toContain('player.png')
      expect(html).toContain('image/png')
    })

    it('should apply custom background color', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        canvas: {
          width: 800,
          height: 600,
          background_color: '#123456',
        },
      })
      const luaFiles: CollectedFile[] = []
      const assets: CollectedAsset[] = []

      const html = generator.generateCanvas(config, luaFiles, assets)

      expect(html).toContain('#123456')
    })

    it('should use default background color when not specified', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        canvas: {
          width: 800,
          height: 600,
          // No background_color specified
        },
      })
      const luaFiles: CollectedFile[] = []
      const assets: CollectedAsset[] = []

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Default should be black
      expect(html).toContain('#000000')
    })

    it('should use default dimensions when canvas config is undefined', () => {
      const generator = new HtmlGenerator(createOptions())
      const config: ProjectConfig = {
        name: 'Test Project',
        main: 'main.lua',
        type: 'canvas',
        // No canvas config - should use defaults
      }
      const luaFiles: CollectedFile[] = []
      const assets: CollectedAsset[] = []

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Default dimensions: 800x600
      expect(html).toContain('width="800"')
      expect(html).toContain('height="600"')
      // Default background color
      expect(html).toContain('#000000')
    })
  })

  describe('generateShell', () => {
    it('should generate valid HTML document', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        type: 'shell',
        shell: { columns: 80, rows: 24 },
        canvas: undefined,
      })
      const luaFiles: CollectedFile[] = []

      const html = generator.generateShell(config, luaFiles)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html')
      expect(html).toContain('</html>')
    })

    it('should include project name in title', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        name: 'My Shell App',
        type: 'shell',
        shell: { columns: 80, rows: 24 },
        canvas: undefined,
      })
      const luaFiles: CollectedFile[] = []

      const html = generator.generateShell(config, luaFiles)

      expect(html).toContain('<title>My Shell App</title>')
    })

    it('should include terminal configuration', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        type: 'shell',
        shell: {
          columns: 120,
          rows: 40,
          font_family: 'monospace',
          font_size: 16,
        },
        canvas: undefined,
      })
      const luaFiles: CollectedFile[] = []

      const html = generator.generateShell(config, luaFiles)

      expect(html).toContain('120')
      expect(html).toContain('40')
    })

    it('should embed Lua files as JSON', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        type: 'shell',
        shell: { columns: 80, rows: 24 },
        canvas: undefined,
      })
      const luaFiles: CollectedFile[] = [{ path: 'main.lua', content: 'io.write("test")' }]

      const html = generator.generateShell(config, luaFiles)

      expect(html).toContain('"main.lua"')
      expect(html).toContain('io.write')
    })

    it('should use default values when shell config is undefined', () => {
      const generator = new HtmlGenerator(createOptions())
      const config: ProjectConfig = {
        name: 'Shell App',
        main: 'main.lua',
        type: 'shell',
        // No shell config - should use defaults
      }
      const luaFiles: CollectedFile[] = []

      const html = generator.generateShell(config, luaFiles)

      // Default terminal dimensions: 80x24
      expect(html).toContain('cols: 80')
      expect(html).toContain('rows: 24')
      // Default font settings
      expect(html).toContain('monospace')
      expect(html).toContain('fontSize: 14')
    })
  })

  describe('single-file mode', () => {
    it('should embed images as data URLs when singleFile is true', () => {
      const generator = new HtmlGenerator(createOptions({ singleFile: true }))
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      // PNG header bytes
      const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const assets: CollectedAsset[] = [
        { path: 'player.png', data: pngData, mimeType: 'image/png' },
      ]

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Should contain data URL with base64-encoded image
      const expectedBase64 = encodeBase64(pngData)
      expect(html).toContain(`data:image/png;base64,${expectedBase64}`)
    })

    it('should embed fonts as data URLs when singleFile is true', () => {
      const generator = new HtmlGenerator(createOptions({ singleFile: true }))
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      // TTF header bytes
      const fontData = new Uint8Array([0, 1, 0, 0])
      const assets: CollectedAsset[] = [
        { path: 'custom.ttf', data: fontData, mimeType: 'font/ttf' },
      ]

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Should contain data URL with base64-encoded font
      const expectedBase64 = encodeBase64(fontData)
      expect(html).toContain(`data:font/ttf;base64,${expectedBase64}`)
    })

    it('should embed audio as data URLs when singleFile is true', () => {
      const generator = new HtmlGenerator(createOptions({ singleFile: true }))
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      // MP3 header bytes
      const audioData = new Uint8Array([0xff, 0xfb, 0x90, 0x00])
      const assets: CollectedAsset[] = [
        { path: 'sounds/effect.mp3', data: audioData, mimeType: 'audio/mpeg' },
      ]

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Should contain data URL with base64-encoded audio
      const expectedBase64 = encodeBase64(audioData)
      expect(html).toContain(`data:audio/mpeg;base64,${expectedBase64}`)
    })

    it('should NOT embed assets as data URLs when singleFile is false', () => {
      const generator = new HtmlGenerator(createOptions({ singleFile: false }))
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const assets: CollectedAsset[] = [
        { path: 'player.png', data: pngData, mimeType: 'image/png' },
      ]

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Should NOT contain data URL
      expect(html).not.toContain('data:image/png;base64,')
      // Should reference assets folder path
      expect(html).toContain('assets/')
    })

    it('should NOT embed assets as data URLs when singleFile is undefined', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const assets: CollectedAsset[] = [
        { path: 'player.png', data: pngData, mimeType: 'image/png' },
      ]

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Should NOT contain data URL
      expect(html).not.toContain('data:image/png;base64,')
    })

    it('should handle multiple assets in single-file mode', () => {
      const generator = new HtmlGenerator(createOptions({ singleFile: true }))
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      const pngData = new Uint8Array([0x89, 0x50])
      const mp3Data = new Uint8Array([0xff, 0xfb])
      const assets: CollectedAsset[] = [
        { path: 'player.png', data: pngData, mimeType: 'image/png' },
        { path: 'sound.mp3', data: mp3Data, mimeType: 'audio/mpeg' },
      ]

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Both should be embedded
      expect(html).toContain(`data:image/png;base64,${encodeBase64(pngData)}`)
      expect(html).toContain(`data:audio/mpeg;base64,${encodeBase64(mp3Data)}`)
    })

    it('should handle empty assets in single-file mode', () => {
      const generator = new HtmlGenerator(createOptions({ singleFile: true }))
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      const assets: CollectedAsset[] = []

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Should still generate valid HTML
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('ASSET_MANIFEST')
    })

    it('should use dataUrl for image loading in single-file mode', () => {
      const generator = new HtmlGenerator(createOptions({ singleFile: true }))
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const assets: CollectedAsset[] = [
        { path: 'player.png', data: pngData, mimeType: 'image/png' },
      ]

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Image loading should use dataUrl fallback
      expect(html).toContain('assetPath.dataUrl || ')
    })

    it('should use dataUrl for font loading in single-file mode', () => {
      const generator = new HtmlGenerator(createOptions({ singleFile: true }))
      const config = createConfig()
      const luaFiles: CollectedFile[] = []
      const fontData = new Uint8Array([0, 1, 0, 0])
      const assets: CollectedAsset[] = [
        { path: 'custom.ttf', data: fontData, mimeType: 'font/ttf' },
      ]

      const html = generator.generateCanvas(config, luaFiles, assets)

      // Font loading should use dataUrl fallback
      expect(html).toContain('assetPath.dataUrl || ')
    })
  })

  describe('module resolution with init.lua fallback', () => {
    it('should generate __load_module with init.lua fallback logic in canvas export', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({ type: 'canvas' })
      const luaFiles: CollectedFile[] = [
        { path: 'main.lua', content: 'local player = require("player")' },
        { path: 'player/init.lua', content: 'return {}' },
      ]
      const assets: CollectedAsset[] = []

      const html = generator.generateCanvas(config, luaFiles, assets)

      // The __load_module function should contain init.lua fallback logic
      // It should try modulePath/init.lua when modulePath.lua is not found
      expect(html).toMatch(/initPath.*=.*\/init\.lua/)
    })

    it('should generate __load_module with init.lua fallback logic in shell export', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        type: 'shell',
        shell: { columns: 80, rows: 24 },
        canvas: undefined,
      })
      const luaFiles: CollectedFile[] = [
        { path: 'main.lua', content: 'local player = require("player")' },
        { path: 'player/init.lua', content: 'return {}' },
      ]

      const html = generator.generateShell(config, luaFiles)

      // The __load_module function should contain init.lua fallback logic
      expect(html).toMatch(/initPath.*=.*\/init\.lua/)
    })

    it('should embed init.lua files with correct path in LUA_MODULES', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({ type: 'canvas' })
      const luaFiles: CollectedFile[] = [
        { path: 'main.lua', content: 'local player = require("player")' },
        { path: 'player/init.lua', content: 'return { name = "player" }' },
      ]
      const assets: CollectedAsset[] = []

      const html = generator.generateCanvas(config, luaFiles, assets)

      // The file should be embedded with its full path
      expect(html).toContain('"player/init.lua"')
    })
  })

  describe('offline capability (no CDN URLs)', () => {
    it('should not import from CDN in canvas export', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({ type: 'canvas' })
      const luaFiles: CollectedFile[] = [{ path: 'main.lua', content: 'print("hi")' }]
      const assets: CollectedAsset[] = []

      const html = generator.generate(config, luaFiles, assets)

      // Should NOT import from CDN
      expect(html).not.toMatch(/import\s+.*from\s+['"]https:\/\/cdn\.jsdelivr\.net/)
      expect(html).not.toMatch(/import\s+.*from\s+['"]https:\/\/unpkg\.com/)
      // Should NOT load scripts from CDN
      expect(html).not.toMatch(/<script\s+src\s*=\s*['"]https:\/\/cdn\.jsdelivr\.net/)
      expect(html).not.toMatch(/<script\s+src\s*=\s*['"]https:\/\/unpkg\.com/)
      // Should NOT load stylesheets from CDN
      expect(html).not.toMatch(/<link\s+rel\s*=\s*['"]stylesheet['"]\s+href\s*=\s*['"]https:\/\/cdn\.jsdelivr\.net/)
    })

    it('should not import from CDN in shell export', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        type: 'shell',
        shell: { columns: 80, rows: 24 },
        canvas: undefined,
      })
      const luaFiles: CollectedFile[] = [{ path: 'main.lua', content: 'print("hi")' }]
      const assets: CollectedAsset[] = []

      const html = generator.generate(config, luaFiles, assets)

      // Should NOT import from CDN
      expect(html).not.toMatch(/import\s+.*from\s+['"]https:\/\/cdn\.jsdelivr\.net/)
      expect(html).not.toMatch(/import\s+.*from\s+['"]https:\/\/unpkg\.com/)
      // Should NOT load scripts from CDN
      expect(html).not.toMatch(/<script\s+src\s*=\s*['"]https:\/\/cdn\.jsdelivr\.net/)
      expect(html).not.toMatch(/<script\s+src\s*=\s*['"]https:\/\/unpkg\.com/)
      // Should NOT load stylesheets from CDN
      expect(html).not.toMatch(/<link\s+rel\s*=\s*['"]stylesheet['"]\s+href\s*=\s*['"]https:\/\/cdn\.jsdelivr\.net/)
    })

    it('should include bundled wasmoon in canvas export', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({ type: 'canvas' })
      const luaFiles: CollectedFile[] = [{ path: 'main.lua', content: 'print("hi")' }]
      const assets: CollectedAsset[] = []

      const html = generator.generate(config, luaFiles, assets)

      // Should contain inline wasmoon comment marker
      expect(html).toContain('Wasmoon Lua runtime (bundled with embedded WASM)')
      // Should contain LuaFactory (from wasmoon)
      expect(html).toContain('LuaFactory')
    })

    it('should include bundled wasmoon in shell export', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        type: 'shell',
        shell: { columns: 80, rows: 24 },
        canvas: undefined,
      })
      const luaFiles: CollectedFile[] = [{ path: 'main.lua', content: 'print("hi")' }]
      const assets: CollectedAsset[] = []

      const html = generator.generate(config, luaFiles, assets)

      // Should contain inline wasmoon comment marker
      expect(html).toContain('Wasmoon Lua runtime (bundled with embedded WASM)')
      // Should contain LuaFactory (from wasmoon)
      expect(html).toContain('LuaFactory')
    })

    it('should include bundled xterm.js in shell export', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        type: 'shell',
        shell: { columns: 80, rows: 24 },
        canvas: undefined,
      })
      const luaFiles: CollectedFile[] = [{ path: 'main.lua', content: 'print("hi")' }]
      const assets: CollectedAsset[] = []

      const html = generator.generate(config, luaFiles, assets)

      // Should contain inline xterm comment marker
      expect(html).toContain('xterm.js terminal emulator (bundled for offline use)')
      // Should contain xterm CSS comment marker
      expect(html).toContain('xterm.js CSS (bundled for offline use)')
    })
  })
})
