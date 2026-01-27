# Canvas Lifecycle & Game Loop

Control the canvas lifecycle and implement your game loop.

## Canvas Lifecycle

### canvas.start()

Start the canvas and block until `canvas.stop()` is called or Ctrl+C.
This opens a canvas tab and runs the game loop.
Call `canvas.tick()` before this to register your render callback.

```lua
local canvas = require('canvas')

local function draw()
  canvas.clear()
  canvas.set_color(255, 0, 0)
  canvas.fill_rect(10, 10, 50, 50)
end

local function game()
  draw()
end

canvas.tick(game)
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
local function draw()
  canvas.clear()
  canvas.set_color(255, 0, 0)
  canvas.fill_rect(10, 10, 50, 50)
end

local function game()
  draw()
end

canvas.tick(game)
```

## Start Screen (Browser Audio Policy)

Modern browsers require user interaction before playing audio. When running games with the `--start-screen` flag (or in exported games with audio), a "Click to Start" overlay is shown before the game runs.

### canvas.set_start_screen(callback)

Set a custom start screen callback for rendering an overlay. If `callback` is `nil`, the default "Click to Start" overlay is shown.

The callback is called each frame until the user clicks or presses a key.

**Parameters:**
- `callback` (function|nil): Custom render callback, or nil for default overlay

```lua
-- Custom animated start screen
local pulse = 0

canvas.set_start_screen(function()
  pulse = pulse + canvas.get_delta() * 3
  local alpha = math.abs(math.sin(pulse))

  canvas.clear()
  canvas.set_color(20, 20, 40)
  canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

  canvas.set_color(255, 255, 255, 255 * alpha)
  canvas.set_font_size(32)
  canvas.draw_text(150, 140, "Click to Start")

  canvas.set_color(150, 150, 150)
  canvas.set_font_size(16)
  canvas.draw_text(120, 180, "Audio requires user interaction")
end)
```

### canvas.is_waiting_for_interaction()

Check if the canvas is waiting for user interaction. Returns `true` if the start screen is being shown (user hasn't clicked yet).

**Returns:**
- (boolean): True if waiting for user interaction

```lua
-- Useful for conditional logic
if canvas.is_waiting_for_interaction() then
  -- Show preview or instructions
else
  -- Normal game loop
end
```

### Use Cases

#### Games with Audio

When your game uses `canvas.play_sound()` or `canvas.play_music()`, browsers may block audio until the user interacts. Use `--start-screen` to ensure audio works:

```bash
lua --start-screen my-game.lua
```

#### Custom Branding

Replace the default overlay with your game's branding:

```lua
canvas.set_start_screen(function()
  canvas.clear()
  canvas.draw_image("logo", 100, 50)
  canvas.set_color(255, 255, 255)
  canvas.draw_text(150, 200, "Press any key")
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

## Canvas Capture

### canvas.capture(options?)

Capture the current canvas state as a data URL (base64-encoded image). Useful for saving screenshots, creating thumbnails, or implementing undo/redo functionality.

**Parameters:**
- `options` (table, optional): Capture options

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | string | "png" | Image format: "png", "jpeg", "jpg", or "webp" |
| `quality` | number | 0.92 | Quality for JPEG/WebP (0.0 to 1.0) |

**Returns:**
- (string): Data URL of the captured image (e.g., "data:image/png;base64,...")

```lua
-- Capture as PNG (default)
local dataUrl = canvas.capture()

-- Capture as JPEG with custom quality
local jpegUrl = canvas.capture({format = "jpeg", quality = 0.85})

-- Capture as WebP
local webpUrl = canvas.capture({format = "webp", quality = 0.9})
```

### Use Cases

#### Screenshot Button

```lua
local screenshots = {}

if canvas.is_key_pressed(canvas.keys.S) then
  -- Capture current frame
  local screenshot = canvas.capture({format = "png"})
  table.insert(screenshots, screenshot)
  print("Screenshot saved! Total: " .. #screenshots)
end
```

#### Thumbnail Generation

```lua
-- Draw something at full resolution
canvas.set_size(800, 600)
drawMyScene()

-- Capture the full scene
local fullImage = canvas.capture()

-- Use it as a texture or save reference
```

### Data URL Format

The returned data URL can be used:
- As an image source in web contexts
- Saved to local storage
- Sent to a server for processing
- Displayed in an `<img>` tag

The format is: `data:image/<format>;base64,<encoded-data>`

---

## Related Examples

- [Input Demo](../../examples/canvas/input/demo.lua) - Game loop with user_input(), update(), draw()
- [Rotating Square](../../examples/canvas/transforms/rotating-square.lua) - Animation using get_delta()
- [Analog Clock](../../examples/canvas/transforms/analog-clock.lua) - Using get_time() for real-time display
- [Capture Demo](../../examples/canvas/capture/capture-demo.lua) - Canvas capture as data URL
- [Custom Start Screen](../../examples/canvas/start-screen/custom-overlay.lua) - Custom start screen overlay

---

[← Back to Canvas Library](../canvas.md)
