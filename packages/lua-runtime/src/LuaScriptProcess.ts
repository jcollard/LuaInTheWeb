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
} from './LuaEngineFactory'
import { resolvePath } from '@lua-learning/shell-core'

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
  }> = []
  private hasError = false

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

  constructor(
    private readonly filename: string,
    private readonly context: ShellContext
  ) {}

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
   */
  stop(): void {
    if (!this.running) return

    this.running = false

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
    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => this.onOutput(text),
      onError: (text: string) => {
        this.hasError = true
        this.onError(formatLuaError(text) + '\n')
      },
      onReadInput: () => this.waitForInput(),
    }

    try {
      this.engine = await LuaEngineFactory.create(callbacks)

      // Execute the script
      await this.engine.doString(scriptContent)

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
      this.onError(formatLuaError(errorMsg) + '\n')
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
   */
  private waitForInput(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.inputQueue.push({ resolve, reject })
    })
  }

  /**
   * Exit the process with the given code.
   */
  private exitWithCode(code: number): void {
    this.running = false

    const engineToClose = this.engine
    this.engine = null
    LuaEngineFactory.closeDeferred(engineToClose)

    this.onExit(code)
  }
}
