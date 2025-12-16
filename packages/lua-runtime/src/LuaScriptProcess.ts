/**
 * Lua script execution process implementing IProcess interface.
 * Executes a Lua script file and exits when complete.
 */

import type { IProcess, ShellContext } from '@lua-learning/shell-core'
import type { LuaEngine } from 'wasmoon'
import {
  LuaEngineFactory,
  formatLuaError,
  type LuaEngineCallbacks,
  type LuaEngineOptions,
  type ExecutionControlOptions,
} from './LuaEngineFactory'
import { resolvePath } from '@lua-learning/shell-core'
import { CanvasController, type CanvasCallbacks } from './CanvasController'

/**
 * Options for configuring the Lua script process.
 */
export interface LuaScriptProcessOptions extends ExecutionControlOptions {
  /** Callbacks for canvas tab management (enables canvas.start()/stop()) */
  canvasCallbacks?: CanvasCallbacks
}

/**
 * Process that executes a Lua script file.
 * Reads the script from the filesystem, executes it, and exits.
 */
export class LuaScriptProcess implements IProcess {
  private engine: LuaEngine | null = null
  private running = false
  private inputQueue: Array<{
    resolve: (value: string) => void
    reject: (error: Error) => void
    charCount?: number
  }> = []
  private hasError = false
  private readonly options: LuaScriptProcessOptions
  private canvasController: CanvasController | null = null

  /**
   * Callback invoked when the process produces output.
   */
  onOutput: (text: string) => void = () => {}

  /**
   * Callback invoked when the process produces an error.
   */
  onError: (text: string) => void = () => {}

  /**
   * Callback invoked when the process exits.
   */
  onExit: (code: number) => void = () => {}

  /**
   * Callback invoked when the process requests input (io.read).
   * @param charCount - If provided, the process expects exactly this many characters
   *                    (character mode - no Enter required). If undefined, expects
   *                    a full line (line mode - wait for Enter).
   */
  onRequestInput: (charCount?: number) => void = () => {}

  constructor(
    private readonly filename: string,
    private readonly context: ShellContext,
    options?: LuaScriptProcessOptions
  ) {
    this.options = options ?? {}
  }

  /**
   * Start the script process.
   * Reads and executes the Lua script file.
   */
  start(): void {
    if (this.running) return

    this.running = true
    this.hasError = false
    this.executeScript()
  }

  /**
   * Stop the script process.
   * Interrupts script execution and cleans up.
   * Requests cooperative stop for any running code via debug hook.
   */
  stop(): void {
    if (!this.running) return

    this.running = false

    // Stop any running canvas first
    if (this.canvasController?.isActive()) {
      this.canvasController.stop()
    }
    this.canvasController = null

    // Request stop from any running Lua code via debug hook
    // This sets a flag that the debug hook checks periodically
    if (this.engine) {
      try {
        this.engine.doString('__request_stop()')
      } catch {
        // Ignore errors - engine may be in invalid state
      }
    }

    // Reject any pending input requests
    for (const pending of this.inputQueue) {
      pending.reject(new Error('Process stopped'))
    }
    this.inputQueue = []

    const engineToClose = this.engine
    this.engine = null
    LuaEngineFactory.closeDeferred(engineToClose)

    this.onExit(0)
  }

  /**
   * Check if the process is currently running.
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Handle input from the user.
   * Routes input to io.read() if the script is waiting.
   */
  handleInput(input: string): void {
    if (!this.running) return

    // If there's a pending io.read(), resolve it
    if (this.inputQueue.length > 0) {
      const pending = this.inputQueue.shift()
      if (pending) {
        pending.resolve(input)
      }
    }
  }

  /**
   * Execute the script file.
   * Wraps execution with debug hooks for instruction limiting.
   *
   * NOTE: Due to wasmoon limitations, debug hooks don't persist across doString calls.
   * We wrap the script content with hook setup/teardown in a single Lua chunk.
   */
  private async executeScript(): Promise<void> {
    // Resolve the file path
    const filepath = this.resolvePath(this.filename)

    // Check if file exists
    if (!this.context.filesystem.exists(filepath)) {
      this.onError(formatLuaError(`File not found: ${this.filename}`) + '\n')
      this.exitWithCode(1)
      return
    }

    // Check if it's a file (not a directory)
    if (this.context.filesystem.isDirectory(filepath)) {
      this.onError(formatLuaError(`${this.filename} is not a file`) + '\n')
      this.exitWithCode(1)
      return
    }

    // Read the script content
    let scriptContent: string
    try {
      scriptContent = this.context.filesystem.readFile(filepath)
    } catch (error) {
      this.onError(formatLuaError(`Failed to read file: ${error}`) + '\n')
      this.exitWithCode(1)
      return
    }

    // Create engine and execute
    // With load(), the script content has its own chunk name so line numbers are preserved
    const LINE_OFFSET = 0
    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => this.onOutput(text),
      onError: (text: string) => {
        this.hasError = true
        // Adjust line numbers in error messages to account for wrapper lines
        const adjustedError = this.adjustErrorLineNumber(text, LINE_OFFSET)
        this.onError(formatLuaError(adjustedError) + '\n')
      },
      onReadInput: (charCount?: number) => this.waitForInput(charCount),
      onInstructionLimitReached: this.options.onInstructionLimitReached,
      // Enable require() to load modules from the virtual file system
      fileReader: (path: string): string | null => {
        if (!this.context.filesystem.exists(path)) {
          return null
        }
        if (this.context.filesystem.isDirectory(path)) {
          return null
        }
        try {
          return this.context.filesystem.readFile(path)
        } catch {
          return null
        }
      },
    }

    const engineOptions: LuaEngineOptions = {
      instructionLimit: this.options.instructionLimit,
      instructionCheckInterval: this.options.instructionCheckInterval,
      scriptPath: filepath,
    }

    try {
      this.engine = await LuaEngineFactory.create(callbacks, engineOptions)

      // Set up canvas API if callbacks are provided
      this.setupCanvasAPI()

      // Set up a helper function to execute script content with hooks
      // Using load() allows scripts to have top-level return statements
      this.engine.global.set('__script_content', scriptContent)
      this.engine.global.set('__script_name', this.filename)

      // Execute the script wrapped with hooks using load()
      // This ensures the debug hook is active during the entire script execution
      // and properly handles scripts with top-level return statements
      // The wrapper adds 4 lines before the script content (via load), which we adjust for in error messages
      await this.engine.doString(`
__setup_execution_hook()
local __fn, __err = load(__script_content, "@" .. __script_name)
if not __fn then
  error(__err)
end
__fn()
__clear_execution_hook()
`)

      // Flush any buffered output from the execution
      LuaEngineFactory.flushOutput(this.engine)

      // Script completed successfully
      if (this.running) {
        this.exitWithCode(this.hasError ? 1 : 0)
      }
    } catch (error) {
      // Flush any buffered output before reporting error
      if (this.engine) {
        LuaEngineFactory.flushOutput(this.engine)
      }
      // Script failed with error
      const errorMsg = error instanceof Error ? error.message : String(error)
      // Adjust line numbers in error messages to account for wrapper lines
      const adjustedError = this.adjustErrorLineNumber(errorMsg, LINE_OFFSET)
      this.onError(formatLuaError(adjustedError) + '\n')
      this.exitWithCode(1)
    }
  }

  /**
   * Resolve a path relative to the current working directory.
   */
  private resolvePath(path: string): string {
    // If path starts with /, it's absolute
    if (path.startsWith('/')) {
      return path
    }
    // Otherwise, resolve relative to cwd
    return resolvePath(this.context.cwd, path)
  }

  /**
   * Wait for user input (used by io.read()).
   * @param charCount - If provided, requests exactly this many characters (character mode).
   *                    If undefined, requests a full line (line mode).
   */
  private waitForInput(charCount?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.inputQueue.push({ resolve, reject, charCount })
      // Notify UI that input is requested
      this.onRequestInput(charCount)
    })
  }

  /**
   * Get the expected character count for the current pending input request.
   * Returns undefined if no input is pending or if in line mode.
   */
  getPendingInputCharCount(): number | undefined {
    if (this.inputQueue.length === 0) return undefined
    return this.inputQueue[0].charCount
  }

  /**
   * Check if there's a pending input request.
   */
  hasPendingInput(): boolean {
    return this.inputQueue.length > 0
  }

  /**
   * Exit the process with the given code.
   */
  private exitWithCode(code: number): void {
    this.running = false

    // Stop any running canvas
    if (this.canvasController?.isActive()) {
      this.canvasController.stop()
    }
    this.canvasController = null

    const engineToClose = this.engine
    this.engine = null
    LuaEngineFactory.closeDeferred(engineToClose)

    this.onExit(code)
  }

  /**
   * Adjust line numbers in Lua error messages to account for wrapper code.
   * Lua errors have format: [string "..."]:LINE: message
   * or: filename.lua:LINE: message
   *
   * Also adjusts line numbers mentioned in error message body (e.g., "at line 5")
   * and hides internal wrapper function names from user-facing errors.
   */
  private adjustErrorLineNumber(error: string, offset: number): string {
    let adjusted = error

    // Adjust line numbers in source:line: format (e.g., [string "..."]:5:)
    adjusted = adjusted.replace(
      /(\[string "[^"]*"\]|[^:\s]+\.lua):(\d+):/g,
      (_match, source, lineStr) => {
        const line = parseInt(lineStr, 10)
        const adjustedLine = Math.max(1, line - offset)
        return `${source}:${adjustedLine}:`
      }
    )

    // Adjust line numbers mentioned in message body (e.g., "at line 5", "line 3")
    adjusted = adjusted.replace(
      /\b(at line|line)\s+(\d+)\b/gi,
      (_match, prefix, lineStr) => {
        const line = parseInt(lineStr, 10)
        const adjustedLine = Math.max(1, line - offset)
        return `${prefix} ${adjustedLine}`
      }
    )

    // Hide internal wrapper function names from user-facing errors
    // Replace references to wrapper functions with <end of file>
    adjusted = adjusted.replace(
      /'__(?:setup|clear)_execution_hook'/g,
      '<end of file>'
    )
    adjusted = adjusted.replace(
      /near\s+__(?:setup|clear)_execution_hook/g,
      'near <end of file>'
    )

    return adjusted
  }

  /**
   * Set up the canvas API if canvas callbacks are provided.
   * This enables canvas.start(), canvas.stop(), and all drawing/input functions.
   */
  private setupCanvasAPI(): void {
    if (!this.engine || !this.options.canvasCallbacks) return

    const lua = this.engine
    const process = this

    // Create canvas controller
    this.canvasController = new CanvasController(this.options.canvasCallbacks)

    // --- Canvas lifecycle functions ---

    // Check if canvas is active
    lua.global.set('__canvas_is_active', () => {
      return process.canvasController?.isActive() ?? false
    })

    // Start canvas - returns Promise for :await() blocking
    lua.global.set('__canvas_start', () => {
      if (!process.canvasController) {
        throw new Error('Canvas not available')
      }
      return process.canvasController.start()
    })

    // Stop canvas
    lua.global.set('__canvas_stop', () => {
      if (process.canvasController?.isActive()) {
        process.canvasController.stop()
      }
    })

    // Register onDraw callback
    lua.global.set('__canvas_onDraw', (callback: () => void) => {
      process.canvasController?.setOnDrawCallback(callback)
    })

    // --- Drawing functions ---

    lua.global.set('__canvas_clear', () => {
      process.canvasController?.clear()
    })

    lua.global.set('__canvas_setColor', (r: number, g: number, b: number, a?: number | null) => {
      process.canvasController?.setColor(r, g, b, a ?? undefined)
    })

    lua.global.set('__canvas_setLineWidth', (width: number) => {
      process.canvasController?.setLineWidth(width)
    })

    lua.global.set('__canvas_setSize', (width: number, height: number) => {
      process.canvasController?.setSize(width, height)
    })

    lua.global.set('__canvas_rect', (x: number, y: number, width: number, height: number) => {
      process.canvasController?.drawRect(x, y, width, height)
    })

    lua.global.set('__canvas_fillRect', (x: number, y: number, width: number, height: number) => {
      process.canvasController?.fillRect(x, y, width, height)
    })

    lua.global.set('__canvas_circle', (x: number, y: number, radius: number) => {
      process.canvasController?.drawCircle(x, y, radius)
    })

    lua.global.set('__canvas_fillCircle', (x: number, y: number, radius: number) => {
      process.canvasController?.fillCircle(x, y, radius)
    })

    lua.global.set('__canvas_line', (x1: number, y1: number, x2: number, y2: number) => {
      process.canvasController?.drawLine(x1, y1, x2, y2)
    })

    lua.global.set('__canvas_text', (x: number, y: number, text: string) => {
      process.canvasController?.drawText(x, y, text)
    })

    // --- Timing functions ---

    lua.global.set('__canvas_getDelta', () => {
      return process.canvasController?.getDelta() ?? 0
    })

    lua.global.set('__canvas_getTime', () => {
      return process.canvasController?.getTime() ?? 0
    })

    // --- Canvas dimensions ---

    lua.global.set('__canvas_getWidth', () => {
      return process.canvasController?.getWidth() ?? 0
    })

    lua.global.set('__canvas_getHeight', () => {
      return process.canvasController?.getHeight() ?? 0
    })

    // --- Input functions ---

    lua.global.set('__canvas_isKeyDown', (key: string) => {
      return process.canvasController?.isKeyDown(key) ?? false
    })

    lua.global.set('__canvas_isKeyPressed', (key: string) => {
      return process.canvasController?.isKeyPressed(key) ?? false
    })

    lua.global.set('__canvas_getKeysDown', () => {
      return process.canvasController?.getKeysDown() ?? []
    })

    lua.global.set('__canvas_getKeysPressed', () => {
      return process.canvasController?.getKeysPressed() ?? []
    })

    lua.global.set('__canvas_getMouseX', () => {
      return process.canvasController?.getMouseX() ?? 0
    })

    lua.global.set('__canvas_getMouseY', () => {
      return process.canvasController?.getMouseY() ?? 0
    })

    lua.global.set('__canvas_isMouseDown', (button: number) => {
      return process.canvasController?.isMouseButtonDown(button) ?? false
    })

    lua.global.set('__canvas_isMousePressed', (button: number) => {
      return process.canvasController?.isMouseButtonPressed(button) ?? false
    })

    // --- Set up Lua-side canvas table ---
    lua.doStringSync(`
      canvas = {}

      -- Canvas lifecycle (new for shell integration)
      function canvas.start()
        if __canvas_is_active() then
          error("Canvas is already running. Call canvas.stop() first.")
        end
        __canvas_start():await()
      end

      function canvas.stop()
        __canvas_stop()
      end

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

      -- Shape drawing
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

        -- Number row
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

      -- Register canvas as a module so require('canvas') works
      package.preload['canvas'] = function()
        return canvas
      end
    `)
  }
}
