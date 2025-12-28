import { describe, it, expect } from 'vitest'
import { HtmlGenerator } from '../src/HtmlGenerator'
import type { ProjectConfig, ExportOptions, CollectedFile, CollectedAsset } from '../src/types'

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
    webWorkers: false,
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
})
