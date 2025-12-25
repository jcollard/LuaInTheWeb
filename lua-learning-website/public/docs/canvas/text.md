# Text Rendering

Control text alignment, styling, and advanced text layout with word wrapping.

## Font Styling

### canvas.set_font_size(size)

Set the font size in pixels for all subsequent text drawing.

**Parameters:**
- `size` (number): Font size in pixels

```lua
canvas.set_font_size(24)
canvas.draw_text(100, 100, "Large text")

canvas.set_font_size(12)
canvas.draw_text(100, 130, "Small text")
```

### canvas.set_font_family(family)

Set the font family for all subsequent text drawing.

**Parameters:**
- `family` (string): Font family name (e.g., "Arial", "monospace", or custom font name)

```lua
canvas.set_font_family("Arial")
canvas.draw_text(100, 100, "Arial font")

canvas.set_font_family("monospace")
canvas.draw_text(100, 130, "Monospace font")
```

### canvas.get_text_width(text)

Get the width of text in pixels using the current font settings.

**Parameters:**
- `text` (string): Text to measure

**Returns:**
- (number): Width in pixels

```lua
canvas.set_font_size(24)
local width = canvas.get_text_width("Hello, World!")
-- Use width for centering or layout
```

## Text Alignment

### canvas.set_text_align(align)

Set the horizontal text alignment for all subsequent `draw_text()` calls.

**Parameters:**
- `align` (string): One of the alignment values below

**Alignment Values:**

| Value | Description |
|-------|-------------|
| `"left"` | Text starts at x (left edge at x) |
| `"right"` | Text ends at x (right edge at x) |
| `"center"` | Text is centered at x |
| `"start"` | Same as "left" for left-to-right languages |
| `"end"` | Same as "right" for left-to-right languages |

```lua
local w = canvas.get_width()

-- Centered title
canvas.set_text_align("center")
canvas.set_font_size(48)
canvas.draw_text(w / 2, 50, "Game Title")

-- Left-aligned paragraph
canvas.set_text_align("left")
canvas.set_font_size(16)
canvas.draw_text(50, 100, "Left-aligned text")

-- Right-aligned score
canvas.set_text_align("right")
canvas.draw_text(w - 20, 20, "Score: 12345")
```

### canvas.set_text_baseline(baseline)

Set the vertical text alignment for all subsequent `draw_text()` calls.

**Parameters:**
- `baseline` (string): One of the baseline values below

**Baseline Values:**

| Value | Description |
|-------|-------------|
| `"top"` | Top of text at y |
| `"hanging"` | Hanging baseline at y (similar to top) |
| `"middle"` | Middle of text at y |
| `"alphabetic"` | Alphabetic baseline at y (default, where most letters sit) |
| `"ideographic"` | Ideographic baseline at y (for CJK characters) |
| `"bottom"` | Bottom of text at y |

```lua
-- Vertically centered text in a button
local btnX, btnY, btnW, btnH = 100, 100, 150, 50

canvas.set_fill_style("#4CAF50")
canvas.fill_rect(btnX, btnY, btnW, btnH)

canvas.set_text_align("center")
canvas.set_text_baseline("middle")
canvas.set_fill_style("#FFFFFF")
canvas.draw_text(btnX + btnW/2, btnY + btnH/2, "Click Me")
```

## Advanced Text Layout

### canvas.draw_label(x, y, width, height, text, options)

Draw text within a bounded rectangle with automatic alignment, overflow handling, and word wrapping. This is a convenience function that simplifies common text layout tasks.

**Parameters:**
- `x` (number): X coordinate of the rectangle
- `y` (number): Y coordinate of the rectangle
- `width` (number): Width of the rectangle
- `height` (number): Height of the rectangle
- `text` (string): Text to draw
- `options` (table, optional): Configuration options

**Options:**

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `align_h` | "left", "center", "right" | "center" | Horizontal alignment |
| `align_v` | "top", "middle", "bottom" | "middle" | Vertical alignment |
| `overflow` | "visible", "hidden", "ellipsis" | "visible" | How to handle text that exceeds bounds |
| `padding` | `{left, top, right, bottom}` | all 0 | Internal padding from edges |
| `wrap` | boolean | false | Enable word wrapping for multi-line text |
| `line_height` | number | 1.2 | Line height multiplier for wrapped text |
| `char_count` | number | nil | Number of characters to show (for typewriter effects) |

### Basic Examples

```lua
-- Simple centered button
canvas.set_fill_style("#4CAF50")
canvas.fill_rect(100, 100, 150, 50)
canvas.set_fill_style("#FFFFFF")
canvas.draw_label(100, 100, 150, 50, "Click Me")

-- Left-aligned with padding
canvas.draw_label(100, 200, 200, 30, "Left aligned", {
    align_h = "left",
    padding = {left = 10}
})

-- Truncate long text with ellipsis
canvas.draw_label(100, 250, 100, 30, "Very long text here", {
    overflow = "ellipsis"
})
```

### Word Wrapping

```lua
-- Word wrapping in a text box
canvas.draw_label(100, 300, 200, 80, "This is a longer paragraph that will automatically wrap to multiple lines within the bounding box.", {
    wrap = true,
    align_h = "left",
    padding = {left = 10, right = 10}
})
```

### Typewriter Effect

```lua
-- Typewriter effect (text appears over time)
local chars = math.floor(canvas.get_time() * 15)
canvas.draw_label(100, 400, 300, 80, "Hello, welcome to the game!", {
    wrap = true,
    char_count = chars
})
```

## Example: Game HUD

```lua
local canvas = require('canvas')

canvas.set_size(800, 600)

local score = 12345
local health = 75

local function draw()
  canvas.clear()

  -- Title (centered at top)
  canvas.set_text_align("center")
  canvas.set_text_baseline("top")
  canvas.set_font_size(32)
  canvas.set_color(255, 255, 255)
  canvas.draw_text(400, 10, "Space Invaders")

  -- Score (top-left)
  canvas.set_text_align("left")
  canvas.set_font_size(20)
  canvas.draw_text(20, 50, "Score: " .. score)

  -- Health (top-right)
  canvas.set_text_align("right")
  canvas.draw_text(780, 50, "Health: " .. health .. "%")

  -- Dialog box with wrapped text
  canvas.set_fill_style("#333333")
  canvas.fill_rect(100, 450, 600, 100)
  canvas.set_fill_style("#FFFFFF")
  canvas.draw_label(100, 450, 600, 100, "Welcome, brave adventurer! Your quest begins here. Press SPACE to continue...", {
    wrap = true,
    align_h = "left",
    align_v = "top",
    padding = {left = 15, top = 15, right = 15, bottom = 15}
  })
end

local function game()
  draw()
end

canvas.tick(game)
canvas.start()
```

---

[← Back to Canvas Library](../canvas.md)
