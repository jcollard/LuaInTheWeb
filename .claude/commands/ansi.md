# ANSI Subsystem Guide

The ANSI subsystem spans ~92 files and ~25k lines across four tightly coupled areas: the **ANSI Art Editor**, the **Lua runtime**, a **shared playback engine**, and the **tab system**. They share the same file format, compositing algorithm, playback engine, and terminal display. Changes to one side can silently break the other.

> **CRITICAL**: Key logic is **intentionally duplicated** between the editor and runtime (compositing, text rasterization, types). When you change one side, you **must** update the other. See [DRY Relationships](#dry-relationships--paired-files) below.

---

## Architecture Overview

```
                         ┌──────────────────────────────┐
                         │     Tab System (IDE)         │
                         │  AnsiTabContent (runtime)    │
                         │  AnsiEditorTabContent (editor)│
                         └──────┬──────────┬────────────┘
                                │          │
                    ┌───────────▼──┐  ┌────▼──────────────┐
                    │  ANSI Editor │  │   Lua Runtime      │
                    │  (website)   │  │   (lua-runtime)    │
                    │              │  │                     │
                    │ layerUtils   │  │ screenCompositor    │
                    │ textLayerGrid│  │ textLayerGrid       │
                    │ serialization│  │ screenParser         │
                    │ terminalBuf  │  │ ansiStringRenderer   │
                    │ types.ts     │  │ screenTypes.ts       │
                    └──────┬───────┘  └──────┬──────────────┘
                           │                 │
                           │  ┌──────────────┘
                           │  │
                    ┌──────▼──▼──────────┐
                    │  ansi-shared       │
                    │  playbackEngine.ts │
                    └────────────────────┘
                           │
                    ┌──────▼─────────────┐
                    │    xterm.js        │
                    │  (terminal display)│
                    └────────────────────┘
```

---

## Critical File Paths

### Editor (`lua-learning-website/src/components/AnsiGraphicsEditor/`)

| File | Purpose |
|------|---------|
| `useAnsiEditor.ts` | Main editor state machine (layers, brush, grid, playback, undo/redo) |
| `useAnsiEditorFile.ts` | File load/save operations and persistence |
| `useLayerState.ts` | Layer state management (add, remove, reorder, merge, group) |
| `layerUtils.ts` | Layer structure ops + **compositing** (`compositeCellCore`) |
| `textLayerGrid.ts` | Text rasterization (word wrap, justify, alignment) |
| `terminalBuffer.ts` | Double-buffered rendering to xterm.js |
| `drawHelpers.ts` | Drawing preview, commit, and rendering helpers |
| `gridUtils.ts` | Core grid manipulation (get/set cells, init, copy) |
| `serialization.ts` | Serialize/deserialize to Lua table format (v1-v6) |
| `types.ts` | Core types (AnsiCell, AnsiGrid, Layer, DrawTool, Palettes) |
| `colorUtils.ts` | Color manipulation (RGB, hex, CGA palette) |
| `selectionTool.ts` | Selection tool implementation |
| `lineAlgorithm.ts` | Bresenham line drawing |
| `keyboardShortcuts.ts` | Keyboard shortcut handler |
| `ansExport.ts` | ANSI (.ans) file export |
| `shExport.ts` | Shell script (.sh) export |
| `pngImport.ts` | PNG to ANSI layer import |
| `AnsiGraphicsEditor.tsx` | Root editor component |
| `AnsiEditorToolbar.tsx` | Toolbar UI |
| `LayersPanel.tsx` / `LayerRow.tsx` | Layer hierarchy UI |
| `FramesPanel.tsx` | Frame animation UI |
| `ColorPanel.tsx` | Color selection UI |
| `CharPaletteModal.tsx` | Character palette browser |
| `SaveAsDialog.tsx` | Save As dialog |
| `FileOptionsModal.tsx` | File options (resolution, palette) |

### Runtime (`packages/lua-runtime/src/`)

| File | Purpose |
|------|---------|
| `AnsiController.ts` | Main runtime controller (screen mgmt, playback, input, terminal I/O) |
| `setupAnsiAPI.ts` | Registers JS functions for Lua bridge (`__ansi_*` globals) |
| `screenCompositor.ts` | Layer **compositing** (`compositeCellCore`) — mirrored from editor |
| `screenParser.ts` | Parse ANSI screen files (v1-v6 migration) |
| `screenTypes.ts` | Screen types (LayerData, DrawableLayerData, AnsiGrid, constants) |
| `textLayerGrid.ts` | Text rasterization — **ported from editor** |
| `ansiStringRenderer.ts` | Convert grid to ANSI escape sequences (full + diff render) |
| `ansiLuaWrapper.ts` | Combines core + input Lua code |
| `ansiLuaCode/core.ts` | Core Lua API (screen, layer, playback functions) |
| `ansiLuaCode/input.ts` | Input Lua API (keyboard and mouse) |
| `lua/ansi.lua` | Lua API source (user-facing documentation) |
| `lua/ansi.generated.ts` | Generated Lua code bundled into runtime |

### Shared (`packages/ansi-shared/src/`)

| File | Purpose |
|------|---------|
| `playbackEngine.ts` | Shared frame animation playback (drift correction, scheduling) |
| `index.ts` | Module exports |

### Tab System (`lua-learning-website/src/components/`)

| File | Purpose |
|------|---------|
| `AnsiTerminalPanel/AnsiTerminalPanel.tsx` | xterm.js terminal container (used by both editor + runtime) |
| `IDELayout/AnsiTabContent.tsx` | Tab wrapper for runtime ANSI output (`'ansi'` tab type) |
| `IDELayout/AnsiEditorTabContent.tsx` | Tab wrapper for ANSI editor (`'ansi-editor'` tab type) |

### Documentation & Assets

| File | Purpose |
|------|---------|
| `docs/ansi-editor-development.md` | Developer guide for editor architecture |
| `docs/ansi-graphics-editor.md` | Feature documentation |
| `lua-learning-website/public/docs/ansi.md` | User-facing ANSI API docs |
| `lua-learning-website/public/libs/ansi.lua` | Public Lua library |
| `lua-learning-website/public/examples/ansi/*.lua` | Example programs |

---

## DRY Relationships / Paired Files

These file pairs implement the **same logic** in both editor and runtime. When you change one, you **must** update the other.

| Logic | Editor File | Runtime File | Notes |
|-------|-------------|--------------|-------|
| **Compositing** | `layerUtils.ts` → `compositeCellCore()` | `screenCompositor.ts` → `compositeCellCore()` | Same algorithm: bottom-to-top, transparent-bg handling, half-block merging |
| **Text rasterization** | `textLayerGrid.ts` | `textLayerGrid.ts` | Fully ported with identical tests in both locations |
| **Types & constants** | `types.ts` (AnsiCell, Layer, ANSI_COLS/ROWS, HALF_BLOCK, TRANSPARENT_*) | `screenTypes.ts` (LayerData, DrawableLayerData, same constants) | Editor uses mutable types; runtime uses immutable `LayerData` |
| **Serialization** | `serialization.ts` (write + read) | `screenParser.ts` (read only) | Both must handle v1-v6. Runtime only parses; editor also writes |
| **Visibility filtering** | `layerUtils.ts` → `hiddenGroupIds()`, `visibleDrawableLayers()` | `screenCompositor.ts` → `hiddenGroupIds()`, `visibleDrawableLayers()` | Same group-visibility propagation logic |

---

## File Format & Versioning

The ANSI file format uses Lua table syntax (`return { ... }`), parsed by `@kilcekru/lua-table`.

| Version | Added | Backward Compatible |
|---------|-------|-------------------|
| **v1** | Simple grid (no layers) | Yes |
| **v2** | Layer array + activeLayerId | Yes |
| **v3** | Rect bounds for drawn layers | Yes |
| **v4** | Group layers + parentId nesting | Yes |
| **v5** | Frame animation (multiple frames per drawn layer) | Yes |
| **v6** | Layer tags + availableTags list | Yes |

**Auto-versioning**: `computeVersion()` in `serialization.ts` selects the minimum version needed:
- Uses v5 only if any layer has multiple frames
- Uses v6 only if any layer has tags or availableTags is non-empty
- Otherwise uses v4 (base modern format)

**Rules**:
- All versions must remain **backward compatible** — newer code must load older files
- `screenParser.ts` (runtime) and `serialization.ts` (editor) must both handle all versions
- New fields should be optional with sensible defaults

---

## Display Consistency

Two independent rendering paths must produce **identical visual output** for the same grid:

| Path | Used By | Implementation |
|------|---------|----------------|
| **TerminalBuffer** | Editor | `terminalBuffer.ts` — double-buffered, writes directly to xterm.js via escape sequences |
| **ansiStringRenderer** | Runtime | `ansiStringRenderer.ts` — generates ANSI string, written via `AnsiController.write()` |

Both renderers:
- Use 24-bit RGB colors (`\x1b[38;2;r;g;b` / `\x1b[48;2;r;g;b`)
- Support half-block characters (`\u2580`) for 80x50 effective resolution
- Reset with `\x1b[0m`

**Testing**: If you change compositing or rendering, verify that the same grid produces visually identical output through both paths.

---

## Performance Patterns

### DO use these patterns:

| Pattern | Where | Description |
|---------|-------|-------------|
| **Shadow diff** | `terminalBuffer.ts` | Tracks old/new cell state; only writes changed cells to terminal |
| **Diff rendering** | `ansiStringRenderer.ts` → `renderDiffAnsiString()` | Compares current grid to previous; only emits changed cells |
| **RAF throttling** | `GameLoopController` (canvas-runtime) | Drives frame timing via requestAnimationFrame |
| **Preview-then-commit** | `drawHelpers.ts` | Preview cells show during drag; committed only on release |
| **Playback drift correction** | `playbackEngine.ts` | Snaps forward if more than one full animation period late |

### DO NOT:

- **Full re-render every frame** — always use diff-based rendering
- **Allocate new grids per frame** — reuse existing grid arrays where possible
- **Skip RAF** — never use `setInterval` for animation; use the game loop controller
- **Ignore drift** — playback timing must handle tab-backgrounding and slow frames

---

## ansi.lua API Bridge

The ANSI API uses a three-layer architecture:

```
┌─────────────────────────┐
│  Lua code (user)        │  local ansi = require("ansi")
│  ansi.start()           │  ansi.screen.create(data)
└────────┬────────────────┘
         │ calls
┌────────▼────────────────┐
│  Lua wrapper            │  ansiLuaCode/core.ts + input.ts
│  (bundled as string)    │  Adds error handling, table conversion
└────────┬────────────────┘
         │ calls __ansi_* globals
┌────────▼────────────────┐
│  JS bridge              │  setupAnsiAPI.ts
│  engine.global.set()    │  Registers __ansi_* functions
└────────┬────────────────┘
         │ delegates to
┌────────▼────────────────┐
│  AnsiController         │  AnsiController.ts
│  (actual implementation)│  Screen mgmt, playback, input, I/O
└─────────────────────────┘
```

### Adding a new API function:

1. **AnsiController.ts** — Add the method implementation
2. **setupAnsiAPI.ts** — Register `__ansi_<name>` global that calls the controller method
3. **ansiLuaCode/core.ts** or **input.ts** — Add Lua wrapper that calls `__ansi_<name>`
4. **lua/ansi.lua** — Update the Lua API documentation source
5. **public/docs/ansi.md** — Update user-facing documentation

### Naming conventions:
- JS bridge functions: `__ansi_camelCase` (e.g., `__ansi_createScreen`)
- Lua API: `ansi.snake_case` or `ansi.namespace.snake_case` (e.g., `ansi.screen.create`)

---

## Tab System

Two tab types display ANSI content:

| Tab Type | Component | Purpose |
|----------|-----------|---------|
| `'ansi'` | `AnsiTabContent.tsx` | Runtime ANSI output (from Lua programs) |
| `'ansi-editor'` | `AnsiEditorTabContent.tsx` | ANSI Art Editor |

Both use `AnsiTerminalPanel.tsx` as the xterm.js container. The panel:
- Creates an xterm.js Terminal instance
- Configures 80x25 character grid (80x50 with half-blocks)
- Sets `disableStdin: true` for display-only mode
- Prevents xterm.js from capturing keyboard events (important for editor shortcuts)

---

## Change Impact Matrix

Use this table to determine what else needs updating when you change a file:

| If you change... | Also update... | Reason |
|------------------|----------------|--------|
| `layerUtils.ts` compositing | `screenCompositor.ts` | Same algorithm in both |
| `screenCompositor.ts` compositing | `layerUtils.ts` | Same algorithm in both |
| `textLayerGrid.ts` (editor) | `textLayerGrid.ts` (runtime) | Ported implementation |
| `textLayerGrid.ts` (runtime) | `textLayerGrid.ts` (editor) | Ported implementation |
| `types.ts` (add/change type) | `screenTypes.ts` | Parallel type definitions |
| `screenTypes.ts` (add/change type) | `types.ts` | Parallel type definitions |
| `serialization.ts` (new version) | `screenParser.ts` | Both must parse the format |
| `screenParser.ts` (parsing logic) | `serialization.ts` | Ensure write/read roundtrip |
| `AnsiController.ts` (new method) | `setupAnsiAPI.ts` + `ansiLuaCode/` + docs | Full API chain |
| `playbackEngine.ts` | Editor playback + runtime playback | Shared by both |
| `terminalBuffer.ts` (rendering) | `ansiStringRenderer.ts` | Must produce identical output |
| `ansiStringRenderer.ts` (rendering) | `terminalBuffer.ts` | Must produce identical output |

---

## Verification Steps

### After changing editor compositing (`layerUtils.ts`):
```bash
npm --prefix lua-learning-website run test -- --run layerUtils
npm --prefix lua-learning-website run test -- --run drawHelpers
```

### After changing runtime compositing (`screenCompositor.ts`):
```bash
npm test -w @lua-learning/lua-runtime -- --run screenCompositor
```

### After changing text rasterization (`textLayerGrid.ts` — either side):
```bash
npm --prefix lua-learning-website run test -- --run textLayerGrid
npm test -w @lua-learning/lua-runtime -- --run textLayerGrid
```

### After changing playback (`playbackEngine.ts`):
```bash
npm test -w @lua-learning/ansi-shared -- --run playbackEngine
```

### After changing serialization/parsing:
```bash
npm --prefix lua-learning-website run test -- --run serialization
npm test -w @lua-learning/lua-runtime -- --run screenParser
```

### After changing the API bridge:
```bash
npm test -w @lua-learning/lua-runtime -- --run AnsiController
```

### Full pre-PR verification:
```bash
npm run build
npm --prefix lua-learning-website run test -- --run
npm --prefix lua-learning-website run lint
npx tsc -p lua-learning-website/tsconfig.app.json --noEmit 2>&1 | grep -v "@lua-learning/"
npm --prefix lua-learning-website run test:e2e
```

---

## Pre-PR Checklist for ANSI Changes

- [ ] **Paired files updated**: If you changed compositing, text rasterization, types, or serialization in one location, the paired file is also updated
- [ ] **Both compositing paths tested**: `layerUtils.ts` tests AND `screenCompositor.ts` tests pass
- [ ] **Display consistency verified**: Same grid produces identical output through TerminalBuffer and ansiStringRenderer
- [ ] **File format backward compat**: Older version files still load correctly after serialization changes
- [ ] **API chain complete**: New API functions are wired through all three layers (controller, bridge, Lua wrapper) with docs
- [ ] **Playback drift handled**: Animation changes work correctly when tabs are backgrounded
- [ ] **Performance preserved**: Diff-based rendering still works; no full re-renders introduced
- [ ] **All ANSI tests pass**: Editor tests, runtime tests, shared tests
- [ ] **Type check clean**: `npx tsc -p lua-learning-website/tsconfig.app.json --noEmit 2>&1 | grep -v "@lua-learning/"` produces no output
