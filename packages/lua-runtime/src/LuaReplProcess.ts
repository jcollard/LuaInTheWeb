/**
 * Interactive Lua REPL process implementing IProcess interface.
 * Provides a read-eval-print-loop for Lua code execution in the shell.
 */

import type { IProcess } from '@lua-learning/shell-core'
import type { LuaEngine } from 'wasmoon'
import { LuaEngineFactory, type LuaEngineCallbacks } from './LuaEngineFactory'

/**
 * Interactive Lua REPL process.
 * Executes Lua code line by line and maintains state between inputs.
 */
export class LuaReplProcess implements IProcess {
  private engine: LuaEngine | null = null
  private running = false
  private inputQueue: Array<{
    resolve: (value: string) => void
    reject: (error: Error) => void
  }> = []

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
   */
  stop(): void {
    if (!this.running) return

    this.running = false

    // Reject any pending input requests
    for (const pending of this.inputQueue) {
      pending.reject(new Error('Process stopped'))
    }
    this.inputQueue = []

    // Close the engine
    if (this.engine) {
      LuaEngineFactory.close(this.engine)
      this.engine = null
    }

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

    // Execute as REPL code
    this.executeReplCode(input)
  }

  /**
   * Format an error message with prefix.
   */
  private formatError(text: string): string {
    return `[error] ${text}`
  }

  /**
   * Initialize the Lua engine with REPL callbacks.
   */
  private async initEngine(): Promise<void> {
    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => this.onOutput(text),
      onError: (text: string) => this.onError(this.formatError(text)),
      onReadInput: () => this.waitForInput(),
    }

    try {
      this.engine = await LuaEngineFactory.create(callbacks)

      // Setup exit() command
      this.engine.global.set('exit', () => {
        this.stop()
      })

      // Output welcome message with newline so input appears on next line
      this.onOutput('Lua 5.4 REPL - Type exit() to quit\n')
    } catch (error) {
      this.onError(this.formatError(`Failed to initialize Lua engine: ${error}`))
      this.running = false
      this.onExit(1)
    }
  }

  /**
   * Execute code in REPL mode.
   * Handles both statements and expressions.
   */
  private async executeReplCode(code: string): Promise<void> {
    if (!this.engine) return

    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => this.onOutput(text),
      onError: (text: string) => this.onError(this.formatError(text)),
    }

    const result = await LuaEngineFactory.executeCode(this.engine, code, callbacks)

    // If expression returned a value, output it with newline
    if (result !== undefined && result !== 'nil') {
      this.onOutput(result + '\n')
    }
  }

  /**
   * Wait for user input (used by io.read()).
   * Returns a promise that resolves when input is provided.
   */
  private waitForInput(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.inputQueue.push({ resolve, reject })
    })
  }
}
