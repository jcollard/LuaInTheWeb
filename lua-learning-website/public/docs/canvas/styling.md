# Styling

Advanced styling with line styles, gradients, patterns, shadows, and compositing.

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
```

### canvas.set_miter_limit(limit)

Set the miter limit for sharp corners. When `line_join` is `"miter"`, this limits how far the corner can extend. If the miter length exceeds this limit, the corner is drawn as a bevel instead.

**Parameters:**
- `limit` (number): Miter limit value (default: 10)

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

-- Complex pattern: long dash, gap, short dash, gap
canvas.set_line_dash({15, 5, 5, 5})

-- Reset to solid line
canvas.set_line_dash({})
```

### canvas.get_line_dash()

Get the current line dash pattern.

**Returns:**
- (table): Current dash pattern array (empty for solid line)

### canvas.set_line_dash_offset(offset)

Set the line dash offset for animating dashed lines. Useful for creating "marching ants" selection effects.

**Parameters:**
- `offset` (number): Offset to shift the dash pattern

```lua
-- Animated marching ants selection box
local offset = 0

local function update()
  offset = offset + 0.5
end

local function draw()
  canvas.clear()
  canvas.set_line_dash({4, 4})
  canvas.set_line_dash_offset(offset)
  canvas.set_color(0, 0, 0)
  canvas.begin_path()
  canvas.draw_rect(100, 100, 200, 150)
  canvas.stroke()
end

local function game()
  update()
  draw()
end

canvas.tick(game)
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
```

### Gradient:add_color_stop(offset, color)

Add a color stop to a gradient. Color stops define where colors appear along the gradient. Returns the gradient for method chaining.

**Parameters:**
- `offset` (number): Position along gradient (0.0 to 1.0)
- `color` (string): CSS color string (hex, named color, rgb, rgba)

**Returns:**
- (Gradient): The gradient object (for chaining)

```lua
-- Method chaining
local gradient = canvas.create_linear_gradient(0, 0, 100, 0)
  :add_color_stop(0, "red")
  :add_color_stop(0.5, "yellow")
  :add_color_stop(1, "green")
```

### canvas.set_fill_style(style)

Set the fill style for subsequent fill operations. Accepts a CSS color string, gradient, or pattern.

**Parameters:**
- `style` (string|Gradient|Pattern): CSS color string, gradient, or pattern object

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

Set the stroke style for subsequent stroke operations. Accepts a CSS color string, gradient, or pattern.

**Parameters:**
- `style` (string|Gradient|Pattern): CSS color string, gradient, or pattern object

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

---

## Related Examples

- [Line Styles](../../examples/canvas/styling/line-styles.lua) - Line caps, joins, and widths
- [Dashed Lines](../../examples/canvas/styling/dashed-lines.lua) - Line dash patterns
- [Linear Gradient](../../examples/canvas/styling/linear-gradient.lua) - Linear gradient fills
- [Radial Gradient](../../examples/canvas/styling/radial-gradient.lua) - Radial gradient fills
- [Conic Gradient](../../examples/canvas/styling/conic-gradient.lua) - Conic/angular gradients
- [Pattern Demo](../../examples/canvas/styling/pattern-demo.lua) - Image pattern fills
- [Shadow Demo](../../examples/canvas/styling/shadow-demo.lua) - Shadow effects
- [Compositing Demo](../../examples/canvas/styling/compositing-demo.lua) - Blend modes

---

[← Back to Canvas Library](../canvas.md)
