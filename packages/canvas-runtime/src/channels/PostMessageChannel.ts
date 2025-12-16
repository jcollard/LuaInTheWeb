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
 * Interface for objects that can send/receive postMessages.
 * This is satisfied by MessagePort, DedicatedWorkerGlobalScope, and Worker.
 */
export interface PostMessageTarget {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent<ChannelMessage>) => void) | null;
  /** Optional start method (required for MessagePort, not for Worker) */
  start?(): void;
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
  private readonly target: PostMessageTarget;

  // State storage
  private pendingDrawCommands: DrawCommand[] = [];
  private inputState: InputState = createEmptyInputState();
  private timingInfo: TimingInfo = createDefaultTimingInfo();

  // Frame synchronization
  private frameReadyResolver: (() => void) | null = null;

  constructor(_config: ChannelConfig, target: PostMessageTarget) {
    this.target = target;

    // Set up message handler
    this.target.onmessage = this.handleMessage.bind(this);
    // Only call start() if it exists (MessagePort requires it, Worker doesn't)
    this.target.start?.();
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
        this.inputState = payload as InputState;
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
   * Send a message to the other side.
   */
  private send(type: MessageType, payload: unknown): void {
    const message: ChannelMessage = { type, payload };
    this.target.postMessage(message);
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
    this.send('input-state', state);
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
    // Only close if it's a MessagePort (has close method)
    if ('close' in this.target && typeof this.target.close === 'function') {
      (this.target as MessagePort).close();
    }
  }
}
