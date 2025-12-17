import { LuaFactory, LuaEngine } from 'wasmoon';
import type { IWorkerChannel } from '../channels/IWorkerChannel.js';
import type { DrawCommand, AssetDefinition } from '../shared/types.js';
import type { WorkerState } from './WorkerMessages.js';

/** Valid image extensions for canvas.assets.image() */
const VALID_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

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

  // Asset manifest: registered asset definitions
  private assetManifest: Map<string, AssetDefinition> = new Map();

  // Asset dimensions: width/height for each loaded asset
  private assetDimensions: Map<string, { width: number; height: number }> = new Map();

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
   * Get the asset manifest (definitions registered via canvas.assets.image).
   */
  getAssetManifest(): Map<string, AssetDefinition> {
    return this.assetManifest;
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

    lua.global.set('__canvas_text', (x: number, y: number, text: string) => {
      runtime.frameCommands.push({ type: 'text', x, y, text });
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

    // Asset API functions
    lua.global.set('__canvas_assets_image', (name: string, path: string) => {
      // Check if started
      if (runtime.started) {
        throw new Error('Cannot define assets after canvas.start()');
      }

      // Validate image extension
      const lowerPath = path.toLowerCase();
      const hasValidExtension = VALID_IMAGE_EXTENSIONS.some((ext) =>
        lowerPath.endsWith(ext)
      );
      if (!hasValidExtension) {
        throw new Error(
          `Cannot load '${path}': unsupported format (expected PNG, JPG, GIF, or WebP)`
        );
      }

      // Register the asset definition
      runtime.assetManifest.set(name, { name, path, type: 'image' });
    });

    lua.global.set('__canvas_drawImage', (name: string, x: number, y: number, width?: number | null, height?: number | null) => {
      // Verify asset is registered
      if (!runtime.assetDimensions.has(name)) {
        throw new Error(`Unknown asset '${name}' - did you call canvas.assets.image()?`);
      }

      const command: DrawCommand = { type: 'drawImage', name, x, y };
      if (width !== undefined && width !== null && height !== undefined && height !== null) {
        (command as { type: 'drawImage'; name: string; x: number; y: number; width?: number; height?: number }).width = width;
        (command as { type: 'drawImage'; name: string; x: number; y: number; width?: number; height?: number }).height = height;
      }
      runtime.frameCommands.push(command);
    });

    lua.global.set('__canvas_assets_getWidth', (name: string) => {
      const dims = runtime.assetDimensions.get(name);
      if (!dims) {
        throw new Error(`Unknown asset '${name}' - did you call canvas.assets.image()?`);
      }
      return dims.width;
    });

    lua.global.set('__canvas_assets_getHeight', (name: string) => {
      const dims = runtime.assetDimensions.get(name);
      if (!dims) {
        throw new Error(`Unknown asset '${name}' - did you call canvas.assets.image()?`);
      }
      return dims.height;
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

      function canvas.draw_text(x, y, text)
        __canvas_text(x, y, text)
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

      function canvas.assets.image(name, path)
        __canvas_assets_image(name, path)
      end

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
              this.errorHandler(error.message);
            }
          }
        }

        // Send draw commands to main thread
        if (this.frameCommands.length > 0) {
          this.channel.sendDrawCommands(this.frameCommands);
        }
      } catch (error) {
        if (this.errorHandler && error instanceof Error) {
          this.errorHandler(error.message);
        }
      }
    }
  }
}
