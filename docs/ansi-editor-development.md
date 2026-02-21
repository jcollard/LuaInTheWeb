# ANSI Editor Development Guide

How to extend and modify the ANSI Graphics Editor. For architecture and concepts, see [ANSI Graphics Editor](./ansi-graphics-editor.md).

## File Organization

All files live in `lua-learning-website/src/components/AnsiGraphicsEditor/`.

### Components

| File | Purpose |
|------|---------|
| `AnsiGraphicsEditor.tsx` | Main editor — layout, overlays, event wiring |
| `AnsiEditorToolbar.tsx` | Tool/mode buttons, brush settings |
| `ColorPanel.tsx` | HSV picker, palette swatches |
| `LayersPanel.tsx` | Layers tab (LayerRow list) + Tags tab |
| `LayerRow.tsx` | Single layer row (visibility, name, drag handle) |
| `TagsTabContent.tsx` | Tags tab content (tag headings, per-tag layer lists) |
| `FramesPanel.tsx` | Animation frame thumbnails and controls |
| `ToastContainer.tsx` | Ephemeral notification display |

### Modals

| File | Purpose |
|------|---------|
| `SaveAsDialog.tsx` | Save/Save As with directory picker |
| `FileOptionsModal.tsx` | New, open, import, export actions |
| `CharPaletteModal.tsx` | Unicode character selection grid |
| `SimplifyPaletteModal.tsx` | Palette reduction via iterative merge |
| `DirectoryPicker.tsx` | File System Access API directory browser |

### Hooks

| File | Purpose |
|------|---------|
| `useAnsiEditor.ts` | Orchestrator — wires tools, undo, keyboard, rendering |
| `useLayerState.ts` | Layer CRUD, frames, tags, state restoration |
| `useToast.ts` | Toast show/dismiss with auto-timeout |

### Utilities — Drawing & Tools

| File | Purpose |
|------|---------|
| `drawHelpers.ts` | Shape drawing tool handler factories |
| `selectionTool.ts` | Selection rectangle, copy, paste handlers |
| `textTool.ts` | Text placement and editing handlers |
| `lineAlgorithm.ts` | Bresenham line rasterization |
| `gridUtils.ts` | Grid ops, pixel ops, shape computation (rect, oval, flood fill) |

### Utilities — Layers & Transforms

| File | Purpose |
|------|---------|
| `layerUtils.ts` | Compositing, contiguity, group visibility |
| `textLayerGrid.ts` | Text-to-grid rasterization |
| `selectionGridUtils.ts` | Selection cut/paste grid operations |
| `moveUtils.ts` | Layer/selection move operations |
| `flipUtils.ts` | Horizontal/vertical flip operations |
| `colorUtils.ts` | Color math, CGA quantize, palette extraction |

### I/O

| File | Purpose |
|------|---------|
| `serialization.ts` | Lua table serialize/deserialize (v1–v6) |
| `ansExport.ts` | ANS format export |
| `shExport.ts` | Shell script export (static + animated) |
| `pngImport.ts` | PNG import with palette quantization |

### Infrastructure

| File | Purpose |
|------|---------|
| `terminalBuffer.ts` | Double-buffered ANSI rendering to xterm.js |
| `playbackEngine.ts` | Animation frame scheduling with drift correction |
| `keyboardShortcuts.ts` | Shortcut key mapping and handler dispatch |
| `charPaletteData.ts` | Unicode character categories for palette modal |
| `filterWritableFolders.ts` | File System Access API writable folder filter |
| `types.ts` | All TypeScript types, interfaces, constants |

## Adding a New Drawing Tool

1. **Add to `DrawTool` union** in `types.ts`:
   ```typescript
   export type DrawTool = 'pencil' | 'line' | ... | 'your-tool'
   ```

2. **Implement the tool handler** in `drawHelpers.ts` (or a new `yourTool.ts` file):
   - Shape tools: add a `computeYourToolCells(start, end, brush, baseGrid)` function in `gridUtils.ts` that returns `Map<string, AnsiCell>` keyed by `"row,col"`
   - Interactive tools: create a handler factory similar to `createDrawHelpers()`

3. **Add keyboard shortcut** in `keyboardShortcuts.ts`:
   ```typescript
   { key: 'X', tool: 'your-tool' }
   ```

4. **Add toolbar button** in `AnsiEditorToolbar.tsx`:
   - Add a button in the tools section with the appropriate icon/label
   - Wire `onClick` to set `brush.tool`

5. **Wire into `useAnsiEditor.ts`**:
   - Handle mouse events for the new tool in `handleCanvasMouseDown`, `handleCanvasMouseMove`, `handleCanvasMouseUp`
   - For preview-then-commit tools: write to `previewCellsRef` during drag, commit on mouse-up

6. **Write tests**:
   - Pure function tests for computation (e.g., `gridUtils.test.ts`)
   - Hook integration tests if tool has complex state (e.g., `useAnsiEditor.test.ts`)

## Adding a New Brush Mode

1. **Add to `BrushMode` union** in `types.ts`:
   ```typescript
   export type BrushMode = 'brush' | 'pixel' | 'blend-pixel' | 'eraser' | 'your-mode'
   ```

2. **Handle in drawing functions**: Update `computePixelCell()` or add new cell computation in `gridUtils.ts`

3. **Add keyboard shortcut** in `keyboardShortcuts.ts`

4. **Add toolbar toggle** in `AnsiEditorToolbar.tsx`

5. **Write tests** for the new mode's cell computation

## Extending the Layer System

### Adding a New Layer Type

1. **Define the type** in `types.ts`:
   ```typescript
   interface YourLayer extends BaseLayer {
     type: 'your-type'
     // your-type-specific fields
   }

   export type Layer = DrawnLayer | TextLayer | GroupLayer | YourLayer
   ```

2. **Update type guards** in `types.ts`:
   ```typescript
   export function isYourLayer(layer: Layer): layer is YourLayer { ... }
   ```

3. **Implement layer operations** in `useLayerState.ts`:
   - Add creation function (e.g., `addYourLayer()`)
   - Handle in existing operations (duplicate, delete, reorder)

4. **Update serialization** in `serialization.ts`:
   - Bump version in `computeVersion()` (check `needsVN()`)
   - Add serialization in `serializeLayers()`
   - Add deserialization case in `deserializeLayers()`

5. **Update compositing** in `layerUtils.ts`:
   - Handle the new type in `visibleDrawableLayers()` if drawable
   - Handle in `compositeCellCore()` if it has rendering behavior

6. **Thread through UI**:
   - `useAnsiEditor.ts` → expose creation function
   - `AnsiGraphicsEditor.tsx` → wire to UI
   - `LayersPanel.tsx` / `LayerRow.tsx` → display layer type

7. **Write tests** following existing patterns (see [Testing Patterns](#testing-patterns))

### Adding a Layer Operation

For operations that should be undoable:

1. **Implement raw operation** in `useLayerState.ts` (pure state mutation)
2. **Wrap with undo** in `useAnsiEditor.ts`:
   ```typescript
   const yourOperation = useCallback(() => {
     withLayerUndo(() => {
       rawYourOperation()
     })
   }, [withLayerUndo, rawYourOperation])
   ```
3. **Export** the wrapped version from `useAnsiEditor`

## Adding an Export Format

1. **Create `xxxExport.ts`** with a pure export function:
   ```typescript
   export function exportToXxx(layers: Layer[]): string | Blob {
     const grid = compositeGrid(layers)
     // Convert grid to your format
   }
   ```

2. **Add UI trigger** in `FileOptionsModal.tsx` or `AnsiEditorToolbar.tsx`

3. **Wire into `useAnsiEditor.ts`**:
   - Call export function with current layers
   - Handle file download (Blob + anchor click or File System Access API)

4. **Write tests** — export functions are pure and easy to test

## Testing Patterns

### Running Tests

```bash
cd lua-learning-website

# All ANSI editor tests
npx vitest run src/components/AnsiGraphicsEditor/

# Specific test file
npx vitest run src/components/AnsiGraphicsEditor/gridUtils.test.ts

# Watch mode for a file
npx vitest watch src/components/AnsiGraphicsEditor/gridUtils.test.ts
```

### Hook Tests

Pattern from `useLayerState.test.ts` and `useAnsiEditor.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'

it('should add a layer', () => {
  const { result } = renderHook(() => useLayerState())

  act(() => {
    result.current.addDrawnLayer()
  })

  expect(result.current.layers).toHaveLength(2)
})
```

### Component Tests

Pattern from `LayersPanel.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'

// Helper to render with required props
function renderPanel(overrides = {}) {
  const defaultProps = { layers: makeLayers(), activeLayerId: '1', ... }
  return render(<LayersPanel {...defaultProps} {...overrides} />)
}

it('should display layer names', () => {
  renderPanel({ layers: [makeLayer({ name: 'Background' })] })
  expect(screen.getByText('Background')).toBeInTheDocument()
})
```

### Test Helper Conventions

- `renderPanel()` / `renderTags()` — factory functions that provide default props
- `makeLayers()` / `makeLayer()` — create test layer data
- `createEmptyGrid()` — from `gridUtils.ts` for test grids

### Pure Function Tests

Pattern from `gridUtils.test.ts`, `colorUtils.test.ts`:

```typescript
it('should compute flood fill cells', () => {
  const grid = createEmptyGrid()
  grid[0][0] = { char: 'X', fg: [255, 0, 0], bg: [0, 0, 0] }

  const result = computeFloodFillCells(0, 0, brush, grid)

  expect(result.size).toBeGreaterThan(0)
})
```

### Mutation Testing

```bash
# Scoped to specific files (run after each feature)
npm run test:mutation:scope "src/components/AnsiGraphicsEditor/gridUtils.*"

# Full mutation suite (before PR)
npm run test:mutation
```

Target: >= 80% mutation score per file.

## Undo/Redo Integration

Every user-visible state change should be wrapped with `withLayerUndo`:

```typescript
// In useAnsiEditor.ts
const myNewAction = useCallback(() => {
  withLayerUndo(() => {
    // Perform state changes (layer mutations, etc.)
    // These changes are now undoable as a single unit
  })
}, [withLayerUndo])
```

**How it works:**
1. `pushSnapshot()` clones the full `LayerState` (all layers + activeLayerId)
2. Your action executes, mutating state
3. Display is flushed to the terminal
4. On undo: state is restored from the snapshot; on redo: from the redo stack

**Important:** Keep the action synchronous. The snapshot is taken before the action runs.

## Key Architectural Patterns

### Preview-then-Commit

Drawing tools show live previews without modifying layer data:

1. On mouse-down: record start position
2. On mouse-move: compute preview cells, write to terminal via `TerminalBuffer.writeCell()`
3. On mouse-up: commit preview cells to the active layer's grid, flush full display

Preview cells are stored in `previewCellsRef` and cleared on commit or cancel.

### Ref-Based Synchronous Access

Event handlers (mouse, keyboard) need current state synchronously. React state updates are async, so refs mirror critical state:

```
layersRef.current         → current layers array
activeLayerIdRef.current  → current active layer ID
brushRef.current          → current brush settings
```

These refs are updated alongside their corresponding React state.

### Tool Handler Factories

Complex tools use factory functions that return handler objects:

```typescript
const drawHelpers = createDrawHelpers({
  layersRef, brushRef, terminalBuffer, ...
})
// Returns: { handleMouseDown, handleMouseMove, handleMouseUp }
```

This keeps `useAnsiEditor.ts` focused on orchestration rather than tool-specific logic.

### Immutable Layer Mutations

Layers are updated immutably via map + spread:

```typescript
setLayers(prev => prev.map(l =>
  l.id === targetId ? { ...l, visible: !l.visible } : l
))
```

This ensures React detects changes and re-renders correctly.
