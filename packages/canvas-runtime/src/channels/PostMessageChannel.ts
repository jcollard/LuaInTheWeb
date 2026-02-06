import type { IWorkerChannel, ChannelConfig } from './IWorkerChannel.js';
import type {
  AudioState,
  DrawCommand,
  GetImageDataRequest,
  GetImageDataResponse,
  InputState,
  TimingInfo,
} from '../shared/types.js';
import { createDefaultAudioState, createEmptyInputState, createDefaultTimingInfo } from '../shared/types.js';

/**
 * Message types for PostMessage communication.
 */
type MessageType =
  | 'draw-commands'
  | 'input-state'
  | 'audio-state'
  | 'timing-info'
  | 'canvas-size'
  | 'frame-ready'
  | 'image-data-request'
  | 'image-data-response'
  | 'waiting-for-interaction'
  | 'has-custom-start-screen';

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
  private audioState: AudioState = createDefaultAudioState();
  private timingInfo: TimingInfo = createDefaultTimingInfo();
  private canvasSize: { width: number; height: number } = { width: 800, height: 600 };

  // Pixel manipulation state
  private pendingImageDataRequests: GetImageDataRequest[] = [];
  private imageDataResponseResolvers: Map<
    string,
    (response: GetImageDataResponse) => void
  > = new Map();

  // Frame synchronization
  private frameReadyResolver: (() => void) | null = null;

  // Start screen state
  private waitingForInteraction = false;
  private customStartScreen = false;

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

      case 'audio-state':
        this.audioState = payload as AudioState;
        break;

      case 'timing-info':
        this.timingInfo = payload as TimingInfo;
        break;

      case 'canvas-size':
        this.canvasSize = payload as { width: number; height: number };
        break;

      case 'frame-ready':
        if (this.frameReadyResolver) {
          this.frameReadyResolver();
          this.frameReadyResolver = null;
        }
        break;

      case 'image-data-request':
        this.pendingImageDataRequests.push(payload as GetImageDataRequest);
        break;

      case 'image-data-response': {
        const response = payload as GetImageDataResponse;
        const resolver = this.imageDataResponseResolvers.get(response.requestId);
        if (resolver) {
          resolver(response);
          this.imageDataResponseResolvers.delete(response.requestId);
        }
        break;
      }

      case 'waiting-for-interaction':
        this.waitingForInteraction = payload as boolean;
        break;

      case 'has-custom-start-screen':
        this.customStartScreen = payload as boolean;
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

  getAudioState(): AudioState {
    return this.audioState;
  }

  setAudioState(state: AudioState): void {
    this.send('audio-state', state);
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

  getCanvasSize(): { width: number; height: number } {
    return this.canvasSize;
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasSize = { width, height };
    this.send('canvas-size', this.canvasSize);
  }

  // Pixel manipulation methods

  requestImageData(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<GetImageDataResponse> {
    const requestId = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const request: GetImageDataRequest = {
      type: 'getImageData',
      requestId,
      x,
      y,
      width,
      height,
    };

    return new Promise<GetImageDataResponse>(resolve => {
      this.imageDataResponseResolvers.set(requestId, resolve);
      this.send('image-data-request', request);
    });
  }

  getPendingImageDataRequests(): GetImageDataRequest[] {
    const requests = this.pendingImageDataRequests;
    this.pendingImageDataRequests = [];
    return requests;
  }

  sendImageDataResponse(response: GetImageDataResponse): void {
    this.send('image-data-response', response);
  }

  // Start screen state

  isWaitingForInteraction(): boolean {
    return this.waitingForInteraction;
  }

  setWaitingForInteraction(waiting: boolean): void {
    this.waitingForInteraction = waiting;
    this.send('waiting-for-interaction', waiting);
  }

  hasCustomStartScreen(): boolean {
    return this.customStartScreen;
  }

  setHasCustomStartScreen(hasCustom: boolean): void {
    this.customStartScreen = hasCustom;
    this.send('has-custom-start-screen', hasCustom);
  }

  dispose(): void {
    // Only close if it's a MessagePort (has close method)
    if ('close' in this.target && typeof this.target.close === 'function') {
      (this.target as MessagePort).close();
    }
  }
}
