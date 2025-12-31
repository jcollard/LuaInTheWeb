/**
 * Entry point for generating the inline canvas bridge for HTML exports.
 *
 * This file is bundled by esbuild into a self-contained JavaScript file
 * that gets embedded in exported HTML files.
 *
 * The bundle exposes:
 * - setupCanvasBridge(engine, state) - Main bridge setup function
 * - createCanvasRuntimeState(canvas) - Create runtime state
 * - setupInputListeners(state) - Set up input listeners
 * - canvasLuaCode - Combined Lua code for canvas API
 */

import {
  setupCanvasBridge,
  createCanvasRuntimeState,
  setupInputListeners,
  canvasLuaCode,
} from './canvas-standalone.js';

// Expose globally for use in exported HTML
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).CanvasStandalone = {
  setupCanvasBridge,
  createCanvasRuntimeState,
  setupInputListeners,
  canvasLuaCode,
};

// Also expose individual functions for backward compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).setupCanvasBridge = setupCanvasBridge;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).createCanvasRuntimeState = createCanvasRuntimeState;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).setupInputListeners = setupInputListeners;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).canvasLuaCode = canvasLuaCode;
