/**
 * Lua Canvas Process implementing IProcess interface.
 *
 * Runs Lua canvas games in a Web Worker with main-thread rendering.
 */

import type { IProcess, IFileSystem } from '@lua-learning/shell-core';
import {
  isSharedArrayBufferAvailable,
  DEFAULT_BUFFER_SIZE,
  type ChannelMode,
  createChannelPair,
  type ChannelPairResult,
} from '../channels/channelFactory.js';
import type { IWorkerChannel } from '../channels/IWorkerChannel.js';
import { GameLoopController } from '../renderer/GameLoopController.js';
import { CanvasRenderer } from '../renderer/CanvasRenderer.js';
import { InputCapture } from '../renderer/InputCapture.js';
import { ImageCache } from '../renderer/ImageCache.js';
import { AssetLoader } from '../shared/AssetLoader.js';
import { MainThreadAudioEngine } from '../audio/MainThreadAudioEngine.js';
import type { DrawCommand } from '../shared/types.js';
import type {
  WorkerToMainMessage,
  WorkerState,
  SerializedAsset,
  AssetRequest,
  AssetPathRequest,
  ModuleContentResponseMessage,
} from '../worker/WorkerMessages.js';

/**
 * Options for creating a LuaCanvasProcess.
 */
export interface LuaCanvasProcessOptions {
  /** Lua code to execute */
  code: string;
  /** Canvas element for rendering */
  canvas: HTMLCanvasElement;
  /** Custom worker URL (optional) */
  workerUrl?: URL;
  /** Force a specific channel mode (optional, defaults to auto) */
  mode?: ChannelMode;
  /** Filesystem for loading assets (optional, required for image support) */
  fileSystem?: IFileSystem;
  /** Script directory for resolving relative asset paths (optional) */
  scriptDirectory?: string;
}

/**
 * Process that runs Lua canvas games in a Web Worker.
 *
 * Coordinates:
 * - Web Worker lifecycle (LuaCanvasWorker)
 * - Channel communication (SharedArrayBuffer or postMessage)
 * - Main thread rendering (GameLoopController, CanvasRenderer, InputCapture)
 */
export class LuaCanvasProcess implements IProcess {
  private readonly code: string;
  private readonly canvas: HTMLCanvasElement;
  private readonly workerUrl?: URL;
  private readonly mode: ChannelMode;
  private readonly fileSystem?: IFileSystem;
  private readonly scriptDirectory: string;

  private worker: Worker | null = null;
  private running = false;
  private currentWorkerState: WorkerState = 'idle';

  // Rendering components
  private channel: IWorkerChannel | null = null;
  private gameLoop: GameLoopController | null = null;
  private renderer: CanvasRenderer | null = null;
  private inputCapture: InputCapture | null = null;
  private channelPairResult: ChannelPairResult | null = null;
  private imageCache: ImageCache | null = null;

  // Audio
  private audioEngine: MainThreadAudioEngine | null = null;
  private audioInitPromise: Promise<void> | null = null;
  private audioAvailable = false;

  /**
   * Callback invoked when the process produces output.
   */
  onOutput: (text: string) => void = () => {};

  /**
   * Callback invoked when the process produces an error.
   */
  onError: (text: string) => void = () => {};

  /**
   * Callback invoked when the process exits.
   */
  onExit: (code: number) => void = () => {};

  /**
   * Get the canvas element.
   * Used by GameLoopController/CanvasRenderer integration in React.
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get the current worker state.
   */
  getWorkerState(): WorkerState {
    return this.currentWorkerState;
  }

  constructor(options: LuaCanvasProcessOptions) {
    this.code = options.code;
    this.canvas = options.canvas;
    this.workerUrl = options.workerUrl;
    this.mode = options.mode ?? 'auto';
    this.fileSystem = options.fileSystem;
    this.scriptDirectory = options.scriptDirectory ?? '/';
  }

  /**
   * Start the canvas process.
   * Creates a Web Worker and initializes the Lua runtime.
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.currentWorkerState = 'idle';

    // Determine communication mode
    const useSharedArrayBuffer = this.shouldUseSharedArrayBuffer();

    // Output mode information
    if (useSharedArrayBuffer) {
      this.onOutput('Running in high-performance mode\n');
    } else {
      this.onOutput('Running in compatibility mode\n');
    }

    // Create channel pair for main ↔ worker communication
    const actualMode = useSharedArrayBuffer ? 'sharedArrayBuffer' : 'postMessage';
    this.channelPairResult = createChannelPair(actualMode, DEFAULT_BUFFER_SIZE);
    this.channel = this.channelPairResult.mainChannel;

    // Set canvas size on channel
    this.channel.setCanvasSize(this.canvas.width, this.canvas.height);

    // Create rendering components
    this.imageCache = new ImageCache();
    this.renderer = new CanvasRenderer(this.canvas, this.imageCache);
    this.gameLoop = new GameLoopController(this.handleFrame.bind(this));
    this.inputCapture = new InputCapture(this.canvas);

    // Create audio engine and start initialization
    this.audioEngine = new MainThreadAudioEngine();
    this.audioInitPromise = this.audioEngine
      .initialize()
      .then(() => {
        this.audioAvailable = this.audioEngine?.isAudioAvailable() ?? false;
        if (!this.audioAvailable) {
          this.onOutput('Audio disabled (initialization failed)\n');
        }
      })
      .catch((error) => {
        console.warn('Failed to initialize audio engine:', error);
        this.audioAvailable = false;
        this.onOutput('Audio disabled (initialization error)\n');
      });

    // Create the worker
    this.worker = this.createWorker();

    // Set up message handler
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.onerror = this.handleWorkerError.bind(this);

    // Build init message with channel resources
    const initMessage: {
      type: 'init';
      code: string;
      buffer?: SharedArrayBuffer;
      port?: MessagePort;
    } = {
      type: 'init',
      code: this.code,
    };

    // Transfer the appropriate resources to the worker
    const transferList: Transferable[] = [];

    if (this.channelPairResult.mode === 'sharedArrayBuffer' && this.channelPairResult.buffer) {
      initMessage.buffer = this.channelPairResult.buffer;
    } else if (this.channelPairResult.mode === 'postMessage' && this.channelPairResult.ports) {
      initMessage.port = this.channelPairResult.ports.port2;
      transferList.push(this.channelPairResult.ports.port2);
    }

    this.worker.postMessage(initMessage, transferList);
  }

  /**
   * Stop the canvas process.
   * Terminates the Web Worker and cleans up resources.
   */
  stop(): void {
    if (!this.running) return;

    // Stop the game loop
    if (this.gameLoop) {
      this.gameLoop.dispose();
      this.gameLoop = null;
    }

    // Dispose input capture
    if (this.inputCapture) {
      this.inputCapture.dispose();
      this.inputCapture = null;
    }

    // Dispose audio engine
    if (this.audioEngine) {
      this.audioEngine.dispose();
      this.audioEngine = null;
    }

    // Dispose the channel
    if (this.channel) {
      this.channel.dispose();
      this.channel = null;
    }

    // Send stop message if worker exists
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
      this.worker.terminate();
      this.worker = null;
    }

    this.running = false;
    this.currentWorkerState = 'stopped';
    this.renderer = null;
    this.channelPairResult = null;
    this.imageCache = null;

    this.onExit(0);
  }

  /**
   * Check if the process is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Pause the canvas process.
   * Pauses the game loop but keeps the worker alive.
   */
  pause(): void {
    if (this.gameLoop) {
      this.gameLoop.pause();
    }
  }

  /**
   * Resume the canvas process.
   * Resumes the game loop.
   */
  resume(): void {
    if (this.gameLoop) {
      this.gameLoop.resume();
    }
  }

  /**
   * Check if the process is currently paused.
   */
  isPaused(): boolean {
    return this.gameLoop?.isPaused() ?? false;
  }

  /**
   * Execute a single frame while paused, then remain paused.
   * Only works when the process is running and paused.
   */
  step(): void {
    if (this.gameLoop) {
      this.gameLoop.step();
    }
  }

  /**
   * Trigger hot reload of all loaded Lua modules.
   * Updates function definitions while preserving runtime state.
   */
  reload(): void {
    if (!this.running || !this.worker) return;

    this.worker.postMessage({ type: 'reload' });
  }

  /**
   * Handle input from the user.
   * Canvas games use keyboard/mouse input, not text input - this is a no-op.
   */
  handleInput(_input: string): void {
    // Canvas games don't use text input - no-op
  }

  /**
   * Determine whether to use SharedArrayBuffer based on mode and availability.
   */
  private shouldUseSharedArrayBuffer(): boolean {
    if (this.mode === 'postMessage') {
      return false;
    }
    if (this.mode === 'sharedArrayBuffer') {
      return true;
    }
    // Auto mode - check availability
    return isSharedArrayBufferAvailable();
  }

  /**
   * Create the Web Worker instance.
   */
  private createWorker(): Worker {
    if (this.workerUrl) {
      return new Worker(this.workerUrl, { type: 'module' });
    }
    // Default worker URL - relative to this module
    return new Worker(new URL('../worker/LuaCanvasWorker.js', import.meta.url), {
      type: 'module',
    });
  }

  /**
   * Handle messages from the worker.
   */
  private handleWorkerMessage(event: MessageEvent<WorkerToMainMessage>): void {
    const message = event.data;

    switch (message.type) {
      case 'ready':
        this.handleReady();
        break;

      case 'error':
        this.handleError(message.message);
        break;

      case 'stateChanged':
        this.handleStateChanged(message.state);
        break;

      case 'assetsNeeded':
        this.handleAssetsNeeded(message.assets, message.assetPaths);
        break;

      case 'moduleContentRequest':
        this.handleModuleContentRequest(message.moduleName, message.modulePath);
        break;
    }
  }

  /**
   * Handle worker error event.
   */
  private handleWorkerError(event: ErrorEvent): void {
    this.handleError(event.message);
  }

  /**
   * Handle ready message from worker.
   */
  private handleReady(): void {
    // Worker is initialized, start the game loop
    if (this.worker) {
      this.worker.postMessage({ type: 'start' });
    }
  }

  /**
   * Handle assetsNeeded message from worker.
   * Loads assets from the filesystem and sends them to the worker.
   */
  private async handleAssetsNeeded(assetRequests: AssetRequest[], assetPaths?: AssetPathRequest[]): Promise<void> {
    if (!this.fileSystem) {
      this.handleError('Assets requested but no filesystem provided');
      return;
    }

    if (!this.worker) {
      return;
    }

    try {
      const assetLoader = new AssetLoader(this.fileSystem, this.scriptDirectory);
      const loadedAssets: SerializedAsset[] = [];
      const transferList: ArrayBuffer[] = [];

      // Load legacy API assets (individual file requests)
      for (const request of assetRequests) {
        const loaded = await assetLoader.loadAsset({
          name: request.name,
          path: request.path,
          type: 'image',
        });

        // Store in image cache for main thread rendering
        if (this.imageCache && loaded.width && loaded.height) {
          const blob = new Blob([loaded.data]);
          const imageBitmap = await createImageBitmap(blob);
          this.imageCache.set(loaded.name, imageBitmap);
        }

        // Prepare asset for transfer to worker
        const serialized: SerializedAsset = {
          name: loaded.name,
          data: loaded.data,
          width: loaded.width ?? 0,
          height: loaded.height ?? 0,
        };

        loadedAssets.push(serialized);
        transferList.push(loaded.data);
      }

      // Load new API assets (directory-based discovery)
      if (assetPaths && assetPaths.length > 0) {
        // Track loaded filenames to avoid duplicates
        const loadedFilenames = new Set<string>();

        for (const pathRequest of assetPaths) {
          // Scan the directory for asset files
          const discoveredFiles = assetLoader.scanDirectory(pathRequest.path);

          for (const file of discoveredFiles) {
            // Skip if already loaded (in case of overlapping paths)
            if (loadedFilenames.has(file.filename)) {
              console.warn(`Asset file '${file.filename}' already loaded, skipping duplicate`);
              continue;
            }
            loadedFilenames.add(file.filename);

            // Handle audio files separately - decode to main thread audio engine
            if (file.type === 'audio') {
              // Wait for audio engine to be initialized
              if (this.audioInitPromise) {
                await this.audioInitPromise;
              }
              // Only load audio if audio is available
              if (this.audioEngine && this.audioAvailable) {
                try {
                  const loaded = await assetLoader.loadAsset({
                    name: file.relativePath,
                    path: file.fullPath,
                    type: 'audio',
                  });
                  // Decode audio on main thread using relativePath as key
                  // This matches the path used in Lua: canvas.assets.load_sound("name", "sfx/file.ogg")
                  await this.audioEngine.decodeAudio(file.relativePath, loaded.data);
                } catch (error) {
                  console.warn(`Failed to load audio asset '${file.relativePath}':`, error);
                }
              }
              // Audio assets don't need to be sent to worker
              continue;
            }

            // Load the asset (image or font types)
            const loaded = await assetLoader.loadAsset({
              name: file.filename, // Use filename as the name for loading
              path: file.fullPath,
              type: file.type as 'image' | 'font',
            });

            // Store in image cache for main thread rendering (images only)
            if (this.imageCache && file.type === 'image' && loaded.width && loaded.height) {
              const blob = new Blob([loaded.data]);
              const imageBitmap = await createImageBitmap(blob);
              this.imageCache.set(file.filename, imageBitmap);
            }

            // Prepare asset for transfer to worker with filename metadata
            const serialized: SerializedAsset = {
              name: file.filename, // Use filename as the name
              data: loaded.data,
              width: loaded.width ?? 0,
              height: loaded.height ?? 0,
              filename: file.filename,
              assetType: file.type as 'image' | 'font',
            };

            loadedAssets.push(serialized);
            transferList.push(loaded.data);
          }
        }
      }

      // Send loaded assets to worker with transferable ArrayBuffers
      this.worker.postMessage({ type: 'assetsLoaded', assets: loadedAssets }, transferList);
    } catch (error) {
      if (error instanceof Error) {
        this.handleError(error.message);
      } else {
        this.handleError('Failed to load assets');
      }
    }
  }

  /**
   * Handle moduleContentRequest message from worker.
   * Reads module file content from filesystem and sends it back to the worker.
   */
  private handleModuleContentRequest(moduleName: string, modulePath: string): void {
    if (!this.worker) return;

    let content: string | null = null;

    if (this.fileSystem) {
      try {
        // Resolve the path relative to script directory if needed
        const resolvedPath = this.resolveModulePath(modulePath);

        if (this.fileSystem.exists(resolvedPath)) {
          content = this.fileSystem.readFile(resolvedPath) ?? null;
        }
      } catch {
        // File not found or read error - content stays null
      }
    }

    const response: ModuleContentResponseMessage = {
      type: 'moduleContentResponse',
      moduleName,
      modulePath,
      content,
    };

    this.worker.postMessage(response);
  }

  /**
   * Resolve a module path relative to the script directory.
   * Handles both absolute paths (starting with /) and relative paths.
   */
  private resolveModulePath(path: string): string {
    // If path is already absolute, use it as-is
    if (path.startsWith('/')) {
      return path;
    }

    // Otherwise, resolve relative to script directory
    const baseDir = this.scriptDirectory.endsWith('/')
      ? this.scriptDirectory
      : this.scriptDirectory + '/';
    return baseDir + path;
  }

  /**
   * Handle error from worker.
   */
  private handleError(message: string): void {
    this.onError(message);
    this.terminateWithError();
  }

  /**
   * Handle state change from worker.
   */
  private handleStateChanged(state: WorkerState): void {
    this.currentWorkerState = state;

    if (state === 'running') {
      // Worker is running, start the game loop
      this.startGameLoop();
    } else if (state === 'stopped') {
      this.running = false;
    } else if (state === 'error') {
      this.terminateWithError();
    }
  }

  /**
   * Start the main-thread game loop for rendering.
   */
  private startGameLoop(): void {
    if (this.gameLoop) {
      this.gameLoop.start();
    }
  }

  /**
   * Handle each frame of the game loop.
   * Gets draw commands from channel and renders them.
   */
  private handleFrame(timing: { deltaTime: number; totalTime: number; frameNumber: number }): void {
    if (!this.channel || !this.renderer) return;

    // Update timing info on the channel for the worker
    this.channel.setTimingInfo(timing);

    // Send current input state to the worker
    if (this.inputCapture) {
      const inputState = this.inputCapture.getInputState();
      this.channel.setInputState(inputState);

      // Resume AudioContext on first user interaction (browser autoplay policy)
      if (this.audioEngine && (inputState.mouseButtonsPressed.length > 0 || inputState.keysPressed.length > 0)) {
        this.audioEngine.resumeContext().catch(() => {
          // Ignore errors - context may already be running
        });
      }
    }

    // Get draw commands from worker via channel
    const commands = this.channel.getDrawCommands();

    // Render the commands and update channel state for any setSize commands
    if (commands.length > 0) {
      for (const cmd of commands) {
        if (cmd.type === 'setSize') {
          // Update channel's canvas size so get_width/get_height return correct values
          this.channel.setCanvasSize(cmd.width, cmd.height);
        }
      }
      // Process audio commands
      this.processAudioCommands(commands);
      // Render draw commands
      this.renderer.render(commands);
    }

    // Sync audio state to worker
    if (this.audioEngine) {
      this.channel.setAudioState(this.audioEngine.getAudioState());
    }

    // Process pixel data requests from worker
    this.processPixelRequests();

    // Clear "just pressed" state for next frame
    if (this.inputCapture) {
      this.inputCapture.update();
    }

    // Signal that the frame is ready (for frame synchronization)
    this.channel.signalFrameReady();
  }

  /**
   * Process pending pixel data requests from the worker.
   * Reads pixel data from the canvas and sends responses.
   */
  private processPixelRequests(): void {
    if (!this.channel || !this.renderer) return;

    const requests = this.channel.getPendingImageDataRequests();
    for (const request of requests) {
      const imageData = this.renderer.getImageData(
        request.x,
        request.y,
        request.width,
        request.height
      );
      this.channel.sendImageDataResponse({
        type: 'getImageDataResponse',
        requestId: request.requestId,
        width: request.width,
        height: request.height,
        data: Array.from(imageData.data),
      });
    }
  }

  /**
   * Process audio commands from the worker.
   * Handles playSound, playMusic, etc.
   */
  private processAudioCommands(commands: DrawCommand[]): void {
    if (!this.audioEngine) return;

    for (const cmd of commands) {
      switch (cmd.type) {
        case 'playSound':
          this.audioEngine.playSound(cmd.name, cmd.volume);
          break;
        case 'playMusic':
          this.audioEngine.playMusic(cmd.name, cmd.volume, cmd.loop);
          break;
        case 'stopMusic':
          this.audioEngine.stopMusic();
          break;
        case 'pauseMusic':
          this.audioEngine.pauseMusic();
          break;
        case 'resumeMusic':
          this.audioEngine.resumeMusic();
          break;
        case 'setMusicVolume':
          this.audioEngine.setMusicVolume(cmd.volume);
          break;
        case 'setMasterVolume':
          this.audioEngine.setMasterVolume(cmd.volume);
          break;
        case 'mute':
          this.audioEngine.mute();
          break;
        case 'unmute':
          this.audioEngine.unmute();
          break;
        // Audio channel commands
        case 'channelCreate':
          this.audioEngine.createChannel(cmd.channel);
          break;
        case 'channelDestroy':
          this.audioEngine.destroyChannel(cmd.channel);
          break;
        case 'channelPlay':
          this.audioEngine.playOnChannel(cmd.channel, cmd.audio, cmd.volume, cmd.loop);
          break;
        case 'channelStop':
          this.audioEngine.stopChannel(cmd.channel);
          break;
        case 'channelPause':
          this.audioEngine.pauseChannel(cmd.channel);
          break;
        case 'channelResume':
          this.audioEngine.resumeChannel(cmd.channel);
          break;
        case 'channelSetVolume':
          this.audioEngine.setChannelVolume(cmd.channel, cmd.volume);
          break;
        case 'channelFadeTo':
          this.audioEngine.fadeChannelTo(cmd.channel, cmd.targetVolume, cmd.duration);
          break;
      }
    }
  }

  /**
   * Terminate the process with an error code.
   */
  private terminateWithError(): void {
    // Stop the game loop
    if (this.gameLoop) {
      this.gameLoop.dispose();
      this.gameLoop = null;
    }

    // Dispose input capture
    if (this.inputCapture) {
      this.inputCapture.dispose();
      this.inputCapture = null;
    }

    // Dispose the channel
    if (this.channel) {
      this.channel.dispose();
      this.channel = null;
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.running = false;
    this.currentWorkerState = 'error';
    this.renderer = null;
    this.channelPairResult = null;
    this.imageCache = null;

    this.onExit(1);
  }
}
