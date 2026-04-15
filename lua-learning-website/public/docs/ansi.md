# ANSI Terminal Library

The `ansi` library provides a text terminal for DOS-style ANSI games and art display. The terminal defaults to 80×25 and automatically resizes when you `load_screen()` a file authored at different dimensions. Load the library with:

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

### `ansi.create_label(markup, default_color?, default_bg?)`

Parse color tag markup into a label table for use with `set_label`.

- **markup** — Text with `[color=X]...[/color]` and/or `[bg=X]...[/bg]` tags
- **default_color** — Optional default foreground as `{r,g,b}` table or hex string (default: `LIGHT_GRAY`)
- **default_bg** — Optional default background as `{r,g,b}` table or hex string
- **Returns** — A label table for use with `screen:set_label()`

```lua
-- Plain text (all default color)
local plain = ansi.create_label("Hello World")

-- Foreground color markup
local colored = ansi.create_label(
  "The [color=GREEN]forest[/color] is [color=CGA_ALT_GREEN]shimmering[/color]..."
)

-- Background color markup
local highlighted = ansi.create_label(
  "[bg=YELLOW][color=BLACK]WARNING[/color][/bg] Normal text"
)

-- Custom default color
local custom = ansi.create_label("Status: OK", ansi.colors.BRIGHT_GREEN)
```

### `ansi.create_escaped_label(text, default_fg?, default_bg?)`

Parse ANSI escape sequences into a label table for use with `set_label`. Use this instead of `create_label` when your text contains terminal escape codes.

- **text** — Text containing ANSI escape sequences (e.g., `\x1b[31m`)
- **default_fg** — Default foreground color as `{r,g,b}` or hex (default: `LIGHT_GRAY`)
- **default_bg** — Default background color as `{r,g,b}` or hex (optional)
- **Returns** — A label table for use with `screen:set_label()`

```lua
local ESC = string.char(27)

-- Standard CGA colors
local label = ansi.create_escaped_label(ESC .. "[31mRed" .. ESC .. "[32m Green" .. ESC .. "[0m Normal")

-- 24-bit RGB colors
local rgb = ansi.create_escaped_label(ESC .. "[38;2;255;128;0mOrange" .. ESC .. "[0m")

-- Combined foreground + background
local combo = ansi.create_escaped_label(ESC .. "[31;42mRed on Green" .. ESC .. "[0m")

screen:set_label("status", label)
```

Supported SGR codes:

| Code | Effect |
|------|--------|
| `0` | Reset all attributes |
| `30-37` | Standard foreground (CGA palette) |
| `38;2;R;G;B` | 24-bit RGB foreground |
| `39` | Default foreground |
| `40-47` | Standard background |
| `48;2;R;G;B` | 24-bit RGB background |
| `49` | Default background |
| `90-97` | Bright foreground |
| `100-107` | Bright background |

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

## Screen Transitions

Swipe and dither transitions reveal or hide content with cinematic effects.

### `screen:swipe_out(opts?)`

Sweep a boundary across the screen to hide content. When called without `layers`, replaces all cells with a fill color. When called with `layers`, transitions to the screen state with those layers hidden, then permanently hides them.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `duration` | number | `1` | Duration in seconds |
| `layers` | string or string[] | *none* | Layer identifier(s) to hide — ID, name, or tag. If omitted, fills entire screen. |
| `color` | `{r,g,b}` | `{0,0,0}` | Fill color (ignored when `layers` is set) |
| `char` | string | `" "` | Fill character (ignored when `layers` is set) |
| `direction` | string | `"right"` | Sweep direction (see below) |
| `on_complete` | function | *none* | Callback invoked when the transition finishes |

**Directions**: `"right"`, `"left"`, `"down"`, `"up"`, `"down-right"`, `"down-left"`, `"up-right"`, `"up-left"`

```lua
screen:swipe_out()                                           -- default: right, black, 1s
screen:swipe_out({ duration = 0.5, direction = "down" })     -- swipe down
screen:swipe_out({ color = {255, 0, 0}, direction = "left" }) -- red fill, swipe left
screen:swipe_out({ layers = "scene1", duration = 0.8 })      -- hide scene1 with swipe
screen:swipe_out({ layers = {"scene1", "ui"} })              -- hide multiple layers
screen:swipe_out({ layers = "enemy", duration = 0.5, on_complete = function()
  screen:layer_on("loot-panel")  -- safe: runs after transition commits
end })
```

### `screen:swipe_in(opts)`

Composite a preview with specified layers visible, then swipe it in. When complete, the layers are permanently toggled visible.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `layers` | string or string[] | *required* | Layer identifier(s) — ID, name, or tag. Use a table for multiple. |
| `duration` | number | `1` | Duration in seconds |
| `direction` | string | `"right"` | Sweep direction |
| `on_complete` | function | *none* | Callback invoked when the transition finishes |

```lua
screen:swipe_in({ layers = "scene2" })
screen:swipe_in({ layers = "scene2", duration = 1.5, direction = "up" })
screen:swipe_in({ layers = {"background", "characters", "ui"} })
screen:swipe_in({ layers = "enemy", direction = "up", duration = 0.5, on_complete = function()
  screen:layer_on("combat-ui")
end })
```

### `screen:dither_out(opts?)`

Randomly replace cells one-by-one to hide content (dissolve effect). When called without `layers`, dissolves to a fill color. When called with `layers`, dissolves to the screen state with those layers hidden, then permanently hides them.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `duration` | number | `1` | Duration in seconds |
| `layers` | string or string[] | *none* | Layer identifier(s) to hide — ID, name, or tag. If omitted, fills entire screen. |
| `color` | `{r,g,b}` | `{0,0,0}` | Fill color (ignored when `layers` is set) |
| `char` | string | `" "` | Fill character (ignored when `layers` is set) |
| `seed` | number | `os.time()` | Random seed for dither pattern |
| `on_complete` | function | *none* | Callback invoked when the transition finishes |

```lua
screen:dither_out()
screen:dither_out({ duration = 2, seed = 42 })
screen:dither_out({ layers = "scene1", duration = 1 })
screen:dither_out({ layers = {"scene1", "ui"}, seed = 42 })
screen:dither_out({ layers = "enemy", duration = 0.5, on_complete = function()
  screen:layer_on("loot-panel")
end })
```

### `screen:dither_in(opts)`

Randomly reveal cells one-by-one from a preview with specified layers visible. When complete, the layers are permanently toggled visible.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `layers` | string or string[] | *required* | Layer identifier(s) — ID, name, or tag. Use a table for multiple. |
| `duration` | number | `1` | Duration in seconds |
| `seed` | number | `os.time()` | Random seed for dither pattern |
| `on_complete` | function | *none* | Callback invoked when the transition finishes |

```lua
screen:dither_in({ layers = "scene2" })
screen:dither_in({ layers = {"scene2", "overlay"}, duration = 2 })
screen:dither_in({ layers = "enemy", duration = 0.5, on_complete = function()
  screen:layer_on("combat-ui")
end })
```

### `screen:is_transitioning()` / `screen:is_swiping()`

Check if any transition (swipe or dither) is currently in progress.

```lua
if not screen:is_transitioning() then
  screen:swipe_out()
end
```

### Important: Transitions snapshot the screen

When a transition starts, it captures a snapshot of the current screen state. Any `layer_on`, `layer_off`, or `set_label` calls made **in the same frame** as the transition call will be included in that snapshot, which can cause unexpected visual results (e.g., the entire screen appearing to go black).

**Use `on_complete` to safely chain layer changes after a transition:**

```lua
-- WRONG: layer_off in the same frame affects the transition's snapshot
screen:layer_off("crawling-panel")
screen:swipe_in({ layers = "enemy", duration = 0.5 })

-- RIGHT: use on_complete to change layers after the transition finishes
screen:swipe_in({ layers = "enemy", duration = 0.5, on_complete = function()
  screen:layer_off("crawling-panel")
  screen:layer_on("combat-panel")
end })
```

### Example: Scene transitions

```lua
local ansi = require("ansi")
local screen = ansi.load_screen("my_scenes.ansi.lua")
ansi.set_screen(screen)

ansi.tick(function()
  if not screen:is_transitioning() then
    if ansi.is_key_pressed("o") then
      screen:swipe_out({ duration = 0.8, direction = "right" })
    elseif ansi.is_key_pressed("h") then
      screen:swipe_out({ layers = "scene2", duration = 0.8 })  -- hide scene2
    elseif ansi.is_key_pressed("i") then
      screen:swipe_in({ layers = "scene2", duration = 0.8 })
    elseif ansi.is_key_pressed("d") then
      screen:dither_out({ duration = 1.5 })
    end
  end
  if ansi.is_key_pressed("escape") then ansi.stop() end
end)

ansi.start()
```

### Example: Chaining transitions with on_complete

```lua
-- Combat flow: swipe in enemy, then on defeat dither out and show loot
screen:swipe_in({
  layers = "enemy",
  direction = "up",
  duration = 0.5,
  on_complete = function()
    screen:layer_on("combat-ui")
  end,
})

-- Later, on defeat:
screen:dither_out({
  layers = "enemy",
  duration = 0.5,
  on_complete = function()
    screen:layer_off("combat-ui")
    screen:dither_in({ layers = "loot-panel", duration = 0.3 })
  end,
})
```

## Viewport / Pan

The viewport controls which terminal-sized window of virtual space is displayed. By default, the viewport is at position (0, 0). Use reference layers with offsets to position content beyond the visible area, then pan the viewport to reveal it. The window size matches the current screen's authored dimensions (e.g. 80×25 for the default, 120×40 for a wide screen).

### `screen:pan(opts)`

Smoothly animate the viewport from one position to another over a specified duration.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `col` | number | current | Target column offset |
| `row` | number | current | Target row offset |
| `duration` | number | 1 | Duration in seconds |
| `from_col` | number | current | Starting column offset |
| `from_row` | number | current | Starting row offset |

```lua
-- Pan from left scene to right scene over 3 seconds
screen:pan({ col = 80, duration = 3 })

-- Pan with explicit start position
screen:pan({ col = 80, row = 0, duration = 2, from_col = 0, from_row = 0 })
```

### `screen:set_viewport(col, row)`

Instantly set the viewport position (no animation).

```lua
screen:set_viewport(80, 0)  -- jump to column 80
screen:set_viewport(0, 0)   -- reset to origin
```

### `screen:is_panning()`

Check if a pan animation is currently in progress.

```lua
while screen:is_panning() do
  coroutine.yield()
end
```

### `screen:get_viewport()`

Get the current viewport position. Returns two values: column and row.

```lua
local col, row = screen:get_viewport()
```

### Example: Cinematic pan

Create a screen with two scenes positioned side-by-side using reference layers
(Scene A at offsetCol=0, Scene B at offsetCol=80), then pan between them:

```lua
local ansi = require("ansi")
local screen = ansi.load_screen("panorama.ansi.lua")
ansi.set_screen(screen)

-- Pan from scene A to scene B over 3 seconds
screen:pan({ col = 80, duration = 3 })

ansi.tick(function()
  if ansi.is_key_pressed("escape") then ansi.stop() end
end)

ansi.start()
```

Alternatively, use `set_layer_offset` to position layers at runtime without needing reference layers in the screen file:

```lua
local ansi = require("ansi")
local screen = ansi.load_screen("title.ansi.lua")
-- Position the right half at column 80
screen:set_layer_offset("title-screen-right", 80, 0)
ansi.set_screen(screen)

-- Pan from left to right over 3 seconds
screen:pan({ col = 80, duration = 3 })

ansi.tick(function()
  if ansi.is_key_pressed("escape") then ansi.stop() end
end)

ansi.start()
```

## Layer Offsets

Layer offsets let you position layers at arbitrary positions in the virtual canvas, creating scenes wider or taller than the visible terminal window. This is especially useful for panoramic scrolling with `screen:pan()`.

### `screen:set_layer_offset(identifier, col, row)`

Set the position offset of layer(s) matching an identifier. All matching layers receive the same offset. Resolves by layer ID first, then by name, then by tag.

```lua
-- Position a layer 80 columns to the right
screen:set_layer_offset("scene-right", 80, 0)

-- Position a layer below the visible area
screen:set_layer_offset("scene-bottom", 0, 25)

-- Reset a layer to its default position
screen:set_layer_offset("scene-right", 0, 0)
```

### `screen:get_layer_offset(identifier)`

Get the position offset of the first layer matching an identifier. Returns two values: column and row.

```lua
local col, row = screen:get_layer_offset("scene-right")
```

## Terminal Dimensions

The terminal starts at 80 columns × 25 rows and automatically resizes when you call `ansi.set_screen()` on a screen authored at different dimensions. Programs that only use `ansi.print()` without loading a screen run at the default 80×25.

### `ansi.width()` and `ansi.height()`

Return the current terminal dimensions in characters. These query the live terminal size and update whenever a screen with different dimensions becomes active.

```lua
print("Terminal is " .. ansi.width() .. "×" .. ansi.height())
```

### `ansi.COLS` and `ansi.ROWS`

Live values exposed via a metatable — reading them is equivalent to calling `ansi.width()` / `ansi.height()`. Existing programs that do `for c = 1, ansi.COLS do` continue to work and automatically adapt when a differently-sized screen is loaded.

```lua
-- Draw a horizontal line across the full terminal width
for c = 1, ansi.COLS do
  ansi.set_cursor(1, c); ansi.print("-")
end
```

**Caching caveat:** Do not cache `ansi.COLS` / `ansi.ROWS` in a local if your program later loads a differently-sized screen. The field is re-read on every access, so caching into `local W = ansi.COLS` captures the value *at that instant* and becomes stale after a resize. Read the field fresh (or call `ansi.width()`) inside any loop that runs across screen transitions.

## CRT Shader Effect

Apply a retro CRT monitor post-processing effect to the terminal output using a WebGL shader. The effect can be enabled before or after `ansi.start()`, and parameters can be adjusted live from within the `tick()` loop.

### `ansi.crt(config)`

Enable or update the CRT shader with the given configuration. When called while the shader is already enabled, the new values are merged into the existing config (partial updates are supported).

- **config** — A table of CRT parameters (all optional; omitted keys keep their current values)

```lua
-- Enable CRT with custom settings
ansi.crt({
  scanlineIntensity = 0.33,
  brightness = 1.15,
  curvature = 0.05,
})

-- Later, update just one parameter
ansi.crt({ bloomIntensity = 0.8 })
```

### CRT Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `smoothing` | boolean | — | `true` | Texture filtering: `true` = LINEAR (smooth), `false` = NEAREST (pixelated) |
| `scanlineIntensity` | number | 0–1 | 0.33 | Scanline darkness |
| `scanlineCount` | number | 50–1200 | 150 | Number of horizontal scanlines |
| `adaptiveIntensity` | number | 0–1 | 1 | Scanline adaptive modulation (reduces scanlines on bright pixels) |
| `brightness` | number | 0.6–1.8 | 1.15 | Brightness multiplier |
| `contrast` | number | 0.5–1.5 | 1 | Contrast adjustment |
| `saturation` | number | 0–2 | 1 | Color saturation |
| `bloomIntensity` | number | 0–1.5 | 0.25 | Bright pixel glow strength |
| `bloomThreshold` | number | 0–1 | 0 | Luminance threshold for bloom |
| `rgbShift` | number | 0–1 | 1 | Chromatic aberration (RGB sub-pixel shift) |
| `vignetteStrength` | number | 0–2 | 0.22 | Edge darkening |
| `curvature` | number | 0–0.5 | 0.05 | Barrel distortion (screen curvature) |
| `flickerStrength` | number | 0–0.15 | 0 | Temporal brightness flicker |
| `phosphor` | number | 0–1 | 0 | RGB phosphor mask strength |

### Example: Enable CRT before start

```lua
local ansi = require("ansi")

ansi.crt({
  scanlineIntensity = 0.4,
  brightness = 1.2,
  curvature = 0.08,
  bloomIntensity = 0.5,
})

ansi.tick(function()
  ansi.clear()
  ansi.set_cursor(1, 1)
  ansi.foreground(85, 255, 85)
  ansi.print("CRT effect active!")
end)

ansi.start()
```

### Example: Live parameter adjustment

```lua
local ansi = require("ansi")

local bloom = 0.25
ansi.crt({ bloomIntensity = bloom })

ansi.tick(function()
  if ansi.is_key_pressed("up") then
    bloom = math.min(bloom + 0.05, 1.5)
    ansi.crt({ bloomIntensity = bloom })
  end
  if ansi.is_key_pressed("down") then
    bloom = math.max(bloom - 0.05, 0)
    ansi.crt({ bloomIntensity = bloom })
  end

  ansi.clear()
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 255, 255)
  ansi.print(string.format("Bloom: %.2f (UP/DOWN to adjust)", bloom))
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
| `ansi.create_label(markup)` | Parse `[color=X]`/`[bg=X]` markup into a label table |
| `ansi.create_escaped_label(text)` | Parse ANSI escape sequences into a label table |
| `screen:play()` | Start/resume animation playback |
| `screen:pause()` | Pause animation playback |
| `screen:is_playing()` | Check if animation is playing |
| `screen:swipe_out(opts?)` | Swipe out to fill color or hide layers (8 directions, `on_complete`) |
| `screen:swipe_in(opts)` | Swipe in preview layers (8 directions, `on_complete`) |
| `screen:dither_out(opts?)` | Dither out to fill color or hide layers (dissolve, `on_complete`) |
| `screen:dither_in(opts)` | Dither in preview layers (dissolve, `on_complete`) |
| `screen:is_transitioning()` | Check if any transition is active |
| `screen:pan(opts)` | Animate viewport pan over time |
| `screen:set_viewport(col, row)` | Set viewport position instantly |
| `screen:is_panning()` | Check if pan animation is active |
| `screen:get_viewport()` | Get current viewport position (col, row) |
| `screen:set_layer_offset(id, col, row)` | Set layer position offset in virtual canvas |
| `screen:get_layer_offset(id)` | Get layer position offset (col, row) |
| `ansi.crt(config)` | Enable/update CRT shader effect |
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
| `ansi.get_mouse_col()` | Mouse column (1–`ansi.COLS`) |
| `ansi.get_mouse_row()` | Mouse row (1–`ansi.ROWS`) |
| `ansi.width()` / `ansi.COLS` | Current terminal width in columns |
| `ansi.height()` / `ansi.ROWS` | Current terminal height in rows |
