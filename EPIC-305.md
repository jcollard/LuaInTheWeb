# Epic #305: Canvas Image Support

**Status:** Complete (5/5)
**Branch:** epic-305
**Created:** 2025-12-17
**Last Updated:** 2025-12-17T20:34:00-07:00

## Overview

Add image drawing support to the canvas Lua API with a preloaded asset manifest system.

### Problem

Users cannot load and draw images in their canvas programs. This limits creative possibilities for games and visual projects.

### Solution

Add a `canvas.assets` sub-library for defining assets before `canvas.start()`, which preloads them into memory. This solves the worker canvas filesystem limitation and provides deterministic loading.

### Proposed API

```lua
-- Define assets before starting (setup phase)
canvas.assets.image("player", "sprites/player.png")
canvas.assets.image("enemy", "/my-files/sprites/enemy.png")

-- Start loads all assets, throws if any fail
canvas.start()

-- Use assets by name (synchronous, already loaded)
canvas.tick(function()
    canvas.draw_image("player", x, y)
    canvas.draw_image("enemy", ex, ey, 64, 64)  -- with scaling
end)

-- Query dimensions
local w = canvas.assets.get_width("player")
local h = canvas.assets.get_height("player")
```

## Architecture Decisions

<!-- Document key decisions as work progresses -->

### ADR-1: Generic AssetLoader with API-layer validation

**Decision:** AssetLoader is a generic binary file loader. Format validation happens at the Lua API layer (`canvas.assets.image()`), not in the loader.

**Context:** Originally AssetLoader was designed to validate image formats and throw on unsupported types. However, this couples the loader to image-specific logic.

**Rationale:**
- Separation of concerns: loader loads files, API validates intent
- Future extensibility: `canvas.assets.audio()` can reuse the same loader
- Cleaner architecture: validation at the layer where user intent is expressed

**Consequences:**
- `LoadedAsset.width`, `height`, `mimeType` are optional
- `canvas.assets.image()` must validate extensions and check dimensions exist
- Non-image files can be loaded without errors (dimensions will be undefined)

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #306 | Core Types & ImageCache | ✅ Complete | 306-core-types-imagecache | Merged in PR #312 |
| #307 | Asset Loading Infrastructure | ✅ Complete | 307-asset-loading-infrastructure | Merged in PR #314 |
| #308 | Worker Canvas Implementation | ✅ Complete | 308-worker-canvas-implementation | Merged in PR #317 |
| #309 | Shell Canvas Implementation | ✅ Complete | 309-shell-canvas-implementation | Merged in PR #318 |
| #310 | Process Integration & E2E Testing | ✅ Complete | 310-process-integration-e2e-testing | PR #323 |

### Dependency Graph

```
#306 (Types & Cache)
  │
  v
#307 (Asset Loading)
  │
  ├──────────────┐
  v              v
#308 (Worker)  #309 (Shell)
  │              │
  └──────┬───────┘
         v
#310 (Integration & E2E)
```

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-17
- Epic started
- Started work on #306: Core Types & ImageCache
- Completed #306: Core Types & ImageCache - Merged PR #312 to epic-305
- Started work on #307: Asset Loading Infrastructure
- PR created for #307: Asset Loading Infrastructure (PR #314)
- Completed #307: Asset Loading Infrastructure - Merged PR #314 to epic-305
- Integrated main into epic branch (8 commits)
- Started work on #308: Worker Canvas Implementation
- PR created for #308: Worker Canvas Implementation (PR #317)
- Completed #308: Worker Canvas Implementation - Merged PR #317 to epic-305
- Started work on #309: Shell Canvas Implementation
- Completed #309: Shell Canvas Implementation - Merged PR #318 to epic-305
- Started work on #310: Process Integration & E2E Testing
- Completed #310: Process Integration & E2E Testing - PR #323 created
- **Epic #305 complete!** All 5 sub-issues finished.

## Key Files

<!-- Populated as files are created/modified -->

- `packages/canvas-runtime/src/shared/types.ts` - AssetDefinition, AssetManifest, DrawImageCommand types
- `packages/canvas-runtime/src/renderer/ImageCache.ts` - Image cache class for storing loaded images
- `packages/canvas-runtime/tests/renderer/ImageCache.test.ts` - ImageCache unit tests
- `packages/canvas-runtime/src/shared/AssetLoader.ts` - Generic binary asset loader with path resolution
- `packages/canvas-runtime/tests/shared/AssetLoader.test.ts` - AssetLoader unit tests
- `packages/canvas-runtime/src/worker/WorkerMessages.ts` - SerializedAsset type for worker communication
- `packages/canvas-runtime/src/worker/LuaCanvasRuntime.ts` - Asset API bindings (canvas.assets.*, canvas.draw_image)
- `packages/canvas-runtime/src/renderer/CanvasRenderer.ts` - drawImage command with ImageCache support
- `packages/lua-runtime/src/CanvasController.ts` - Shell canvas: registerAsset, loadAssets, drawImage, getAssetWidth/Height
- `packages/lua-runtime/src/setupCanvasAPI.ts` - Shell canvas: canvas.assets.image, canvas.draw_image, canvas.assets.get_width/height
- `packages/canvas-runtime/src/process/LuaCanvasProcess.ts` - Asset loading protocol integration for worker canvas
- `lua-learning-website/e2e/canvas-image.spec.ts` - E2E tests for canvas image support

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
