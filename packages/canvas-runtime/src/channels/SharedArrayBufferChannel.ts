import type { IWorkerChannel, ChannelConfig } from './IWorkerChannel.js';
import type { DrawCommand, InputState, TimingInfo } from '../shared/types.js';

/**
 * SharedArrayBuffer memory layout (64KB total):
 *
 * Offset   | Size   | Purpose
 * ---------|--------|----------------------------------
 * 0-3      | 4B     | Frame ready flag (Atomics)
 * 4-7      | 4B     | Draw commands count
 * 8-11     | 4B     | Draw commands data length
 * 12-15    | 4B     | Reserved
 * 16-23    | 8B     | Delta time (Float64)
 * 24-31    | 8B     | Total time (Float64)
 * 32-35    | 4B     | Frame number
 * 36-39    | 4B     | Mouse X
 * 40-43    | 4B     | Mouse Y
 * 44-47    | 4B     | Mouse buttons down (bitmask)
 * 48-51    | 4B     | Keys down count
 * 52-563   | 512B   | Keys down data (up to 32 keys, 16 bytes each)
 * 564-567  | 4B     | Keys pressed count
 * 568-1079 | 512B   | Keys pressed data (up to 32 keys, 16 bytes each)
 * 1080-1083| 4B     | Canvas width
 * 1084-1087| 4B     | Canvas height
 * 1088-1091| 4B     | Mouse buttons pressed (bitmask)
 * 1092-2047| 956B   | Reserved for future use
 * 2048-65535| 63KB  | Draw commands ring buffer
 */

// Memory layout offsets
const OFFSET_FRAME_READY = 0;
const OFFSET_DRAW_COUNT = 4;
const OFFSET_DRAW_LENGTH = 8;
const OFFSET_DELTA_TIME = 16;
const OFFSET_TOTAL_TIME = 24;
const OFFSET_FRAME_NUMBER = 32;
const OFFSET_MOUSE_X = 36;
const OFFSET_MOUSE_Y = 40;
const OFFSET_MOUSE_BUTTONS = 44;
const OFFSET_KEYS_DOWN_COUNT = 48;
const OFFSET_KEYS_DOWN_DATA = 52;
const OFFSET_KEYS_PRESSED_COUNT = 564;
const OFFSET_KEYS_PRESSED_DATA = 568;
const OFFSET_CANVAS_WIDTH = 1080;
const OFFSET_CANVAS_HEIGHT = 1084;
const OFFSET_MOUSE_BUTTONS_PRESSED = 1088;
const OFFSET_DRAW_BUFFER = 2048;

const MAX_KEYS = 32;
const KEY_SIZE = 16; // 16 bytes per key name (longest: "NumpadSubtract" = 14 chars)
const DRAW_BUFFER_SIZE = 65536 - OFFSET_DRAW_BUFFER;

// Mouse button bitmasks
const MOUSE_LEFT = 1;
const MOUSE_MIDDLE = 2;
const MOUSE_RIGHT = 4;

/**
 * SharedArrayBuffer-based implementation of IWorkerChannel.
 *
 * This is the high-performance implementation that uses SharedArrayBuffer
 * and Atomics for lock-free communication between threads.
 *
 * Performance characteristics:
 * - ~0ms latency (direct memory access)
 * - Lock-free reads
 * - Atomic synchronization
 * - Requires crossOriginIsolated context
 */
export class SharedArrayBufferChannel implements IWorkerChannel {
  private readonly buffer: SharedArrayBuffer;
  private readonly int32View: Int32Array;
  private readonly float64View: Float64Array;
  private readonly uint8View: Uint8Array;
  private readonly textEncoder: TextEncoder;
  private readonly textDecoder: TextDecoder;

  constructor(_config: ChannelConfig, buffer: SharedArrayBuffer) {
    this.buffer = buffer;
    this.int32View = new Int32Array(buffer);
    this.float64View = new Float64Array(buffer);
    this.uint8View = new Uint8Array(buffer);
    this.textEncoder = new TextEncoder();
    this.textDecoder = new TextDecoder();
  }

  /**
   * Get the underlying SharedArrayBuffer.
   */
  getBuffer(): SharedArrayBuffer {
    return this.buffer;
  }

  // Draw commands

  sendDrawCommands(commands: DrawCommand[]): void {
    // Serialize commands to JSON
    const json = JSON.stringify(commands);
    const encoded = this.textEncoder.encode(json);

    if (encoded.length > DRAW_BUFFER_SIZE) {
      console.warn('Draw commands too large, truncating');
      return;
    }

    // Write data to buffer
    this.uint8View.set(encoded, OFFSET_DRAW_BUFFER);

    // Update length and count atomically
    Atomics.store(this.int32View, OFFSET_DRAW_LENGTH / 4, encoded.length);
    Atomics.store(this.int32View, OFFSET_DRAW_COUNT / 4, commands.length);
  }

  getDrawCommands(): DrawCommand[] {
    const count = Atomics.load(this.int32View, OFFSET_DRAW_COUNT / 4);
    if (count === 0) {
      return [];
    }

    const length = Atomics.load(this.int32View, OFFSET_DRAW_LENGTH / 4);
    if (length === 0) {
      return [];
    }

    // Read and decode data
    const data = this.uint8View.slice(OFFSET_DRAW_BUFFER, OFFSET_DRAW_BUFFER + length);
    const json = this.textDecoder.decode(data);

    // Clear the buffer
    Atomics.store(this.int32View, OFFSET_DRAW_COUNT / 4, 0);
    Atomics.store(this.int32View, OFFSET_DRAW_LENGTH / 4, 0);

    try {
      return JSON.parse(json) as DrawCommand[];
    } catch (error) {
      console.warn('Failed to parse draw commands JSON:', error);
      return [];
    }
  }

  // Input state

  getInputState(): InputState {
    const mouseX = Atomics.load(this.int32View, OFFSET_MOUSE_X / 4);
    const mouseY = Atomics.load(this.int32View, OFFSET_MOUSE_Y / 4);

    // Read mouse buttons down bitmask
    const mouseButtonDownMask = Atomics.load(this.int32View, OFFSET_MOUSE_BUTTONS / 4);
    const mouseButtonsDown: number[] = [];
    if (mouseButtonDownMask & MOUSE_LEFT) mouseButtonsDown.push(0);
    if (mouseButtonDownMask & MOUSE_MIDDLE) mouseButtonsDown.push(1);
    if (mouseButtonDownMask & MOUSE_RIGHT) mouseButtonsDown.push(2);

    // Read mouse buttons pressed bitmask (separate from down)
    const mouseButtonPressedMask = Atomics.load(this.int32View, OFFSET_MOUSE_BUTTONS_PRESSED / 4);
    const mouseButtonsPressed: number[] = [];
    if (mouseButtonPressedMask & MOUSE_LEFT) mouseButtonsPressed.push(0);
    if (mouseButtonPressedMask & MOUSE_MIDDLE) mouseButtonsPressed.push(1);
    if (mouseButtonPressedMask & MOUSE_RIGHT) mouseButtonsPressed.push(2);

    const keysDown = this.readKeyArray(OFFSET_KEYS_DOWN_COUNT, OFFSET_KEYS_DOWN_DATA);
    const keysPressed = this.readKeyArray(OFFSET_KEYS_PRESSED_COUNT, OFFSET_KEYS_PRESSED_DATA);

    return {
      keysDown,
      keysPressed,
      mouseX,
      mouseY,
      mouseButtonsDown,
      mouseButtonsPressed,
    };
  }

  setInputState(state: InputState): void {
    Atomics.store(this.int32View, OFFSET_MOUSE_X / 4, state.mouseX);
    Atomics.store(this.int32View, OFFSET_MOUSE_Y / 4, state.mouseY);

    // Write mouse buttons down bitmask
    let mouseButtonDownMask = 0;
    if (state.mouseButtonsDown.includes(0)) mouseButtonDownMask |= MOUSE_LEFT;
    if (state.mouseButtonsDown.includes(1)) mouseButtonDownMask |= MOUSE_MIDDLE;
    if (state.mouseButtonsDown.includes(2)) mouseButtonDownMask |= MOUSE_RIGHT;
    Atomics.store(this.int32View, OFFSET_MOUSE_BUTTONS / 4, mouseButtonDownMask);

    // Write mouse buttons pressed bitmask (separate from down)
    let mouseButtonPressedMask = 0;
    if (state.mouseButtonsPressed.includes(0)) mouseButtonPressedMask |= MOUSE_LEFT;
    if (state.mouseButtonsPressed.includes(1)) mouseButtonPressedMask |= MOUSE_MIDDLE;
    if (state.mouseButtonsPressed.includes(2)) mouseButtonPressedMask |= MOUSE_RIGHT;
    Atomics.store(this.int32View, OFFSET_MOUSE_BUTTONS_PRESSED / 4, mouseButtonPressedMask);

    this.writeKeyArray(OFFSET_KEYS_DOWN_COUNT, OFFSET_KEYS_DOWN_DATA, state.keysDown);
    this.writeKeyArray(OFFSET_KEYS_PRESSED_COUNT, OFFSET_KEYS_PRESSED_DATA, state.keysPressed);
  }

  private readKeyArray(countOffset: number, dataOffset: number): string[] {
    const count = Atomics.load(this.int32View, countOffset / 4);
    const keys: string[] = [];

    for (let i = 0; i < count && i < MAX_KEYS; i++) {
      const keyStart = dataOffset + i * KEY_SIZE;
      // Find null terminator or end of key slot
      let keyEnd = keyStart;
      while (keyEnd < keyStart + KEY_SIZE && this.uint8View[keyEnd] !== 0) {
        keyEnd++;
      }
      if (keyEnd > keyStart) {
        const keyData = this.uint8View.slice(keyStart, keyEnd);
        keys.push(this.textDecoder.decode(keyData));
      }
    }

    return keys;
  }

  private writeKeyArray(countOffset: number, dataOffset: number, keys: string[]): void {
    const keyArray = keys.slice(0, MAX_KEYS);
    Atomics.store(this.int32View, countOffset / 4, keyArray.length);

    // Clear existing data
    this.uint8View.fill(0, dataOffset, dataOffset + MAX_KEYS * KEY_SIZE);

    // Write keys
    for (let i = 0; i < keyArray.length; i++) {
      const encoded = this.textEncoder.encode(keyArray[i]);
      const keyStart = dataOffset + i * KEY_SIZE;
      const copyLength = Math.min(encoded.length, KEY_SIZE - 1); // Leave room for null terminator
      this.uint8View.set(encoded.subarray(0, copyLength), keyStart);
    }
  }

  // Timing

  getDeltaTime(): number {
    return this.float64View[OFFSET_DELTA_TIME / 8];
  }

  getTotalTime(): number {
    return this.float64View[OFFSET_TOTAL_TIME / 8];
  }

  getTimingInfo(): TimingInfo {
    return {
      deltaTime: this.float64View[OFFSET_DELTA_TIME / 8],
      totalTime: this.float64View[OFFSET_TOTAL_TIME / 8],
      frameNumber: Atomics.load(this.int32View, OFFSET_FRAME_NUMBER / 4),
    };
  }

  setTimingInfo(timing: TimingInfo): void {
    this.float64View[OFFSET_DELTA_TIME / 8] = timing.deltaTime;
    this.float64View[OFFSET_TOTAL_TIME / 8] = timing.totalTime;
    Atomics.store(this.int32View, OFFSET_FRAME_NUMBER / 4, timing.frameNumber);
  }

  // Frame synchronization

  async waitForFrame(): Promise<void> {
    // Check if frame is already ready
    const current = Atomics.load(this.int32View, OFFSET_FRAME_READY / 4);
    if (current === 1) {
      // Reset and return immediately
      Atomics.store(this.int32View, OFFSET_FRAME_READY / 4, 0);
      return;
    }

    // Wait for frame signal
    // Note: Atomics.wait is not available in main thread, so we use polling
    // In a real worker, Atomics.wait would be used for true blocking
    return new Promise<void>(resolve => {
      const check = (): void => {
        const value = Atomics.load(this.int32View, OFFSET_FRAME_READY / 4);
        if (value === 1) {
          Atomics.store(this.int32View, OFFSET_FRAME_READY / 4, 0);
          resolve();
        } else {
          setTimeout(check, 1);
        }
      };
      check();
    });
  }

  signalFrameReady(): void {
    Atomics.store(this.int32View, OFFSET_FRAME_READY / 4, 1);
    // Notify waiting workers
    Atomics.notify(this.int32View, OFFSET_FRAME_READY / 4, 1);
  }

  getCanvasSize(): { width: number; height: number } {
    const width = Atomics.load(this.int32View, OFFSET_CANVAS_WIDTH / 4);
    const height = Atomics.load(this.int32View, OFFSET_CANVAS_HEIGHT / 4);
    return { width: width || 800, height: height || 600 };
  }

  setCanvasSize(width: number, height: number): void {
    Atomics.store(this.int32View, OFFSET_CANVAS_WIDTH / 4, width);
    Atomics.store(this.int32View, OFFSET_CANVAS_HEIGHT / 4, height);
  }

  dispose(): void {
    // Nothing to clean up for SharedArrayBuffer
    // The buffer will be garbage collected when no references remain
  }
}
