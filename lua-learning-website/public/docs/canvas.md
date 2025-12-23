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
