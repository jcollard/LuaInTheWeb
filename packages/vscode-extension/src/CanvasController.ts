/**
 * Canvas Controller
 *
 * Manages the game loop and communication between the Lua runtime and the canvas WebView.
 * Handles draw commands, input state, timing, and assets.
 */

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import type { DrawCommand, InputState, TimingInfo, AudioState } from '@lua-learning/canvas-runtime'
import type { CanvasViewProvider } from './CanvasViewProvider'

/**
 * Manages canvas state and game loop for Lua execution.
 */
export class CanvasController {
  private canvasProvider: CanvasViewProvider
  private workspaceRoot: string

  // Game loop state
  private isRunning = false
  private isPaused = false
  private lastFrameTime = 0
  private totalTime = 0
  private frameNumber = 0

  // Draw command buffer
  private commandBuffer: DrawCommand[] = []

  // Input state (updated from WebView)
  private inputState: InputState = {
    keysDown: [],
    keysPressed: [],
    mouseX: 0,
    mouseY: 0,
    mouseButtonsDown: [],
    mouseButtonsPressed: [],
    gamepads: [],
  }

  // Audio state
  private audioState: AudioState = {
    muted: false,
    masterVolume: 1.0,
    musicPlaying: false,
    musicTime: 0,
    musicDuration: 0,
    currentMusicName: '',
    channels: {},
  }

  // Asset cache
  private loadedAssets = new Map<string, string>() // name -> data URL

  constructor(canvasProvider: CanvasViewProvider, workspaceRoot: string) {
    this.canvasProvider = canvasProvider
    this.workspaceRoot = workspaceRoot
  }

  /**
   * Start the canvas with given dimensions.
   */
  async start(width: number, height: number): Promise<void> {
    this.isRunning = true
    this.isPaused = false
    this.lastFrameTime = performance.now()
    this.totalTime = 0
    this.frameNumber = 0

    await this.canvasProvider.initCanvas(width, height)
  }

  /**
   * Stop the canvas.
   */
  stop(): void {
    this.isRunning = false
    this.isPaused = false
    this.canvasProvider.closeCanvas()
  }

  /**
   * Pause the game loop.
   */
  pause(): void {
    this.isPaused = true
  }

  /**
   * Resume the game loop.
   */
  resume(): void {
    this.isPaused = false
    this.lastFrameTime = performance.now()
  }

  /**
   * Check if the canvas is running.
   */
  getIsRunning(): boolean {
    return this.isRunning
  }

  /**
   * Check if the canvas is paused.
   */
  getIsPaused(): boolean {
    return this.isPaused
  }

  /**
   * Add draw commands to the buffer.
   */
  addDrawCommands(commands: DrawCommand[]): void {
    this.commandBuffer.push(...commands)
  }

  /**
   * Flush draw commands to the WebView.
   */
  flushDrawCommands(): void {
    if (this.commandBuffer.length > 0) {
      this.canvasProvider.sendDrawCommands(this.commandBuffer)
      this.commandBuffer = []
    }
  }

  /**
   * Update input state from WebView.
   */
  updateInputState(state: InputState): void {
    this.inputState = state
  }

  /**
   * Get current input state.
   */
  getInputState(): InputState {
    return this.inputState
  }

  /**
   * Get timing information for the current frame.
   */
  getTimingInfo(): TimingInfo {
    const now = performance.now()
    const deltaTime = this.isPaused ? 0 : (now - this.lastFrameTime) / 1000
    this.lastFrameTime = now
    this.totalTime += deltaTime
    this.frameNumber++

    return {
      deltaTime,
      totalTime: this.totalTime,
      frameNumber: this.frameNumber,
    }
  }

  /**
   * Get audio state.
   */
  getAudioState(): AudioState {
    return this.audioState
  }

  /**
   * Load an image asset.
   */
  async loadImage(name: string, filePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolvePath(filePath)
      const data = fs.readFileSync(resolvedPath)
      const ext = path.extname(filePath).toLowerCase()
      const mimeType = this.getMimeType(ext)
      const dataUrl = `data:${mimeType};base64,${data.toString('base64')}`

      this.loadedAssets.set(name, dataUrl)

      // Send to WebView
      this.canvasProvider.loadImage(name, dataUrl)

      return true
    } catch (error) {
      console.error(`Failed to load image: ${filePath}`, error)
      return false
    }
  }

  /**
   * Load an audio asset.
   */
  async loadAudio(name: string, filePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolvePath(filePath)
      const data = fs.readFileSync(resolvedPath)
      const ext = path.extname(filePath).toLowerCase()
      const mimeType = this.getAudioMimeType(ext)
      const dataUrl = `data:${mimeType};base64,${data.toString('base64')}`

      this.loadedAssets.set(name, dataUrl)

      // Send to WebView
      this.canvasProvider.loadAudio(name, dataUrl)

      return true
    } catch (error) {
      console.error(`Failed to load audio: ${filePath}`, error)
      return false
    }
  }

  /**
   * Load a font asset.
   */
  async loadFont(name: string, filePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolvePath(filePath)
      const data = fs.readFileSync(resolvedPath)
      const ext = path.extname(filePath).toLowerCase()
      const mimeType = this.getFontMimeType(ext)
      const dataUrl = `data:${mimeType};base64,${data.toString('base64')}`

      this.loadedAssets.set(name, dataUrl)

      // Send to WebView
      this.canvasProvider.loadFont(name, dataUrl)

      return true
    } catch (error) {
      console.error(`Failed to load font: ${filePath}`, error)
      return false
    }
  }

  /**
   * Resolve a file path relative to the workspace.
   */
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath
    }
    return path.join(this.workspaceRoot, filePath)
  }

  /**
   * Get MIME type for image file extension.
   */
  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * Get MIME type for audio file extension.
   */
  private getAudioMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
    }
    return mimeTypes[ext] || 'audio/mpeg'
  }

  /**
   * Get MIME type for font file extension.
   */
  private getFontMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    }
    return mimeTypes[ext] || 'font/ttf'
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.stop()
    this.loadedAssets.clear()
  }
}
