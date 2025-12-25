# Images & Assets

Load and draw images on the canvas.

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

## Font Assets

### canvas.assets.font(name, path)

Register a custom font for use with text rendering.

**Parameters:**
- `name` (string): Unique name to reference this font
- `path` (string): Path to the font file (TTF, OTF, WOFF, WOFF2)

```lua
canvas.assets.font("pixel", "fonts/pixel.ttf")

canvas.tick(function()
  canvas.set_font_family("pixel")
  canvas.draw_text(100, 100, "Custom Font!")
end)
```

## Example: Sprite Animation

```lua
local canvas = require('canvas')

canvas.set_size(400, 300)

-- Register sprite sheet
canvas.assets.image("player", "images/player.png")

local x, y = 200, 150
local speed = 150

canvas.tick(function()
  local dt = canvas.get_delta()

  -- Move with arrow keys
  if canvas.is_key_down(canvas.keys.LEFT) then
    x = x - speed * dt
  end
  if canvas.is_key_down(canvas.keys.RIGHT) then
    x = x + speed * dt
  end

  -- Draw
  canvas.clear()

  -- Draw player centered
  local w = canvas.assets.get_width("player")
  local h = canvas.assets.get_height("player")
  canvas.draw_image("player", x - w/2, y - h/2)
end)

canvas.start()
```

---

[← Back to Canvas Library](../canvas.md)
