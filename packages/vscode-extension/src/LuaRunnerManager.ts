/**
 * Lua Runner Manager
 *
 * Manages Lua script execution, including lifecycle, hot reload, and output handling.
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { VSCodeFileSystem } from './adapters/VSCodeFileSystem'
import type { CanvasViewProvider } from './CanvasViewProvider'
import { LuaEngineFactory, type LuaEngineCallbacks } from '@lua-learning/lua-runtime'
import type { LuaEngine } from 'wasmoon'

type RunningStateCallback = (isRunning: boolean) => void

export class LuaRunnerManager {
  private context: vscode.ExtensionContext
  private outputChannel: vscode.OutputChannel
  private engine: LuaEngine | null = null
  private isRunning = false
  private currentScriptUri: vscode.Uri | null = null
  private runningStateCallbacks: RunningStateCallback[] = []
  private fileSystem: VSCodeFileSystem | null = null
  private canvasProvider: CanvasViewProvider | null = null

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.outputChannel = vscode.window.createOutputChannel('Lua Canvas')
  }

  /**
   * Run a Lua file.
   */
  async runFile(
    fileUri: vscode.Uri,
    canvasProvider: CanvasViewProvider
  ): Promise<void> {
    // Stop any existing execution
    this.stopExecution()

    this.currentScriptUri = fileUri
    this.canvasProvider = canvasProvider

    // Initialize file system rooted at the file's directory
    const scriptDir = path.dirname(fileUri.fsPath)
    this.fileSystem = new VSCodeFileSystem(scriptDir)

    // Create output callbacks
    const callbacks: LuaEngineCallbacks = {
      onOutput: (text: string) => {
        this.outputChannel.append(text)
      },
      onError: (text: string) => {
        this.outputChannel.appendLine(`[error] ${text}`)
      },
      fileReader: (filePath: string) => {
        try {
          return this.fileSystem?.readFile(filePath) ?? null
        } catch {
          return null
        }
      },
      getTerminalWidth: () => 120,
      getTerminalHeight: () => 40,
      onInstructionLimitReached: () => {
        // For now, just continue - we could show a dialog later
        return true
      },
    }

    try {
      // Show output channel
      this.outputChannel.show(true)
      this.outputChannel.appendLine(`Running: ${fileUri.fsPath}`)
      this.outputChannel.appendLine('---')

      // Create engine
      this.engine = await LuaEngineFactory.create(callbacks, {
        scriptPath: fileUri.fsPath,
        cwd: scriptDir,
      })

      this.setRunningState(true)

      // Read and execute the script
      const scriptContent = this.fileSystem.readFile(fileUri.fsPath)

      // Set up canvas API if needed
      await this.setupCanvasAPI()

      // Execute the script
      await this.engine.doString(scriptContent)

      this.outputChannel.appendLine('---')
      this.outputChannel.appendLine('Execution completed')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.outputChannel.appendLine(`[error] ${errorMsg}`)
      vscode.window.showErrorMessage(`Lua error: ${errorMsg}`)
    } finally {
      this.setRunningState(false)
      LuaEngineFactory.closeDeferred(this.engine)
      this.engine = null
    }
  }

  /**
   * Set up canvas API for the Lua engine.
   */
  private async setupCanvasAPI(): Promise<void> {
    if (!this.engine || !this.canvasProvider) return

    // Import canvas Lua code and set up the API
    // For now, we'll set up basic canvas stubs
    // The full implementation will connect to the WebView

    this.engine.global.set('__canvas_start', async (width: number, height: number) => {
      await this.canvasProvider?.initCanvas(width, height)
    })

    this.engine.global.set('__canvas_stop', () => {
      this.canvasProvider?.closeCanvas()
    })

    // Set up draw command buffer
    this.engine.global.set('__canvas_send_commands', (commands: unknown[]) => {
      this.canvasProvider?.sendDrawCommands(commands)
    })

    // Set up input state getter
    this.engine.global.set('__canvas_get_input', () => {
      return this.canvasProvider?.getInputState() ?? null
    })
  }

  /**
   * Stop the current Lua execution.
   */
  stopExecution(): void {
    if (this.engine) {
      LuaEngineFactory.closeDeferred(this.engine)
      this.engine = null
    }
    this.setRunningState(false)
    this.outputChannel.appendLine('Execution stopped')
  }

  /**
   * Trigger hot reload of the current script.
   */
  triggerHotReload(): void {
    if (!this.isRunning || !this.currentScriptUri || !this.canvasProvider) {
      return
    }

    // Re-run the current script
    this.outputChannel.appendLine('Hot reload triggered...')
    this.runFile(this.currentScriptUri, this.canvasProvider)
  }

  /**
   * Register a callback for running state changes.
   */
  onRunningStateChanged(callback: RunningStateCallback): void {
    this.runningStateCallbacks.push(callback)
  }

  /**
   * Set the running state and notify callbacks.
   */
  private setRunningState(running: boolean): void {
    this.isRunning = running
    for (const callback of this.runningStateCallbacks) {
      callback(running)
    }
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.stopExecution()
    this.outputChannel.dispose()
  }
}
