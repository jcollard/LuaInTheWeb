/**
 * Lua Canvas IDE - VS Code Extension Entry Point
 *
 * Provides Lua development environment with canvas graphics support.
 */

import * as vscode from 'vscode'
import { LuaRunnerManager } from './LuaRunnerManager'
import { CanvasViewProvider } from './CanvasViewProvider'
import { LuaReplProvider } from './LuaReplProvider'

let luaRunnerManager: LuaRunnerManager
let canvasViewProvider: CanvasViewProvider
let luaReplProvider: LuaReplProvider

export function activate(context: vscode.ExtensionContext): void {
  console.log('Lua Canvas IDE is now active')

  // Initialize managers
  luaRunnerManager = new LuaRunnerManager(context)
  canvasViewProvider = new CanvasViewProvider(context)
  luaReplProvider = new LuaReplProvider(context)

  // Register canvas webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CanvasViewProvider.viewType,
      canvasViewProvider
    )
  )

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('luaCanvas.runFile', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.document.languageId !== 'lua') {
        vscode.window.showErrorMessage('No Lua file is currently open')
        return
      }

      // Save file before running
      await editor.document.save()

      // Run the Lua file
      await luaRunnerManager.runFile(
        editor.document.uri,
        canvasViewProvider
      )
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('luaCanvas.stopExecution', () => {
      luaRunnerManager.stopExecution()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('luaCanvas.openRepl', () => {
      luaReplProvider.openRepl()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('luaCanvas.openCanvas', () => {
      canvasViewProvider.showCanvas()
    })
  )

  // Set up hot reload on file save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      const config = vscode.workspace.getConfiguration('luaCanvas')
      if (config.get<boolean>('hotReload') && document.languageId === 'lua') {
        luaRunnerManager.triggerHotReload()
      }
    })
  )

  // Status bar item for running state
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  )
  statusBarItem.command = 'luaCanvas.stopExecution'
  context.subscriptions.push(statusBarItem)

  // Update status bar based on running state
  luaRunnerManager.onRunningStateChanged((isRunning) => {
    if (isRunning) {
      statusBarItem.text = '$(debug-stop) Stop Lua'
      statusBarItem.tooltip = 'Click to stop Lua execution'
      statusBarItem.show()
    } else {
      statusBarItem.hide()
    }
  })
}

export function deactivate(): void {
  luaRunnerManager?.dispose()
  canvasViewProvider?.dispose()
  luaReplProvider?.dispose()
}
