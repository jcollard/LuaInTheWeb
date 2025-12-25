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

---

## Related Examples

- [Input Demo](../../examples/canvas/input/demo.lua) - Game loop with user_input(), update(), draw()
- [Rotating Square](../../examples/canvas/transforms/rotating-square.lua) - Animation using get_delta()
- [Analog Clock](../../examples/canvas/transforms/analog-clock.lua) - Using get_time() for real-time display

---

[← Back to Canvas Library](../canvas.md)
