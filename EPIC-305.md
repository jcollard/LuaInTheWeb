# Epic #305: Canvas Image Support

**Status:** In Progress (1/5 complete)
**Branch:** epic-305
**Created:** 2025-12-17
**Last Updated:** 2025-12-17T11:21:39-07:00

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

(none yet)

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #306 | Core Types & ImageCache | ✅ Complete | 306-core-types-imagecache | Merged in PR #312 |
| #307 | Asset Loading Infrastructure | ⏳ Pending | - | Depends on #306 |
| #308 | Worker Canvas Implementation | ⏳ Pending | - | Depends on #306, #307 |
| #309 | Shell Canvas Implementation | ⏳ Pending | - | Depends on #306, #307 |
| #310 | Process Integration & E2E Testing | ⏳ Pending | - | Depends on #306, #307, #308, #309 |

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

## Key Files

<!-- Populated as files are created/modified -->

- `packages/canvas-runtime/src/shared/types.ts` - AssetDefinition, AssetManifest, DrawImageCommand types
- `packages/canvas-runtime/src/renderer/ImageCache.ts` - Image cache class for storing loaded images
- `packages/canvas-runtime/tests/renderer/ImageCache.test.ts` - ImageCache unit tests

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
