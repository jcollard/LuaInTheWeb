# ANSI Terminal Library

The `ansi` library provides an 80×25 text terminal for DOS-style ANSI games and art display. Load it with:

```lua
local ansi = require("ansi")
```

## Screen Display

Load and display `.ansi.lua` images created with the ANSI Graphics Editor.

### `ansi.load_screen(path)`

Load an `.ansi.lua` file by path and return a screen object. This is the recommended way to load ANSI screen files.

- **path** — File path to the `.ansi.lua` file (relative to project or absolute)
- **Returns** — A screen object with layer control methods

```lua
local screen = ansi.load_screen("my_image.ansi.lua")
```

Relative paths are resolved from the current working directory, with a fallback to the project root.

### `ansi.create_screen(data)`

Create a screen from a data table programmatically. Use this when building screen data in code rather than loading from a file.

- **data** — A table matching the `.ansi.lua` file format (version, grid/layers)
- **Returns** — A screen object (also accepted by `ansi.set_screen()`)

```lua
local screen = ansi.create_screen({ version = 1, width = 80, height = 25, grid = my_grid })
```

### `ansi.set_screen(screen)`

Set the active background screen. When active, the screen is rendered each frame before `tick()` runs. Use `ansi.print()` to draw on top.

- **screen** — Screen object from `load_screen()` or `create_screen()`, a numeric screen ID, or `nil` to clear

```lua
ansi.set_screen(screen)   -- display background
ansi.set_screen(nil)      -- clear background
```

### Example: Display a static image

```lua
local ansi = require("ansi")

-- Load an ANSI screen file
local screen = ansi.load_screen("my_art.ansi.lua")

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

local screen = ansi.load_screen("my_scene.ansi.lua")
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

## Label Text

Dynamically set the text content of text layers at runtime. Text layers are identified by their ID, name, or tag (same resolution as `layer_on`/`layer_off`).

### `screen:set_label(identifier, value)`

Set the text of text layer(s) matching the identifier. Non-text layers are silently skipped. Errors if zero text layers match.

- **identifier** — Layer ID, name, or tag (string or number)
- **value** — Plain text string or label table from `ansi.create_label()`

```lua
-- Plain string: uses the layer's existing color
screen:set_label("direction", "NORTH")

-- Label with colors: uses per-character coloring
local label = ansi.create_label("[color=RED]Fire[/color] burns!")
screen:set_label("description", label)
```

### `ansi.create_label(markup, default_color?)`

Parse color markup into a label table for use with `set_label`.

- **markup** — Text with optional `[color=X]...[/color]` tags
- **default_color** — Optional default color as `{r,g,b}` table or hex string (default: `LIGHT_GRAY`)
- **Returns** — A label table with `text`, `colors`, and `default_color` fields

```lua
-- Plain text (all default color)
local plain = ansi.create_label("Hello World")

-- Color markup
local colored = ansi.create_label(
  "The [color=GREEN]forest[/color] is [color=CGA_ALT_GREEN]shimmering[/color]..."
)

-- Custom default color
local custom = ansi.create_label("Status: OK", ansi.colors.BRIGHT_GREEN)
```

#### Color Name Formats

| Format | Example | Description |
|--------|---------|-------------|
| Hex | `#FF0000`, `#F00` | RGB hex color |
| CGA name | `RED`, `BRIGHT_RED` | 16 CGA color names (matches `ansi.colors` keys) |
| CGA prefixed | `CGA_RED`, `CGA_BRIGHT_RED` | Same colors with `CGA_` prefix |
| Alternating | `CGA_ALT_RED` | Alternates dark/bright per character |

#### CGA Alternating Color Pairs

| Name | Alternates Between |
|------|-------------------|
| `CGA_ALT_BLACK` | BLACK / DARK_GRAY |
| `CGA_ALT_BLUE` | BLUE / BRIGHT_BLUE |
| `CGA_ALT_GREEN` | GREEN / BRIGHT_GREEN |
| `CGA_ALT_CYAN` | CYAN / BRIGHT_CYAN |
| `CGA_ALT_RED` | RED / BRIGHT_RED |
| `CGA_ALT_MAGENTA` | MAGENTA / BRIGHT_MAGENTA |
| `CGA_ALT_BROWN` | BROWN / YELLOW |
| `CGA_ALT_GRAY` | LIGHT_GRAY / WHITE |

Tags can be nested: `[color=BLUE]outer [color=RED]inner[/color] back to blue[/color]`

### Example: Dynamic game UI labels

```lua
local ansi = require("ansi")

local screen = ansi.load_screen("game.ansi.lua")
ansi.set_screen(screen)

local directions = {"NORTH", "EAST", "SOUTH", "WEST"}
local dir_index = 1

ansi.tick(function()
  if ansi.is_key_pressed("right") then
    dir_index = (dir_index % 4) + 1
  end

  -- Update the direction label (text layer tagged "direction")
  screen:set_label("direction", directions[dir_index])

  -- Update description with colored text
  local desc = ansi.create_label(
    "You face [color=CGA_ALT_GREEN]" .. directions[dir_index] .. "[/color]",
    ansi.colors.LIGHT_GRAY
  )
  screen:set_label("description", desc)

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

local screen = ansi.load_screen("my_animation.ansi.lua")
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
| `ansi.load_screen(path)` | Load `.ansi.lua` file into a screen object |
| `ansi.create_screen(data)` | Create screen from a data table |
| `ansi.set_screen(screen)` | Set background screen (`nil` to clear) |
| `screen:get_layers()` | Get layer info (id, name, type, visible, tags) |
| `screen:layer_on(id)` | Show layer(s) by ID, name, or tag |
| `screen:layer_off(id)` | Hide layer(s) by ID, name, or tag |
| `screen:layer_toggle(id)` | Toggle layer(s) by ID, name, or tag |
| `screen:set_label(id, val)` | Set text layer content (string or label) |
| `ansi.create_label(markup)` | Parse color markup into a label table |
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
