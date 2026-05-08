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
    // Default bitmap family is the WOFF-backed `Web IBM VGA 8x16`.
    expect(html).toContain('Web IBM VGA 8x16')
    expect(html).toContain('format("woff")')
  })

  it('emits one @font-face rule per entry in ANSI_FONT_DATA, each with an inline data URL', async () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    // ANSI_FONT_DATA is the single source of truth for which WOFFs the
    // export bundles. Verify every registered font makes it into the
    // HTML @font-face block (not just the default IBM VGA 8×16).
    const { ANSI_FONT_DATA } = await import('@lua-learning/lua-runtime')
    expect(ANSI_FONT_DATA.length).toBeGreaterThan(0)

    for (const entry of ANSI_FONT_DATA) {
      // Family name must appear inside an @font-face rule.
      const familyRule = `font-family: "${entry.fontFamily}"`
      expect(html, `missing @font-face family for ${entry.id}`).toContain(familyRule)
      // And the matching base64 data URL must be inlined — no external fetches
      // permitted in the standalone export.
      expect(html, `missing inline data URL for ${entry.id}`).toContain(entry.dataUrl)
    }
  })

  it('should include xterm.js + CanvasAddon combined bundle', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('xterm.js + CanvasAddon')
    expect(html).toContain('shared module context')
  })

  it('should load CanvasAddon after terminal.open', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('new CanvasAddon()')
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

    // The wrapper handle seeds lastCols / lastRows from the config so the
    // initial buildPixelHandle/buildXtermHandle call constructs at the right size.
    expect(html).toContain('let lastCols = 120;')
    expect(html).toContain('let lastRows = 40;')
    // Font size is interpolated as the FONT_SIZE constant used by both factories.
    expect(html).toContain('const FONT_SIZE = 12;')
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

    expect(html).toContain('let lastCols = 80;')
    expect(html).toContain('let lastRows = 25;')
    expect(html).toContain('const FONT_SIZE = 16;')
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

  it('should configure xterm.js with correct display settings', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('disableStdin: true')
    expect(html).toContain('scrollback: 0')
    expect(html).toContain('cursorBlink: false')
  })

  it('should default to integer scale mode', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    expect(html).toContain('scale: "integer"')
    expect(html).toContain('applyScale')
    // After the chooser refactor the listener delegates to whichever inner
    // handle is currently mounted; assert the listener is wired and routes
    // to inner.applyScale.
    expect(html).toContain("window.addEventListener('resize',")
    expect(html).toContain('inner.applyScale')
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

  it('should scale via terminal.options.fontSize', () => {
    const generator = new HtmlGenerator(createOptions())
    const config = createConfig()
    const luaFiles: CollectedFile[] = []

    const html = generator.generateAnsi(config, luaFiles, [])

    // The xterm factory scales by mutating term.options.fontSize using the
    // currently-active font's cell height (so per-screen font swaps scale correctly).
    expect(html).toContain('term.options.fontSize = currentFontEntryCellH * newScale')
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
    // The wrapper now drives CRT activation via handle.setCrt so it persists
    // across pixel/xterm renderer swaps. The shader itself is enabled inside applyCrt.
    expect(html).toContain('handle.setCrt(true, undefined, CRT_CONFIG)')
    expect(html).toContain('crtShader.enable(config)')
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
    expect(html).toContain('destroyCrt')
    expect(html).not.toContain('crt-enabled')
  })

  describe('use_font_blocks override', () => {
    it('emits PROJECT_USE_FONT_BLOCKS_OVERRIDE = null when omitted (auto / per-screen)', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig()
      const html = generator.generateAnsi(config, [], [])

      expect(html).toContain('const PROJECT_USE_FONT_BLOCKS_OVERRIDE = null;')
    })

    it('emits PROJECT_USE_FONT_BLOCKS_OVERRIDE = true when forced to pixel', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        ansi: { columns: 80, rows: 25, font_size: 16, use_font_blocks: true },
      })
      const html = generator.generateAnsi(config, [], [])

      expect(html).toContain('const PROJECT_USE_FONT_BLOCKS_OVERRIDE = true;')
    })

    it('emits PROJECT_USE_FONT_BLOCKS_OVERRIDE = false when forced to xterm', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig({
        ansi: { columns: 80, rows: 25, font_size: 16, use_font_blocks: false },
      })
      const html = generator.generateAnsi(config, [], [])

      expect(html).toContain('const PROJECT_USE_FONT_BLOCKS_OVERRIDE = false;')
    })

    it('emits both buildPixelHandle and buildXtermHandle factories regardless of override', () => {
      // Both factories must be reachable so the runtime can swap renderers
      // when AnsiController fires setUseFontBlocks per-screen.
      for (const override of [undefined, true, false] as const) {
        const generator = new HtmlGenerator(createOptions())
        const config = createConfig({
          ansi: {
            columns: 80,
            rows: 25,
            font_size: 16,
            ...(override === undefined ? {} : { use_font_blocks: override }),
          },
        })
        const html = generator.generateAnsi(config, [], [])

        expect(html, `pixel factory missing for override=${String(override)}`).toContain(
          'function buildPixelHandle('
        )
        expect(html, `xterm factory missing for override=${String(override)}`).toContain(
          'async function buildXtermHandle('
        )
      }
    })

    it('references the bundled PixelAnsiRenderer global so the pixel path can construct', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig()
      const html = generator.generateAnsi(config, [], [])

      // The ansi-inline bundle exposes PixelAnsiRenderer on globalThis.AnsiStandalone.
      // The template must read it from there for the pixel factory to work.
      expect(html).toContain('globalThis.AnsiStandalone.PixelAnsiRenderer')
    })

    it('exposes setUseFontBlocks on the wrapper handle (not a no-op stub)', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig()
      const html = generator.generateAnsi(config, [], [])

      // The wrapper's setUseFontBlocks must call resolveUsePixel + rebuild
      // so AnsiController.applyFontSettings actually swaps renderers.
      expect(html).toContain('setUseFontBlocks: async')
      expect(html).toContain('resolveUsePixel(flag)')
      expect(html).toContain('rebuild(target)')
    })

    it('resolveUsePixel honors the override over the per-screen request', () => {
      const generator = new HtmlGenerator(createOptions())
      const config = createConfig()
      const html = generator.generateAnsi(config, [], [])

      // resolveUsePixel must short-circuit on === true / === false
      // before falling through to the requested per-screen value.
      expect(html).toContain('PROJECT_USE_FONT_BLOCKS_OVERRIDE === true')
      expect(html).toContain('PROJECT_USE_FONT_BLOCKS_OVERRIDE === false')
    })
  })
})
