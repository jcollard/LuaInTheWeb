import type { IWorkerChannel, ChannelConfig } from './IWorkerChannel.js';
import type { DrawCommand, InputState, TimingInfo } from '../shared/types.js';
import { createEmptyInputState, createDefaultTimingInfo } from '../shared/types.js';

/**
 * Message types for PostMessage communication.
 */
type MessageType =
  | 'draw-commands'
  | 'input-state'
  | 'timing-info'
  | 'frame-ready';

/**
 * Message structure for PostMessage communication.
 */
interface ChannelMessage {
  type: MessageType;
  payload: unknown;
}

/**
 * Serialized input state (Sets converted to arrays for postMessage).
 */
interface SerializedInputState {
  keysDown: string[];
  keysPressed: string[];
  mouseX: number;
  mouseY: number;
  mouseButtons: string[];
}

/**
 * PostMessage-based implementation of IWorkerChannel.
 *
 * This is the fallback implementation that works without SharedArrayBuffer,
 * using postMessage and MessageChannel for communication.
 *
 * Performance characteristics:
 * - ~1-4ms latency per message
 * - Still capable of 60fps
 * - Works on all platforms including GitHub Pages
 */
export class PostMessageChannel implements IWorkerChannel {
  private readonly port: MessagePort;
  private readonly side: 'main' | 'worker';

  // State storage
  private pendingDrawCommands: DrawCommand[] = [];
  private inputState: InputState = createEmptyInputState();
  private timingInfo: TimingInfo = createDefaultTimingInfo();

  // Frame synchronization
  private frameReadyResolver: (() => void) | null = null;

  constructor(config: ChannelConfig, port: MessagePort) {
    this.side = config.side;
    this.port = port;

    // Set up message handler
    this.port.onmessage = this.handleMessage.bind(this);
    this.port.start();
  }

  /**
   * Handle incoming messages from the other side.
   */
  private handleMessage(event: MessageEvent<ChannelMessage>): void {
    const { type, payload } = event.data;

    switch (type) {
      case 'draw-commands':
        this.pendingDrawCommands.push(...(payload as DrawCommand[]));
        break;

      case 'input-state':
        this.inputState = this.deserializeInputState(payload as SerializedInputState);
        break;

      case 'timing-info':
        this.timingInfo = payload as TimingInfo;
        break;

      case 'frame-ready':
        if (this.frameReadyResolver) {
          this.frameReadyResolver();
          this.frameReadyResolver = null;
        }
        break;
    }
  }

  /**
   * Serialize InputState for postMessage (Sets → Arrays).
   */
  private serializeInputState(state: InputState): SerializedInputState {
    return {
      keysDown: Array.from(state.keysDown),
      keysPressed: Array.from(state.keysPressed),
      mouseX: state.mouseX,
      mouseY: state.mouseY,
      mouseButtons: Array.from(state.mouseButtons),
    };
  }

  /**
   * Deserialize InputState from postMessage (Arrays → Sets).
   */
  private deserializeInputState(serialized: SerializedInputState): InputState {
    return {
      keysDown: new Set(serialized.keysDown),
      keysPressed: new Set(serialized.keysPressed),
      mouseX: serialized.mouseX,
      mouseY: serialized.mouseY,
      mouseButtons: new Set(serialized.mouseButtons) as Set<'left' | 'middle' | 'right'>,
    };
  }

  /**
   * Send a message to the other side.
   */
  private send(type: MessageType, payload: unknown): void {
    const message: ChannelMessage = { type, payload };
    this.port.postMessage(message);
  }

  // IWorkerChannel implementation

  sendDrawCommands(commands: DrawCommand[]): void {
    this.send('draw-commands', commands);
  }

  getDrawCommands(): DrawCommand[] {
    const commands = this.pendingDrawCommands;
    this.pendingDrawCommands = [];
    return commands;
  }

  getInputState(): InputState {
    return this.inputState;
  }

  setInputState(state: InputState): void {
    this.send('input-state', this.serializeInputState(state));
  }

  getDeltaTime(): number {
    return this.timingInfo.deltaTime;
  }

  getTotalTime(): number {
    return this.timingInfo.totalTime;
  }

  getTimingInfo(): TimingInfo {
    return this.timingInfo;
  }

  setTimingInfo(timing: TimingInfo): void {
    this.send('timing-info', timing);
  }

  waitForFrame(): Promise<void> {
    return new Promise<void>(resolve => {
      this.frameReadyResolver = resolve;
    });
  }

  signalFrameReady(): void {
    this.send('frame-ready', null);
  }

  dispose(): void {
    this.port.close();
  }
}
