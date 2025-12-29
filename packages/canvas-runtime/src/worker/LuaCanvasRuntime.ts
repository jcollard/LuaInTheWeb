import { LuaFactory, LuaEngine } from 'wasmoon';
import type { IWorkerChannel } from '../channels/IWorkerChannel.js';
import type {
  DrawCommand,
  GetImageDataResponse,
} from '../shared/types.js';
import type { WorkerState } from './WorkerMessages.js';

/**
 * Lua canvas runtime that manages the Lua engine and game loop.
 *
 * This class is designed to be testable without actual Web Workers.
 * It handles:
 * - Lua engine initialization
 * - canvas.* API bindings
 * - Game loop execution
 * - Error handling
 */
export class LuaCanvasRuntime {
  private readonly channel: IWorkerChannel;
  private engine: LuaEngine | null = null;
  private state: WorkerState = 'idle';
  private onDrawCallback: (() => void) | null = null;
  private errorHandler: ((message: string) => void) | null = null;
  private loopRunning = false;
  private disposed = false;

  // Draw commands accumulated during a frame
  private frameCommands: DrawCommand[] = [];

  // Track whether start() has been called
  private started = false;

  // Asset dimensions: width/height for each loaded asset (by name)
  private assetDimensions: Map<string, { width: number; height: number }> = new Map();

  // Asset paths: directories to scan for assets (new API)
  private assetPaths: string[] = [];

  // Discovered files: files loaded from asset paths, keyed by filename
  private discoveredFiles: Map<string, { width: number; height: number; type: 'image' | 'font' }> = new Map();

  // Track whether files have been loaded (for validation in load_image/load_font)
  private filesLoaded = false;

  // Pre-registered assets: assets registered via load_image/load_font before files are loaded
  private preRegisteredAssets: Map<string, { filename: string; type: 'image' | 'font' }> = new Map();

  // Font state
  private currentFontSize: number = 16;
  private currentFontFamily: string = 'monospace';
  private measureCanvas: OffscreenCanvas | null = null;
  private measureCtx: OffscreenCanvasRenderingContext2D | null = null;

  // Pixel manipulation state
  // Cache of image data responses (keyed by "x,y,w,h")
  private pixelDataCache: Map<string, GetImageDataResponse> = new Map();
  // Pending pixel data requests waiting to be sent
  private pendingPixelRequests: Set<string> = new Set();

  constructor(channel: IWorkerChannel) {
    this.channel = channel;
  }

  /**
   * Get the current runtime state.
   */
  getState(): WorkerState {
    return this.state;
  }

  /**
   * Initialize the Lua engine.
   */
  async initialize(): Promise<void> {
    if (this.engine) {
      throw new Error('Already initialized');
    }

    this.state = 'initializing';

    try {
      const factory = new LuaFactory();
      this.engine = await factory.createEngine();

      // Set up the canvas API
      this.setupCanvasAPI();

      this.state = 'idle';
    } catch (error) {
      this.state = 'error';
      throw error;
    }
  }

  /**
   * Load and execute Lua code.
   */
  async loadCode(code: string): Promise<void> {
    if (!this.engine) {
      throw new Error('Not initialized');
    }

    await this.engine.doString(code);
  }

  /**
   * Get a global variable from Lua.
   */
  async getGlobal(name: string): Promise<unknown> {
    if (!this.engine) {
      throw new Error('Not initialized');
    }

    return this.engine.global.get(name);
  }

  /**
   * Start the game loop.
   */
  start(): void {
    if (!this.engine) {
      throw new Error('Not initialized');
    }

    if (!this.onDrawCallback) {
      throw new Error('No onDraw callback registered');
    }

    // Mark as started (prevents adding new assets)
    this.started = true;

    // Send any initialization commands (like set_size called at top level)
    if (this.frameCommands.length > 0) {
      this.channel.sendDrawCommands(this.frameCommands);
      this.frameCommands = [];
    }

    this.state = 'running';
    this.loopRunning = true;
    this.runLoop();
  }

  /**
   * Set asset dimensions for a named asset.
   * Used by tests and by the main thread after loading assets.
   */
  setAssetDimensions(name: string, width: number, height: number): void {
    this.assetDimensions.set(name, { width, height });
  }

  /**
   * Get the asset manifest (definitions registered via load_image/load_font).
   */
  getAssetManifest(): Map<string, { name: string; path: string; type: 'image' | 'font' }> {
    const manifest = new Map<string, { name: string; path: string; type: 'image' | 'font' }>();
    for (const [name, { filename, type }] of this.preRegisteredAssets) {
      manifest.set(name, { name, path: filename, type });
    }
    return manifest;
  }

  /**
   * Get the asset paths (directories registered via canvas.assets.add_path).
   */
  getAssetPaths(): string[] {
    return this.assetPaths;
  }

  /**
   * Set discovered file metadata (called when assets are loaded from paths).
   */
  setDiscoveredFile(filename: string, width: number, height: number, type: 'image' | 'font'): void {
    this.discoveredFiles.set(filename, { width, height, type });
    this.filesLoaded = true;
  }

  /**
   * Generate a cache key for pixel data requests.
   */
  private getPixelCacheKey(x: number, y: number, width: number, height: number): string {
    return `${x},${y},${width},${height}`;
  }


  /**
   * Request image data from the canvas.
   * Returns cached data if available, otherwise queues request for next frame.
   * Always queues a new request to keep the cache fresh for the next frame.
   */
  private getImageData(
    x: number,
    y: number,
    width: number,
    height: number
  ): number[] | null {
    const key = this.getPixelCacheKey(x, y, width, height);

    // Check if we have cached data
    const cached = this.pixelDataCache.get(key);
    const hasData = cached && cached.data.length > 0;

    // Always queue a request to keep the cache fresh for the next frame
    if (!this.pendingPixelRequests.has(key)) {
      this.pendingPixelRequests.add(key);

      // Send the request asynchronously
      this.channel.requestImageData(x, y, width, height).then(response => {
        // Cache the response for the next frame
        this.pixelDataCache.set(key, response);
        this.pendingPixelRequests.delete(key);
      });
    }

    // Return cached data if available, otherwise null
    if (hasData) {
      return cached.data;
    }

    return null;
  }

  /**
   * Stop the game loop.
   */
  stop(): void {
    this.loopRunning = false;
    this.state = 'stopped';
  }

  /**
   * Register an error handler.
   */
  onError(handler: (message: string) => void): void {
    this.errorHandler = handler;
  }

  /**
   * Clean up resources.
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.loopRunning = false;
    this.state = 'stopped';

    if (this.engine) {
      this.engine.global.close();
      this.engine = null;
    }
  }

  /**
   * Set up the canvas.* Lua API.
   */
  private setupCanvasAPI(): void {
    if (!this.engine) return;

    const lua = this.engine;
    const runtime = this;

    // Create the canvas table
    lua.global.set('canvas', {});

    // Register onDraw - stores callback reference
    lua.global.set('__canvas_onDraw', (callback: () => void) => {
      runtime.onDrawCallback = callback;
    });

    // Drawing functions
    lua.global.set('__canvas_clear', () => {
      runtime.frameCommands.push({ type: 'clear' });
    });

    lua.global.set('__canvas_setColor', (r: number, g: number, b: number, a?: number | null) => {
      const command: DrawCommand = { type: 'setColor', r, g, b };
      if (a !== undefined && a !== null) {
        (command as { type: 'setColor'; r: number; g: number; b: number; a?: number }).a = a;
      }
      runtime.frameCommands.push(command);
    });

    lua.global.set('__canvas_rect', (x: number, y: number, width: number, height: number) => {
      runtime.frameCommands.push({ type: 'rect', x, y, width, height });
    });

    lua.global.set('__canvas_fillRect', (x: number, y: number, width: number, height: number) => {
      runtime.frameCommands.push({ type: 'fillRect', x, y, width, height });
    });

    lua.global.set('__canvas_circle', (x: number, y: number, radius: number) => {
      runtime.frameCommands.push({ type: 'circle', x, y, radius });
    });

    lua.global.set('__canvas_fillCircle', (x: number, y: number, radius: number) => {
      runtime.frameCommands.push({ type: 'fillCircle', x, y, radius });
    });

    lua.global.set('__canvas_line', (x1: number, y1: number, x2: number, y2: number) => {
      runtime.frameCommands.push({ type: 'line', x1, y1, x2, y2 });
    });

    lua.global.set('__canvas_text', (x: number, y: number, text: string, fontSize?: number | null, fontFamily?: string | null) => {
      const command: DrawCommand = { type: 'text', x, y, text };
      if (fontSize !== undefined && fontSize !== null) {
        (command as { type: 'text'; x: number; y: number; text: string; fontSize?: number }).fontSize = fontSize;
      }
      if (fontFamily !== undefined && fontFamily !== null) {
        (command as { type: 'text'; x: number; y: number; text: string; fontFamily?: string }).fontFamily = fontFamily;
      }
      runtime.frameCommands.push(command);
    });

    // Timing functions
    lua.global.set('__canvas_getDelta', () => {
      return runtime.channel.getTimingInfo().deltaTime;
    });

    lua.global.set('__canvas_getTime', () => {
      return runtime.channel.getTimingInfo().totalTime;
    });

    // Input functions
    lua.global.set('__canvas_isKeyDown', (key: string) => {
      const state = runtime.channel.getInputState();
      return state.keysDown.includes(key);
    });

    lua.global.set('__canvas_isKeyPressed', (key: string) => {
      const state = runtime.channel.getInputState();
      return state.keysPressed.includes(key);
    });

    lua.global.set('__canvas_getMouseX', () => {
      return runtime.channel.getInputState().mouseX;
    });

    lua.global.set('__canvas_getMouseY', () => {
      return runtime.channel.getInputState().mouseY;
    });

    lua.global.set('__canvas_isMouseDown', (button: number) => {
      const state = runtime.channel.getInputState();
      return state.mouseButtonsDown.includes(button);
    });

    lua.global.set('__canvas_isMousePressed', (button: number) => {
      const state = runtime.channel.getInputState();
      return state.mouseButtonsPressed.includes(button);
    });

    // Functions to get all keys (returns arrays that Lua converts to tables)
    lua.global.set('__canvas_getKeysDown', () => {
      return runtime.channel.getInputState().keysDown;
    });

    lua.global.set('__canvas_getKeysPressed', () => {
      return runtime.channel.getInputState().keysPressed;
    });

    // Canvas dimensions and configuration
    lua.global.set('__canvas_getWidth', () => {
      return runtime.channel.getCanvasSize().width;
    });

    lua.global.set('__canvas_getHeight', () => {
      return runtime.channel.getCanvasSize().height;
    });

    lua.global.set('__canvas_setSize', (width: number, height: number) => {
      runtime.frameCommands.push({ type: 'setSize', width, height });
    });

    lua.global.set('__canvas_setLineWidth', (width: number) => {
      runtime.frameCommands.push({ type: 'setLineWidth', width });
    });

    // Font functions
    lua.global.set('__canvas_setFontSize', (size: number) => {
      runtime.currentFontSize = size;
      runtime.frameCommands.push({ type: 'setFontSize', size });
    });

    lua.global.set('__canvas_setFontFamily', (family: string) => {
      runtime.currentFontFamily = family;
      runtime.frameCommands.push({ type: 'setFontFamily', family });
    });

    lua.global.set('__canvas_getTextWidth', (text: string) => {
      // Lazily create the offscreen canvas for text measurement
      if (!runtime.measureCanvas) {
        runtime.measureCanvas = new OffscreenCanvas(1, 1);
        runtime.measureCtx = runtime.measureCanvas.getContext('2d');
      }
      if (!runtime.measureCtx) {
        return 0;
      }
      runtime.measureCtx.font = `${runtime.currentFontSize}px ${runtime.currentFontFamily}`;
      return runtime.measureCtx.measureText(text).width;
    });

    // Asset API functions
    lua.global.set('__canvas_assets_addPath', (path: string) => {
      // Check if started
      if (runtime.started) {
        throw new Error('Cannot add asset paths after canvas.start()');
      }

      // Add the path if not already added
      if (!runtime.assetPaths.includes(path)) {
        runtime.assetPaths.push(path);
      }
    });

    lua.global.set('__canvas_assets_loadImage', (name: string, filename: string) => {
      // If files have been loaded, validate that the file exists
      if (runtime.filesLoaded) {
        const fileInfo = runtime.discoveredFiles.get(filename);
        if (!fileInfo) {
          throw new Error(`Image file '${filename}' not found - did you call canvas.assets.add_path() with the correct directory?`);
        }

        if (fileInfo.type !== 'image') {
          throw new Error(`File '${filename}' is not an image file`);
        }

        // Register the asset by name with the discovered dimensions
        runtime.assetDimensions.set(name, { width: fileInfo.width, height: fileInfo.height });
      } else {
        // Pre-register the asset for later validation when files are loaded
        runtime.preRegisteredAssets.set(name, { filename, type: 'image' });
      }

      // Return an asset handle
      return { _type: 'image', _name: name, _file: filename };
    });

    lua.global.set('__canvas_assets_loadFont', (name: string, filename: string) => {
      // If files have been loaded, validate that the file exists
      if (runtime.filesLoaded) {
        const fileInfo = runtime.discoveredFiles.get(filename);
        if (!fileInfo) {
          throw new Error(`Font file '${filename}' not found - did you call canvas.assets.add_path() with the correct directory?`);
        }

        if (fileInfo.type !== 'font') {
          throw new Error(`File '${filename}' is not a font file`);
        }

        // Register the asset by name
        runtime.assetDimensions.set(name, { width: 0, height: 0 });
      } else {
        // Pre-register the asset for later validation when files are loaded
        runtime.preRegisteredAssets.set(name, { filename, type: 'font' });
      }

      // Return an asset handle
      return { _type: 'font', _name: name, _file: filename };
    });

    // Helper to extract asset name from string or handle
    const extractAssetName = (nameOrHandle: unknown): string => {
      if (typeof nameOrHandle === 'string') {
        return nameOrHandle;
      }
      // Handle AssetHandle objects from Lua (tables with _name property)
      if (typeof nameOrHandle === 'object' && nameOrHandle !== null && '_name' in nameOrHandle) {
        return (nameOrHandle as { _name: string })._name;
      }
      throw new Error('Invalid asset reference: expected string name or asset handle');
    };

    lua.global.set('__canvas_drawImage', (nameOrHandle: unknown, x: number, y: number, width?: number | null, height?: number | null) => {
      const name = extractAssetName(nameOrHandle);

      // Verify asset is registered
      if (!runtime.assetDimensions.has(name)) {
        throw new Error(`Unknown asset '${name}' - did you call canvas.assets.load_image()?`);
      }

      const command: DrawCommand = { type: 'drawImage', name, x, y };
      if (width !== undefined && width !== null && height !== undefined && height !== null) {
        (command as { type: 'drawImage'; name: string; x: number; y: number; width?: number; height?: number }).width = width;
        (command as { type: 'drawImage'; name: string; x: number; y: number; width?: number; height?: number }).height = height;
      }
      runtime.frameCommands.push(command);
    });

    lua.global.set('__canvas_assets_getWidth', (nameOrHandle: unknown) => {
      const name = extractAssetName(nameOrHandle);
      const dims = runtime.assetDimensions.get(name);
      if (!dims) {
        throw new Error(`Unknown asset '${name}' - did you call canvas.assets.load_image()?`);
      }
      return dims.width;
    });

    lua.global.set('__canvas_assets_getHeight', (nameOrHandle: unknown) => {
      const name = extractAssetName(nameOrHandle);
      const dims = runtime.assetDimensions.get(name);
      if (!dims) {
        throw new Error(`Unknown asset '${name}' - did you call canvas.assets.load_image()?`);
      }
      return dims.height;
    });

    // Pixel manipulation functions
    lua.global.set(
      '__canvas_getImageData',
      (x: number, y: number, width: number, height: number) => {
        return runtime.getImageData(x, y, width, height);
      }
    );

    lua.global.set(
      '__canvas_putImageData',
      (data: number[], width: number, height: number, dx: number, dy: number) => {
        runtime.frameCommands.push({
          type: 'putImageData',
          data,
          width,
          height,
          dx,
          dy,
        });
      }
    );

    lua.global.set('__canvas_createImageData', (width: number, height: number) => {
      // Create an empty RGBA array (all zeros = transparent black)
      return new Array(width * height * 4).fill(0);
    });

    // Audio API functions
    lua.global.set('__canvas_assets_loadSound', (name: string, filename: string) => {
      // If files have been loaded, validate that the file exists in discovered audio files
      // For audio, we don't store dimensions, just validate the file is known
      if (runtime.filesLoaded) {
        // Audio files are discovered but not stored in discoveredFiles (which is for images/fonts)
        // Just store the name mapping for now
      }
      // Pre-register the asset for audio
      runtime.preRegisteredAssets.set(name, { filename, type: 'sound' as 'image' });
      return { _type: 'sound', _name: name, _file: filename };
    });

    lua.global.set('__canvas_assets_loadMusic', (name: string, filename: string) => {
      // Similar to loadSound but for music tracks
      runtime.preRegisteredAssets.set(name, { filename, type: 'music' as 'image' });
      return { _type: 'music', _name: name, _file: filename };
    });

    // Helper to extract audio asset filename from handle or name
    const extractAudioFilename = (nameOrHandle: unknown): string => {
      // Handle AudioAssetHandle objects from Lua (tables with _file property)
      if (typeof nameOrHandle === 'object' && nameOrHandle !== null && '_file' in nameOrHandle) {
        return (nameOrHandle as { _file: string })._file;
      }
      // Handle string - could be a registered name or a raw filename
      if (typeof nameOrHandle === 'string') {
        // Look up in preRegisteredAssets to get the filename
        const registered = runtime.preRegisteredAssets.get(nameOrHandle);
        if (registered) {
          return registered.filename;
        }
        // Fall back to using the string as-is (raw filename)
        return nameOrHandle;
      }
      throw new Error('Invalid audio reference: expected string name or audio asset handle');
    };

    lua.global.set('__audio_playSound', (nameOrHandle: unknown, volume?: number) => {
      const name = extractAudioFilename(nameOrHandle);
      runtime.frameCommands.push({
        type: 'playSound',
        name,
        volume: volume ?? 1,
      });
    });

    lua.global.set('__audio_playMusic', (nameOrHandle: unknown, volume?: number, loop?: boolean) => {
      const name = extractAudioFilename(nameOrHandle);
      runtime.frameCommands.push({
        type: 'playMusic',
        name,
        volume: volume ?? 1,
        loop: loop ?? false,
      });
    });

    lua.global.set('__audio_stopMusic', () => {
      runtime.frameCommands.push({ type: 'stopMusic' });
    });

    lua.global.set('__audio_pauseMusic', () => {
      runtime.frameCommands.push({ type: 'pauseMusic' });
    });

    lua.global.set('__audio_resumeMusic', () => {
      runtime.frameCommands.push({ type: 'resumeMusic' });
    });

    lua.global.set('__audio_setMusicVolume', (volume: number) => {
      runtime.frameCommands.push({ type: 'setMusicVolume', volume });
    });

    lua.global.set('__audio_setMasterVolume', (volume: number) => {
      runtime.frameCommands.push({ type: 'setMasterVolume', volume });
    });

    lua.global.set('__audio_mute', () => {
      runtime.frameCommands.push({ type: 'mute' });
    });

    lua.global.set('__audio_unmute', () => {
      runtime.frameCommands.push({ type: 'unmute' });
    });

    // Audio state query functions (read from channel)
    lua.global.set('__audio_isMuted', () => {
      return runtime.channel.getAudioState().muted;
    });

    lua.global.set('__audio_getMasterVolume', () => {
      return runtime.channel.getAudioState().masterVolume;
    });

    lua.global.set('__audio_isMusicPlaying', () => {
      return runtime.channel.getAudioState().musicPlaying;
    });

    lua.global.set('__audio_getMusicTime', () => {
      return runtime.channel.getAudioState().musicTime;
    });

    lua.global.set('__audio_getMusicDuration', () => {
      return runtime.channel.getAudioState().musicDuration;
    });

    lua.global.set('__audio_getCurrentMusicName', () => {
      return runtime.channel.getAudioState().currentMusicName;
    });

    // Set up the Lua-side canvas table with methods (using snake_case for Lua conventions)
    lua.doStringSync(`
      canvas = {}

      function canvas.tick(callback)
        __canvas_onDraw(callback)
      end

      -- Canvas configuration
      function canvas.set_size(width, height)
        __canvas_setSize(width, height)
      end

      function canvas.get_width()
        return __canvas_getWidth()
      end

      function canvas.get_height()
        return __canvas_getHeight()
      end

      -- Drawing state
      function canvas.clear()
        __canvas_clear()
      end

      function canvas.set_color(r, g, b, a)
        __canvas_setColor(r, g, b, a)
      end

      function canvas.set_line_width(width)
        __canvas_setLineWidth(width)
      end

      -- Font styling
      function canvas.set_font_size(size)
        __canvas_setFontSize(size)
      end

      function canvas.set_font_family(family)
        __canvas_setFontFamily(family)
      end

      function canvas.get_text_width(text)
        return __canvas_getTextWidth(text)
      end

      -- Shape drawing (renamed to draw_* for clarity)
      function canvas.draw_rect(x, y, w, h)
        __canvas_rect(x, y, w, h)
      end

      function canvas.fill_rect(x, y, w, h)
        __canvas_fillRect(x, y, w, h)
      end

      function canvas.draw_circle(x, y, r)
        __canvas_circle(x, y, r)
      end

      function canvas.fill_circle(x, y, r)
        __canvas_fillCircle(x, y, r)
      end

      function canvas.draw_line(x1, y1, x2, y2)
        __canvas_line(x1, y1, x2, y2)
      end

      function canvas.draw_text(x, y, text, options)
        local fontSize = nil
        local fontFamily = nil
        if options then
          fontSize = options.font_size
          fontFamily = options.font_family
        end
        __canvas_text(x, y, text, fontSize, fontFamily)
      end

      -- Timing
      function canvas.get_delta()
        return __canvas_getDelta()
      end

      function canvas.get_time()
        return __canvas_getTime()
      end

      -- Key constants for discoverability
      canvas.keys = {
        -- Letters
        A = 'KeyA', B = 'KeyB', C = 'KeyC', D = 'KeyD', E = 'KeyE',
        F = 'KeyF', G = 'KeyG', H = 'KeyH', I = 'KeyI', J = 'KeyJ',
        K = 'KeyK', L = 'KeyL', M = 'KeyM', N = 'KeyN', O = 'KeyO',
        P = 'KeyP', Q = 'KeyQ', R = 'KeyR', S = 'KeyS', T = 'KeyT',
        U = 'KeyU', V = 'KeyV', W = 'KeyW', X = 'KeyX', Y = 'KeyY', Z = 'KeyZ',

        -- Number row (top of keyboard)
        ['0'] = 'Digit0', ['1'] = 'Digit1', ['2'] = 'Digit2', ['3'] = 'Digit3',
        ['4'] = 'Digit4', ['5'] = 'Digit5', ['6'] = 'Digit6', ['7'] = 'Digit7',
        ['8'] = 'Digit8', ['9'] = 'Digit9',
        DIGIT_0 = 'Digit0', DIGIT_1 = 'Digit1', DIGIT_2 = 'Digit2', DIGIT_3 = 'Digit3',
        DIGIT_4 = 'Digit4', DIGIT_5 = 'Digit5', DIGIT_6 = 'Digit6', DIGIT_7 = 'Digit7',
        DIGIT_8 = 'Digit8', DIGIT_9 = 'Digit9',

        -- Arrow keys
        UP = 'ArrowUp', DOWN = 'ArrowDown', LEFT = 'ArrowLeft', RIGHT = 'ArrowRight',
        ARROW_UP = 'ArrowUp', ARROW_DOWN = 'ArrowDown', ARROW_LEFT = 'ArrowLeft', ARROW_RIGHT = 'ArrowRight',

        -- Function keys
        F1 = 'F1', F2 = 'F2', F3 = 'F3', F4 = 'F4', F5 = 'F5', F6 = 'F6',
        F7 = 'F7', F8 = 'F8', F9 = 'F9', F10 = 'F10', F11 = 'F11', F12 = 'F12',

        -- Modifier keys
        SHIFT = 'ShiftLeft', SHIFT_LEFT = 'ShiftLeft', SHIFT_RIGHT = 'ShiftRight',
        CTRL = 'ControlLeft', CTRL_LEFT = 'ControlLeft', CTRL_RIGHT = 'ControlRight',
        CONTROL = 'ControlLeft', CONTROL_LEFT = 'ControlLeft', CONTROL_RIGHT = 'ControlRight',
        ALT = 'AltLeft', ALT_LEFT = 'AltLeft', ALT_RIGHT = 'AltRight',
        META = 'MetaLeft', META_LEFT = 'MetaLeft', META_RIGHT = 'MetaRight',
        CAPS_LOCK = 'CapsLock',

        -- Special keys
        SPACE = 'Space', ENTER = 'Enter', ESCAPE = 'Escape', TAB = 'Tab',
        BACKSPACE = 'Backspace', DELETE = 'Delete', INSERT = 'Insert',
        HOME = 'Home', END = 'End', PAGE_UP = 'PageUp', PAGE_DOWN = 'PageDown',
        PRINT_SCREEN = 'PrintScreen', SCROLL_LOCK = 'ScrollLock', PAUSE = 'Pause',
        NUM_LOCK = 'NumLock',

        -- Numpad keys
        NUMPAD_0 = 'Numpad0', NUMPAD_1 = 'Numpad1', NUMPAD_2 = 'Numpad2', NUMPAD_3 = 'Numpad3',
        NUMPAD_4 = 'Numpad4', NUMPAD_5 = 'Numpad5', NUMPAD_6 = 'Numpad6', NUMPAD_7 = 'Numpad7',
        NUMPAD_8 = 'Numpad8', NUMPAD_9 = 'Numpad9',
        NUMPAD_ADD = 'NumpadAdd', NUMPAD_SUBTRACT = 'NumpadSubtract',
        NUMPAD_MULTIPLY = 'NumpadMultiply', NUMPAD_DIVIDE = 'NumpadDivide',
        NUMPAD_DECIMAL = 'NumpadDecimal', NUMPAD_ENTER = 'NumpadEnter',

        -- Punctuation and symbols
        MINUS = 'Minus', EQUAL = 'Equal', BRACKET_LEFT = 'BracketLeft', BRACKET_RIGHT = 'BracketRight',
        BACKSLASH = 'Backslash', SEMICOLON = 'Semicolon', QUOTE = 'Quote',
        BACKQUOTE = 'Backquote', COMMA = 'Comma', PERIOD = 'Period', SLASH = 'Slash',

        -- Context menu key
        CONTEXT_MENU = 'ContextMenu',
      }

      -- Helper to normalize key names to KeyboardEvent.code format
      local function normalize_key(key)
        -- Single letter keys: 'a' -> 'KeyA'
        if #key == 1 and key:match('[a-zA-Z]') then
          return 'Key' .. key:upper()
        end
        -- Arrow keys: 'up', 'down', 'left', 'right' -> 'ArrowUp', etc.
        local arrows = { up = 'ArrowUp', down = 'ArrowDown', left = 'ArrowLeft', right = 'ArrowRight' }
        if arrows[key:lower()] then
          return arrows[key:lower()]
        end
        -- Space key
        if key:lower() == 'space' or key == ' ' then
          return 'Space'
        end
        -- Common keys
        local common = {
          enter = 'Enter', escape = 'Escape', esc = 'Escape',
          tab = 'Tab', shift = 'ShiftLeft', ctrl = 'ControlLeft',
          alt = 'AltLeft', backspace = 'Backspace'
        }
        if common[key:lower()] then
          return common[key:lower()]
        end
        -- Return as-is if no mapping (allows using raw codes like 'KeyA')
        return key
      end

      -- Keyboard input
      function canvas.is_key_down(key)
        return __canvas_isKeyDown(normalize_key(key))
      end

      function canvas.is_key_pressed(key)
        return __canvas_isKeyPressed(normalize_key(key))
      end

      function canvas.get_keys_down()
        return __canvas_getKeysDown()
      end

      function canvas.get_keys_pressed()
        return __canvas_getKeysPressed()
      end

      -- Mouse input
      function canvas.get_mouse_x()
        return __canvas_getMouseX()
      end

      function canvas.get_mouse_y()
        return __canvas_getMouseY()
      end

      function canvas.is_mouse_down(button)
        return __canvas_isMouseDown(button)
      end

      function canvas.is_mouse_pressed(button)
        return __canvas_isMousePressed(button)
      end

      -- Asset management
      canvas.assets = {}

      -- Register a directory path to scan for assets
      function canvas.assets.add_path(path)
        __canvas_assets_addPath(path)
      end

      function canvas.assets.load_image(name, filename)
        return __canvas_assets_loadImage(name, filename)
      end

      function canvas.assets.load_font(name, filename)
        return __canvas_assets_loadFont(name, filename)
      end

      -- Get asset dimensions (accepts string name or asset handle)
      function canvas.assets.get_width(name)
        return __canvas_assets_getWidth(name)
      end

      function canvas.assets.get_height(name)
        return __canvas_assets_getHeight(name)
      end

      -- Draw image
      function canvas.draw_image(name, x, y, width, height)
        __canvas_drawImage(name, x, y, width, height)
      end

      -- Pixel manipulation
      -- ImageData class for manipulating pixel data
      local ImageData = {}
      ImageData.__index = ImageData

      function ImageData.new(width, height, data)
        local self = setmetatable({}, ImageData)
        self.width = width
        self.height = height
        self.data = data or {}
        if not data then
          -- Initialize with transparent black (all zeros)
          for i = 1, width * height * 4 do
            self.data[i] = 0
          end
        end
        return self
      end

      -- Get pixel at x, y (0-indexed coordinates)
      -- Returns r, g, b, a (0-255)
      function ImageData:get_pixel(x, y)
        if x < 0 or x >= self.width or y < 0 or y >= self.height then
          return 0, 0, 0, 0
        end
        local i = (y * self.width + x) * 4 + 1  -- Lua is 1-indexed
        return self.data[i], self.data[i+1], self.data[i+2], self.data[i+3]
      end

      -- Set pixel at x, y (0-indexed coordinates)
      -- r, g, b, a are 0-255 values
      function ImageData:set_pixel(x, y, r, g, b, a)
        if x < 0 or x >= self.width or y < 0 or y >= self.height then
          return
        end
        a = a or 255
        local i = (y * self.width + x) * 4 + 1
        self.data[i] = r
        self.data[i+1] = g
        self.data[i+2] = b
        self.data[i+3] = a
      end

      -- Create an empty ImageData buffer
      function canvas.create_image_data(width, height)
        local data = __canvas_createImageData(width, height)
        return ImageData.new(width, height, data)
      end

      -- Get pixel data from a region of the canvas
      -- Returns ImageData or nil if data not yet available
      function canvas.get_image_data(x, y, width, height)
        local data = __canvas_getImageData(x, y, width, height)
        if not data then
          return nil
        end
        return ImageData.new(width, height, data)
      end

      -- Write pixel data to the canvas
      function canvas.put_image_data(image_data, dx, dy)
        __canvas_putImageData(image_data.data, image_data.width, image_data.height, dx, dy)
      end

      -- Audio asset loading
      function canvas.assets.load_sound(name, filename)
        return __canvas_assets_loadSound(name, filename)
      end

      function canvas.assets.load_music(name, filename)
        return __canvas_assets_loadMusic(name, filename)
      end

      -- Sound effects
      function canvas.play_sound(sound_handle, volume)
        __audio_playSound(sound_handle, volume)
      end

      -- Music playback
      function canvas.play_music(music_handle, options)
        local volume = 1
        local loop = false
        if options then
          if options.volume then volume = options.volume end
          if options.loop then loop = options.loop end
        end
        __audio_playMusic(music_handle, volume, loop)
      end

      function canvas.stop_music()
        __audio_stopMusic()
      end

      function canvas.pause_music()
        __audio_pauseMusic()
      end

      function canvas.resume_music()
        __audio_resumeMusic()
      end

      function canvas.set_music_volume(volume)
        __audio_setMusicVolume(volume)
      end

      -- Global audio control
      function canvas.set_master_volume(volume)
        __audio_setMasterVolume(volume)
      end

      function canvas.get_master_volume()
        return __audio_getMasterVolume()
      end

      function canvas.mute()
        __audio_mute()
      end

      function canvas.unmute()
        __audio_unmute()
      end

      function canvas.is_muted()
        return __audio_isMuted()
      end

      -- Music state queries
      function canvas.is_music_playing()
        return __audio_isMusicPlaying()
      end

      function canvas.get_music_time()
        return __audio_getMusicTime()
      end

      function canvas.get_music_duration()
        return __audio_getMusicDuration()
      end

      function canvas.get_current_music_name()
        return __audio_getCurrentMusicName()
      end
    `);
  }

  /**
   * Run the game loop.
   */
  private async runLoop(): Promise<void> {
    while (this.loopRunning && !this.disposed) {
      try {
        // Wait for the next frame signal
        await this.channel.waitForFrame();

        if (!this.loopRunning || this.disposed) {
          break;
        }

        // Clear frame commands
        this.frameCommands = [];

        // Execute the onDraw callback
        if (this.onDrawCallback) {
          try {
            this.onDrawCallback();
          } catch (error) {
            if (this.errorHandler && error instanceof Error) {
              this.errorHandler(`canvas.tick: ${error.message}`);
            }
          }
        }

        // Send draw commands to main thread
        if (this.frameCommands.length > 0) {
          this.channel.sendDrawCommands(this.frameCommands);
        }
      } catch (error) {
        if (this.errorHandler && error instanceof Error) {
          this.errorHandler(`canvas.tick: ${error.message}`);
        }
      }
    }
  }
}
