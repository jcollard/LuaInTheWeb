# Epic #233: High-Performance Canvas Game Loop with Web Workers and SharedArrayBuffer

**Status:** In Progress (8/9 complete)
**Branch:** epic-233
**Created:** 2025-12-15
**Last Updated:** 2025-12-16

## Overview

Implement a Web Worker-based Lua game engine with **dual-mode communication** (SharedArrayBuffer for high-performance, postMessage fallback for compatibility), featuring a frame-based API (`canvas.onDraw()`, `canvas.isKeyDown()`, etc.).

### Motivation

- Current Lua execution blocks the main thread, making interactive games impossible
- Need ~60fps rendering with responsive input handling
- Stop button must work immediately (true interruptibility)
- Canvas API (#210) requires a non-blocking execution model
- Foundation for future debugging features (#196, #197)
- Enable standalone game export that works on any hosting platform

### Architecture

```
Main Thread                          Web Worker (Lua)
────────────────────                 ────────────────
requestAnimationFrame loop           wasmoon engine
        │                                   │
        ├──► IWorkerChannel ◄───────────────┤
        │    ┌─────────────────────────┐    │
        │    │ SharedArrayBufferChannel│    │  ← Fast path (when available)
        │    │ PostMessageChannel      │    │  ← Fallback (always works)
        │    └─────────────────────────┘    │
        │    [Input State]                  │
        │    [Draw Commands]                │
        │    [Sync Flags]                   │
        │                                   │
Canvas ◄─── render draw commands            │
Keyboard ──► write input state ────────────►│
Mouse                                       │
```

## Architecture Decisions

<!-- Document key decisions as work progresses -->

(none yet)

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #252 | Communication Abstraction Layer | ✅ Complete | - | Merged PR #262 |
| #253 | SharedArrayBuffer Memory Layout | ✅ Complete | - | Done in #252 (PR #262) |
| #254 | Web Worker + Lua Integration | ✅ Complete | - | Merged PR #272 |
| #255 | Main Thread Rendering | ✅ Complete | - | Merged PR #268 |
| #256 | Process Integration | ✅ Complete | - | Merged PR #273 |
| #257 | React Integration & Canvas UI | ✅ Complete | - | Merged PR #281 |
| #258 | COOP/COEP Header Configuration | ✅ Complete | - | Merged PR #260 |
| #259 | Library Workspace Integration | ✅ Complete | - | Merged PR #277 |
| #286 | Shell integration: canvas.start() and canvas.stop() | 🔄 In Progress | 286-shell-canvas-integration | M - Depends on #257 |

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

## Dependency Graph

```
#258 (COOP/COEP) ────────────────────────────────────┐
                                                     │
#252 (Channel Abstraction) ──┬── #253 (SAB Layout)   │
                             │                       │
                             ├── #254 (Worker+Lua) ──┼── #256 (Process) ──┐
                             │         │             │                    │
                             │         └─────────────┼── #259 (Libs)      │
                             │                       │                    │
                             └── #255 (Rendering) ───┴────────────────────┴── #257 (React UI) ── #286 (Shell Integration)
```

**Recommended order:**
1. #258 (XS) - Can be done immediately, enables SAB testing
2. #252 (M) - Foundation for all communication
3. #253 (M) & #255 (M) - Can be done in parallel after #252
4. #254 (L) - Web Worker integration
5. #256 (S) & #259 (S) - Can be done in parallel after #254
6. #257 (M) - Final UI integration
7. #286 (M) - Shell integration with canvas.start()/canvas.stop()

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-15
- Epic started
- Created 8 sub-issues (#252-#259)
- Worktree created at `LuaInTheWeb-epic-233`
- ✅ Completed #258: COOP/COEP Header Configuration (PR #260)
- ✅ Completed #252: Communication Abstraction Layer (PR #262)
  - Created `@lua-learning/canvas-runtime` package
  - Implemented IWorkerChannel interface
  - Implemented PostMessageChannel and SharedArrayBufferChannel
  - 70 tests, 77.92% mutation score
- ✅ Closed #253: SharedArrayBuffer Memory Layout (work done in #252)
- Started #255: Main Thread Rendering
- ✅ Completed #255: Main Thread Rendering (PR #268)
  - Implemented CanvasRenderer for rendering DrawCommands
  - Implemented InputCapture for keyboard/mouse input tracking
  - Implemented GameLoopController for RAF-based game loop
  - Updated InputState to use arrays for channel serialization
  - 143 tests, 75.98% mutation score
- ✅ Completed #254: Web Worker + Lua Integration (PR #272)
  - Implemented LuaCanvasRuntime with wasmoon Lua engine
  - Implemented full canvas.* Lua API (drawing, timing, input)
  - Created LuaCanvasWorker entry point
  - Updated PostMessageChannel for broader target support
  - 171 tests, 76.84% mutation score
- ✅ Completed #256: Process Integration (PR #273)
  - Implemented LuaCanvasProcess implementing IProcess interface
  - Web Worker lifecycle management (create, start, stop, terminate)
  - Mode detection (SharedArrayBuffer vs postMessage) with friendly messaging
  - Worker state tracking and error handling
  - 202 tests, 75.93% mutation score
- ✅ Completed #259: Library Workspace Integration (PR #277)
  - Created LUA_CANVAS_CODE in @lua-learning/lua-runtime with full API docs
  - Added canvas.lua to /libs workspace with all canvas functions
  - Added canvas.md documentation to /docs workspace with examples
  - Improved canvas API: snake_case naming, clearer function names
  - Added set_size, get_width, get_height, set_line_width, is_mouse_pressed
  - 45 new tests, 83.54% mutation score
- Integrated main into epic branch (resolved Lua stdlib docs merge)
- Started #257: React Integration & Canvas UI

### 2025-12-16
- ✅ Completed #257: React Integration & Canvas UI (PR #281)
  - Created CanvasGamePanel component with useCanvasGame hook
  - Integrated canvas tabs into IDELayout with TabBar support
  - Added "Run Canvas" button to EditorPanel toolbar
  - Implemented pause/resume controls for canvas games
  - Canvas keeps running in background when switching tabs
  - Auto-close canvas tabs on process exit (optional)
  - Extracted useCanvasTabManager hook to reduce IDELayout complexity
  - Added canvas documentation to hover provider
  - 6 new E2E tests, comprehensive unit test coverage
- Created #286: Shell integration - canvas.start() and canvas.stop() via lua command
  - Adds `canvas.start()` to open canvas tab and block until `canvas.stop()` or Ctrl+C
  - Removes "Run Canvas" button from EditorPanel
  - All print() output goes to terminal while canvas runs
- Integrated main into epic branch (useWindowFocusRefresh hook)
- Started #286: Shell integration - canvas.start() and canvas.stop()

## Key Files

<!-- Populated as files are created/modified -->

- `lua-learning-website/firebase.json` - COOP/COEP headers for production
- `lua-learning-website/vite.config.ts` - COOP/COEP headers for dev server
- `packages/canvas-runtime/` - New package for canvas game runtime
  - `src/channels/IWorkerChannel.ts` - Channel interface
  - `src/channels/PostMessageChannel.ts` - Fallback implementation
  - `src/channels/SharedArrayBufferChannel.ts` - High-performance implementation
  - `src/channels/channelFactory.ts` - Auto-detection factory
  - `src/shared/types.ts` - DrawCommand, InputState, TimingInfo types
  - `src/renderer/CanvasRenderer.ts` - Renders DrawCommands to canvas
  - `src/renderer/InputCapture.ts` - Captures keyboard/mouse input
  - `src/renderer/GameLoopController.ts` - RAF-based game loop controller
  - `src/worker/LuaCanvasRuntime.ts` - Core Lua runtime with canvas API
  - `src/worker/LuaCanvasWorker.ts` - Web Worker entry point
  - `src/worker/WorkerMessages.ts` - Message type definitions
  - `src/process/LuaCanvasProcess.ts` - IProcess implementation for canvas games

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
