// Worker module exports
// Note: LuaCanvasWorker.ts is the worker entry point, loaded separately as a Worker script

export { LuaCanvasRuntime } from './LuaCanvasRuntime.js';
export type {
  WorkerState,
  MainToWorkerMessage,
  WorkerToMainMessage,
  InitMessage,
  StartMessage,
  StopMessage,
  ReadyMessage,
  ErrorMessage,
  StateChangedMessage,
} from './WorkerMessages.js';
