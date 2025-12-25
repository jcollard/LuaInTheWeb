# Drawing Basics

Basic drawing functions for shapes, colors, and simple text.

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

## Drawing Functions

### canvas.draw_rect(x, y, width, height)

Draw a rectangle outline.

**Parameters:**
- `x` (number): X coordinate of top-left corner
- `y` (number): Y coordinate of top-left corner
- `width` (number): Width of rectangle
- `height` (number): Height of rectangle

### canvas.fill_rect(x, y, width, height)

Draw a filled rectangle.

**Parameters:**
- `x` (number): X coordinate of top-left corner
- `y` (number): Y coordinate of top-left corner
- `width` (number): Width of rectangle
- `height` (number): Height of rectangle

### canvas.draw_circle(x, y, radius)

Draw a circle outline.

**Parameters:**
- `x` (number): X coordinate of center
- `y` (number): Y coordinate of center
- `radius` (number): Radius of circle

### canvas.fill_circle(x, y, radius)

Draw a filled circle.

**Parameters:**
- `x` (number): X coordinate of center
- `y` (number): Y coordinate of center
- `radius` (number): Radius of circle

### canvas.draw_line(x1, y1, x2, y2)

Draw a line between two points.

**Parameters:**
- `x1` (number): X coordinate of start point
- `y1` (number): Y coordinate of start point
- `x2` (number): X coordinate of end point
- `y2` (number): Y coordinate of end point

### canvas.draw_text(x, y, text)

Draw text at the specified position.

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate
- `text` (string): Text to draw

## Example

```lua
local canvas = require('canvas')

canvas.set_size(400, 300)

local function draw()
  canvas.clear()

  -- Draw a red square
  canvas.set_color(255, 0, 0)
  canvas.fill_rect(50, 50, 100, 100)

  -- Draw a blue circle
  canvas.set_color("#0000FF")
  canvas.fill_circle(250, 100, 50)

  -- Draw a green line
  canvas.set_color(0, 255, 0)
  canvas.set_line_width(3)
  canvas.draw_line(50, 200, 350, 200)

  -- Draw text
  canvas.set_color(0, 0, 0)
  canvas.draw_text(50, 250, "Hello, Canvas!")
end

local function game()
  draw()
end

canvas.tick(game)
canvas.start()
```

---

## Related Examples

- [Basic Shapes](../../examples/canvas/drawing/shapes.lua) - Rectangles, circles, lines, text

---

[← Back to Canvas Library](../canvas.md)
