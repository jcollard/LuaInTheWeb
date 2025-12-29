import type {
  AudioState,
  DrawCommand,
  GetImageDataRequest,
  GetImageDataResponse,
  InputState,
  TimingInfo,
} from '../shared/types.js';

/**
 * Communication channel interface for main thread ↔ Web Worker communication.
 *
 * This interface abstracts the communication mechanism, allowing implementations
 * to use either SharedArrayBuffer (high-performance) or postMessage (fallback).
 *
 * The channel is bidirectional:
 * - Worker → Main: Draw commands
 * - Main → Worker: Input state, timing info
 *
 * Synchronization is frame-based:
 * 1. Main thread signals frame ready with input/timing
 * 2. Worker processes frame and sends draw commands
 * 3. Worker waits for next frame signal
 */
export interface IWorkerChannel {
  /**
   * Send draw commands from worker to main thread.
   * Called by the worker after processing a frame.
   *
   * @param commands - Array of draw commands to execute
   */
  sendDrawCommands(commands: DrawCommand[]): void;

  /**
   * Get pending draw commands on the main thread.
   * Called by the main thread to retrieve commands for rendering.
   *
   * @returns Array of draw commands to render, or empty array if none
   */
  getDrawCommands(): DrawCommand[];

  /**
   * Get the current input state.
   * Called by the worker to read keyboard/mouse state.
   *
   * @returns Current input state
   */
  getInputState(): InputState;

  /**
   * Update the input state from the main thread.
   * Called by the main thread to provide input to the worker.
   *
   * @param state - New input state
   */
  setInputState(state: InputState): void;

  /**
   * Get the current audio state.
   * Called by the worker to read audio system state.
   *
   * @returns Current audio state
   */
  getAudioState(): AudioState;

  /**
   * Update the audio state from the main thread.
   * Called by the main thread to sync audio state to the worker.
   *
   * @param state - New audio state
   */
  setAudioState(state: AudioState): void;

  /**
   * Get the time elapsed since the last frame.
   *
   * @returns Delta time in seconds
   */
  getDeltaTime(): number;

  /**
   * Get the total elapsed time since the game started.
   *
   * @returns Total time in seconds
   */
  getTotalTime(): number;

  /**
   * Get the current timing info.
   *
   * @returns Timing information for the current frame
   */
  getTimingInfo(): TimingInfo;

  /**
   * Update timing information from the main thread.
   *
   * @param timing - New timing information
   */
  setTimingInfo(timing: TimingInfo): void;

  /**
   * Worker waits for the next frame signal from the main thread.
   * This is a blocking call in SharedArrayBuffer mode.
   * In postMessage mode, it returns a Promise that resolves when the frame is ready.
   *
   * @returns Promise that resolves when the next frame is ready
   */
  waitForFrame(): Promise<void>;

  /**
   * Main thread signals that a new frame is ready.
   * Wakes up the worker if it's waiting.
   */
  signalFrameReady(): void;

  /**
   * Get the current canvas size.
   * Called by the worker to read canvas dimensions.
   *
   * @returns Canvas width and height
   */
  getCanvasSize(): { width: number; height: number };

  /**
   * Set the canvas size.
   * Called by the main thread to update dimensions.
   *
   * @param width - Canvas width in pixels
   * @param height - Canvas height in pixels
   */
  setCanvasSize(width: number, height: number): void;

  /**
   * Request image data from the canvas (worker side).
   * This is a blocking call that waits for the main thread to respond.
   *
   * @param x - X coordinate of the region to read
   * @param y - Y coordinate of the region to read
   * @param width - Width of the region to read
   * @param height - Height of the region to read
   * @returns Promise resolving to the image data response
   */
  requestImageData(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<GetImageDataResponse>;

  /**
   * Get pending image data requests (main thread side).
   * Called by the main thread to check for pending getImageData requests.
   *
   * @returns Array of pending requests
   */
  getPendingImageDataRequests(): GetImageDataRequest[];

  /**
   * Send image data response to the worker (main thread side).
   * Called by the main thread after processing a getImageData request.
   *
   * @param response - The image data response
   */
  sendImageDataResponse(response: GetImageDataResponse): void;

  /**
   * Clean up resources when the channel is no longer needed.
   */
  dispose(): void;
}

/**
 * Side of the channel (main thread or worker).
 */
export type ChannelSide = 'main' | 'worker';

/**
 * Configuration for channel creation.
 */
export interface ChannelConfig {
  /** Which side of the channel this is */
  side: ChannelSide;
}
