import type { TimingInfo } from '../shared/types.js';

/**
 * Frame callback function type.
 */
export type FrameCallback = (timing: TimingInfo) => void;

/**
 * Maximum delta time in seconds to prevent "spiral of death"
 * when the browser tab is backgrounded or the system is under load.
 */
const MAX_DELTA_TIME = 0.1; // 100ms

/**
 * Controls the game loop using requestAnimationFrame.
 *
 * GameLoopController manages the timing and execution of the game loop,
 * providing accurate timing information including delta time, total time,
 * and frame count. It supports start/stop/pause/resume controls and
 * handles edge cases like delta time capping.
 */
export class GameLoopController {
  private readonly frameCallback: FrameCallback;
  private running = false;
  private paused = false;
  private disposed = false;
  private stepping = false;
  private animationFrameId: number | null = null;
  private targetFPS = 60;

  // Timing state
  private frameNumber = 0;
  private totalTime = 0;
  private lastTime = 0;
  private startTime = 0;
  private lastDeltaTime = 0;

  constructor(frameCallback: FrameCallback) {
    this.frameCallback = frameCallback;
  }

  /**
   * Start the game loop.
   */
  start(): void {
    if (this.running || this.disposed) return;

    this.running = true;
    this.paused = false;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.scheduleFrame();
  }

  /**
   * Stop the game loop completely.
   */
  stop(): void {
    this.running = false;
    this.paused = false;
    this.cancelFrame();
  }

  /**
   * Pause the game loop (can be resumed).
   */
  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.cancelFrame();
  }

  /**
   * Resume a paused game loop.
   */
  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastTime = performance.now();
    this.scheduleFrame();
  }

  /**
   * Execute a single frame and return to paused state.
   * Only works when the loop is running AND paused.
   */
  step(): void {
    if (!this.running || !this.paused) return;

    this.stepping = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.scheduleFrame();
  }

  /**
   * Reset timing state (frame counter, total time).
   */
  reset(): void {
    this.frameNumber = 0;
    this.totalTime = 0;
    this.lastDeltaTime = 0;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
  }

  /**
   * Check if the loop is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if the loop is paused.
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get the target frames per second.
   */
  getTargetFPS(): number {
    return this.targetFPS;
  }

  /**
   * Set the target frames per second.
   * Note: This is advisory only; actual FPS depends on requestAnimationFrame.
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = fps;
  }

  /**
   * Get the current timing state.
   */
  getCurrentTiming(): TimingInfo {
    return {
      deltaTime: this.lastDeltaTime,
      totalTime: this.totalTime,
      frameNumber: this.frameNumber,
    };
  }

  /**
   * Clean up and stop the game loop.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
  }

  private scheduleFrame(): void {
    if (this.disposed || !this.running || this.paused) return;
    this.animationFrameId = requestAnimationFrame(this.onFrame.bind(this));
  }

  private cancelFrame(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private onFrame(timestamp: number): void {
    if (this.disposed || !this.running || this.paused) return;

    // Calculate delta time in seconds
    let deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Cap delta time to prevent spiral of death
    if (deltaTime > MAX_DELTA_TIME) {
      deltaTime = MAX_DELTA_TIME;
    }

    // Update timing
    this.frameNumber++;
    this.totalTime += deltaTime;
    this.lastDeltaTime = deltaTime;

    // Create timing info
    const timing: TimingInfo = {
      deltaTime,
      totalTime: this.totalTime,
      frameNumber: this.frameNumber,
    };

    // Call the frame callback
    this.frameCallback(timing);

    // If stepping, pause after this frame
    if (this.stepping) {
      this.stepping = false;
      this.paused = true;
      return;
    }

    // Schedule next frame
    this.scheduleFrame();
  }
}
