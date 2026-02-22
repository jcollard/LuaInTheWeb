# ANSI Graphics Editor

The ANSI Graphics Editor is a full-featured art editor for creating ANSI-style artwork using the terminal's 80x25 character grid. It supports multiple layer types, animation frames, pixel-level drawing, and export to multiple formats.

For usage instructions, see the [User Guide](./ansi/editor.md).

**Location:** `lua-learning-website/src/components/AnsiGraphicsEditor/` (~92 files, ~25k lines)

## Component Hierarchy

```
AnsiGraphicsEditor
├── AnsiEditorToolbar          # Tool/mode selection, brush settings, save/export
├── ColorPanel                 # HSV picker, palette swatches (left sidebar)
├── canvasAndFrames            # Center area
│   ├── AnsiTerminalPanel      # xterm.js drawing surface
│   ├── FramesPanel            # Animation frame management (if active layer is drawn)
│   └── ToastContainer         # Ephemeral notifications
├── LayersPanel                # Right sidebar
│   ├── Layers tab → LayerRow[]          # Per-layer visibility, name, reorder
│   └── Tags tab → TagsTabContent       # Tag-based layer organization
├── Modals
│   ├── SaveAsDialog           # Save/Save As with directory picker
│   ├── FileOptionsModal       # New, open, export options
│   ├── CharPaletteModal       # Unicode character selection
│   ├── SimplifyPaletteModal   # Palette reduction (iterative merge)
│   └── ConfirmDialog          # Overwrite confirmation
└── Overlays (absolutely positioned over canvas)
    ├── cellCursor             # Brush position indicator
    ├── dimensionLabel         # Shape dimensions while drawing
    ├── selectionOverlay       # Selection rectangle
    ├── textBoundsOverlay      # Text layer editing bounds
    ├── textCursor             # Text insertion point
    └── flipOriginOverlay      # Flip tool origin marker
```

## State Architecture

```
AnsiGraphicsEditor.tsx (pure UI — props, events, rendering)
    │
    └── useAnsiEditor(options)          # Orchestrator hook
        ├── useLayerState()             # Layer CRUD, frames, tags
        ├── useToast()                  # Toast notifications
        ├── TerminalBuffer              # Double-buffered rendering
        ├── undoStackRef / redoStackRef # Snapshot-based undo
        ├── createDrawHelpers()         # Shape drawing tool handlers
        ├── createSelectionHandlers()   # Selection tool handlers
        └── createTextToolHandlers()    # Text tool handlers
```

### Key Patterns

- **Ref-based synchronous access**: `layersRef`, `activeLayerIdRef`, `brushRef` provide current values inside event handlers without stale closures.
- **Preview-then-commit**: Drawing previews write to `previewCellsRef` and render via `TerminalBuffer.writeCell()`. On mouse-up, previews commit to the layer grid.
- **RAF throttling**: Drag and move operations use `requestAnimationFrame` to throttle redraws.
- **Immutable mutations**: Layer updates use `map` + spread (`layers.map(l => l.id === id ? { ...l, ...changes } : l)`).

### Undo/Redo

- **Snapshot-based** (not command pattern): full `LayerState` cloned on each undoable action
- **MAX_HISTORY = 50** entries per stack
- **`withLayerUndo(action)`**: Pushes snapshot before executing `action()`, then flushes display
- **Redo stack**: Cleared on new action; populated on undo

## Type System

### Core Types

| Type | Definition | Description |
|------|-----------|-------------|
| `RGBColor` | `[number, number, number]` | RGB tuple |
| `AnsiCell` | `{ char, fg, bg }` | Single character cell |
| `AnsiGrid` | `AnsiCell[][]` | 2D grid of cells |
| `BrushSettings` | `{ char, fg, bg, mode, tool, borderStyle?, blendRatio? }` | Current brush state |
| `DrawTool` | `'pencil' \| 'line' \| 'rect-outline' \| ...` | 13 drawing tools |
| `BrushMode` | `'brush' \| 'pixel' \| 'blend-pixel' \| 'eraser'` | Brush behavior mode |
| `BorderStyle` | `{ tl, t, tr, l, r, bl, b, br }` | 8-character border set |
| `Rect` | `{ r0, c0, r1, c1 }` | Bounding rectangle |
| `LayerState` | `{ layers, activeLayerId, availableTags? }` | Full editor state |

### Layer Types

| Type | Fields | Description |
|------|--------|-------------|
| `DrawnLayer` | `grid, frames[], currentFrameIndex, frameDurationMs` | Pixel/character art with animation |
| `TextLayer` | `text, bounds, textFg, textFgColors?, textAlign?` | Styled text with bounding rect |
| `GroupLayer` | `collapsed` | Organizational container (no grid) |

All layers share: `id`, `name`, `visible`, `parentId?`, `tags?`

Union: `Layer = DrawnLayer | TextLayer | GroupLayer`

### Sentinel Colors

| Constant | Value | Purpose |
|----------|-------|---------|
| `TRANSPARENT_HALF` | `[-1, -1, -1]` | Transparent half-pixel in `HALF_BLOCK` cells |
| `TRANSPARENT_BG` | `[-2, -2, -2]` | Transparent background in text layer cells |

Both must be resolved by compositing before reaching the terminal.

### Key Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `ANSI_COLS` | `80` | Canvas width in characters |
| `ANSI_ROWS` | `25` | Canvas height in characters |
| `HALF_BLOCK` | `'\u2580'` (▀) | Character for pixel-level graphics |
| `DEFAULT_BLEND_RATIO` | `0.25` | Default blend-pixel transparency |
| `DEFAULT_FRAME_DURATION_MS` | `100` | Default animation frame timing |
| `MIN_FRAME_DURATION_MS` | `16` | Minimum frame duration |
| `MAX_FRAME_DURATION_MS` | `10000` | Maximum frame duration |

## Layer System

### Storage and Ordering

Layers are stored as a **flat array ordered bottom-to-top** (index 0 = bottom). Tree structure is encoded via `parentId` references.

**Contiguity invariant**: Children of a group must be contiguous in the array and immediately follow their parent. Enforced by `assertContiguousBlocks()` in `layerUtils.ts`.

### Tags

- **Global tag list**: `availableTags[]` in `LayerState`
- **Per-layer tags**: `tags[]` on each layer
- Tags enable bulk visibility toggling and organizational grouping via the Tags tab

### Serialization

Format: **Lua table** via `@kilcekru/lua-table` (prefix: `return { ... }`)

| Version | Adds |
|---------|------|
| 1 | Single grid (legacy) |
| 2 | Multiple drawn layers (legacy) |
| 3 | Drawn + text + group layer types |
| 4 | Group layers with `parentId` |
| 5 | Animation frames (`frames[]` per drawn layer) |
| 6 | Tags (`availableTags` + per-layer `tags`) |

Version is auto-selected based on features used (`computeVersion()`). Text layer grids are recomputed on load rather than serialized.

## Rendering Pipeline

```
1. Layer Compositing
   compositeGrid(layers)
       │
       ├── visibleDrawableLayers()    # Filter hidden groups and non-drawable
       │
       └── compositeCellCore()        # Per-cell blending, bottom-to-top
           ├── Handle TRANSPARENT_BG  # Text floats above pixel art
           ├── Handle HALF_BLOCK      # Merge top/bottom pixel colors
           └── Handle opaque cells    # Direct passthrough or fill gaps

2. Color Transform (optional)
   ColorTransform: (c: RGBColor) => RGBColor
       └── e.g., cgaQuantize for CGA preview mode

3. Terminal Output
   TerminalBuffer.flush(grid, colorTransform?)
       │
       ├── Diff each cell against shadow buffer
       ├── Skip unchanged cells
       ├── Batch all changed cells into single write
       └── Emit ANSI escape sequences to xterm.js
```

### compositeCellCore Algorithm

Iterates visible layers top-to-bottom:
1. Skip empty/default cells
2. **TRANSPARENT_BG cells**: Store as "pending text" — character waiting for a background from a lower layer
3. **HALF_BLOCK cells**: Accumulate top/bottom pixel colors independently; pending text can use the cell's background
4. **Opaque cells**: Return immediately if no partial state; otherwise fill missing pixel colors from background

### TerminalBuffer

Double-buffered renderer that minimizes terminal writes:
- **Shadow buffer**: Mirrors what's currently on screen (initialized to sentinel values)
- **Diff on flush**: Only emits ANSI sequences for cells that changed
- **Batch writes**: All changed cells collected into a single `handle.write()` call
- **`invalidate()`**: Forces full redraw (used on attach or display clear)

ANSI escape format per cell:
```
\x1b[{row};{col}H\x1b[38;2;{r};{g};{b}m\x1b[48;2;{r};{g};{b}m{char}\x1b[0m
```

## Drawing Tools

| Tool | Key | Description |
|------|-----|-------------|
| Pencil | `B` | Freehand drawing with current brush |
| Line | `L` | Straight line (Bresenham's algorithm) |
| Rectangle Outline | `U` | Outlined rectangle |
| Rectangle Filled | `Shift+U` | Filled rectangle |
| Oval Outline | `O` | Ellipse outline (midpoint algorithm) |
| Oval Filled | `Shift+O` | Filled ellipse |
| Border | `K` | Box-drawing border (5 presets: ASCII, Single, Double, Rounded, Heavy) |
| Flood Fill | `G` | BFS fill — cell-level or pixel-level depending on mode |
| Select | `M` | Rectangular selection with copy/move |
| Eyedropper | `I` | Sample colors from canvas |
| Text | `T` | Place/edit text layers |
| Move | `V` | Move layers or selections |
| Flip | `Shift+V` | Flip layer/selection at origin point |

## Brush Modes

| Mode | Key | Description |
|------|-----|-------------|
| Brush | *(default)* | Full cell replacement (character + fg + bg) |
| Pixel | `N` | Half-block sub-cell drawing (effective 160x50 resolution) |
| Blend Pixel | `J` | Half-block with color interpolation (default ratio 0.25) |
| Eraser | `E` | Reset cells/pixels to default |

## Animation System

- Each `DrawnLayer` has `frames[]` (array of `AnsiGrid`), `currentFrameIndex`, and `frameDurationMs`
- **Playback engine** (`playbackEngine.ts`):
  - `initSchedule(layers, now)` — creates per-layer schedule of next-advance timestamps
  - `computePlaybackTick(layers, schedule, now)` — advances ready frames, returns `{ changed, nextDelayMs }`
  - **Drift correction**: If more than one period late, snaps forward to `now + duration` instead of accumulating skipped frames
- Independent per-layer timing (layers can have different frame rates)
- Frame controls: `Space` (play/pause), `[` (previous frame), `]` (next frame)

## Color System

### Palettes

| Palette | Colors | Description |
|---------|--------|-------------|
| CGA | 16 | Classic CGA colors matching `ansi.colors` |
| EGA | 64 | 4 intensity levels per RGB channel |
| VGA | 256 | 16 CGA + 216 color cube + 24 grayscale |
| Current | Dynamic | Colors currently used in the artwork |
| Layer | Dynamic | Colors used in the active layer |

### Features

- **HSV picker** with brightness slider
- **Simplify palette**: Iterative merge of similar colors to reduce palette size
- **CGA preview mode**: `cgaQuantize` maps all colors to nearest CGA color (display-only, non-destructive)

## Import/Export

| Format | Direction | Description |
|--------|-----------|-------------|
| Lua table | Load/Save | Native format with versioned serialization (v3–v6) |
| PNG | Import | Image import with palette quantization |
| ANS | Export | Standard ANSI art file format |
| .sh | Export | Shell script that renders art via `echo -e` (single frame) |
| .sh (animated) | Export | Shell script with frame loop for animations |

## Keyboard Shortcuts

### Tools

| Key | Tool |
|-----|------|
| `B` | Pencil |
| `L` | Line |
| `U` | Rectangle Outline |
| `Shift+U` | Rectangle Filled |
| `O` | Oval Outline |
| `Shift+O` | Oval Filled |
| `K` | Border |
| `G` | Flood Fill |
| `M` | Select |
| `I` | Eyedropper |
| `T` | Text |
| `V` | Move |
| `Shift+V` | Flip |

### Modes

| Key | Mode |
|-----|------|
| `E` | Eraser |
| `N` | Pixel |
| `J` | Blend Pixel |

### Actions

| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `F` | Open file menu |
| `Shift+H` | Flip horizontal (with Select or Flip tool) |
| `Space` | Play/pause animation |
| `[` | Previous frame |
| `]` | Next frame |

> Non-Ctrl shortcuts are suppressed when an input field has focus. Ctrl shortcuts (undo, redo, save) work in all contexts.
