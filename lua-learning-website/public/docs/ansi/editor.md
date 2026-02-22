# ANSI Graphics Editor — User Guide

The ANSI Graphics Editor is an art editor for creating ANSI-style artwork on an 80-column by 25-row character grid. You can draw with characters, half-block pixels, box-drawing borders, and full RGB colors. The editor supports multiple layers, animation frames, and export to several formats.


## Interface Overview

The editor is divided into four areas:

- **Toolbar** (top) — tool and mode selection, brush settings, file operations
- **Color panel** (left) — color picker and palette swatches
- **Canvas** (center) — the 80x25 drawing surface
- **Layers panel** (right) — layer list and tag organization


## Getting Started

### Creating New Artwork

Press **F** to open the File menu, then select **New**. A blank canvas is created with the default size of 80 columns by 25 rows.

### Opening Existing Artwork

Press **F** to open the File menu, then select **Open** to load a `.ansi.lua` file.

### Saving Your Work

- **Ctrl+S** — Save (overwrites the current file)
- **Ctrl+Shift+S** — Save As (opens a dialog to choose a directory and filename)

The Save As dialog lets you pick a directory and enter a filename. The `.ansi.lua` extension is added automatically.

## Drawing Tools

Tools are selected from the toolbar or with keyboard shortcuts. The active tool determines what happens when you click or drag on the canvas.


### Pencil (B)

Click or drag to paint with the current brush character and colors. Each cell you touch is set to the current foreground color, background color, and character.

### Line (L)

Click and drag to draw a straight line from the start point to the end point. A preview is shown while you drag.

### Rectangle (U / Shift+U)

- **U** — Click and drag to draw a rectangle outline.
- **Shift+U** — Click and drag to draw a filled rectangle.

A dimension label (e.g., "5x3") is shown while you drag.

### Oval (O / Shift+O)

- **O** — Click and drag to draw an oval outline.
- **Shift+O** — Click and drag to draw a filled oval.

### Border (K)

Click and drag to draw box-drawing borders. A flyout in the toolbar lets you choose from five border presets:

| Preset | Characters |
|--------|------------|
| ASCII | `+`, `-`, `\|` |
| Single | `┌`, `─`, `┐`, `│`, `└`, `┘` |
| Double | `╔`, `═`, `╗`, `║`, `╚`, `╝` |
| Rounded | `╭`, `─`, `╮`, `│`, `╰`, `╯` |
| Heavy | `┏`, `━`, `┓`, `┃`, `┗`, `┛` |

### Flood Fill (G)

Click a cell to fill all contiguous cells of the same color with the current brush. In pixel mode, the fill operates on half-block pixels instead of full cells.

### Select (M)

Click and drag to select a rectangular region. Once a selection is active:

- **Drag** the selection to move it
- **Ctrl+C** — Copy
- **Ctrl+X** — Cut
- **Ctrl+V** — Paste
- **Delete** — Clear the selected area
- **Shift+H** — Flip selection horizontally
- **Shift+V** — Flip selection vertically
- Click outside the selection to deselect

### Eyedropper (I)

- **Left-click** — Sample the foreground color from the canvas
- **Right-click** — Sample the background color

### Text (T)

Click and drag to create a text box on the canvas. A new text layer is created automatically. Type to enter text. While editing:

- Use the alignment buttons in the toolbar to set **left**, **center**, **right**, or **justify** alignment
- Drag the edges to move the text box
- Drag the corners to resize the text box

### Move (V)

Click and drag to move the active layer. Press **Escape** to cancel a move in progress.

### Flip (Shift+V)

Click to set the flip origin point on the canvas. Then press:

- **Shift+H** — Flip horizontally around the origin
- **Shift+V** — Flip vertically around the origin

## Brush Modes

Brush modes change how drawing tools apply paint to the canvas. Select a mode from the toolbar or use a keyboard shortcut.

### Brush (default)

Paints full character cells. Each cell gets the current character, foreground color, and background color.

### Pixel (N)

Paints half-block pixels using the `▀` (upper half block) character. Each character cell is split into an upper and lower pixel, giving an effective resolution of 160x50.


### Blend Pixel (J)

Like pixel mode but blends the new color with the existing color. The blend ratio is adjustable via a slider in the toolbar (0–100%).

### Eraser (E)

Clears cells or pixels back to the transparent default. In brush mode, the entire cell is cleared. In pixel mode, individual half-block pixels are cleared.

## Color Sampling

These shortcuts work with any active tool:

- **Right-click** on the canvas — Sample the character at that cell
- **Ctrl+Right-click** — Sample the background color
- **Eyedropper left-click** — Sample the foreground color

## Colors

### Palette Tabs

The color panel has five palette tabs:

| Tab | Colors | Description |
|-----|--------|-------------|
| CGA | 16 | Classic CGA colors |
| EGA | 64 | 4 intensity levels per RGB channel |
| VGA | 256 | 16 CGA + 216 color cube + 24 grayscale |
| Current | Dynamic | All colors currently used in the artwork |
| Layer | Dynamic | Colors used in the active layer only |


### Picking Colors

- **Left-click** a swatch to set the foreground color
- **Right-click** a swatch to set the background color
- Use the **HSV gradient** and **hue bar** for custom colors
- Click the **FG/BG button** for an expanded picker with hex input
- Use the **brightness +/-** buttons for quick adjustments

### Simplify Palette

Available on the Current and Layer tabs. Reduces the number of similar colors in your artwork by iteratively merging the closest pairs. Use the slider to choose a target color count. A preview is shown before applying.

### CGA Preview

Toggle in the File menu. Shows your artwork approximated to the 16-color CGA palette. This is non-destructive — your original colors are preserved and restored when you turn CGA preview off.

## Character Selection

Click the character button in the toolbar (it shows the current brush character) to open the character palette. Characters are organized into categories:

- ASCII
- Blocks
- Borders
- Geometric
- Arrows
- Symbols

Click a character to select it as the current brush character.


## Layers

### Layers Tab

The layers panel shows all layers stacked bottom-to-top. Available actions:

- Click **+** to add a new drawn layer
- **Click** a layer to select it as the active layer
- Toggle the **eye icon** to show or hide a layer
- **Double-click** the layer name to rename it
- **Drag** the handle (☰) to reorder layers
- Click the **trash icon** to delete a layer (the last layer cannot be deleted)
- **Right-click** a layer for a context menu with additional options:
  - Merge Down
  - Group with new folder
  - Duplicate
  - Remove from group
  - Tags submenu (add or remove tags)

### Layer Types

| Type | Description |
|------|-------------|
| **Drawn** | Pixel and character art with optional animation frames |
| **Text** | Styled text with a bounding box, created via the Text tool |
| **Group** | Organizational folders that toggle visibility for all children |

### Tags Tab

Tags let you organize layers across groups:

- Create tags to categorize layers
- Toggle a tag heading's visibility to show or hide all layers with that tag at once
- Double-click a tag name to rename it
- Click **x** to delete a tag


## Animation

Animation is available on drawn layers. Each drawn layer can have multiple frames with independent timing.

### Managing Frames

When a drawn layer is active, the Frames panel appears below the canvas:

- Click **+ Add** to add a blank frame
- Click **Dup** to duplicate the current frame
- Click **- Del** to remove the current frame
- Click a frame thumbnail to switch to it
- Set the frame duration per layer (16–10,000 ms)

### Playback

- **Space** — Play or pause the animation
- **[** — Step to the previous frame
- **]** — Step to the next frame

Each layer can have a different frame rate, allowing independent animation timing across layers.


## Import & Export

Access via the File button (**F**) or with **Ctrl+S** / **Ctrl+Shift+S**.

| Format | Description |
|--------|-------------|
| **Save / Save As** | Native `.ansi.lua` format — preserves all layers, frames, and tags |
| **Load PNG** | Import a PNG image as a new layer |
| **Export ANS** | Standard ANSI art file format |
| **Export .sh** | Shell script that renders the art via `echo -e` |

## Undo & Redo

- **Ctrl+Z** — Undo (up to 50 steps)
- **Ctrl+Shift+Z** — Redo

Most drawing, move, and layer operations are undoable. Undo and redo work as full-state snapshots, so each step restores the complete editor state.

## Keyboard Shortcuts Reference

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
| `Shift+H` | Flip horizontally (with Select or Flip tool) |
| `Space` | Play / pause animation |
| `[` | Previous frame |
| `]` | Next frame |

> Non-Ctrl shortcuts are suppressed when a text input field has focus. Ctrl shortcuts (undo, redo, save) work in all contexts.
