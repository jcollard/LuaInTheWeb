/* eslint-disable max-lines */
import type { ProjectConfig } from './types'
import {
  WASMOON_INLINE_JS,
  XTERM_INLINE_CSS,
  AUDIO_INLINE_JS,
  audioLuaCode,
  CHIP_INLINE_JS,
  chipLuaCode,
  ANSI_FONT_DATA,
} from '@lua-learning/lua-runtime'

/** Build the @font-face rule block for every registered bitmap font. */
function buildFontFaceRules(): string {
  return ANSI_FONT_DATA.map((f) =>
    `@font-face { font-family: "${f.fontFamily}"; src: url("${f.dataUrl}") format("woff"); font-weight: normal; font-style: normal; }`,
  ).join('\n    ')
}
import { ANSI_INLINE_JS } from './runtime/ansi-inline.generated'
import { XTERM_WITH_CANVAS_ADDON_JS } from './runtime/xterm-canvas.generated'

/** Emit a CRT config field: literal value if defined, CRT_DEFAULTS fallback otherwise. */
function crtField(name: string, value: number | undefined): string {
  return value !== undefined ? `${name}: ${value}` : `${name}: CRT_DEFAULTS.${name}`
}

/**
 * Generate HTML for an ANSI terminal project.
 * @param config - Project configuration
 * @param luaModules - Serialized JSON string of Lua module map
 * @param escapeHtml - Function to escape HTML special characters
 * @param assetManifest - Serialized JSON string of asset manifest
 * @returns Generated HTML string
 */
export function generateAnsiHtml(
  config: ProjectConfig,
  luaModules: string,
  escapeHtml: (str: string) => string,
  assetManifest: string = '[]'
): string {
  const columns = config.ansi?.columns ?? 80
  const rows = config.ansi?.rows ?? 25
  const fontSize = config.ansi?.font_size ?? 16
  const scaleMode = config.ansi?.scale ?? 'integer'
  const crtEnabled = config.ansi?.crt ?? false
  // Project-wide useFontBlocks override.
  // - undefined: honor each screen's per-screen useFontBlocks (default).
  // - true: force pixel renderer (PixelAnsiRenderer) for all screens.
  // - false: force xterm + CanvasAddon for all screens.
  const useFontBlocksOverrideLiteral =
    config.ansi?.use_font_blocks === undefined ? 'null' : String(config.ansi.use_font_blocks)

  // Build CRT config JS object entries — use literal values when set, CRT_DEFAULTS fallback otherwise
  const crtConfigEntries = crtEnabled ? [
    `smoothing: ${config.ansi?.crt_smoothing ?? true}`,
    crtField('scanlineIntensity', config.ansi?.crt_scanlineIntensity),
    crtField('scanlineCount', config.ansi?.crt_scanlineCount),
    crtField('adaptiveIntensity', config.ansi?.crt_adaptiveIntensity),
    crtField('brightness', config.ansi?.crt_brightness),
    crtField('contrast', config.ansi?.crt_contrast),
    crtField('saturation', config.ansi?.crt_saturation),
    crtField('bloomIntensity', config.ansi?.crt_bloomIntensity),
    crtField('bloomThreshold', config.ansi?.crt_bloomThreshold),
    crtField('rgbShift', config.ansi?.crt_rgbShift),
    crtField('vignetteStrength', config.ansi?.crt_vignetteStrength),
    crtField('curvature', config.ansi?.crt_curvature),
    crtField('flickerStrength', config.ansi?.crt_flickerStrength),
    crtField('phosphor', config.ansi?.crt_phosphor),
  ].join(', ') : ''

  // Escape Lua code strings for safe embedding in JS template literals
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
  const escapedAudioLuaCode = esc(audioLuaCode)
  const escapedChipLuaCode = esc(chipLuaCode)

  // Stryker disable all: HTML template - mutations to string literals don't affect behavior
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.name)}</title>
  <style>
    /* xterm.js CSS (bundled for offline use) */
    ${XTERM_INLINE_CSS}
  </style>
  <style>
    /* Bitmap font registry — inline data URLs so the export stays
       self-contained even when served from the file:// protocol. */
    ${buildFontFaceRules()}
    body {
      margin: 0;
      padding: 0;
      background-color: #000000;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow: hidden;
    }
    #start-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10;
      cursor: pointer;
    }
    #start-overlay span {
      color: white;
      font-size: 32px;
      font-family: sans-serif;
      font-weight: bold;
    }
    #terminal-wrapper {
      display: none;
      outline: none;
      cursor: default;
      user-select: none;
    }
    #terminal-wrapper .xterm { cursor: default; user-select: none; pointer-events: none; }
    #terminal-wrapper .xterm canvas { image-rendering: pixelated; image-rendering: crisp-edges; }
    #terminal-wrapper .xterm-viewport { overflow: hidden !important; }
  </style>
</head>
<body>
  <div id="start-overlay"><span>Click to Start</span></div>
  <div id="terminal-wrapper" tabindex="0"></div>

  <script>
    // xterm.js + CanvasAddon (bundled together for shared module context)
    ${XTERM_WITH_CANVAS_ADDON_JS}
  </script>
  <script>
    // Wasmoon Lua runtime (bundled with embedded WASM)
    ${WASMOON_INLINE_JS}
  </script>
  <script>
    // ANSI bridge (bundled from AnsiController + setupAnsiAPI)
    ${ANSI_INLINE_JS}
  </script>
  <script>
    // Audio bridge (bundled from audio-inline-entry.ts)
    ${AUDIO_INLINE_JS}
    ${CHIP_INLINE_JS}
  </script>
  <script type="module">
    // Lua module map
    const LUA_MODULES = ${luaModules};

    // Asset manifest (for audio assets)
    const ASSET_MANIFEST = ${assetManifest};

    const AUDIO_LUA_CODE = \`${escapedAudioLuaCode}\`;
    const CHIP_LUA_CODE = \`${escapedChipLuaCode}\`;

    // Project configuration
    const PROJECT_CONFIG = {
      name: ${JSON.stringify(config.name)},
      main: ${JSON.stringify(config.main)},
      columns: ${columns},
      rows: ${rows},
      scale: ${JSON.stringify(scaleMode)}
    };

    const wrapper = document.getElementById('terminal-wrapper');
    const overlay = document.getElementById('start-overlay');

    // Output buffer for batching terminal writes (for print/io.write)
    let outputBuffer = '';
    let flushTimeout = null;
    let termRef = null;

    function flushOutput() {
      if (flushTimeout) { clearTimeout(flushTimeout); flushTimeout = null; }
      if (outputBuffer && termRef) {
        termRef.write(outputBuffer);
        outputBuffer = '';
      }
    }

    function writeToTerminal(text) {
      outputBuffer += text;
      if (!flushTimeout) { flushTimeout = setTimeout(flushOutput, 10); }
    }

    async function startApp() {
      overlay.remove(); wrapper.style.display = 'block'; wrapper.focus();
      // Restore focus when user clicks back into the page or alt-tabs back
      wrapper.addEventListener('mousedown', () => wrapper.focus());
      document.addEventListener('visibilitychange', () => { if (!document.hidden) wrapper.focus(); });
      // Create AudioContext synchronously in gesture handler (Issue #617)
      let preUnlockedAudioContext = null;
      try {
        const audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        preUnlockedAudioContext = audioCtx;
      } catch (e) {
        console.warn('Could not pre-unlock AudioContext:', e);
      }

      const FONT_SIZE = ${fontSize};
      const scaleMode = PROJECT_CONFIG.scale;
      const getFontById = globalThis.AnsiStandalone.getFontById;
      const DEFAULT_FONT_ID = globalThis.AnsiStandalone.DEFAULT_FONT_ID;

      // Project-wide override resolved at export time.
      // null = honor per-screen flag; true = force pixel; false = force xterm.
      const PROJECT_USE_FONT_BLOCKS_OVERRIDE = ${useFontBlocksOverrideLiteral};
      function resolveUsePixel(requested) {
        if (PROJECT_USE_FONT_BLOCKS_OVERRIDE === true) return true;
        if (PROJECT_USE_FONT_BLOCKS_OVERRIDE === false) return false;
        return !!requested;
      }
      function computeIntegerScale(containerW, containerH, baseW, baseH) {
        if (baseW === 0 || baseH === 0) return 1;
        switch (scaleMode) {
          case '1x': return 1;
          case '2x': return 2;
          case '3x': return 3;
          case 'full': return Math.min(containerW / baseW, containerH / baseH);
          default: return Math.max(1, Math.floor(Math.min(containerW / baseW, containerH / baseH)));
        }
      }

      // Pixel renderer factory — uses PixelAnsiRenderer (bitmap atlas, image-rendering: pixelated).
      function buildPixelHandle(opts) {
        const PixelAnsiRenderer = globalThis.AnsiStandalone.PixelAnsiRenderer;
        const renderer = new PixelAnsiRenderer({ cols: opts.cols, rows: opts.rows, fontId: opts.fontId });
        wrapper.replaceChildren(renderer.canvas);
        renderer.canvas.style.imageRendering = 'pixelated';
        let baseW = renderer.canvas.width;
        let baseH = renderer.canvas.height;
        let currentScale = -1;
        function applyScale() {
          const newScale = computeIntegerScale(window.innerWidth, window.innerHeight, baseW, baseH);
          if (newScale === currentScale) return;
          currentScale = newScale;
          renderer.canvas.style.width = (baseW * newScale) + 'px';
          renderer.canvas.style.height = (baseH * newScale) + 'px';
        }
        applyScale();
        return {
          type: 'pixel',
          write: (data) => renderer.write(data),
          container: wrapper,
          dispose: () => { try { renderer.dispose(); } catch (e) { console.warn('[ANSI Export] pixel dispose failed:', e); } },
          resize: (cols, rows) => {
            try { renderer.resize(cols, rows); } catch (e) { console.warn('[ANSI Export] pixel resize failed:', e); }
            baseW = renderer.canvas.width;
            baseH = renderer.canvas.height;
            currentScale = -1;
            applyScale();
          },
          setFontFamily: async (fontId) => {
            try { await renderer.setFontFamily(fontId); } catch (e) { console.warn('[ANSI Export] pixel setFontFamily failed:', e); }
            requestAnimationFrame(() => {
              baseW = renderer.canvas.width;
              baseH = renderer.canvas.height;
              currentScale = -1;
              applyScale();
            });
          },
          setUseFontBlocks: (flag) => { try { renderer.setUseFontBlocks(flag); } catch (e) { /* renderer flag is informational */ void e; } },
          applyScale,
          getCanvas: () => renderer.canvas,
        };
      }

      // xterm + CanvasAddon factory — fallback for screens authored with useFontBlocks=false.
      async function buildXtermHandle(opts) {
        await document.fonts.load(FONT_SIZE + 'px "Web IBM VGA 8x16"');
        const term = new Terminal({
          cols: opts.cols,
          rows: opts.rows,
          fontSize: FONT_SIZE,
          fontFamily: '"Web IBM VGA 8x16", monospace',
          lineHeight: 1,
          letterSpacing: 0,
          cursorBlink: false,
          disableStdin: true,
          scrollback: 0,
          overviewRulerWidth: 0,
          allowTransparency: false,
          theme: { background: '#000000', foreground: '#AAAAAA', cursor: '#AAAAAA' },
        });
        term.open(wrapper);
        try { term.loadAddon(new CanvasAddon()); } catch (e) { console.warn('[ANSI Export] CanvasAddon failed:', e); }
        // Snap fillRect to integer pixels to prevent antialiasing seams between cells.
        function patchFR(c) { var ctx = c.getContext('2d'); if (!ctx || ctx._p) return; var o = ctx.fillRect.bind(ctx); ctx.fillRect = function(x,y,w,h) { var x1=Math.round(x),y1=Math.round(y); o(x1,y1,Math.round(x+w)-x1,Math.round(y+h)-y1); }; ctx._p = 1; }
        wrapper.querySelectorAll('canvas').forEach(patchFR);
        const observer = new MutationObserver(function() { wrapper.querySelectorAll('canvas').forEach(patchFR); });
        observer.observe(wrapper, { childList: true, subtree: true });
        term.attachCustomKeyEventHandler(() => false);
        let baseW = wrapper.scrollWidth;
        let baseH = wrapper.scrollHeight;
        let currentScale = -1;
        let currentFontEntryCellH = FONT_SIZE;
        function applyScale() {
          const newScale = computeIntegerScale(window.innerWidth, window.innerHeight, baseW, baseH);
          if (newScale === currentScale) return;
          currentScale = newScale;
          term.options.fontSize = currentFontEntryCellH * newScale;
        }
        applyScale();
        // Apply non-default initial font if provided.
        if (opts.fontId && opts.fontId !== DEFAULT_FONT_ID) {
          const entry = getFontById(opts.fontId);
          if (entry) {
            document.fonts.load(entry.cellH + 'px "' + entry.fontFamily + '"').catch(() => {});
            term.options.fontFamily = '"' + entry.fontFamily + '", monospace';
            currentFontEntryCellH = entry.cellH;
            requestAnimationFrame(() => {
              baseW = wrapper.scrollWidth;
              baseH = wrapper.scrollHeight;
              currentScale = -1;
              applyScale();
            });
          }
        }
        return {
          type: 'xterm',
          write: (data) => term.write(data),
          container: wrapper,
          dispose: () => { try { observer.disconnect(); term.dispose(); } catch (e) { console.warn('[ANSI Export] xterm dispose failed:', e); } },
          resize: (cols, rows) => {
            try { term.resize(cols, rows); } catch (e) { console.warn('[ANSI Export] xterm resize failed:', e); }
            requestAnimationFrame(() => {
              baseW = wrapper.scrollWidth;
              baseH = wrapper.scrollHeight;
              currentScale = -1;
              applyScale();
            });
          },
          setFontFamily: (fontId) => {
            const entry = getFontById(fontId);
            if (!entry) return;
            document.fonts.load(entry.cellH + 'px "' + entry.fontFamily + '"').catch(() => {});
            term.options.fontFamily = '"' + entry.fontFamily + '", monospace';
            currentFontEntryCellH = entry.cellH;
            requestAnimationFrame(() => {
              baseW = wrapper.scrollWidth;
              baseH = wrapper.scrollHeight;
              currentScale = -1;
              applyScale();
            });
          },
          setUseFontBlocks: () => { /* swap is handled by the outer wrapper */ },
          applyScale,
          getCanvas: () => wrapper.querySelector('canvas'),
        };
      }

      // CRT shader is attached to whichever inner handle is currently active.
      // Track its state at the wrapper level so it can be re-applied after a renderer swap.
      let crtShader = null;
      function destroyCrt() {
        if (crtShader) { try { crtShader.disable(); } catch (e) { console.warn('[ANSI Export] CRT disable failed:', e); } crtShader = null; }
      }
      function applyCrt(canvas, config) {
        const CrtShader = globalThis.AnsiStandalone.CrtShader;
        if (!canvas) return;
        crtShader = new CrtShader(canvas, wrapper, {});
        crtShader.enable(config);
      }

      // Outer wrapper handle — persists across renderer swaps. AnsiController only sees this.
      let inner = null;
      let lastCols = ${columns};
      let lastRows = ${rows};
      let lastFontId = DEFAULT_FONT_ID;
      let crtEnabled = false;
      let crtConfig = null;
      let swapInProgress = null;

      async function rebuild(usePixel) {
        destroyCrt();
        if (inner) { try { inner.dispose(); } catch (e) { console.warn('[ANSI Export] inner dispose failed:', e); } inner = null; }
        while (wrapper.firstChild) wrapper.firstChild.remove();
        const opts = { cols: lastCols, rows: lastRows, fontId: lastFontId };
        inner = usePixel ? buildPixelHandle(opts) : await buildXtermHandle(opts);
        if (crtEnabled && crtConfig) applyCrt(inner.getCanvas(), crtConfig);
      }

      const handle = {
        write: (data) => { if (inner) inner.write(data); },
        container: wrapper,
        dispose: () => { destroyCrt(); if (inner) inner.dispose(); },
        resize: (cols, rows) => {
          lastCols = cols; lastRows = rows;
          if (inner) inner.resize(cols, rows);
        },
        setFontFamily: (fontId) => {
          lastFontId = fontId;
          if (inner) return inner.setFontFamily(fontId);
        },
        setCrt: (enabled, intensity, config) => {
          crtEnabled = !!enabled;
          if (config) crtConfig = config;
          else if (intensity !== undefined && !crtConfig) crtConfig = { /* shader uses intensity directly */ };
          if (enabled) {
            if (!crtShader) applyCrt(inner ? inner.getCanvas() : null, crtConfig);
            else if (config) { try { crtShader.enable(config); } catch (e) { console.warn('[ANSI Export] CRT re-enable failed:', e); } }
          } else {
            destroyCrt();
          }
        },
        setUseFontBlocks: async (flag) => {
          const target = resolveUsePixel(flag);
          if (inner && target === (inner.type === 'pixel')) return;
          // Serialize swaps so a rapid sequence doesn't tear the DOM mid-rebuild.
          const prev = swapInProgress;
          let resolveSwap;
          const mine = new Promise((r) => { resolveSwap = r; });
          swapInProgress = mine;
          if (prev) { try { await prev; } catch (e) { void e; } }
          try { await rebuild(target); } finally { resolveSwap(); if (swapInProgress === mine) swapInProgress = null; }
        },
      };

      const initialUsePixel = resolveUsePixel(true /* DEFAULT_USE_FONT_BLOCKS */);
      await rebuild(initialUsePixel);
      termRef = handle;
      window.addEventListener('resize', () => { if (inner && inner.applyScale) inner.applyScale(); });

      ${crtEnabled ? `{
        const CRT_DEFAULTS = globalThis.AnsiStandalone.CRT_DEFAULTS;
        const CRT_CONFIG = { ${crtConfigEntries} };
        handle.setCrt(true, undefined, CRT_CONFIG);
      }` : ''}

      const callbacks = {
        onRequestAnsiTab: () => Promise.resolve(handle), onCloseAnsiTab: () => {},
        onFlushOutput: () => flushOutput(),
        onError: (error) => { console.error('[ANSI Export] Game loop error:', error); },
      };

      // Create AnsiController and setup API
      const AnsiController = globalThis.AnsiStandalone.AnsiController;
      const setupAnsiAPI = globalThis.AnsiStandalone.setupAnsiAPI;
      const controller = new AnsiController(callbacks);

      // Initialize Lua runtime
      try {
        const factory = new LuaFactory();
        const engine = await factory.createEngine();

        // Shell bridge globals (for print/io.write support)
        engine.global.set('__js_write', (text) => writeToTerminal(text));
        engine.global.set('__shell_get_width', () => PROJECT_CONFIG.columns);
        engine.global.set('__shell_get_height', () => PROJECT_CONFIG.rows);

        // Override print to write to terminal
        engine.global.set('print', (...args) => {
          const output = args.map(arg => {
            if (arg === null || arg === undefined) return 'nil';
            if (typeof arg === 'object') return JSON.stringify(arg);
            return String(arg);
          }).join('\\x09');
          writeToTerminal(output + '\\x0a');
        });

        // Override io.write via Lua to avoid userdata conversion issues
        await engine.doString(\`
          local old_io_write = io.write
          io.write = function(...)
            local args = {...}
            for i, v in ipairs(args) do
              __js_write(tostring(v))
            end
          end
        \`);

        // Set up ANSI API with file reader for load_screen()
        setupAnsiAPI(engine, () => controller, {
          fileReader: (path) => {
            // Strip leading slash — LUA_MODULES uses relative paths
            const p = path.startsWith('/') ? path.slice(1) : path;
            if (LUA_MODULES[p]) return LUA_MODULES[p];
            if (LUA_MODULES[p + '.lua']) return LUA_MODULES[p + '.lua'];
            return null;
          },
        });

        await globalThis.AnsiStandalone.setupLocalStorageBridge(engine);
        const audioState = { preUnlockedAudioContext: preUnlockedAudioContext };
        globalThis.setupAudioBridge(engine, audioState, ASSET_MANIFEST);
        globalThis.setupChipBridge(engine, ASSET_MANIFEST);

        // Override __ansi_start with non-blocking version.
        engine.global.set('__ansi_start', () => {
          return new Promise((resolve) => {
            controller.start().then(() => {
            }).catch((err) => {
              console.error('[ANSI Export] controller.start() failed:', err);
            });
            setTimeout(resolve, 0);
          });
        });

        // Set up custom require to load from embedded modules
        engine.global.set('__load_module', (modulePath) => {
          let filePath = modulePath;
          if (!filePath.endsWith('.lua')) {
            filePath = modulePath.replace(/[.]/g, '/') + '.lua';
          }
          let code = LUA_MODULES[filePath];
          if (!code && !modulePath.endsWith('.lua')) {
            code = LUA_MODULES[modulePath + ".lua"];
          }
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

        if (AUDIO_LUA_CODE) { await engine.doString(AUDIO_LUA_CODE); }
        if (CHIP_LUA_CODE) { await engine.doString(CHIP_LUA_CODE); }

        // Get and execute main script
        const mainCode = LUA_MODULES[PROJECT_CONFIG.main];
        if (!mainCode) {
          writeToTerminal('Error: Main file not found: ' + PROJECT_CONFIG.main + '\\x0a');
          flushOutput();
          return;
        }
        await engine.doString(mainCode);
        flushOutput();
      } catch (err) {
        console.error('[ANSI Export] Error:', err);
        writeToTerminal('Error: ' + err.message + '\\x0a');
        flushOutput();
      }
    }

    // Wait for user interaction before starting (once only)
    let started = false;
    function startOnce() {
      if (started) return;
      started = true;
      overlay.removeEventListener('click', startOnce);
      document.removeEventListener('keydown', startOnce);
      startApp();
    }
    overlay.addEventListener('click', startOnce);
    document.addEventListener('keydown', startOnce);
  </script>
</body>
</html>`
  // Stryker restore all
}
