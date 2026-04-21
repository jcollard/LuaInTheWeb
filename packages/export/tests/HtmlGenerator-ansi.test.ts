import { describe, it, expect } from 'vitest'
import { HtmlGenerator } from '../src/HtmlGenerator'
import type { ProjectConfig, ExportOptions, CollectedFile, CollectedAsset } from '../src/types'

function createConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    name: 'Test Project',
    main: 'main.lua',
    type: 'ansi',
    ansi: { columns: 80, rows: 25, font_size: 16 },
    ...overrides,
  }
}

function createOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
  return {
    ...overrides,
  }
}

describe('HtmlGenerator - generateAnsi', () => {
  it('should dispatch to generateAnsi for ansi type projects', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = [{ path: 'main.lua', content: 'print("hi")' }]
    const assets: CollectedAsset[] = []

    const html = generator.generate(config, luaFiles, assets)

    expect(html).toContain('AnsiStandalone')
    expect(html).toContain('terminal-wrapper')
  })

  it('should generate valid HTML document', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })

  it('should include project name in title', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig({ name: 'My ANSI App' })
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('<title>My ANSI App</title>')
  })

  it('should include IBM VGA font face declaration', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('@font-face')
    expect(html).toContain('IBM VGA 8x16')
    expect(html).toContain('format("woff")')
  })

  it('should construct a PixelAnsiRenderer instead of xterm Terminal', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('new PixelAnsiRenderer(')
    // Bundled xterm.js code inside ANSI_INLINE_JS may contain the substrings
    // "new Terminal(" and "customGlyphs:" as part of its internal identifiers,
    // so we can't negative-assert on those globally. We assert instead that the
    // template does not itself instantiate those directly by checking for the
    // hand-written patterns that used to appear at the top level.
    expect(html).not.toContain('term.open(wrapper)')
    expect(html).not.toContain('term.loadAddon(')
  })

  it('exposes setFontFamily and setUseFontBlocks on the terminal handle', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('setFontFamily:')
    expect(html).toContain('setUseFontBlocks:')
  })

  it('should include ANSI bridge bundle', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('ANSI bridge (bundled from AnsiController + setupAnsiAPI)')
    expect(html).toContain('AnsiStandalone')
  })

  it('should include start overlay', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('start-overlay')
    expect(html).toContain('Click to Start')
  })

  it('should embed Lua files as JSON', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = [
      { path: 'main.lua', content: 'local ansi = require("ansi")' },
      { path: 'title.ansi.lua', content: 'return { layers = {} }' },
    ]

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('"main.lua"')
    expect(html).toContain('"title.ansi.lua"')
  })

  it('should use custom terminal dimensions', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig({
      ansi: { columns: 120, rows: 40, font_size: 12 },
    })
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('cols: 120')
    expect(html).toContain('rows: 40')
  })

  it('should use default values when ansi config is undefined', () => {
    const generator = new HtmlGenerator(createOptions())
    const config: ProjectConfig = {
      name: 'ANSI App',
      main: 'main.lua',
      type: 'ansi',
    }
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('cols: 80')
    expect(html).toContain('rows: 25')
  })

  it('should include wasmoon runtime', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('Wasmoon Lua runtime (bundled with embedded WASM)')
  })

  it('should include custom module loader for embedded files', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('__load_module')
    expect(html).toContain('custom_loader')
  })

  it('should set up setupAnsiAPI with file reader', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('setupAnsiAPI')
    expect(html).toContain('fileReader')
  })

  it('should include shell bridge globals for print support', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('__js_write')
    expect(html).toContain('__shell_get_width')
    expect(html).toContain('__shell_get_height')
  })

  it('should not import from CDN in ansi export', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = [{ path: 'main.lua', content: 'print("hi")' }]
    const assets: CollectedAsset[] = []

    const html = generator.generate(config, luaFiles, assets)

    expect(html).not.toMatch(/import\s+.*from\s+['"]https:\/\/cdn\.jsdelivr\.net/)
    expect(html).not.toMatch(/<script\s+src\s*=\s*['"]https:\/\/cdn\.jsdelivr\.net/)
  })

  it('should generate __load_module with init.lua and compound extension fallback', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = [
      { path: 'main.lua', content: 'local art = require("name.ansi")' },
      { path: 'name.ansi.lua', content: 'return {}' },
    ]

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('modulePath + ".lua"')
    expect(html).toMatch(/initPath.*=.*\/init\.lua/)
  })

  it('should construct the renderer with a theme for default colors', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('foreground: 0xAAAAAA')
    expect(html).toContain('background: 0x000000')
  })

  it('should default to integer scale mode', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('scale: "integer"')
    expect(html).toContain('applyScale')
    expect(html).toContain("window.addEventListener('resize', applyScale)")
  })

  it('should use configured scale mode', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig({
      ansi: { columns: 80, rows: 25, font_size: 16, scale: 'full' },
    })
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('scale: "full"')
  })

  it('should include fixed scale cases for 1x, 2x, 3x', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig({
      ansi: { columns: 80, rows: 25, font_size: 16, scale: '2x' },
    })
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('scale: "2x"')
    expect(html).toContain("case '1x':")
    expect(html).toContain("case '2x':")
    expect(html).toContain("case '3x':")
  })

  it('should scale via CSS transform on the renderer canvas', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain("renderer.canvas.style.transform = 'scale(' + newScale + ')'")
  })

  it('should not include CrtShader initialization when crt is disabled', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig({ ansi: { columns: 80, rows: 25, font_size: 16, crt: false } })
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).not.toContain('CRT_CONFIG')
  })

  it('should not include CSS crt-enabled class', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig({ ansi: { columns: 80, rows: 25, font_size: 16, crt: true } })
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).not.toContain('crt-enabled')
    expect(html).not.toContain('crt-flicker')
  })

  it('should initialize CrtShader when crt is enabled', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig({ ansi: { columns: 80, rows: 25, font_size: 16, crt: true } })
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('AnsiStandalone.CrtShader')
    expect(html).toContain('AnsiStandalone.CRT_DEFAULTS')
    expect(html).toContain('CRT_CONFIG')
    expect(html).toContain('crtShader.enable(CRT_CONFIG)')
  })

  it('should use CRT_DEFAULTS fallback for unset CRT parameters', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig({ ansi: { columns: 80, rows: 25, font_size: 16, crt: true } })
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('scanlineIntensity: CRT_DEFAULTS.scanlineIntensity')
    expect(html).toContain('curvature: CRT_DEFAULTS.curvature')
  })

  it('should use literal values for explicitly set CRT parameters', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig({
      ansi: { columns: 80, rows: 25, font_size: 16, crt: true, crt_scanlineIntensity: 0.8, crt_curvature: 0.2 },
    })
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('scanlineIntensity: 0.8')
    expect(html).toContain('curvature: 0.2')
  })

  it('should include setCrt handler using CrtShader', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('setCrt:')
    expect(html).toContain('crtShader.disable()')
    expect(html).not.toContain('crt-enabled')
  })
})
