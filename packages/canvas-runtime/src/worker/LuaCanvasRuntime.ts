import { LuaFactory, LuaEngine } from 'wasmoon';
import type { IWorkerChannel } from '../channels/IWorkerChannel.js';
import type { DrawCommand } from '../shared/types.js';
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

    this.state = 'running';
    this.loopRunning = true;
    this.runLoop();
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

    // Set up the Lua-side canvas table with methods (using snake_case for Lua conventions)
    lua.doStringSync(`
      canvas = {}

      function canvas.on_draw(callback)
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

      -- Keyboard input
      function canvas.is_key_down(key)
        return __canvas_isKeyDown(key)
      end

      function canvas.is_key_pressed(key)
        return __canvas_isKeyPressed(key)
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
