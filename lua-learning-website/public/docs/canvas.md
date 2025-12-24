# Canvas Library

The canvas library provides functions for 2D graphics rendering, input handling, and game loop management.

**Note**: The canvas API is only available in canvas mode.

## Loading the Library

```lua
local canvas = require('canvas')
```

## Canvas Lifecycle

### canvas.start()

Start the canvas and block until `canvas.stop()` is called or Ctrl+C.
This opens a canvas tab and runs the game loop.
Call `canvas.tick()` before this to register your render callback.

```lua
local canvas = require('canvas')

canvas.tick(function()
  canvas.clear()
  canvas.set_color(255, 0, 0)
  canvas.fill_rect(10, 10, 50, 50)
end)

canvas.start()  -- Blocks until stop or Ctrl+C
```

### canvas.stop()

Stop the canvas and close the canvas tab.
This unblocks the `canvas.start()` call and returns control to the script.

```lua
-- Stop after 5 seconds
if canvas.get_time() > 5 then
  canvas.stop()
end
```

## Game Loop

### canvas.tick(callback)

Register the tick callback function. This callback is called once per frame (~60fps).
All game logic and drawing should be performed inside this callback.

**Parameters:**
- `callback` (function): Function to call each frame

```lua
canvas.tick(function()
  canvas.clear()
  canvas.set_color(255, 0, 0)
  canvas.fill_rect(10, 10, 50, 50)
end)
```

## Canvas Configuration

### canvas.set_size(width, height)

Set the canvas size in pixels. Call this before tick() to set the desired canvas dimensions.

**Parameters:**
- `width` (number): Canvas width in pixels
- `height` (number): Canvas height in pixels

```lua
canvas.set_size(800, 600)
```

### canvas.get_width()

Get the canvas width in pixels.

**Returns:**
- (number): Canvas width

### canvas.get_height()

Get the canvas height in pixels.

**Returns:**
- (number): Canvas height

```lua
local center_x = canvas.get_width() / 2
local center_y = canvas.get_height() / 2
```

## Drawing State

### canvas.clear()

Clear the canvas.

### canvas.set_color(r, g, b, a) or canvas.set_color(hex)

Set the drawing color. All subsequent drawing operations will use this color.
Accepts either RGBA values (0-255) or hex color strings.

**RGBA Parameters:**
- `r` (number): Red component (0-255)
- `g` (number): Green component (0-255)
- `b` (number): Blue component (0-255)
- `a` (number, optional): Alpha component (0-255, default: 255)

**Hex Parameter:**
- `hex` (string): A hex color string in one of these formats:
  - `#RGB` - Short form, expands to #RRGGBB (e.g., `#F00` = red)
  - `#RRGGBB` - Full RGB (e.g., `#FF0000` = red)
  - `#RRGGBBAA` - Full RGBA with alpha (e.g., `#FF000080` = semi-transparent red)

Hex colors are case-insensitive (`#abc` and `#ABC` both work).

```lua
-- RGBA format
canvas.set_color(255, 0, 0)       -- Red
canvas.set_color(0, 255, 0, 128)  -- Semi-transparent green

-- Hex format
canvas.set_color("#F00")          -- Red (short form)
canvas.set_color("#FF0000")       -- Red (full form)
canvas.set_color("#00FF0080")     -- Semi-transparent green
```

### canvas.set_line_width(width)

Set the line width for stroke operations (draw_rect, draw_circle, draw_line).

**Parameters:**
- `width` (number): Line width in pixels

```lua
canvas.set_line_width(3)
canvas.draw_rect(10, 10, 100, 100)  -- 3px thick outline
```

## Line Styles

Control how line endpoints and corners are rendered.

### canvas.set_line_cap(cap)

Set the line cap style for stroke endpoints.

**Parameters:**
- `cap` (string): Line cap style
  - `"butt"` (default): Flat end at the endpoint
  - `"round"`: Rounded end extending past endpoint
  - `"square"`: Square end extending past endpoint

```lua
canvas.set_line_width(15)

-- Butt cap: flat end exactly at the endpoint
canvas.set_line_cap("butt")
canvas.draw_line(50, 50, 200, 50)

-- Round cap: semicircle extending past endpoint
canvas.set_line_cap("round")
canvas.draw_line(50, 100, 200, 100)

-- Square cap: square extending past endpoint
canvas.set_line_cap("square")
canvas.draw_line(50, 150, 200, 150)
```

### canvas.set_line_join(join)

Set the line join style for stroke corners.

**Parameters:**
- `join` (string): Line join style
  - `"miter"` (default): Sharp corner (may be limited by miter_limit)
  - `"round"`: Rounded corner
  - `"bevel"`: Flat corner (chamfered)

```lua
canvas.set_line_width(15)

-- Miter join: sharp corners
canvas.set_line_join("miter")
canvas.begin_path()
canvas.move_to(50, 50)
canvas.line_to(100, 100)
canvas.line_to(150, 50)
canvas.stroke()

-- Round join: rounded corners
canvas.set_line_join("round")
canvas.begin_path()
canvas.move_to(200, 50)
canvas.line_to(250, 100)
canvas.line_to(300, 50)
canvas.stroke()

-- Bevel join: flat/chamfered corners
canvas.set_line_join("bevel")
canvas.begin_path()
canvas.move_to(350, 50)
canvas.line_to(400, 100)
canvas.line_to(450, 50)
canvas.stroke()
```

### canvas.set_miter_limit(limit)

Set the miter limit for sharp corners. When `line_join` is `"miter"`, this limits how far the corner can extend. If the miter length exceeds this limit, the corner is drawn as a bevel instead.

**Parameters:**
- `limit` (number): Miter limit value (default: 10)

```lua
canvas.set_line_width(15)
canvas.set_line_join("miter")

-- Low miter limit: sharp angles become bevels
canvas.set_miter_limit(2)
canvas.begin_path()
canvas.move_to(50, 50)
canvas.line_to(75, 100)
canvas.line_to(100, 50)
canvas.stroke()

-- High miter limit: allows sharper corners
canvas.set_miter_limit(20)
canvas.begin_path()
canvas.move_to(150, 50)
canvas.line_to(175, 100)
canvas.line_to(200, 50)
canvas.stroke()
```

## Dashed Lines

Create dashed and dotted line effects with control over pattern and animation.

### canvas.set_line_dash(segments)

Set the line dash pattern for strokes. Use an empty table to reset to solid line.

**Parameters:**
- `segments` (table): Array of dash and gap lengths (e.g., {10, 5} for 10px dash, 5px gap)

```lua
-- Simple dashed line
canvas.set_line_dash({10, 5})
canvas.begin_path()
canvas.move_to(50, 50)
canvas.line_to(300, 50)
canvas.stroke()

-- Dotted line
canvas.set_line_dash({2, 4})
canvas.begin_path()
canvas.move_to(50, 100)
canvas.line_to(300, 100)
canvas.stroke()

-- Complex pattern: long dash, gap, short dash, gap
canvas.set_line_dash({15, 5, 5, 5})
canvas.begin_path()
canvas.move_to(50, 150)
canvas.line_to(300, 150)
canvas.stroke()

-- Reset to solid line
canvas.set_line_dash({})
```

### canvas.get_line_dash()

Get the current line dash pattern.

**Returns:**
- (table): Current dash pattern array (empty for solid line)

```lua
canvas.set_line_dash({10, 5})
local pattern = canvas.get_line_dash()  -- Returns {10, 5}
```

### canvas.set_line_dash_offset(offset)

Set the line dash offset for animating dashed lines. Useful for creating "marching ants" selection effects.

**Parameters:**
- `offset` (number): Offset to shift the dash pattern

```lua
-- Animated marching ants selection box
local offset = 0

canvas.tick(function()
  canvas.clear()
  offset = offset + 0.5

  canvas.set_line_dash({4, 4})
  canvas.set_line_dash_offset(offset)
  canvas.set_color(0, 0, 0)
  canvas.begin_path()
  canvas.draw_rect(100, 100, 200, 150)
  canvas.stroke()
end)
```

## Gradients

Gradients allow smooth color transitions for fills and strokes. Create gradient objects, add color stops, then apply them with `set_fill_style()` or `set_stroke_style()`.

### canvas.create_linear_gradient(x0, y0, x1, y1)

Create a linear gradient that transitions colors along a line from (x0, y0) to (x1, y1).

**Parameters:**
- `x0` (number): Start X coordinate
- `y0` (number): Start Y coordinate
- `x1` (number): End X coordinate
- `y1` (number): End Y coordinate

**Returns:**
- (Gradient): A gradient object

```lua
-- Horizontal gradient (left to right)
local gradient = canvas.create_linear_gradient(0, 0, 200, 0)
gradient:add_color_stop(0, "#FF0000")  -- Red at start
gradient:add_color_stop(1, "#0000FF")  -- Blue at end

-- Vertical gradient (top to bottom)
local sky = canvas.create_linear_gradient(0, 0, 0, 400)
sky:add_color_stop(0, "#87CEEB")  -- Light blue at top
sky:add_color_stop(1, "#1E90FF")  -- Darker blue at bottom

-- Diagonal gradient
local diagonal = canvas.create_linear_gradient(0, 0, 200, 200)
diagonal:add_color_stop(0, "yellow")
diagonal:add_color_stop(1, "purple")
```

### canvas.create_radial_gradient(x0, y0, r0, x1, y1, r1)

Create a radial gradient that transitions colors between two circles. The first circle (x0, y0, r0) is the start, the second (x1, y1, r1) is the end.

**Parameters:**
- `x0` (number): Center X of start circle
- `y0` (number): Center Y of start circle
- `r0` (number): Radius of start circle (use 0 for point source)
- `x1` (number): Center X of end circle
- `y1` (number): Center Y of end circle
- `r1` (number): Radius of end circle

**Returns:**
- (Gradient): A gradient object

```lua
-- Spotlight effect (same center, point to circle)
local light = canvas.create_radial_gradient(200, 200, 0, 200, 200, 150)
light:add_color_stop(0, "#FFFFFF")         -- White center
light:add_color_stop(1, "rgba(0,0,0,0)")   -- Transparent edge

-- 3D sphere effect (offset highlight)
local sphere = canvas.create_radial_gradient(180, 180, 10, 200, 200, 80)
sphere:add_color_stop(0, "#FFFFFF")   -- Highlight
sphere:add_color_stop(0.3, "#4dabf7") -- Light blue
sphere:add_color_stop(1, "#1864ab")   -- Dark blue
```

### canvas.create_conic_gradient(startAngle, x, y)

Create a conic (angular) gradient that sweeps colors around a center point. Perfect for color wheels, pie charts, and circular progress indicators.

**Parameters:**
- `startAngle` (number): Starting angle in radians (0 = right, PI/2 = down, PI = left)
- `x` (number): Center X coordinate
- `y` (number): Center Y coordinate

**Returns:**
- (Gradient): A gradient object

```lua
-- Color wheel (full spectrum)
local wheel = canvas.create_conic_gradient(0, 200, 200)
wheel:add_color_stop(0, "#FF0000")     -- Red
wheel:add_color_stop(0.17, "#FFFF00")  -- Yellow
wheel:add_color_stop(0.33, "#00FF00")  -- Green
wheel:add_color_stop(0.5, "#00FFFF")   -- Cyan
wheel:add_color_stop(0.67, "#0000FF")  -- Blue
wheel:add_color_stop(0.83, "#FF00FF")  -- Magenta
wheel:add_color_stop(1, "#FF0000")     -- Back to red
canvas.set_fill_style(wheel)
canvas.begin_path()
canvas.arc(200, 200, 100, 0, math.pi * 2)
canvas.fill()

-- Pie chart (start from top with -PI/2)
local pie = canvas.create_conic_gradient(-math.pi/2, 200, 200)
pie:add_color_stop(0, "#4dabf7")    -- Blue (30%)
pie:add_color_stop(0.3, "#4dabf7")
pie:add_color_stop(0.3, "#ff6b6b")  -- Red (50%)
pie:add_color_stop(0.8, "#ff6b6b")
pie:add_color_stop(0.8, "#51cf66")  -- Green (20%)
pie:add_color_stop(1, "#51cf66")
canvas.set_fill_style(pie)
canvas.fill_circle(200, 200, 80)
```

### Gradient:add_color_stop(offset, color)

Add a color stop to a gradient. Color stops define where colors appear along the gradient. Returns the gradient for method chaining.

**Parameters:**
- `offset` (number): Position along gradient (0.0 to 1.0)
- `color` (string): CSS color string (hex, named color, rgb, rgba)

**Returns:**
- (Gradient): The gradient object (for chaining)

```lua
local rainbow = canvas.create_linear_gradient(0, 0, 400, 0)
rainbow:add_color_stop(0, "red")
rainbow:add_color_stop(0.17, "orange")
rainbow:add_color_stop(0.33, "yellow")
rainbow:add_color_stop(0.5, "green")
rainbow:add_color_stop(0.67, "blue")
rainbow:add_color_stop(0.83, "indigo")
rainbow:add_color_stop(1, "violet")

-- Method chaining
local gradient = canvas.create_linear_gradient(0, 0, 100, 0)
  :add_color_stop(0, "red")
  :add_color_stop(0.5, "yellow")
  :add_color_stop(1, "green")
```

### canvas.set_fill_style(style)

Set the fill style for subsequent fill operations. Accepts a CSS color string or a gradient.

**Parameters:**
- `style` (string|Gradient): CSS color string or gradient object

```lua
-- Color string
canvas.set_fill_style("#FF0000")
canvas.set_fill_style("red")
canvas.set_fill_style("rgb(255, 0, 0)")
canvas.set_fill_style("rgba(255, 0, 0, 0.5)")

-- Gradient
local gradient = canvas.create_linear_gradient(0, 0, 200, 0)
gradient:add_color_stop(0, "red"):add_color_stop(1, "blue")
canvas.set_fill_style(gradient)
canvas.fill_rect(0, 0, 200, 100)
```

### canvas.set_stroke_style(style)

Set the stroke style for subsequent stroke operations. Accepts a CSS color string or a gradient.

**Parameters:**
- `style` (string|Gradient): CSS color string or gradient object

```lua
-- Rainbow line
local rainbow = canvas.create_linear_gradient(50, 0, 350, 0)
rainbow:add_color_stop(0, "red")
rainbow:add_color_stop(0.5, "yellow")
rainbow:add_color_stop(1, "blue")

canvas.set_line_width(10)
canvas.set_stroke_style(rainbow)
canvas.begin_path()
canvas.move_to(50, 200)
canvas.line_to(350, 200)
canvas.stroke()
```

### Gradient Examples

```lua
local canvas = require('canvas')

canvas.set_size(400, 400)

canvas.tick(function()
  canvas.clear()

  -- Sky gradient (vertical)
  local sky = canvas.create_linear_gradient(0, 0, 0, 200)
  sky:add_color_stop(0, "#1a1a2e")
  sky:add_color_stop(0.5, "#16213e")
  sky:add_color_stop(1, "#0f3460")
  canvas.set_fill_style(sky)
  canvas.fill_rect(0, 0, 400, 200)

  -- Sunset gradient (horizontal)
  local sunset = canvas.create_linear_gradient(0, 200, 400, 200)
  sunset:add_color_stop(0, "#ff6b6b")
  sunset:add_color_stop(0.5, "#feca57")
  sunset:add_color_stop(1, "#48dbfb")
  canvas.set_fill_style(sunset)
  canvas.fill_rect(0, 200, 400, 100)

  -- 3D sphere
  local sphere = canvas.create_radial_gradient(150, 320, 10, 200, 350, 60)
  sphere:add_color_stop(0, "#ffffff")
  sphere:add_color_stop(0.3, "#4dabf7")
  sphere:add_color_stop(1, "#1864ab")
  canvas.set_fill_style(sphere)
  canvas.fill_circle(200, 350, 60)

  -- Rainbow stroke
  local rainbow = canvas.create_linear_gradient(50, 0, 350, 0)
  rainbow:add_color_stop(0, "#ff0000")
  rainbow:add_color_stop(0.17, "#ff7f00")
  rainbow:add_color_stop(0.33, "#ffff00")
  rainbow:add_color_stop(0.5, "#00ff00")
  rainbow:add_color_stop(0.67, "#0000ff")
  rainbow:add_color_stop(0.83, "#4b0082")
  rainbow:add_color_stop(1, "#9400d3")
  canvas.set_line_width(8)
  canvas.set_stroke_style(rainbow)
  canvas.begin_path()
  canvas.move_to(50, 150)
  canvas.line_to(350, 150)
  canvas.stroke()
end)

canvas.start()
```

## Patterns

Patterns allow you to fill shapes with repeating images. Create a pattern from a registered image asset, then use it with `set_fill_style()` or `set_stroke_style()`.

### canvas.create_pattern(imageName, repetition)

Create a pattern from a registered image for textured fills and strokes.

**Parameters:**
- `imageName` (string): Name of image registered via `canvas.assets.image()`
- `repetition` (string, optional): How the pattern tiles. Defaults to "repeat"

**Repetition modes:**
- `"repeat"` - Tile in both directions (default)
- `"repeat-x"` - Tile horizontally only
- `"repeat-y"` - Tile vertically only
- `"no-repeat"` - No tiling, single image

**Returns:**
- (Pattern): A pattern object for use with `set_fill_style()` or `set_stroke_style()`

**Example:**
```lua
-- Register an image asset
canvas.assets.image("tiles", "canvas/images/meteor.png")

-- Create a repeating pattern
local pattern = canvas.create_pattern("tiles", "repeat")
canvas.set_fill_style(pattern)
canvas.fill_rect(0, 0, 400, 300)

-- Horizontal repeat only
local stripes = canvas.create_pattern("tiles", "repeat-x")
canvas.set_fill_style(stripes)
canvas.fill_rect(0, 0, 400, 100)
```

## Shadows

Add shadow effects to shapes for depth and visual polish. Shadows affect all subsequent drawing operations until cleared.

### canvas.set_shadow_color(color)

Set the shadow color.

**Parameters:**
- `color` (string): CSS color string (e.g., "#00000080", "rgba(0,0,0,0.5)")

### canvas.set_shadow_blur(blur)

Set the shadow blur radius. Higher values create softer, more diffuse shadows.

**Parameters:**
- `blur` (number): Blur radius in pixels (0 = sharp shadow)

### canvas.set_shadow_offset_x(offset)

Set the shadow horizontal offset. Positive values move shadow right.

**Parameters:**
- `offset` (number): Horizontal offset in pixels

### canvas.set_shadow_offset_y(offset)

Set the shadow vertical offset. Positive values move shadow down.

**Parameters:**
- `offset` (number): Vertical offset in pixels

### canvas.set_shadow(color, blur, offsetX, offsetY)

Set all shadow properties at once.

**Parameters:**
- `color` (string): CSS color string
- `blur` (number, optional): Blur radius in pixels (default: 0)
- `offsetX` (number, optional): Horizontal offset in pixels (default: 0)
- `offsetY` (number, optional): Vertical offset in pixels (default: 0)

**Example:**
```lua
-- Drop shadow
canvas.set_shadow("#00000080", 10, 5, 5)
canvas.set_fill_style("#4ECDC4")
canvas.fill_rect(100, 100, 200, 100)

-- Glow effect (no offset)
canvas.set_shadow("#FFD700", 20, 0, 0)
canvas.set_fill_style("#FFD700")
canvas.fill_circle(400, 150, 50)

-- Text with shadow
canvas.set_shadow("#000000", 3, 2, 2)
canvas.set_fill_style("#FFFFFF")
canvas.set_font_size(48)
canvas.draw_text(100, 300, "Shadow Text")
```

### canvas.clear_shadow()

Clear all shadow properties. Resets shadow to default (no shadow) for subsequent drawing.

**Example:**
```lua
canvas.set_shadow("#000000", 10, 5, 5)
canvas.fill_rect(50, 50, 100, 100)  -- With shadow

canvas.clear_shadow()
canvas.fill_rect(200, 50, 100, 100) -- No shadow
```

## Compositing

Control transparency and blend modes for layered graphics and visual effects.

### canvas.set_global_alpha(alpha)

Set the global alpha (transparency) for all subsequent drawing. Affects all drawing operations including shapes, text, and images.

**Parameters:**
- `alpha` (number): Value from 0.0 (fully transparent) to 1.0 (fully opaque)

**Example:**
```lua
canvas.set_global_alpha(0.5)  -- 50% transparent
canvas.set_fill_style("#FF0000")
canvas.fill_rect(50, 50, 100, 100)  -- Semi-transparent red

canvas.set_global_alpha(1.0)  -- Reset to fully opaque
```

### canvas.set_composite_operation(operation)

Set the composite operation (blend mode) for all subsequent drawing. Controls how new pixels are combined with existing pixels on the canvas.

**Parameters:**
- `operation` (string): One of the blend mode names listed below

**Common Blend Modes:**

| Mode | Description |
|------|-------------|
| `"source-over"` | Default. Draw new content on top of existing |
| `"multiply"` | Multiply colors (darkening effect) |
| `"screen"` | Screen blend (lightening effect) |
| `"lighter"` | Additive blending (great for glow effects) |
| `"overlay"` | Overlay blend |
| `"darken"` | Keep the darker color |
| `"lighten"` | Keep the lighter color |

**Additional Blend Modes:**
- `"source-in"`, `"source-out"`, `"source-atop"`
- `"destination-over"`, `"destination-in"`, `"destination-out"`, `"destination-atop"`
- `"copy"`, `"xor"`
- `"color-dodge"`, `"color-burn"`, `"hard-light"`, `"soft-light"`
- `"difference"`, `"exclusion"`, `"hue"`, `"saturation"`, `"color"`, `"luminosity"`

**Example:**
```lua
-- Draw base shapes
canvas.set_fill_style("#00FF00")
canvas.fill_circle(100, 100, 50)

-- Multiply blend (darkening)
canvas.set_composite_operation("multiply")
canvas.set_fill_style("#FF0000")
canvas.fill_circle(130, 100, 50)

-- Additive glow effect
canvas.set_composite_operation("lighter")
canvas.set_fill_style("#0000FF40")
for i = 1, 5 do
    canvas.fill_circle(250, 100, 20 + i * 10)
end

-- Reset to default
canvas.set_composite_operation("source-over")
```

## Text Alignment

Control how text is positioned relative to the specified x and y coordinates.

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

**Example:**
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

**Example:**
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

### canvas.draw_label(x, y, width, height, text, options)

Draw text within a bounded rectangle with automatic alignment and overflow handling. This is a convenience function that simplifies common text layout tasks.

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

**Example:**
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

-- Full options example
canvas.draw_label(100, 300, 200, 40, "Padded Label", {
    align_h = "left",
    align_v = "middle",
    overflow = "ellipsis",
    padding = {left = 10, top = 5, right = 10, bottom = 5}
})
```

## Drawing Functions

### canvas.draw_rect(x, y, width, height)

Draw a rectangle outline.

### canvas.fill_rect(x, y, width, height)

Draw a filled rectangle.

### canvas.draw_circle(x, y, radius)

Draw a circle outline.

### canvas.fill_circle(x, y, radius)

Draw a filled circle.

### canvas.draw_line(x1, y1, x2, y2)

Draw a line between two points.

### canvas.draw_text(x, y, text)

Draw text at the specified position.

## Path API

The path API allows you to create complex shapes by defining paths with multiple segments.

### canvas.begin_path()

Start a new path. Call this before drawing path segments.

### canvas.close_path()

Close the current path by drawing a line back to the starting point.

### canvas.move_to(x, y)

Move the path cursor to (x, y) without drawing.

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate

### canvas.line_to(x, y)

Draw a line from the current position to (x, y).

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate

### canvas.arc(x, y, radius, startAngle, endAngle, counterclockwise?)

Draw an arc (portion of a circle) on the current path.

**Parameters:**
- `x` (number): X coordinate of arc center
- `y` (number): Y coordinate of arc center
- `radius` (number): Arc radius in pixels
- `startAngle` (number): Start angle in radians (0 = 3 o'clock)
- `endAngle` (number): End angle in radians
- `counterclockwise` (boolean, optional): Draw counterclockwise (default: false)

```lua
-- Draw a pie chart slice
canvas.begin_path()
canvas.move_to(200, 200)  -- center
canvas.arc(200, 200, 100, 0, math.pi / 2)  -- quarter circle
canvas.close_path()
canvas.set_color("#FF6B6B")
canvas.fill()
```

### canvas.arc_to(x1, y1, x2, y2, radius)

Draw an arc using tangent control points. Useful for creating rounded corners.

**Parameters:**
- `x1` (number): X coordinate of first control point
- `y1` (number): Y coordinate of first control point
- `x2` (number): X coordinate of second control point
- `y2` (number): Y coordinate of second control point
- `radius` (number): Arc radius in pixels

```lua
-- Draw a rounded corner
canvas.begin_path()
canvas.move_to(50, 100)
canvas.arc_to(100, 100, 100, 50, 20)
canvas.stroke()
```

### canvas.quadratic_curve_to(cpx, cpy, x, y)

Draw a quadratic Bézier curve from the current point. Uses a single control point for a simple curve.

**Parameters:**
- `cpx` (number): X coordinate of the control point
- `cpy` (number): Y coordinate of the control point
- `x` (number): X coordinate of the end point
- `y` (number): Y coordinate of the end point

```lua
-- Draw a simple curved arc
canvas.begin_path()
canvas.move_to(50, 200)
canvas.quadratic_curve_to(150, 50, 250, 200)
canvas.stroke()
```

### canvas.bezier_curve_to(cp1x, cp1y, cp2x, cp2y, x, y)

Draw a cubic Bézier curve from the current point. Uses two control points for complex S-curves and smooth shapes.

**Parameters:**
- `cp1x` (number): X coordinate of the first control point
- `cp1y` (number): Y coordinate of the first control point
- `cp2x` (number): X coordinate of the second control point
- `cp2y` (number): Y coordinate of the second control point
- `x` (number): X coordinate of the end point
- `y` (number): Y coordinate of the end point

```lua
-- Draw an S-curve
canvas.begin_path()
canvas.move_to(50, 200)
canvas.bezier_curve_to(150, 50, 250, 350, 350, 200)
canvas.set_line_width(3)
canvas.stroke()
```

### canvas.ellipse(x, y, radiusX, radiusY, rotation?, startAngle?, endAngle?, counterclockwise?)

Draw an ellipse (oval) on the current path. An ellipse has separate horizontal and vertical radii.

**Parameters:**
- `x` (number): X coordinate of the ellipse's center
- `y` (number): Y coordinate of the ellipse's center
- `radiusX` (number): Horizontal radius (half-width)
- `radiusY` (number): Vertical radius (half-height)
- `rotation` (number, optional): Rotation in radians (default: 0)
- `startAngle` (number, optional): Start angle in radians (default: 0)
- `endAngle` (number, optional): End angle in radians (default: 2π for full ellipse)
- `counterclockwise` (boolean, optional): Draw counterclockwise (default: false)

```lua
-- Draw a full oval
canvas.begin_path()
canvas.ellipse(200, 150, 100, 50)  -- Wide oval
canvas.set_color("#4ECDC4")
canvas.fill()

-- Draw a rotated ellipse
canvas.begin_path()
canvas.ellipse(200, 200, 80, 40, math.pi / 4)  -- 45-degree rotation
canvas.stroke()
```

### canvas.round_rect(x, y, width, height, radii)

Draw a rounded rectangle on the current path. Great for buttons and UI elements.

**Parameters:**
- `x` (number): X coordinate of top-left corner
- `y` (number): Y coordinate of top-left corner
- `width` (number): Rectangle width
- `height` (number): Rectangle height
- `radii` (number or table): Corner radius/radii

**Radii formats:**
- Single number: Same radius for all corners
- `{r}`: Same radius for all corners
- `{r1, r2}`: r1 for top-left/bottom-right, r2 for top-right/bottom-left
- `{r1, r2, r3}`: r1=top-left, r2=top-right/bottom-left, r3=bottom-right
- `{r1, r2, r3, r4}`: top-left, top-right, bottom-right, bottom-left

```lua
-- Draw a button with uniform rounded corners
canvas.begin_path()
canvas.round_rect(50, 50, 200, 60, 15)
canvas.set_color("#667EEA")
canvas.fill()

-- Draw with different corner radii
canvas.begin_path()
canvas.round_rect(50, 150, 200, 60, {20, 0, 20, 0})  -- Alternating corners
canvas.fill()
```

### canvas.fill()

Fill the current path with the current color.

### canvas.stroke()

Stroke (outline) the current path with the current color and line width.

```lua
-- Draw a filled triangle
canvas.begin_path()
canvas.move_to(100, 100)
canvas.line_to(150, 50)
canvas.line_to(200, 100)
canvas.close_path()
canvas.set_color("#4ECDC4")
canvas.fill()
canvas.set_color("#000000")
canvas.stroke()
```

### canvas.clip(fillRule?)

Clip all future drawing to the current path. Creates a clipping region from the current path - all subsequent drawing is constrained to this region.

**Parameters:**
- `fillRule` (string, optional): "nonzero" (default) or "evenodd"

**Important:** Clipping can only shrink the region, not expand it. Use `save()` before clipping and `restore()` to remove the clipping region.

```lua
-- Create a circular viewport
canvas.save()
canvas.begin_path()
canvas.arc(200, 200, 80, 0, math.pi * 2)
canvas.clip()

-- Draw a pattern (clipped to circle)
canvas.set_color(255, 100, 100)
for i = 0, 400, 20 do
  canvas.fill_rect(0, i, 400, 10)
end

canvas.restore()  -- Remove clipping
```

## Transformation Functions

Transformations allow you to translate, rotate, and scale the canvas coordinate system.
All subsequent drawing operations are affected by the current transformation.

### canvas.translate(dx, dy)

Move the canvas origin by the specified amount. All subsequent drawing will be offset.

**Parameters:**
- `dx` (number): Horizontal distance to move
- `dy` (number): Vertical distance to move

```lua
canvas.translate(100, 100)  -- Move origin to (100, 100)
canvas.fill_rect(0, 0, 50, 50)  -- Draws at (100, 100)
```

### canvas.rotate(angle)

Rotate the canvas around the current origin. The angle is in radians.

**Parameters:**
- `angle` (number): Rotation angle in radians

```lua
canvas.rotate(math.pi / 4)  -- Rotate 45 degrees
canvas.fill_rect(0, 0, 50, 50)  -- Draws rotated
```

### canvas.scale(sx, sy)

Scale the canvas from the current origin. Negative values flip/mirror.

**Parameters:**
- `sx` (number): Horizontal scale factor (1.0 = normal, 2.0 = double, -1 = mirror)
- `sy` (number): Vertical scale factor

```lua
canvas.scale(2, 2)   -- Double size
canvas.scale(-1, 1)  -- Flip horizontally (mirror)
```

### canvas.save()

Save the current transformation state to a stack. Use with `restore()` to temporarily apply transformations.

```lua
canvas.save()
canvas.translate(100, 100)
canvas.rotate(math.pi / 4)
canvas.fill_rect(-25, -25, 50, 50)  -- Draw rotated square
canvas.restore()  -- Undo translate and rotate
```

### canvas.restore()

Restore the most recently saved transformation state. Undoes all transformations since the last `save()`.

### canvas.transform(a, b, c, d, e, f)

Apply a custom 2D transformation matrix. Multiplies the current matrix by the specified values.

**Parameters (2x3 matrix):**
- `a` (number): Horizontal scaling
- `b` (number): Vertical skewing
- `c` (number): Horizontal skewing
- `d` (number): Vertical scaling
- `e` (number): Horizontal translation
- `f` (number): Vertical translation

### canvas.set_transform(a, b, c, d, e, f)

Reset to identity matrix, then apply the specified transformation.

### canvas.reset_transform()

Reset the transformation matrix to identity (no transformation).

```lua
canvas.reset_transform()  -- Clear all transforms
```

## Timing Functions

### canvas.get_delta()

Get the time elapsed since the last frame (in seconds).
Use this for frame-rate independent movement.

**Returns:**
- (number): Time since last frame in seconds

```lua
local speed = 100 -- pixels per second
x = x + speed * canvas.get_delta()
```

### canvas.get_time()

Get the total time since the game started (in seconds).

**Returns:**
- (number): Total elapsed time in seconds

## Keyboard Input

### canvas.is_key_down(key)

Check if a key is currently held down.

**Parameters:**
- `key` (string): Key name (e.g., 'w', 'ArrowUp', or use `canvas.keys.W`)

**Returns:**
- (boolean): True if key is currently held

```lua
if canvas.is_key_down('w') then
  y = y - speed * canvas.get_delta()
end

-- Or use key constants
if canvas.is_key_down(canvas.keys.W) then
  y = y - speed * canvas.get_delta()
end
```

### canvas.is_key_pressed(key)

Check if a key was pressed this frame. Returns true only on the frame the key was first pressed.

### canvas.get_keys_down()

Get all keys currently held down.

**Returns:**
- (table): Array of key codes in KeyboardEvent.code format

### canvas.get_keys_pressed()

Get all keys pressed this frame.

**Returns:**
- (table): Array of key codes pressed this frame

## Key Constants

The `canvas.keys` table provides named constants for all keyboard keys.
These can be used with `is_key_down()` and `is_key_pressed()`.

**Letters:** `canvas.keys.A` through `canvas.keys.Z` (maps to KeyA-KeyZ)

**Number Row:** `canvas.keys.DIGIT_0` through `canvas.keys.DIGIT_9` (or `canvas.keys['0']` through `canvas.keys['9']`)

**Arrow Keys:** `canvas.keys.UP`, `canvas.keys.DOWN`, `canvas.keys.LEFT`, `canvas.keys.RIGHT` (also `ARROW_UP`, etc.)

**Function Keys:** `canvas.keys.F1` through `canvas.keys.F12`

**Modifier Keys:** `canvas.keys.SHIFT`, `canvas.keys.CTRL`, `canvas.keys.ALT`, `canvas.keys.META`, `canvas.keys.CAPS_LOCK` (with _LEFT/_RIGHT variants)

**Special Keys:** `canvas.keys.SPACE`, `canvas.keys.ENTER`, `canvas.keys.ESCAPE`, `canvas.keys.TAB`, `canvas.keys.BACKSPACE`, `canvas.keys.DELETE`, `canvas.keys.INSERT`, `canvas.keys.HOME`, `canvas.keys.END`, `canvas.keys.PAGE_UP`, `canvas.keys.PAGE_DOWN`

**Numpad:** `canvas.keys.NUMPAD_0` through `canvas.keys.NUMPAD_9`, `canvas.keys.NUMPAD_ADD`, `canvas.keys.NUMPAD_SUBTRACT`, `canvas.keys.NUMPAD_MULTIPLY`, `canvas.keys.NUMPAD_DIVIDE`, `canvas.keys.NUMPAD_DECIMAL`, `canvas.keys.NUMPAD_ENTER`

**Punctuation:** `canvas.keys.MINUS`, `canvas.keys.EQUAL`, `canvas.keys.BRACKET_LEFT`, `canvas.keys.BRACKET_RIGHT`, `canvas.keys.BACKSLASH`, `canvas.keys.SEMICOLON`, `canvas.keys.QUOTE`, `canvas.keys.BACKQUOTE`, `canvas.keys.COMMA`, `canvas.keys.PERIOD`, `canvas.keys.SLASH`

## Mouse Input

### canvas.get_mouse_x()

Get the current mouse X position relative to canvas.

### canvas.get_mouse_y()

Get the current mouse Y position relative to canvas.

### canvas.is_mouse_down(button)

Check if a mouse button is currently held down.

**Parameters:**
- `button` (number): Button number (0 = left, 1 = middle, 2 = right)

### canvas.is_mouse_pressed(button)

Check if a mouse button was pressed this frame.

```lua
if canvas.is_mouse_pressed(0) then
  -- Left mouse button was just clicked
  shoot_at(canvas.get_mouse_x(), canvas.get_mouse_y())
end
```

## Image Assets

Register and draw images on the canvas. Images must be registered before `canvas.start()`.

**Supported formats:** PNG, JPG, JPEG, GIF, WebP, BMP

### canvas.assets.image(name, path)

Register an image asset for loading. Call this before `canvas.start()`.

**Parameters:**
- `name` (string): Unique name to reference this asset
- `path` (string): Path to the image file (relative or absolute)

```lua
-- Register images before starting
canvas.assets.image("ship", "images/ship.png")
canvas.assets.image("enemy", "images/enemy.png")

canvas.start()  -- Images are loaded here
```

### canvas.assets.get_width(name)

Get the width of a loaded image in pixels.

**Parameters:**
- `name` (string): The asset name

**Returns:**
- (number): Width in pixels

### canvas.assets.get_height(name)

Get the height of a loaded image in pixels.

**Parameters:**
- `name` (string): The asset name

**Returns:**
- (number): Height in pixels

```lua
local w = canvas.assets.get_width("ship")
local h = canvas.assets.get_height("ship")
print("Ship size: " .. w .. "x" .. h)
```

### canvas.draw_image(name, x, y, width?, height?)

Draw an image at the specified position. Optional width/height parameters enable scaling.

**Parameters:**
- `name` (string): The asset name (registered via `canvas.assets.image()`)
- `x` (number): X coordinate of top-left corner
- `y` (number): Y coordinate of top-left corner
- `width` (number, optional): Scale to this width
- `height` (number, optional): Scale to this height

```lua
-- Draw at original size
canvas.draw_image("ship", 100, 100)

-- Draw scaled to 64x64
canvas.draw_image("ship", 100, 100, 64, 64)

-- Center an image
local w = canvas.assets.get_width("ship")
local h = canvas.assets.get_height("ship")
canvas.draw_image("ship", player_x - w/2, player_y - h/2)
```

## Example: Moving Square

```lua
local canvas = require('canvas')

-- Set canvas size
canvas.set_size(800, 600)

local x, y = 100, 100
local speed = 200

canvas.tick(function()
  -- Handle input
  local dt = canvas.get_delta()

  if canvas.is_key_down('ArrowLeft') then
    x = x - speed * dt
  end
  if canvas.is_key_down('ArrowRight') then
    x = x + speed * dt
  end
  if canvas.is_key_down('ArrowUp') then
    y = y - speed * dt
  end
  if canvas.is_key_down('ArrowDown') then
    y = y + speed * dt
  end

  -- Keep player in bounds
  if x < 0 then x = 0 end
  if x > canvas.get_width() - 50 then x = canvas.get_width() - 50 end
  if y < 0 then y = 0 end
  if y > canvas.get_height() - 50 then y = canvas.get_height() - 50 end

  -- Draw
  canvas.clear()
  canvas.set_color(255, 100, 0)
  canvas.fill_rect(x, y, 50, 50)
end)

-- Start the canvas (blocks until Ctrl+C)
canvas.start()
```
