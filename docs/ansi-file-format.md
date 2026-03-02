# ANSI File Format Specification

This document is the single source of truth for all versions of the `.ansi.lua` file format used by the ANSI Graphics Editor and the Lua runtime.

## Overview

ANSI art files use Lua table syntax, prefixed with `return` so they are valid Lua expressions. They are parsed by `@kilcekru/lua-table` (editor) and wasmoon (runtime).

**File extension:** `.ansi.lua`

**Encoding:** UTF-8

**Structure:** `return { version = N, ... }`

## Version History

| Version | Features | Date |
|---------|----------|------|
| 1 | Single grid, no layers | Legacy |
| 2 | Multiple drawn layers, `activeLayerId` | Legacy |
| 3 | Drawn + text + group layer types, `bounds` for drawn layers | Legacy |
| 4 | Group layers with `parentId` nesting | Legacy |
| 5 | Frame animation (`frames[]` per drawn layer) | Legacy |
| 6 | Layer tags (`availableTags` + per-layer `tags`) | Legacy |
| 7 | Palette + sparse run encoding (20-40x size reduction) | 2026-03 |

All versions are **backward compatible** — newer code loads older files. The editor always saves as v7.

---

## V7 Format (Current)

### Top-Level Structure

```lua
return {
  version = 7,
  width = 80,
  height = 25,
  activeLayerId = "layer-1",
  palette = { {170,170,170}, {0,0,0}, {255,85,85}, ... },
  defaultFg = 1,              -- 1-based palette index
  defaultBg = 2,              -- 1-based palette index
  availableTags = {"tag1"},   -- optional
  layers = { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Always `7` |
| `width` | number | Grid width in characters (always 80) |
| `height` | number | Grid height in characters (always 25) |
| `activeLayerId` | string | ID of the currently selected layer |
| `palette` | `RGBColor[]` | Deduplicated color palette; index 1 = default fg, index 2 = default bg |
| `defaultFg` | number | 1-based palette index for the default foreground color |
| `defaultBg` | number | 1-based palette index for the default background color |
| `availableTags` | `string[]?` | Optional global tag list |
| `layers` | `Layer[]` | Ordered array of layers (bottom-to-top) |

### Palette

The palette is an array of `{R, G, B}` tuples containing every unique color used across all drawn layers. The first two entries are always the default foreground (`{170, 170, 170}`) and default background (`{0, 0, 0}`).

```lua
palette = {
  {170, 170, 170},  -- index 1: default fg
  {0, 0, 0},        -- index 2: default bg
  {255, 85, 85},    -- index 3: red
  {0, 0, 170},      -- index 4: blue
  -- ... additional unique colors
}
```

### Layer Types

#### Drawn Layer

```lua
{
  type = "drawn",
  id = "layer-1",
  name = "Background",
  visible = true,
  cells = { ... },              -- sparse run-encoded grid (single frame)
  -- OR for multi-frame animation:
  frameCells = { {...}, {...} }, -- array of sparse grids
  currentFrameIndex = 0,        -- only if multi-frame
  frameDurationMs = 100,        -- only if multi-frame
  parentId = "group-1",         -- optional
  tags = {"tag"},               -- optional
}
```

Single-frame layers use `cells`. Multi-frame layers use `frameCells` (array of sparse grids); `cells` is omitted.

#### Text Layer (unchanged from v6)

```lua
{
  type = "text",
  id = "text-1",
  name = "Title",
  visible = true,
  text = "Hello World",
  bounds = { r0 = 0, c0 = 0, r1 = 5, c1 = 40 },
  textFg = {255, 255, 255},
  textFgColors = { {255,0,0}, {0,255,0} },  -- optional per-char colors
  textAlign = "center",                       -- optional: "left"|"center"|"right"|"justify"
  parentId = "group-1",                       -- optional
  tags = {"tag"},                             -- optional
}
```

Text layer grids are NOT serialized; they are recomputed on load from text, bounds, and style fields.

#### Group Layer (unchanged from v6)

```lua
{
  type = "group",
  id = "group-1",
  name = "My Group",
  visible = true,
  collapsed = false,
  parentId = "parent-group",  -- optional
  tags = {"tag"},             -- optional
}
```

### Sparse Run Encoding

Each drawn layer grid is encoded as an array of "runs." Only non-default cells are stored. A cell is "default" when `char = " "`, `fg = defaultFg`, and `bg = defaultBg`.

Three run types exist, disambiguated by tuple length and element type:

| Type | Tuple | Length | Element at position 3 |
|------|-------|--------|-----------------------|
| **Single cell** | `{row, col, "X", fgIdx, bgIdx}` | 5 | string, length = 1 |
| **Text run** | `{row, col, "Hello", fgIdx, bgIdx}` | 5 | string, length > 1 |
| **Repeat run** | `{row, col, count, "X", fgIdx, bgIdx}` | 6 | number (count) |

**Rules:**

- Row and col are **1-based** (Lua convention)
- `fgIdx` and `bgIdx` are **1-based** palette indices
- Default cells are omitted entirely
- An empty `cells = {}` represents a fully default grid
- Text runs group consecutive cells with the same fg+bg but different characters
- Repeat runs group consecutive identical cells (same char+fg+bg), minimum length 2

### Encoding Example

```lua
palette = { {170,170,170}, {0,0,0}, {255,85,85}, {0,0,170} },
defaultFg = 1,
defaultBg = 2,
cells = {
  {1, 1, 80, " ", 1, 4},     -- Row 1: 80 spaces with blue bg (repeat run)
  {3, 10, "Hello!", 3, 2},   -- Row 3: "Hello!" in red on black (text run)
  {5, 40, "#", 3, 4},        -- Row 5: single red '#' on blue (single cell)
}
```

### Disambiguation Algorithm (Decoding)

```
for each run in cells:
  elements = run as array
  if elements.length == 6:
    → Repeat run: [row, col, count, char, fgIdx, bgIdx]
  else if elements.length == 5:
    if typeof(elements[3]) == "string" and elements[3].length > 1:
      → Text run: [row, col, text, fgIdx, bgIdx]
    else:
      → Single cell: [row, col, char, fgIdx, bgIdx]
```

### Encoding Strategy (Greedy)

The encoder scans each row left-to-right, skipping default cells:

1. **Try repeat run**: Extend while the next cell has identical char+fg+bg (minimum length 2)
2. **Try text run**: Extend while the next cell has the same fg+bg but different character (minimum length 2; break if a repeat opportunity of 2+ appears)
3. **Fall back to single cell**

---

## Legacy Formats (v1-v6)

### V1 — Single Grid

```lua
return {
  version = 1,
  width = 80,
  height = 25,
  grid = {
    { {char=" ", fg={170,170,170}, bg={0,0,0}}, ... },  -- row 1 (80 cells)
    ...                                                    -- 25 rows
  }
}
```

### V2 — Multiple Layers

```lua
return {
  version = 2,
  width = 80,
  height = 25,
  activeLayerId = "layer-1",
  layers = {
    { id = "layer-1", name = "Background", visible = true, grid = { ... } },
    ...
  }
}
```

### V3 — Layer Types

Added `type` field (`"drawn"`, `"text"`, `"group"`) and `bounds` for text layers. Layers without a `type` field are treated as drawn.

### V4 — Group Nesting

Added `parentId` field for group layer hierarchy and `collapsed` field for groups.

### V5 — Frame Animation

Added `frames[]` (array of grids), `currentFrameIndex`, and `frameDurationMs` to drawn layers. Single-frame layers can use either `grid` or `frames = [grid]`.

### V6 — Tags

Added `availableTags` at top level and `tags` per layer.

---

## Size Analysis

For a typical complex animation (10 layers, 30 frames = 300 grids):

| Format | Approximate Size | Notes |
|--------|-----------------|-------|
| v3-v6 (full grids) | ~40 MB | Each cell = ~60-70 bytes in Lua syntax |
| v7 (palette + sparse) | ~1-2 MB | 20-40x reduction |

The savings come from three factors:
1. **Palette**: RGB colors stored once, referenced by 1-2 digit index
2. **Sparse encoding**: Default cells (typically 60-90% of grid) are omitted
3. **Run encoding**: Consecutive similar cells compressed into single tuples

---

## Backward Compatibility

- The editor always saves as v7
- Both the editor (`serialization.ts`) and runtime (`screenParser.ts`) can load all versions (v1-v7)
- New fields are always optional with sensible defaults
- When loading older formats, the editor converts to v7 on the next save
