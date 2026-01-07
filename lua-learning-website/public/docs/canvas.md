# Canvas Library

The canvas library provides functions for 2D graphics rendering, input handling, and game loop management. Create games, animations, and interactive visualizations with a simple, Lua-friendly API.

**Note**: The canvas API is only available in canvas mode.

## Loading the Library

```lua
local canvas = require('canvas')
```

## Quick Start

```lua
local canvas = require('canvas')

-- Set canvas size
canvas.set_size(400, 300)

-- Game state
local x, y = 200, 150
local speed = 100

-- Handle input
local function user_input()
  local dt = canvas.get_delta()
  if canvas.is_key_down(canvas.keys.LEFT) then x = x - speed * dt end
  if canvas.is_key_down(canvas.keys.RIGHT) then x = x + speed * dt end
  if canvas.is_key_down(canvas.keys.UP) then y = y - speed * dt end
  if canvas.is_key_down(canvas.keys.DOWN) then y = y + speed * dt end
end

-- Update game state
local function update()
  -- Keep player in bounds
  x = math.max(25, math.min(canvas.get_width() - 25, x))
  y = math.max(25, math.min(canvas.get_height() - 25, y))
end

-- Render the game
local function draw()
  canvas.clear()
  canvas.set_color(255, 100, 0)
  canvas.fill_circle(x, y, 25)
end

-- Main game loop
local function game()
  user_input()
  update()
  draw()
end

-- Register and start
canvas.tick(game)
canvas.start()
```

## Documentation

### Core

- [**Lifecycle & Game Loop**](canvas/lifecycle.md) - `start()`, `stop()`, `tick()`, timing functions
- [**Drawing Basics**](canvas/drawing.md) - Shapes, colors, lines, simple text

### Advanced Drawing

- [**Path API**](canvas/path.md) - Complex shapes with `begin_path()`, curves, arcs, ellipses, rounded rectangles, clipping
- [**Styling**](canvas/styling.md) - Line styles, gradients, patterns, shadows, compositing/blend modes

### Text & Assets

- [**Text Rendering**](canvas/text.md) - Text alignment, font styling, `draw_label()` with word wrap
- [**Images & Assets**](canvas/assets.md) - Loading and drawing images, custom fonts

### Input

- [**Keyboard, Mouse & Gamepad**](canvas/input.md) - Input handling, key constants, mouse position, gamepad support

### Audio

- [**Audio**](canvas/audio.md) - Sound effects, music playback, audio channels

### Advanced

- [**Transformations**](canvas/transforms.md) - `translate()`, `rotate()`, `scale()`, `save()`/`restore()`
- [**Hit Testing**](canvas/hit-testing.md) - Detect clicks on shapes with `is_point_in_path()`
- [**Pixel Manipulation**](canvas/pixels.md) - Direct pixel access with `ImageData`

## API Reference

### Canvas Lifecycle
| Function | Description |
|----------|-------------|
| `canvas.start()` | Start the canvas and run the game loop |
| `canvas.stop()` | Stop the canvas and return control |
| `canvas.tick(callback)` | Register the frame callback function |

### Configuration
| Function | Description |
|----------|-------------|
| `canvas.set_size(w, h)` | Set canvas dimensions |
| `canvas.get_width()` | Get canvas width |
| `canvas.get_height()` | Get canvas height |

### Drawing
| Function | Description |
|----------|-------------|
| `canvas.clear()` | Clear the canvas |
| `canvas.clear_rect(x, y, w, h)` | Clear a rectangular area to transparent |
| `canvas.set_color(r, g, b, a?)` | Set drawing color (RGBA or hex) |
| `canvas.set_line_width(width)` | Set stroke width |
| `canvas.draw_rect(x, y, w, h)` | Draw rectangle outline |
| `canvas.fill_rect(x, y, w, h)` | Draw filled rectangle |
| `canvas.draw_circle(x, y, r)` | Draw circle outline |
| `canvas.fill_circle(x, y, r)` | Draw filled circle |
| `canvas.draw_line(x1, y1, x2, y2)` | Draw a line |
| `canvas.draw_text(x, y, text)` | Draw filled text |
| `canvas.stroke_text(x, y, text)` | Draw text outline (stroke only) |

### Path API
| Function | Description |
|----------|-------------|
| `canvas.begin_path()` | Start a new path |
| `canvas.close_path()` | Close the path |
| `canvas.move_to(x, y)` | Move without drawing |
| `canvas.line_to(x, y)` | Draw line to point |
| `canvas.arc(x, y, r, start, end)` | Draw an arc |
| `canvas.bezier_curve_to(...)` | Draw cubic bezier |
| `canvas.ellipse(x, y, rx, ry, ...)` | Draw ellipse |
| `canvas.round_rect(x, y, w, h, r)` | Draw rounded rectangle |
| `canvas.rect(x, y, w, h)` | Add rectangle to path |
| `canvas.fill(path?)` | Fill the current path or a Path2D object |
| `canvas.stroke(path?)` | Stroke the current path or a Path2D object |
| `canvas.clip(path?)` | Clip to current path or a Path2D object |

### Path2D (Reusable Paths)
| Function | Description |
|----------|-------------|
| `canvas.create_path()` | Create empty Path2D object |
| `canvas.create_path(svg)` | Create Path2D from SVG path string |
| `canvas.create_path(path)` | Clone an existing Path2D |
| `path:move_to(x, y)` | Move to point (chainable) |
| `path:line_to(x, y)` | Line to point (chainable) |
| `path:arc(x, y, r, start, end)` | Add arc (chainable) |
| `path:rect(x, y, w, h)` | Add rectangle (chainable) |
| `path:round_rect(x, y, w, h, r)` | Add rounded rectangle (chainable) |
| `path:close_path()` | Close the path (chainable) |
| `path:dispose()` | Free path memory |

### Styling
| Function | Description |
|----------|-------------|
| `canvas.create_linear_gradient(...)` | Create linear gradient |
| `canvas.create_radial_gradient(...)` | Create radial gradient |
| `canvas.create_conic_gradient(...)` | Create conic gradient |
| `canvas.create_pattern(name, repeat)` | Create image pattern |
| `canvas.set_fill_style(style)` | Set fill color/gradient/pattern |
| `canvas.set_stroke_style(style)` | Set stroke color/gradient/pattern |
| `canvas.set_shadow(color, blur, x, y)` | Set shadow properties |
| `canvas.clear_shadow()` | Remove shadow |
| `canvas.set_global_alpha(alpha)` | Set transparency |
| `canvas.set_composite_operation(op)` | Set blend mode |
| `canvas.set_image_smoothing(enabled)` | Enable/disable image anti-aliasing (false for pixel art) |
| `canvas.set_filter(filter)` | Apply CSS filter effects (blur, brightness, contrast, etc.) |

### Text
| Function | Description |
|----------|-------------|
| `canvas.set_font_size(size)` | Set font size |
| `canvas.set_font_family(family)` | Set font family |
| `canvas.get_text_width(text)` | Measure text width |
| `canvas.get_text_metrics(text)` | Get detailed text metrics (width, height, bounding box) |
| `canvas.set_text_align(align)` | Set horizontal alignment |
| `canvas.set_text_baseline(baseline)` | Set vertical alignment |
| `canvas.set_direction(dir)` | Set text direction ("ltr", "rtl", "inherit") |
| `canvas.draw_text(x, y, text, opts?)` | Draw filled text (opts: font_size, font_family, max_width) |
| `canvas.stroke_text(x, y, text, opts?)` | Draw text outline (opts: font_size, font_family, max_width) |
| `canvas.draw_label(x, y, w, h, text, opts)` | Draw text in box |

### Timing
| Function | Description |
|----------|-------------|
| `canvas.get_delta()` | Time since last frame (seconds) |
| `canvas.get_time()` | Total elapsed time (seconds) |

### Input
| Function | Description |
|----------|-------------|
| `canvas.is_key_down(key)` | Check if key is held |
| `canvas.is_key_pressed(key)` | Check if key was just pressed |
| `canvas.get_mouse_x()` | Get mouse X position |
| `canvas.get_mouse_y()` | Get mouse Y position |
| `canvas.is_mouse_down(button)` | Check if mouse button is held |
| `canvas.is_mouse_pressed(button)` | Check if button was just pressed |
| `canvas.get_gamepad_count()` | Get number of connected gamepads |
| `canvas.is_gamepad_connected(index)` | Check if gamepad at index is connected |
| `canvas.get_gamepad_button(pad, btn)` | Get button value (0.0-1.0) |
| `canvas.is_gamepad_button_pressed(pad, btn)` | Check if button was just pressed |
| `canvas.get_gamepad_axis(pad, axis)` | Get analog axis value (-1.0 to 1.0) |

### Transformations
| Function | Description |
|----------|-------------|
| `canvas.translate(dx, dy)` | Move origin |
| `canvas.rotate(angle)` | Rotate (radians) |
| `canvas.scale(sx, sy)` | Scale |
| `canvas.save()` | Save transform state |
| `canvas.restore()` | Restore transform state |
| `canvas.reset_transform()` | Reset to identity |

### Assets
| Function | Description |
|----------|-------------|
| `canvas.assets.image(name, path)` | Register image |
| `canvas.assets.font(name, path)` | Register font |
| `canvas.draw_image(name, x, y, w?, h?, sx?, sy?, sw?, sh?)` | Draw image (with optional source cropping for sprite sheets) |

### Hit Testing
| Function | Description |
|----------|-------------|
| `canvas.is_point_in_path(x, y)` | Check if point is in path |
| `canvas.is_point_in_stroke(x, y)` | Check if point is on stroke |

### Pixel Manipulation
| Function | Description |
|----------|-------------|
| `canvas.create_image_data(w, h)` | Create empty pixel buffer |
| `canvas.get_image_data(x, y, w, h)` | Read pixels from canvas |
| `canvas.put_image_data(data, x, y, opts?)` | Write pixels to canvas (opts: dirty_x, dirty_y, dirty_width, dirty_height) |
| `canvas.clone_image_data(data)` | Create independent copy of ImageData |
| `canvas.capture(opts?)` | Capture canvas as data URL (opts: format, quality) |

### Audio - Sound Effects
| Function | Description |
|----------|-------------|
| `canvas.play_sound(name, volume?)` | Play a sound effect (can overlap) |
| `canvas.get_sound_duration(name)` | Get sound duration in seconds |

### Audio - Music
| Function | Description |
|----------|-------------|
| `canvas.play_music(name, opts?)` | Play background music (opts: volume, loop) |
| `canvas.stop_music()` | Stop music playback |
| `canvas.pause_music()` | Pause music |
| `canvas.resume_music()` | Resume paused music |
| `canvas.set_music_volume(volume)` | Set music volume (0-1) |
| `canvas.is_music_playing()` | Check if music is playing |
| `canvas.get_music_time()` | Get playback position in seconds |
| `canvas.get_music_duration()` | Get music duration in seconds |

### Audio - Global Control
| Function | Description |
|----------|-------------|
| `canvas.set_master_volume(volume)` | Set master volume (0-1) |
| `canvas.get_master_volume()` | Get master volume |
| `canvas.mute()` | Mute all audio |
| `canvas.unmute()` | Unmute all audio |
| `canvas.is_muted()` | Check if audio is muted |

### Audio - Channels (Advanced)
| Function | Description |
|----------|-------------|
| `canvas.channel_create(name)` | Create named audio channel |
| `canvas.channel_destroy(name)` | Destroy channel |
| `canvas.channel_play(ch, audio, opts?)` | Play on channel (opts: volume, loop) |
| `canvas.channel_stop(ch)` | Stop channel |
| `canvas.channel_pause(ch)` | Pause channel |
| `canvas.channel_resume(ch)` | Resume channel |
| `canvas.channel_set_volume(ch, vol)` | Set channel volume |
| `canvas.channel_get_volume(ch)` | Get channel volume |
| `canvas.channel_fade_to(ch, vol, dur)` | Fade channel over duration |
| `canvas.channel_is_playing(ch)` | Check if channel is playing |
| `canvas.channel_is_fading(ch)` | Check if channel is fading |

## Examples

See the [examples directory](https://github.com/jcollard/LuaInTheWeb/tree/main/lua-learning-website/public/examples/canvas) for complete working examples:

- **Path API**: Triangles, stars, houses, pie charts, smileys
- **Curves**: Bezier curves, quadratic curves
- **Styling**: Gradients, patterns, shadows, compositing
- **Text**: Alignment, word wrap, game HUDs
- **Interaction**: Hit testing, clickable buttons
- **Effects**: Pixel manipulation, filters
