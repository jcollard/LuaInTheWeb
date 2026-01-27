import type { ProjectConfig, ExportOptions, CollectedFile, CollectedAsset } from './types'
import { shellLuaCode } from './runtime'
import { CANVAS_INLINE_JS } from './runtime/canvas-inline.generated'
import {
  AUDIO_INLINE_JS,
  WASMOON_INLINE_JS,
  XTERM_INLINE_JS,
  XTERM_INLINE_CSS,
} from '@lua-learning/lua-runtime'
import { toDataUrl } from './base64'

/**
 * Generates standalone HTML files for exported projects.
 *
 * Creates self-contained HTML with embedded Lua runtime,
 * canvas/shell API, and project code.
 */
export class HtmlGenerator {
  private readonly options: ExportOptions

  constructor(options: ExportOptions) {
    this.options = options
  }

  /**
   * Escape Lua code for safe embedding in JavaScript string.
   * Handles backticks, backslashes, and template literal special chars.
   */
  private escapeLuaForJs(code: string): string {
    return code
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
  }

  /**
   * Generate CSS for canvas scaling mode.
   */
  private generateScaleCss(scale: 'full' | 'fit' | '1x', bgColor: string): string {
    const baseCss = `
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background-color: ${bgColor};
    }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    canvas {
      display: block;
      image-rendering: pixelated;
    }`

    switch (scale) {
      case 'full':
      case 'fit':
        // Both use JS for scaling, just need overflow hidden for full
        return `${baseCss}
    html, body {
      height: 100%;
      overflow: hidden;
    }`

      case '1x':
        // Native size with scrollbars
        return `${baseCss}
    body {
      overflow: auto;
    }`

      default:
        return baseCss
    }
  }

  /**
   * Generate JavaScript for canvas scaling.
   */
  private generateScaleJs(scale: 'full' | 'fit' | '1x', width: number, height: number): string {
    if (scale === '1x') {
      return '' // No scaling needed
    }

    const scaleUp = scale === 'full' ? 'true' : 'false'

    return `
    // Canvas scaling
    const NATIVE_WIDTH = ${width};
    const NATIVE_HEIGHT = ${height};
    const SCALE_UP = ${scaleUp};

    function resizeCanvas() {
      const canvas = document.getElementById('game-canvas');
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const aspectRatio = NATIVE_WIDTH / NATIVE_HEIGHT;

      let displayWidth, displayHeight;

      if (windowWidth / windowHeight > aspectRatio) {
        // Window is wider than canvas aspect ratio
        displayHeight = SCALE_UP ? windowHeight : Math.min(windowHeight, NATIVE_HEIGHT);
        displayWidth = displayHeight * aspectRatio;
      } else {
        // Window is taller than canvas aspect ratio
        displayWidth = SCALE_UP ? windowWidth : Math.min(windowWidth, NATIVE_WIDTH);
        displayHeight = displayWidth / aspectRatio;
      }

      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
`
  }

  /**
   * Generate HTML for a canvas project.
   * @param config - Project configuration
   * @param luaFiles - Collected Lua source files
   * @param assets - Collected binary assets
   * @returns Generated HTML string
   */
  generateCanvas(
    config: ProjectConfig,
    luaFiles: CollectedFile[],
    assets: CollectedAsset[]
  ): string {
    const width = config.canvas?.width ?? 800
    const height = config.canvas?.height ?? 600
    const bgColor = config.canvas?.background_color ?? '#000000'
    const scale = config.canvas?.scale ?? 'full'

    const luaModules = this.serializeLuaFiles(luaFiles)
    const assetManifest = this.options.singleFile
      ? this.serializeAssetsWithData(assets)
      : this.serializeAssets(assets)
    const scaleCss = this.generateScaleCss(scale, bgColor)
    const scaleJs = this.generateScaleJs(scale, width, height)

    // Stryker disable all: HTML template - mutations to string literals don't affect behavior
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(config.name)}</title>
  <style>${scaleCss}
  </style>
</head>
<body>
  <canvas id="game-canvas" width="${width}" height="${height}"></canvas>
  <script>${scaleJs}
  </script>
  <script>
    // Wasmoon Lua runtime (bundled with embedded WASM)
    ${WASMOON_INLINE_JS}
  </script>
  <script>
    // Canvas bridge (bundled from canvas-standalone.ts)
    ${CANVAS_INLINE_JS}
  </script>
  <script type="module">
    // Lua module map
    const LUA_MODULES = ${luaModules};

    // Asset manifest
    const ASSET_MANIFEST = ${assetManifest};

    // Canvas Lua API code (from bundled canvas-standalone)
    const CANVAS_LUA_CODE = globalThis.canvasLuaCode;

    // HC collision detection library code (from bundled canvas-standalone)
    const HC_LUA_CODE = globalThis.hcLuaCode;

    // LocalStorage library code (from bundled canvas-standalone)
    const LOCALSTORAGE_LUA_CODE = globalThis.localStorageLuaCode;

    // Project configuration
    const PROJECT_CONFIG = {
      name: ${JSON.stringify(config.name)},
      main: ${JSON.stringify(config.main)},
      width: ${width},
      height: ${height}
    };

    // Get canvas element
    const gameCanvas = document.getElementById('game-canvas');

    // Create runtime state using bundled function
    const state = globalThis.createCanvasRuntimeState(gameCanvas);

    // Set up input listeners using bundled function
    globalThis.setupInputListeners(state);

    // Initialize Lua runtime
    async function initLua() {
      try {
        const factory = new LuaFactory();
        const engine = await factory.createEngine();

        // Set up canvas bridge using bundled function
        // This registers all canvas bindings including stub asset handlers
        globalThis.setupCanvasBridge(engine, state);

        // === ASSET MANAGEMENT OVERRIDES ===
        // Override asset functions with ASSET_MANIFEST-aware implementations
        const loadedImages = new Map();
        const loadedFonts = new Map();
        const assetErrors = [];

        // Helper to extract asset name from string or handle
        function extractAssetName(nameOrHandle) {
          if (typeof nameOrHandle === 'string') return nameOrHandle;
          if (typeof nameOrHandle === 'object' && nameOrHandle !== null && '_name' in nameOrHandle) {
            return nameOrHandle._name;
          }
          throw new Error('Invalid asset reference: expected string name or asset handle');
        }

        // Helper to translate font family names
        function translateFontFamily(family) {
          const fontData = loadedFonts.get(family);
          if (fontData && fontData.family) {
            return fontData.family;
          }
          return family;
        }

        engine.global.set('__canvas_assets_addPath', (path) => {
          console.log('Asset path registered:', path);
        });

        engine.global.set('__canvas_assets_loadImage', (name, filename) => {
          const assetPath = ASSET_MANIFEST.find(a => a.path.endsWith(filename));
          if (!assetPath) {
            const err = 'Image file \\'' + filename + '\\' not found in exported assets';
            console.error(err);
            assetErrors.push(err);
            return { _type: 'image', _name: name, _file: filename, _error: err };
          }

          const img = new Image();
          const loadPromise = new Promise((resolve, reject) => {
            img.onload = () => {
              loadedImages.set(name, { img, width: img.naturalWidth, height: img.naturalHeight });
              console.log('Loaded image:', name, img.naturalWidth + 'x' + img.naturalHeight);
              resolve();
            };
            img.onerror = () => {
              const err = 'Failed to load image: ' + filename;
              console.error(err);
              assetErrors.push(err);
              reject(new Error(err));
            };
          });
          img.src = assetPath.dataUrl || ('assets/' + assetPath.path);
          loadedImages.set(name, { img, width: 0, height: 0, loading: loadPromise });
          return { _type: 'image', _name: name, _file: filename };
        });

        engine.global.set('__canvas_assets_loadFont', (name, filename) => {
          const assetPath = ASSET_MANIFEST.find(a => a.path.endsWith(filename));
          if (!assetPath) {
            const err = 'Font file \\'' + filename + '\\' not found in exported assets';
            console.error(err);
            assetErrors.push(err);
            return { _type: 'font', _name: name, _file: filename, _error: err };
          }

          const fontFamily = 'CustomFont_' + name.replace(/[^a-zA-Z0-9]/g, '_');
          const font = new FontFace(fontFamily, 'url(' + (assetPath.dataUrl || ('assets/' + assetPath.path)) + ')');
          font.load().then(() => {
            document.fonts.add(font);
            loadedFonts.set(name, { family: fontFamily });
            console.log('Loaded font:', name, 'as', fontFamily);
          }).catch((err) => {
            const errMsg = 'Failed to load font: ' + filename + ' - ' + err.message;
            console.error(errMsg);
            assetErrors.push(errMsg);
          });
          loadedFonts.set(name, { family: fontFamily });
          return { _type: 'font', _name: name, _file: filename };
        });

        engine.global.set('__canvas_assets_getWidth', (nameOrHandle) => {
          const name = extractAssetName(nameOrHandle);
          const asset = loadedImages.get(name);
          if (!asset) { console.error('Unknown image asset:', name); return 0; }
          return asset.width;
        });

        engine.global.set('__canvas_assets_getHeight', (nameOrHandle) => {
          const name = extractAssetName(nameOrHandle);
          const asset = loadedImages.get(name);
          if (!asset) { console.error('Unknown image asset:', name); return 0; }
          return asset.height;
        });

        engine.global.set('__canvas_drawImage', (nameOrHandle, x, y, width, height, sx, sy, sw, sh) => {
          const name = extractAssetName(nameOrHandle);
          const asset = loadedImages.get(name);
          if (!asset) { console.error('Unknown image asset for drawing:', name); return; }
          if (!asset.img.complete || asset.img.naturalWidth === 0) { return; }
          try {
            const hasSrcRect = sx != null && sy != null && sw != null && sh != null;
            const hasDestSize = width != null && height != null;
            if (hasSrcRect && hasDestSize) {
              state.ctx.drawImage(asset.img, sx, sy, sw, sh, x, y, width, height);
            } else if (hasDestSize) {
              state.ctx.drawImage(asset.img, x, y, width, height);
            } else {
              state.ctx.drawImage(asset.img, x, y);
            }
          } catch (e) { console.error('Error drawing image:', name, e); }
        });

        // Override font styling to use custom font translation
        engine.global.set('__canvas_setFontSize', (size) => {
          state.currentFontSize = size;
          state.ctx.font = size + 'px ' + translateFontFamily(state.currentFontFamily);
        });
        engine.global.set('__canvas_setFontFamily', (family) => {
          state.currentFontFamily = family;
          state.ctx.font = state.currentFontSize + 'px ' + translateFontFamily(family);
        });
        engine.global.set('__canvas_text', (x, y, text, fontSize, fontFamily, maxWidth) => {
          const savedFont = state.ctx.font;
          if (fontSize || fontFamily) {
            const size = fontSize ?? state.currentFontSize;
            const family = translateFontFamily(fontFamily ?? state.currentFontFamily);
            state.ctx.font = size + 'px ' + family;
          }
          if (maxWidth) { state.ctx.fillText(text, x, y, maxWidth); } else { state.ctx.fillText(text, x, y); }
          state.ctx.font = savedFont;
        });
        engine.global.set('__canvas_strokeText', (x, y, text, fontSize, fontFamily, maxWidth) => {
          const savedFont = state.ctx.font;
          if (fontSize || fontFamily) {
            state.ctx.font = (fontSize ?? state.currentFontSize) + 'px ' + translateFontFamily(fontFamily ?? state.currentFontFamily);
          }
          if (maxWidth) { state.ctx.strokeText(text, x, y, maxWidth); } else { state.ctx.strokeText(text, x, y); }
          state.ctx.font = savedFont;
        });

        // === AUDIO API (override with ASSET_MANIFEST-aware version) ===
        ${AUDIO_INLINE_JS}
        globalThis.setupAudioBridge(engine, state, ASSET_MANIFEST);

        // Set up custom require to load from embedded modules
        engine.global.set('__load_module', (modulePath) => {
          let filePath = modulePath;
          if (!filePath.endsWith('.lua')) {
            filePath = modulePath.replace(/[.]/g, '/') + '.lua';
          }
          let code = LUA_MODULES[filePath];
          // Fallback to init.lua if direct file not found (standard Lua behavior)
          if (!code && !modulePath.endsWith('.lua')) {
            const initPath = modulePath.replace(/[.]/g, '/') + '/init.lua';
            code = LUA_MODULES[initPath];
          }
          if (!code) {
            throw new Error('module not found: ' + modulePath);
          }
          return code;
        });

        // Install custom package.loaders
        await engine.doString(
          "local function custom_loader(modulename) " +
          "local ok, code = pcall(__load_module, modulename) " +
          "if ok and code then " +
          "local fn, err = load(code, modulename) " +
          "if fn then return fn end " +
          "return '\\\\n\\\\terror loading: ' .. tostring(err) " +
          "end " +
          "return '\\\\n\\\\tno embedded module' " +
          "end " +
          "if package.loaders then " +
          "table.insert(package.loaders, 2, custom_loader) " +
          "elseif package.searchers then " +
          "table.insert(package.searchers, 2, custom_loader) " +
          "end"
        );

        // Execute the bundled canvas Lua API code
        await engine.doString(CANVAS_LUA_CODE);

        // Register HC collision detection library as a preloadable module
        if (HC_LUA_CODE) {
          await engine.doString(
            "package.preload['hc'] = function() " + HC_LUA_CODE + " end"
          );
        }

        // Register localStorage library as a preloadable module
        if (LOCALSTORAGE_LUA_CODE) {
          await engine.doString(
            "package.preload['localstorage'] = function() " + LOCALSTORAGE_LUA_CODE + " end"
          );
        }

        // Get main module code
        const mainCode = LUA_MODULES[PROJECT_CONFIG.main];
        if (!mainCode) {
          console.error('Error: Main file not found:', PROJECT_CONFIG.main);
          return;
        }

        // Execute main script
        await engine.doString(mainCode);

      } catch (err) {
        console.error('Lua initialization error:', err);
      }
    }

    // Render start screen overlay
    function renderStartScreen() {
      const ctx = gameCanvas.getContext('2d');
      const width = gameCanvas.width;
      const height = gameCanvas.height;

      // Semi-transparent dark background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);

      // Center "Click to Start" text
      const text = 'Click to Start';
      const fontSize = Math.max(24, Math.min(48, width / 12));
      ctx.font = 'bold ' + fontSize + 'px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, height / 2);
    }

    // Show start screen and wait for user interaction before starting Lua
    renderStartScreen();

    async function startGame() {
      document.removeEventListener('click', startGame);
      document.removeEventListener('keydown', startGame);
      document.removeEventListener('touchstart', startGame);

      state.userHasInteracted = true;
      state.forceStartScreen = false;

      // Create AudioContext synchronously in gesture handler (Issue #617)
      // Browser autoplay policy requires this before any await
      try {
        const audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        state.preUnlockedAudioContext = audioCtx;
      } catch (e) {
        console.warn('Could not pre-unlock AudioContext:', e);
      }

      await initLua();
    }

    // Wait for user interaction before starting
    document.addEventListener('click', startGame);
    document.addEventListener('keydown', startGame);
    document.addEventListener('touchstart', startGame);
  </script>
</body>
</html>`
    // Stryker restore all
  }

  /**
   * Generate HTML for a shell project.
   * @param config - Project configuration
   * @param luaFiles - Collected Lua source files
   * @returns Generated HTML string
   */
  generateShell(config: ProjectConfig, luaFiles: CollectedFile[]): string {
    const columns = config.shell?.columns ?? 80
    const rows = config.shell?.rows ?? 24
    const fontFamily = config.shell?.font_family ?? 'monospace'
    const fontSize = config.shell?.font_size ?? 14

    const luaModules = this.serializeLuaFiles(luaFiles)
    const escapedShellLuaCode = this.escapeLuaForJs(shellLuaCode)

    // Stryker disable all: HTML template - mutations to string literals don't affect behavior
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(config.name)}</title>
  <style>
    /* xterm.js CSS (bundled for offline use) */
    ${XTERM_INLINE_CSS}
  </style>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: #1a1a2e;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    #terminal {
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
    }
  </style>
</head>
<body>
  <div id="terminal"></div>

  <script>
    // xterm.js terminal emulator (bundled for offline use)
    ${XTERM_INLINE_JS}
  </script>
  <script>
    // Wasmoon Lua runtime (bundled with embedded WASM)
    ${WASMOON_INLINE_JS}
  </script>
  <script type="module">
    // Lua module map
    const LUA_MODULES = ${luaModules};

    // Shell Lua API code (bundled from lua-runtime)
    const SHELL_LUA_CODE = \`${escapedShellLuaCode}\`;

    // Terminal configuration
    const TERMINAL_CONFIG = {
      name: ${JSON.stringify(config.name)},
      main: ${JSON.stringify(config.main)},
      columns: ${columns},
      rows: ${rows}
    };

    // Initialize xterm.js terminal
    const term = new Terminal({
      cols: ${columns},
      rows: ${rows},
      fontFamily: '${fontFamily}',
      fontSize: ${fontSize},
      convertEol: true
    });
    term.open(document.getElementById('terminal'));

    // Output buffer for batching terminal writes
    let outputBuffer = '';
    let flushTimeout = null;

    function flushOutput() {
      if (outputBuffer) {
        term.write(outputBuffer);
        outputBuffer = '';
      }
      flushTimeout = null;
    }

    function writeToTerminal(text) {
      outputBuffer += text;
      if (!flushTimeout) {
        flushTimeout = setTimeout(flushOutput, 10);
      }
    }

    // Initialize Lua runtime
    async function initLua() {
      try {
        const factory = new LuaFactory();
        const engine = await factory.createEngine();

        // === SHELL BRIDGE FUNCTIONS ===
        // __js_write - Write text to terminal (for ANSI escape sequences)
        engine.global.set('__js_write', (text) => {
          writeToTerminal(text);
        });

        // __shell_get_width / __shell_get_height - Terminal dimensions
        engine.global.set('__shell_get_width', () => TERMINAL_CONFIG.columns);
        engine.global.set('__shell_get_height', () => TERMINAL_CONFIG.rows);

        // Override print function to write to terminal
        engine.global.set('print', (...args) => {
          const output = args.map(arg => {
            if (arg === null || arg === undefined) return 'nil';
            if (typeof arg === 'object') return JSON.stringify(arg);
            return String(arg);
          }).join('\\x09');
          writeToTerminal(output + '\\x0a');
        });

        // Override io.write to write to terminal without newline
        const io = engine.global.get('io');
        if (io) {
          io.write = (...args) => {
            const output = args.join('');
            writeToTerminal(output);
          };
          engine.global.set('io', io);
        }

        // Set up custom require to load from embedded modules
        engine.global.set('__load_module', (modulePath) => {
          let filePath = modulePath;
          if (!filePath.endsWith('.lua')) {
            filePath = modulePath.replace(/[.]/g, '/') + '.lua';
          }
          let code = LUA_MODULES[filePath];
          // Fallback to init.lua if direct file not found (standard Lua behavior)
          if (!code && !modulePath.endsWith('.lua')) {
            const initPath = modulePath.replace(/[.]/g, '/') + '/init.lua';
            code = LUA_MODULES[initPath];
          }
          if (!code) {
            throw new Error('module not found: ' + modulePath);
          }
          return code;
        });

        // Install custom package.loaders
        await engine.doString(
          "local function custom_loader(modulename) " +
          "local ok, code = pcall(__load_module, modulename) " +
          "if ok and code then " +
          "local fn, err = load(code, modulename) " +
          "if fn then return fn end " +
          "return '\\\\n\\\\terror loading: ' .. tostring(err) " +
          "end " +
          "return '\\\\n\\\\tno embedded module' " +
          "end " +
          "if package.loaders then " +
          "table.insert(package.loaders, 2, custom_loader) " +
          "elseif package.searchers then " +
          "table.insert(package.searchers, 2, custom_loader) " +
          "end"
        );

        // Execute the bundled shell Lua API code and register as module
        await engine.doString(
          "package.preload['shell'] = function() " + SHELL_LUA_CODE.replace(/return shell$/, 'return shell end')
        );

        // Get main module code
        const mainCode = LUA_MODULES[TERMINAL_CONFIG.main];
        if (!mainCode) {
          writeToTerminal('Error: Main file not found: ' + TERMINAL_CONFIG.main + '\\x0a');
          return;
        }

        // Execute main script
        await engine.doString(mainCode);

        // Flush any remaining output
        flushOutput();

      } catch (err) {
        writeToTerminal('Error: ' + err.message + '\\x0a');
        flushOutput();
        console.error('Lua error:', err);
      }
    }

    // Start the Lua runtime
    initLua();
  </script>
</body>
</html>`
    // Stryker restore all
  }

  /**
   * Generate HTML based on project type.
   * @param config - Project configuration
   * @param luaFiles - Collected Lua source files
   * @param assets - Collected binary assets
   * @returns Generated HTML string
   */
  generate(
    config: ProjectConfig,
    luaFiles: CollectedFile[],
    assets: CollectedAsset[]
  ): string {
    if (config.type === 'canvas') {
      return this.generateCanvas(config, luaFiles, assets)
    } else {
      return this.generateShell(config, luaFiles)
    }
  }

  /**
   * Serialize Lua files to JSON for embedding.
   */
  private serializeLuaFiles(files: CollectedFile[]): string {
    const moduleMap: Record<string, string> = {}
    for (const file of files) {
      moduleMap[file.path] = file.content
    }
    return JSON.stringify(moduleMap, null, 2)
  }

  /**
   * Create a single asset manifest entry.
   * @param asset - The asset to serialize
   * @param includeData - Whether to include the dataUrl (single-file mode)
   */
  private createAssetManifestEntry(asset: CollectedAsset, includeData: boolean) {
    return {
      path: asset.path,
      mimeType: asset.mimeType,
      ...(includeData && { dataUrl: toDataUrl(asset.data, asset.mimeType) }),
    }
  }

  /**
   * Serialize assets to JSON manifest.
   */
  private serializeAssets(assets: CollectedAsset[]): string {
    const manifest = assets.map((asset) => this.createAssetManifestEntry(asset, false))
    return JSON.stringify(manifest, null, 2)
  }

  /**
   * Serialize assets with embedded data URLs for single-file export.
   * Each asset includes a dataUrl property with the base64-encoded data.
   */
  private serializeAssetsWithData(assets: CollectedAsset[]): string {
    const manifest = assets.map((asset) => this.createAssetManifestEntry(asset, true))
    return JSON.stringify(manifest, null, 2)
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}
