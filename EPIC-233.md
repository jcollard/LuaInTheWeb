# Epic #233: High-Performance Canvas Game Loop with Web Workers and SharedArrayBuffer

**Status:** In Progress (1/8 complete)
**Branch:** epic-233
**Created:** 2025-12-15
**Last Updated:** 2025-12-15

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
| #252 | Communication Abstraction Layer | 🔄 In Progress | 252-communication-abstraction-layer | PR #262 |
| #253 | SharedArrayBuffer Memory Layout | ⏳ Pending | - | M - Depends on #252 |
| #254 | Web Worker + Lua Integration | ⏳ Pending | - | L - Depends on #252 |
| #255 | Main Thread Rendering | ⏳ Pending | - | M - Depends on #252 |
| #256 | Process Integration | ⏳ Pending | - | S - Depends on #254 |
| #257 | React Integration & Canvas UI | ⏳ Pending | - | M - Depends on #255, #256 |
| #258 | COOP/COEP Header Configuration | ✅ Complete | - | Merged PR #260 |
| #259 | Library Workspace Integration | ⏳ Pending | - | S - Depends on #254 |

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
                             └── #255 (Rendering) ───┴────────────────────┴── #257 (React UI)
```

**Recommended order:**
1. #258 (XS) - Can be done immediately, enables SAB testing
2. #252 (M) - Foundation for all communication
3. #253 (M) & #255 (M) - Can be done in parallel after #252
4. #254 (L) - Web Worker integration
5. #256 (S) & #259 (S) - Can be done in parallel after #254
6. #257 (M) - Final UI integration

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-15
- Epic started
- Created 8 sub-issues (#252-#259)
- Worktree created at `LuaInTheWeb-epic-233`
- ✅ Completed #258: COOP/COEP Header Configuration (PR #260)
- Started #252: Communication Abstraction Layer (PR #262)

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

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
