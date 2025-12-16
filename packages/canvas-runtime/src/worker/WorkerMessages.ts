/**
 * Message types for communication with the canvas worker.
 */

/**
 * Worker lifecycle state.
 */
export type WorkerState = 'idle' | 'initializing' | 'running' | 'stopped' | 'error';

/**
 * Message from main thread to worker.
 */
export type MainToWorkerMessage =
  | InitMessage
  | StartMessage
  | StopMessage;

/**
 * Initialize the Lua engine with code.
 */
export interface InitMessage {
  type: 'init';
  /** Lua code to execute */
  code: string;
}

/**
 * Start the game loop.
 */
export interface StartMessage {
  type: 'start';
}

/**
 * Stop the game loop.
 */
export interface StopMessage {
  type: 'stop';
}

/**
 * Message from worker to main thread.
 */
export type WorkerToMainMessage =
  | ReadyMessage
  | ErrorMessage
  | StateChangedMessage;

/**
 * Worker is ready (Lua engine initialized).
 */
export interface ReadyMessage {
  type: 'ready';
}

/**
 * An error occurred.
 */
export interface ErrorMessage {
  type: 'error';
  message: string;
  /** Stack trace if available */
  stack?: string;
}

/**
 * Worker state changed.
 */
export interface StateChangedMessage {
  type: 'stateChanged';
  state: WorkerState;
}
