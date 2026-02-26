# ANSI Terminal Library

The `ansi` library provides an 80×25 text terminal for DOS-style ANSI games and art display. Load it with:

```lua
local ansi = require("ansi")
```

## Screen Display

Load and display `.ansi.lua` images created with the ANSI Graphics Editor.

### `ansi.create_screen(data)`

Parse and composite an `.ansi.lua` file into a screen object with layer control methods.

- **data** — The data table from a `.ansi.lua` file (loaded via `require` or `dofile`)
- **Returns** — A screen object (also accepted by `ansi.set_screen()`)

```lua
local image_data = require("my_image.ansi")
local screen = ansi.create_screen(image_data)
```

### `ansi.set_screen(screen)`

Set the active background screen. When active, the screen is rendered each frame before `tick()` runs. Use `ansi.print()` to draw on top.

- **screen** — Screen object from `create_screen()`, a numeric screen ID, or `nil` to clear

```lua
ansi.set_screen(screen)   -- display background
ansi.set_screen(nil)      -- clear background
```

### Example: Display a static image

```lua
local ansi = require("ansi")

-- Load the image data
local data = require("my_art.ansi")
local screen = ansi.create_screen(data)

-- Display it
ansi.set_screen(screen)

ansi.tick(function()
  -- The background renders automatically each frame
  -- Use ansi.print() to draw text on top
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 255, 0)
  ansi.print("Hello over the image!")
end)

ansi.start()
```

## Layer Visibility

Control the visibility of individual layers in a screen image at runtime. Layers are identified by their ID, name, or tag.

### `screen:get_layers()`

Get information about all layers in the screen.

- **Returns** — An array of layer info tables, each with: `id`, `name`, `type`, `visible`, `tags`

```lua
local screen = ansi.create_screen(data)
local layers = screen:get_layers()
for i, layer in ipairs(layers) do
  print(layer.name, layer.type, layer.visible)
end
```

### `screen:layer_on(identifier)`

Show layer(s) matching the identifier. Resolves by layer ID first, then by name, then by tag.

- **identifier** — Layer ID, name, or tag (string or number)

```lua
screen:layer_on("Background")    -- show by name
screen:layer_on("ui")            -- show all layers tagged "ui"
```

### `screen:layer_off(identifier)`

Hide layer(s) matching the identifier. Resolves by layer ID first, then by name, then by tag.

- **identifier** — Layer ID, name, or tag (string or number)

```lua
screen:layer_off("Background")   -- hide by name
screen:layer_off("ui")           -- hide all layers tagged "ui"
```

### `screen:layer_toggle(identifier)`

Toggle visibility of layer(s) matching the identifier. Resolves by layer ID first, then by name, then by tag.

- **identifier** — Layer ID, name, or tag (string or number)

```lua
screen:layer_toggle("Background")  -- toggle visibility
```

### Example: Toggle layers with keyboard

```lua
local ansi = require("ansi")

local data = require("my_scene.ansi")
local screen = ansi.create_screen(data)
ansi.set_screen(screen)

ansi.tick(function()
  if ansi.is_key_pressed("1") then
    screen:layer_toggle("Background")
  end
  if ansi.is_key_pressed("2") then
    screen:layer_toggle("Foreground")
  end
  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

ansi.start()
```

## Animation Playback

Control animation playback for screens with animated layers (drawn layers with multiple frames). Screens with animated layers auto-play when set as the active screen via `ansi.set_screen()`.

### `screen:play()`

Start or resume animation playback. Animated layers will advance frames automatically based on their `frameDurationMs`.

```lua
screen:play()
```

### `screen:pause()`

Pause animation playback. Animated layers freeze on their current frame.

```lua
screen:pause()
```

### `screen:is_playing()`

Check if animation is currently playing.

- **Returns** — `true` if animation is playing, `false` otherwise

```lua
if screen:is_playing() then
  screen:pause()
else
  screen:play()
end
```

### Example: Toggle animation with SPACE

```lua
local ansi = require("ansi")

local data = require("my_animation.ansi")
local screen = ansi.create_screen(data)
ansi.set_screen(screen)  -- auto-plays if animated

ansi.tick(function()
  if ansi.is_key_pressed("space") then
    if screen:is_playing() then
      screen:pause()
    else
      screen:play()
    end
  end
  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

ansi.start()
```

## Quick Reference

| Function | Description |
|----------|-------------|
| `ansi.create_screen(data)` | Parse `.ansi.lua` data into a screen object |
| `ansi.set_screen(screen)` | Set background screen (`nil` to clear) |
| `screen:get_layers()` | Get layer info (id, name, type, visible, tags) |
| `screen:layer_on(id)` | Show layer(s) by ID, name, or tag |
| `screen:layer_off(id)` | Hide layer(s) by ID, name, or tag |
| `screen:layer_toggle(id)` | Toggle layer(s) by ID, name, or tag |
| `screen:play()` | Start/resume animation playback |
| `screen:pause()` | Pause animation playback |
| `screen:is_playing()` | Check if animation is playing |
| `ansi.start()` | Start terminal (blocks until `stop()`) |
| `ansi.stop()` | Stop terminal |
| `ansi.tick(fn)` | Register per-frame callback |
| `ansi.print(text)` | Write text at cursor |
| `ansi.set_cursor(row, col)` | Move cursor (1-based) |
| `ansi.clear()` | Clear terminal |
| `ansi.foreground(r, g, b)` | Set text color (RGB or hex) |
| `ansi.background(r, g, b)` | Set background color |
| `ansi.reset()` | Reset colors to defaults |
| `ansi.get_delta()` | Seconds since last frame |
| `ansi.get_time()` | Total elapsed seconds |
| `ansi.is_key_down(key)` | Check if key is held |
| `ansi.is_key_pressed(key)` | Check if key was just pressed |
| `ansi.is_mouse_down(btn)` | Check if mouse button is held |
| `ansi.get_mouse_col()` | Mouse column (1–80) |
| `ansi.get_mouse_row()` | Mouse row (1–25) |
