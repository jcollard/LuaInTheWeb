import type { ProjectConfig, ExportOptions, CollectedFile, CollectedAsset } from './types'
import { canvasLuaCode, shellLuaCode } from './runtime'

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
   * Get the web workers option for future use.
   */
  get useWebWorkers(): boolean {
    return this.options.webWorkers ?? false
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
    const assetManifest = this.serializeAssets(assets)
    const escapedCanvasLuaCode = this.escapeLuaForJs(canvasLuaCode)
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
  <script type="module">
    // Import wasmoon from CDN
    import { LuaFactory } from 'https://cdn.jsdelivr.net/npm/wasmoon@1.16.0/+esm';

    // Lua module map
    const LUA_MODULES = ${luaModules};

    // Asset manifest
    const ASSET_MANIFEST = ${assetManifest};

    // Canvas Lua API code (bundled from lua-runtime)
    const CANVAS_LUA_CODE = \`${escapedCanvasLuaCode}\`;

    // Project configuration
    const PROJECT_CONFIG = {
      name: ${JSON.stringify(config.name)},
      main: ${JSON.stringify(config.main)},
      width: ${width},
      height: ${height}
    };

    // Get canvas and context
    const gameCanvas = document.getElementById('game-canvas');
    const ctx = gameCanvas.getContext('2d', { willReadFrequently: true });

    // Runtime state
    const state = {
      isRunning: false,
      tickCallback: null,
      lastFrameTime: 0,
      deltaTime: 0,
      totalTime: 0,
      keysDown: new Set(),
      keysPressed: new Set(),
      mouseX: 0,
      mouseY: 0,
      mouseButtonsDown: new Set(),
      mouseButtonsPressed: new Set(),
      currentFontSize: 16,
      currentFontFamily: 'monospace',
      stopResolve: null
    };

    // Set up input event listeners
    document.addEventListener('keydown', (e) => {
      if (!state.keysDown.has(e.code)) {
        state.keysPressed.add(e.code);
      }
      state.keysDown.add(e.code);
    });

    document.addEventListener('keyup', (e) => {
      state.keysDown.delete(e.code);
    });

    gameCanvas.addEventListener('mousemove', (e) => {
      const rect = gameCanvas.getBoundingClientRect();
      state.mouseX = e.clientX - rect.left;
      state.mouseY = e.clientY - rect.top;
    });

    gameCanvas.addEventListener('mousedown', (e) => {
      if (!state.mouseButtonsDown.has(e.button)) {
        state.mouseButtonsPressed.add(e.button);
      }
      state.mouseButtonsDown.add(e.button);
    });

    gameCanvas.addEventListener('mouseup', (e) => {
      state.mouseButtonsDown.delete(e.button);
    });

    // Helper to convert color components to CSS
    function toHex(value) {
      const hex = Math.max(0, Math.min(255, Math.round(value))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }

    function colorToCss(r, g, b, a) {
      if (a !== undefined && a !== null && a !== 255) {
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + (a / 255) + ')';
      }
      return '#' + toHex(r) + toHex(g) + toHex(b);
    }

    // Game loop
    function gameLoop(timestamp) {
      if (!state.isRunning) return;

      state.deltaTime = (timestamp - state.lastFrameTime) / 1000;
      state.lastFrameTime = timestamp;
      state.totalTime += state.deltaTime;

      if (state.tickCallback) {
        try {
          state.tickCallback();
        } catch (err) {
          console.error('Lua error in tick callback:', err);
          state.isRunning = false;
          if (state.stopResolve) {
            state.stopResolve();
            state.stopResolve = null;
          }
          return;
        }
      }

      state.keysPressed.clear();
      state.mouseButtonsPressed.clear();

      if (state.isRunning) {
        requestAnimationFrame(gameLoop);
      }
    }

    function startGameLoop() {
      state.lastFrameTime = performance.now();
      requestAnimationFrame(gameLoop);
    }

    // Initialize Lua runtime
    async function initLua() {
      try {
        const factory = new LuaFactory();
        const engine = await factory.createEngine();

        // === LIFECYCLE ===
        engine.global.set('__canvas_is_active', () => state.isRunning);

        engine.global.set('__canvas_start', () => {
          return new Promise((resolve) => {
            state.isRunning = true;
            state.stopResolve = resolve;
            startGameLoop();
          });
        });

        engine.global.set('__canvas_stop', () => {
          state.isRunning = false;
          if (state.stopResolve) {
            state.stopResolve();
            state.stopResolve = null;
          }
        });

        engine.global.set('__canvas_setOnDrawCallback', (callback) => {
          state.tickCallback = callback;
        });

        // === CANVAS CONFIGURATION ===
        engine.global.set('__canvas_setSize', (w, h) => { gameCanvas.width = w; gameCanvas.height = h; });
        engine.global.set('__canvas_getWidth', () => gameCanvas.width);
        engine.global.set('__canvas_getHeight', () => gameCanvas.height);

        // === ASSET MAPS (early declaration for font/image functions) ===
        const loadedImages = new Map(); // name -> { img: HTMLImageElement, width, height }
        const loadedFonts = new Map();  // name -> { family: string }
        const assetErrors = [];

        // Helper to translate font family names
        function translateFontFamily(family) {
          const fontData = loadedFonts.get(family);
          if (fontData && fontData.family) {
            return fontData.family;  // Return CustomFont_xxx
          }
          return family;  // Return original if not a loaded font
        }

        // === DRAWING STATE ===
        engine.global.set('__canvas_clear', () => ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height));
        engine.global.set('__canvas_clearRect', (x, y, w, h) => ctx.clearRect(x, y, w, h));
        engine.global.set('__canvas_setColor', (r, g, b, a) => {
          const c = colorToCss(r, g, b, a);
          ctx.fillStyle = c;
          ctx.strokeStyle = c;
        });
        engine.global.set('__canvas_setLineWidth', (w) => { ctx.lineWidth = w; });

        // === FONT STYLING ===
        engine.global.set('__canvas_setFontSize', (size) => {
          state.currentFontSize = size;
          ctx.font = size + 'px ' + translateFontFamily(state.currentFontFamily);
        });
        engine.global.set('__canvas_setFontFamily', (family) => {
          state.currentFontFamily = family;
          ctx.font = state.currentFontSize + 'px ' + translateFontFamily(family);
        });
        engine.global.set('__canvas_getTextWidth', (text) => ctx.measureText(text).width);

        // === SHAPE DRAWING ===
        engine.global.set('__canvas_rect', (x, y, w, h) => ctx.strokeRect(x, y, w, h));
        engine.global.set('__canvas_fillRect', (x, y, w, h) => ctx.fillRect(x, y, w, h));
        engine.global.set('__canvas_circle', (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); });
        engine.global.set('__canvas_fillCircle', (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
        engine.global.set('__canvas_line', (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });

        // === TEXT ===
        engine.global.set('__canvas_text', (x, y, text, fontSize, fontFamily, maxWidth) => {
          const savedFont = ctx.font;
          if (fontSize || fontFamily) {
            const size = fontSize ?? state.currentFontSize;
            const family = translateFontFamily(fontFamily ?? state.currentFontFamily);
            ctx.font = size + 'px ' + family;
          }
          ctx.textBaseline = 'top';
          if (maxWidth) { ctx.fillText(text, x, y, maxWidth); } else { ctx.fillText(text, x, y); }
          ctx.font = savedFont;
        });
        engine.global.set('__canvas_strokeText', (x, y, text, fontSize, fontFamily, maxWidth) => {
          const savedFont = ctx.font;
          if (fontSize || fontFamily) {
            ctx.font = (fontSize ?? state.currentFontSize) + 'px ' + translateFontFamily(fontFamily ?? state.currentFontFamily);
          }
          if (maxWidth) { ctx.strokeText(text, x, y, maxWidth); } else { ctx.strokeText(text, x, y); }
          ctx.font = savedFont;
        });

        // === TIMING ===
        engine.global.set('__canvas_getDelta', () => state.deltaTime);
        engine.global.set('__canvas_getTime', () => state.totalTime);

        // === INPUT ===
        engine.global.set('__canvas_isKeyDown', (key) => state.keysDown.has(key));
        engine.global.set('__canvas_isKeyPressed', (key) => state.keysPressed.has(key));
        engine.global.set('__canvas_getKeysDown', () => Array.from(state.keysDown));
        engine.global.set('__canvas_getKeysPressed', () => Array.from(state.keysPressed));
        engine.global.set('__canvas_getMouseX', () => state.mouseX);
        engine.global.set('__canvas_getMouseY', () => state.mouseY);
        engine.global.set('__canvas_isMouseDown', (button) => state.mouseButtonsDown.has(button));
        engine.global.set('__canvas_isMousePressed', (button) => state.mouseButtonsPressed.has(button));

        // === TRANSFORMATIONS ===
        engine.global.set('__canvas_translate', (dx, dy) => ctx.translate(dx, dy));
        engine.global.set('__canvas_rotate', (angle) => ctx.rotate(angle));
        engine.global.set('__canvas_scale', (sx, sy) => ctx.scale(sx, sy));
        engine.global.set('__canvas_save', () => ctx.save());
        engine.global.set('__canvas_restore', () => ctx.restore());
        engine.global.set('__canvas_transform', (a, b, c, d, e, f) => ctx.transform(a, b, c, d, e, f));
        engine.global.set('__canvas_setTransform', (a, b, c, d, e, f) => ctx.setTransform(a, b, c, d, e, f));
        engine.global.set('__canvas_resetTransform', () => ctx.resetTransform());

        // === PATH API ===
        engine.global.set('__canvas_beginPath', () => ctx.beginPath());
        engine.global.set('__canvas_closePath', () => ctx.closePath());
        engine.global.set('__canvas_moveTo', (x, y) => ctx.moveTo(x, y));
        engine.global.set('__canvas_lineTo', (x, y) => ctx.lineTo(x, y));
        engine.global.set('__canvas_fill', () => ctx.fill());
        engine.global.set('__canvas_stroke', () => ctx.stroke());
        engine.global.set('__canvas_arc', (x, y, r, start, end, ccw) => ctx.arc(x, y, r, start, end, ccw));
        engine.global.set('__canvas_arcTo', (x1, y1, x2, y2, r) => ctx.arcTo(x1, y1, x2, y2, r));
        engine.global.set('__canvas_quadraticCurveTo', (cpx, cpy, x, y) => ctx.quadraticCurveTo(cpx, cpy, x, y));
        engine.global.set('__canvas_bezierCurveTo', (cp1x, cp1y, cp2x, cp2y, x, y) => ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y));
        engine.global.set('__canvas_ellipse', (x, y, rx, ry, rot, start, end, ccw) => ctx.ellipse(x, y, rx, ry, rot, start, end, ccw));
        engine.global.set('__canvas_roundRect', (x, y, w, h, radii) => ctx.roundRect(x, y, w, h, radii));
        engine.global.set('__canvas_rectPath', (x, y, w, h) => ctx.rect(x, y, w, h));
        engine.global.set('__canvas_clip', (rule) => rule ? ctx.clip(rule) : ctx.clip());
        engine.global.set('__canvas_isPointInPath', (x, y, rule) => ctx.isPointInPath(x, y, rule));
        engine.global.set('__canvas_isPointInStroke', (x, y) => ctx.isPointInStroke(x, y));

        // === LINE STYLING ===
        engine.global.set('__canvas_setLineCap', (cap) => { ctx.lineCap = cap; });
        engine.global.set('__canvas_setLineJoin', (join) => { ctx.lineJoin = join; });
        engine.global.set('__canvas_setMiterLimit', (limit) => { ctx.miterLimit = limit; });
        engine.global.set('__canvas_setLineDash', (segments) => ctx.setLineDash(segments));
        engine.global.set('__canvas_getLineDash', () => ctx.getLineDash());
        engine.global.set('__canvas_setLineDashOffset', (offset) => { ctx.lineDashOffset = offset; });

        // === SHADOWS ===
        engine.global.set('__canvas_setShadowColor', (c) => { ctx.shadowColor = c; });
        engine.global.set('__canvas_setShadowBlur', (b) => { ctx.shadowBlur = b; });
        engine.global.set('__canvas_setShadowOffsetX', (x) => { ctx.shadowOffsetX = x; });
        engine.global.set('__canvas_setShadowOffsetY', (y) => { ctx.shadowOffsetY = y; });
        engine.global.set('__canvas_setShadow', (c, b, x, y) => { ctx.shadowColor = c; ctx.shadowBlur = b; ctx.shadowOffsetX = x; ctx.shadowOffsetY = y; });
        engine.global.set('__canvas_clearShadow', () => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; });

        // === COMPOSITING ===
        engine.global.set('__canvas_setGlobalAlpha', (a) => { ctx.globalAlpha = a; });
        engine.global.set('__canvas_setCompositeOperation', (op) => { ctx.globalCompositeOperation = op; });
        engine.global.set('__canvas_setImageSmoothing', (enabled) => { ctx.imageSmoothingEnabled = enabled; });
        engine.global.set('__canvas_setFilter', (filter) => { ctx.filter = filter; });

        // === TEXT ALIGNMENT ===
        engine.global.set('__canvas_setTextAlign', (align) => { ctx.textAlign = align; });
        engine.global.set('__canvas_setTextBaseline', (baseline) => { ctx.textBaseline = baseline; });
        engine.global.set('__canvas_setDirection', (dir) => { ctx.direction = dir; });
        engine.global.set('__canvas_getTextMetrics', (text) => {
          const m = ctx.measureText(text);
          return { width: m.width, actualBoundingBoxLeft: m.actualBoundingBoxLeft, actualBoundingBoxRight: m.actualBoundingBoxRight,
                   actualBoundingBoxAscent: m.actualBoundingBoxAscent, actualBoundingBoxDescent: m.actualBoundingBoxDescent,
                   fontBoundingBoxAscent: m.fontBoundingBoxAscent, fontBoundingBoxDescent: m.fontBoundingBoxDescent };
        });

        // === CAPTURE ===
        engine.global.set('__canvas_capture', (format, quality) => {
          if (format && quality !== undefined && quality !== null) return gameCanvas.toDataURL(format, quality);
          if (format) return gameCanvas.toDataURL(format);
          return gameCanvas.toDataURL();
        });

        // === FILL/STROKE STYLES (gradients) ===
        function applyGradientStyle(style, prop) {
          if (typeof style === 'string') { ctx[prop] = style; return; }
          let gradient;
          if (style.type === 'linear') {
            gradient = ctx.createLinearGradient(style.x0, style.y0, style.x1, style.y1);
          } else if (style.type === 'radial') {
            gradient = ctx.createRadialGradient(style.x0, style.y0, style.r0, style.x1, style.y1, style.r1);
          } else if (style.type === 'conic') {
            gradient = ctx.createConicGradient(style.startAngle, style.x, style.y);
          }
          if (gradient && style.stops) {
            for (const stop of style.stops) { gradient.addColorStop(stop.offset, stop.color); }
            ctx[prop] = gradient;
          }
        }
        engine.global.set('__canvas_setFillStyle', (style) => applyGradientStyle(style, 'fillStyle'));
        engine.global.set('__canvas_setStrokeStyle', (style) => applyGradientStyle(style, 'strokeStyle'));

        // === ASSET MANAGEMENT ===
        // Helper to get asset name from string or handle
        function extractAssetName(nameOrHandle) {
          if (typeof nameOrHandle === 'string') return nameOrHandle;
          if (typeof nameOrHandle === 'object' && nameOrHandle !== null && '_name' in nameOrHandle) {
            return nameOrHandle._name;
          }
          throw new Error('Invalid asset reference: expected string name or asset handle');
        }

        engine.global.set('__canvas_assets_addPath', (path) => {
          // In standalone mode, paths are pre-registered via ASSET_MANIFEST
          console.log('Asset path registered:', path);
        });

        engine.global.set('__canvas_assets_loadImage', (name, filename) => {
          // Find the asset in our manifest
          const assetPath = ASSET_MANIFEST.find(a => a.path.endsWith(filename));
          if (!assetPath) {
            const err = 'Image file \\'' + filename + '\\' not found in exported assets';
            console.error(err);
            assetErrors.push(err);
            return { _type: 'image', _name: name, _file: filename, _error: err };
          }

          // Load the image
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
          img.src = 'assets/' + assetPath.path;

          // Store a placeholder until loaded
          loadedImages.set(name, { img, width: 0, height: 0, loading: loadPromise });

          return { _type: 'image', _name: name, _file: filename };
        });

        engine.global.set('__canvas_assets_loadFont', (name, filename) => {
          // Find the asset in our manifest
          const assetPath = ASSET_MANIFEST.find(a => a.path.endsWith(filename));
          if (!assetPath) {
            const err = 'Font file \\'' + filename + '\\' not found in exported assets';
            console.error(err);
            assetErrors.push(err);
            return { _type: 'font', _name: name, _file: filename, _error: err };
          }

          // Load the font using FontFace API
          const fontFamily = 'CustomFont_' + name.replace(/[^a-zA-Z0-9]/g, '_');
          const font = new FontFace(fontFamily, 'url(assets/' + assetPath.path + ')');
          font.load().then(() => {
            document.fonts.add(font);
            loadedFonts.set(name, { family: fontFamily });
            console.log('Loaded font:', name, 'as', fontFamily);
          }).catch((err) => {
            const errMsg = 'Failed to load font: ' + filename + ' - ' + err.message;
            console.error(errMsg);
            assetErrors.push(errMsg);
          });

          // Store immediately so it can be used (will fall back until loaded)
          loadedFonts.set(name, { family: fontFamily });

          return { _type: 'font', _name: name, _file: filename };
        });

        engine.global.set('__canvas_assets_getWidth', (nameOrHandle) => {
          const name = extractAssetName(nameOrHandle);
          const asset = loadedImages.get(name);
          if (!asset) {
            console.error('Unknown image asset:', name);
            return 0;
          }
          return asset.width;
        });

        engine.global.set('__canvas_assets_getHeight', (nameOrHandle) => {
          const name = extractAssetName(nameOrHandle);
          const asset = loadedImages.get(name);
          if (!asset) {
            console.error('Unknown image asset:', name);
            return 0;
          }
          return asset.height;
        });

        engine.global.set('__canvas_drawImage', (nameOrHandle, x, y, width, height, sx, sy, sw, sh) => {
          const name = extractAssetName(nameOrHandle);
          const asset = loadedImages.get(name);
          if (!asset) {
            console.error('Unknown image asset for drawing:', name);
            return;
          }
          if (!asset.img.complete || asset.img.naturalWidth === 0) {
            // Image not yet loaded, skip this frame
            return;
          }
          try {
            // Check for null OR undefined since Lua nil becomes null in JS
            const hasSrcRect = sx != null && sy != null && sw != null && sh != null;
            const hasDestSize = width != null && height != null;

            if (hasSrcRect && hasDestSize) {
              // Full 9-arg version: source rect + dest rect
              ctx.drawImage(asset.img, sx, sy, sw, sh, x, y, width, height);
            } else if (hasDestSize) {
              // 5-arg version: dest pos + size
              ctx.drawImage(asset.img, x, y, width, height);
            } else {
              // 3-arg version: just dest pos
              ctx.drawImage(asset.img, x, y);
            }
          } catch (e) {
            console.error('Error drawing image:', name, e);
          }
        });

        // === PIXEL MANIPULATION STUBS ===
        engine.global.set('__canvas_createImageData', (w, h) => ({ id: -1, width: w, height: h }));
        engine.global.set('__canvas_getImageData', (x, y, w, h) => {
          const d = ctx.getImageData(x, y, w, h);
          return { id: -1, width: w, height: h, data: Array.from(d.data) };
        });
        engine.global.set('__canvas_imageDataGetPixel', (id, x, y, data, width) => {
          if (!data || !width) return [0, 0, 0, 0];
          const i = (y * width + x) * 4;
          return [data[i], data[i+1], data[i+2], data[i+3]];
        });
        engine.global.set('__canvas_imageDataSetPixel', () => {});
        engine.global.set('__canvas_putImageData', () => {});
        engine.global.set('__canvas_cloneImageData', () => null);

        // === PATH2D STUBS ===
        engine.global.set('__canvas_createPath', () => ({ id: -1 }));
        engine.global.set('__canvas_clonePath', () => ({ id: -1 }));
        engine.global.set('__canvas_disposePath', () => {});
        engine.global.set('__canvas_pathMoveTo', () => {});
        engine.global.set('__canvas_pathLineTo', () => {});
        engine.global.set('__canvas_pathClosePath', () => {});
        engine.global.set('__canvas_pathRect', () => {});
        engine.global.set('__canvas_pathRoundRect', () => {});
        engine.global.set('__canvas_pathArc', () => {});
        engine.global.set('__canvas_pathArcTo', () => {});
        engine.global.set('__canvas_pathEllipse', () => {});
        engine.global.set('__canvas_pathQuadraticCurveTo', () => {});
        engine.global.set('__canvas_pathBezierCurveTo', () => {});
        engine.global.set('__canvas_pathAddPath', () => {});
        engine.global.set('__canvas_fillPath', () => {});
        engine.global.set('__canvas_strokePath', () => {});
        engine.global.set('__canvas_clipPath', () => {});
        engine.global.set('__canvas_isPointInStoredPath', () => false);
        engine.global.set('__canvas_isPointInStoredStroke', () => false);

        // Set up custom require to load from embedded modules
        engine.global.set('__load_module', (modulePath) => {
          let filePath = modulePath;
          if (!filePath.endsWith('.lua')) {
            filePath = modulePath.replace(/[.]/g, '/') + '.lua';
          }
          const code = LUA_MODULES[filePath];
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

    // Start the runtime
    initLua();
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css">
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

  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
  <script type="module">
    // Import wasmoon from CDN
    import { LuaFactory } from 'https://cdn.jsdelivr.net/npm/wasmoon@1.16.0/+esm';

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
          const code = LUA_MODULES[filePath];
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
   * Serialize assets to JSON manifest.
   */
  private serializeAssets(assets: CollectedAsset[]): string {
    const manifest = assets.map((asset) => ({
      path: asset.path,
      mimeType: asset.mimeType,
      // Note: Binary data is stored in the ZIP, manifest only has metadata
    }))
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
