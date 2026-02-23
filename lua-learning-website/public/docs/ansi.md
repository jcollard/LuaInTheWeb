# ANSI Terminal Library

The `ansi` library provides an 80×25 text terminal for DOS-style ANSI games and art display. Load it with:

```lua
local ansi = require("ansi")
```

## Screen Display

Load and display `.ansi.lua` images created with the ANSI Graphics Editor.

### `ansi.create_screen(data)`

Parse and composite an `.ansi.lua` file into a pre-rendered screen image.

- **data** — The data table from a `.ansi.lua` file (loaded via `require` or `dofile`)
- **Returns** — A numeric screen ID

```lua
local image_data = require("my_image.ansi")
local screen = ansi.create_screen(image_data)
```

### `ansi.set_screen(screen)`

Set the active background screen. When active, the screen is rendered each frame before `tick()` runs. Use `ansi.print()` to draw on top.

- **screen** — Screen ID from `create_screen()`, or `nil` to clear

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

## Quick Reference

| Function | Description |
|----------|-------------|
| `ansi.create_screen(data)` | Parse `.ansi.lua` data into a screen (returns ID) |
| `ansi.set_screen(id)` | Set background screen (`nil` to clear) |
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
