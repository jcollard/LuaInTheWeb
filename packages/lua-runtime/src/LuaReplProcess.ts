/**
 * Interactive Lua REPL process implementing IProcess interface.
 * Provides a read-eval-print-loop for Lua code execution in the shell.
 */

import type { IProcess, KeyModifiers } from '@lua-learning/shell-core'
import type { LuaEngine } from 'wasmoon'
import {
  LuaEngineFactory,
  formatLuaError,
  ExecutionStoppedError,
  type LuaEngineCallbacks,
  type LuaEngineOptions,
  type ExecutionControlOptions,
} from './LuaEngineFactory'
import { CanvasController, type CanvasCallbacks } from './CanvasController'

/**
 * Options for configuring the Lua REPL process.
 */
export interface LuaReplProcessOptions extends ExecutionControlOptions {
  /** Canvas callbacks for canvas.start()/stop() integration */
  canvasCallbacks?: CanvasCallbacks
}

/**
 * Interactive Lua REPL process.
 * Executes Lua code line by line and maintains state between inputs.
 */
export class LuaReplProcess implements IProcess {
  /** Maximum number of commands to keep in history */
  private static readonly MAX_HISTORY_SIZE = 1000

  private engine: LuaEngine | null = null
  private running = false
  private inputQueue: Array<{
    resolve: (value: string) => void
    reject: (error: Error) => void
    charCount?: number
  }> = []
  private history: string[] = []
  private historyIndex = -1
  private inputBuffer: string[] = []
  private _inContinuationMode = false
  private readonly options: LuaReplProcessOptions
  /** Canvas controller for canvas.start()/stop() functionality */
  private canvasController: CanvasController | null = null

  /**
   * Whether this process supports raw key input handling.
   * When true, the shell should forward raw key events to handleKey().
   */
  supportsRawInput = true

  /**
   * Create a new Lua REPL process.
   * @param options - Optional configuration for execution control
   */
  constructor(options?: LuaReplProcessOptions) {
    this.options = options ?? {}
  }

  /**
   * Whether the REPL is currently in continuation mode (awaiting more input).
   * When true, the REPL is collecting lines for a multi-line construct
   * (e.g., function definition, loop) and showing the `>>` prompt.
   * @returns true if awaiting more input for incomplete code
   */
  get inContinuationMode(): boolean {
    return this._inContinuationMode
  }

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

  /**
   * Start the REPL process.
   * Initializes the Lua engine and displays a welcome message.
   */
  start(): void {
    if (this.running) return

    this.running = true
    this.initEngine()
  }

  /**
   * Stop the REPL process.
   * Closes the Lua engine and cleans up resources.
   * Requests cooperative stop for any running code via debug hook.
   */
  stop(): void {
    if (!this.running) return

    this.running = false

    // Stop any running canvas
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
   * Executes the input as Lua code in the REPL.
   * Supports multi-line input (e.g., from paste) by splitting on newlines.
   */
  handleInput(input: string): void {
    if (!this.running || !this.engine) return

    // Check if there's a pending io.read() request
    if (this.inputQueue.length > 0) {
      const pending = this.inputQueue.shift()
      if (pending) {
        pending.resolve(input)
        return
      }
    }

    // Check if user pressed Enter while viewing a history entry
    // When viewing history, the terminal shows the entry but input buffer is empty
    // So we need to use the history entry as the actual input
    if (this.historyIndex !== -1 && input === '') {
      const historyEntry = this.history[this.historyIndex]
      this.historyIndex = -1

      // For multi-line history entries, we need to add all lines to buffer
      const lines = historyEntry.split('\n')
      for (const line of lines) {
        this.inputBuffer.push(line)
      }

      // Check if code is complete (it should be, since it was executed before)
      // Fire-and-forget: runs async, results via onOutput/onError callbacks
      this.checkAndExecuteBuffer()
      return
    }

    // Reset history navigation index
    this.historyIndex = -1

    // Handle multi-line input (e.g., from paste)
    // Split by newlines, add all lines to buffer, then check once
    const lines = input.split('\n')
    for (const line of lines) {
      this.inputBuffer.push(line)
    }

    // Check if code is complete (only once for all lines)
    // Fire-and-forget: runs async, results via onOutput/onError callbacks
    this.checkAndExecuteBuffer()
  }

  /**
   * Cancel the current multi-line input and return to normal mode.
   * Clears the input buffer and exits continuation mode, displaying
   * a fresh prompt. Use this when the user wants to abandon an
   * incomplete multi-line construct (e.g., via Ctrl+C).
   */
  cancelInput(): void {
    this.inputBuffer = []
    this._inContinuationMode = false
    this.showPrompt()
  }

  /**
   * Get the command history.
   * @returns Array of previously executed commands
   */
  getHistory(): string[] {
    return [...this.history]
  }

  /**
   * Handle a raw key input event.
   * Handles arrow keys for history navigation.
   * @param key - The key identifier (e.g., 'ArrowUp', 'ArrowDown')
   * @param _modifiers - Optional modifier key state (unused currently)
   */
  handleKey(key: string, _modifiers?: KeyModifiers): void {
    if (!this.running) return

    if (key === 'ArrowUp') {
      this.navigateHistoryUp()
    } else if (key === 'ArrowDown') {
      this.navigateHistoryDown()
    }
  }

  /**
   * Navigate to previous (older) command in history.
   */
  private navigateHistoryUp(): void {
    if (this.history.length === 0) return

    if (this.historyIndex === -1) {
      // Start at most recent command
      this.historyIndex = this.history.length - 1
    } else if (this.historyIndex > 0) {
      // Go to older command
      this.historyIndex--
    }

    // Display the history entry
    this.displayHistoryEntry()
  }

  /**
   * Navigate to next (newer) command in history.
   */
  private navigateHistoryDown(): void {
    if (this.historyIndex === -1) return // Already at current input

    if (this.historyIndex < this.history.length - 1) {
      // Go to newer command
      this.historyIndex++
      this.displayHistoryEntry()
    } else {
      // Go past newest to empty current input
      this.historyIndex = -1
      this.onOutput('\r\x1b[K> ')
    }
  }

  /**
   * Display the current history entry.
   */
  private displayHistoryEntry(): void {
    const entry = this.history[this.historyIndex]
    // Clear line, move cursor to start, show prompt and entry
    this.onOutput(`\r\x1b[K> ${entry}`)
  }

  /**
   * Show the REPL prompt to indicate ready for input.
   */
  private showPrompt(): void {
    this.onOutput(this._inContinuationMode ? '>> ' : '> ')
  }

  /**
   * Check if the buffered code is complete and execute if so.
   */
  private async checkAndExecuteBuffer(): Promise<void> {
    if (!this.engine) return

    const code = this.inputBuffer.join('\n')

    // Check if code is complete
    const result = await LuaEngineFactory.isCodeComplete(this.engine, code)

    if (result.complete) {
      // Code is complete - execute it
      this._inContinuationMode = false

      // Add to history as a single entry (only if non-empty)
      if (code.trim() !== '') {
        const lastCommand = this.history[this.history.length - 1]
        if (code !== lastCommand) {
          this.history.push(code)
          // Enforce history size limit
          if (this.history.length > LuaReplProcess.MAX_HISTORY_SIZE) {
            this.history.shift()
          }
        }
      }

      // Clear buffer before execution
      this.inputBuffer = []

      // Execute the code
      await this.executeReplCode(code)
    } else if (result.error) {
      // Syntax error - report it and reset
      this._inContinuationMode = false
      this.inputBuffer = []
      this.onError(formatLuaError(result.error) + '\n')
      this.showPrompt()
    } else {
      // Code is incomplete - wait for more input
      this._inContinuationMode = true
      this.showPrompt()
    }
  }

  /**
   * Initialize the Lua engine with REPL callbacks.
   */
  private async initEngine(): Promise<void> {
    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => this.onOutput(text),
      onError: (text: string) => this.onError(formatLuaError(text) + '\n'),
      onReadInput: (charCount?: number) => this.waitForInput(charCount),
      onInstructionLimitReached: this.options.onInstructionLimitReached,
    }

    const engineOptions: LuaEngineOptions = {
      instructionLimit: this.options.instructionLimit,
      instructionCheckInterval: this.options.instructionCheckInterval,
    }

    try {
      this.engine = await LuaEngineFactory.create(callbacks, engineOptions)

      // Setup exit() command
      this.engine.global.set('exit', () => {
        this.stop()
      })

      // Setup canvas API if canvas callbacks are provided
      if (this.options.canvasCallbacks) {
        this.setupCanvasAPI()
      }

      // Output welcome message and prompt
      this.onOutput('Lua 5.4 REPL - Type exit() to quit\n')
      this.showPrompt()
    } catch (error) {
      this.onError(formatLuaError(`Failed to initialize Lua engine: ${error}`) + '\n')
      this.running = false
      this.onExit(1)
    }
  }

  /**
   * Set up the canvas API for canvas.start(), canvas.stop(), and drawing functions.
   */
  private setupCanvasAPI(): void {
    if (!this.engine || !this.options.canvasCallbacks) return

    const lua = this.engine
    const process = this

    // Create canvas controller
    this.canvasController = new CanvasController(this.options.canvasCallbacks)

    // --- Canvas lifecycle functions ---
    lua.global.set('__canvas_is_active', () => {
      return process.canvasController?.isActive() ?? false
    })

    lua.global.set('__canvas_start', () => {
      if (!process.canvasController) {
        throw new Error('Canvas not available')
      }
      return process.canvasController.start()
    })

    lua.global.set('__canvas_stop', () => {
      if (process.canvasController?.isActive()) {
        process.canvasController.stop()
      }
    })

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

      -- Canvas lifecycle
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

      -- Helper to normalize key names
      local function normalize_key(key)
        if type(key) ~= 'string' then return key end
        -- Single letter keys
        if #key == 1 and key:match('%a') then
          return 'Key' .. key:upper()
        end
        -- Arrow keys
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

  /**
   * Execute code in REPL mode.
   * Handles both statements and expressions.
   * Wraps execution with debug hooks for instruction limiting.
   *
   * NOTE: Due to wasmoon limitations, debug hooks don't persist across doString calls.
   * We must wrap user code with hook setup/teardown in a single Lua chunk.
   * If execution is stopped by instruction limit, the error propagates directly.
   */
  private async executeReplCode(code: string): Promise<void> {
    if (!this.engine) return

    if (!code.trim()) {
      this.showPrompt()
      return
    }

    try {
      // First try as a statement, wrapped with hooks
      // Hooks are set up and cleared within the same Lua chunk
      await this.engine.doString(`
        __setup_execution_hook()
        ${code}
        __clear_execution_hook()
      `)

      // Flush any buffered output from the execution
      LuaEngineFactory.flushOutput(this.engine)

      // Statement executed successfully, show prompt
      if (this.running) {
        this.showPrompt()
      }
    } catch (statementError: unknown) {
      // Check if this was an execution control error (stop request or limit)
      if (ExecutionStoppedError.isExecutionStoppedError(statementError)) {
        // Execution was stopped - flush output and report
        LuaEngineFactory.flushOutput(this.engine)
        const errorMsg = statementError instanceof Error ? statementError.message : String(statementError)
        this.onError(formatLuaError(errorMsg) + '\n')
        if (this.running) {
          this.showPrompt()
        }
        return
      }

      // Statement failed with syntax error, try as expression
      try {
        const formatted = await this.engine.doString(`
          __setup_execution_hook()
          local result = __format_value((${code}))
          __clear_execution_hook()
          return result
        `)

        // Flush any buffered output from the execution
        LuaEngineFactory.flushOutput(this.engine)

        // Output the formatted result
        this.onOutput(String(formatted) + '\n')

        // Show prompt for next input
        if (this.running) {
          this.showPrompt()
        }
      } catch (exprError: unknown) {
        const exprErrorMsg = exprError instanceof Error ? exprError.message : String(exprError)

        // Check if this was an execution control error
        if (ExecutionStoppedError.isExecutionStoppedError(exprError)) {
          LuaEngineFactory.flushOutput(this.engine)
          this.onError(formatLuaError(exprErrorMsg) + '\n')
          if (this.running) {
            this.showPrompt()
          }
          return
        }

        // Both statement and expression parsing failed - report error
        LuaEngineFactory.flushOutput(this.engine)
        this.onError(formatLuaError(exprErrorMsg) + '\n')

        // Show prompt for next input
        if (this.running) {
          this.showPrompt()
        }
      }
    }
  }

  /**
   * Wait for user input (used by io.read()).
   * Returns a promise that resolves when input is provided.
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
}
