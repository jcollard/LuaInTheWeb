-- canvas/transforms/zoom-effect.lua
-- Demonstrates: scale() for zoom in/out effects
-- Features: scale, translate, save, restore, is_key_down, is_key_pressed
--
-- Press UP/DOWN arrows to zoom in/out
-- Press R to reset zoom
-- The scene is drawn at a fixed size, then scaled

local canvas = require('canvas')

local zoom = 1.0
local min_zoom = 0.25
local max_zoom = 4.0
local zoom_speed = 1.5

-- Draw a simple scene
local function draw_scene()
  -- Ground
  canvas.set_color(60, 120, 60)
  canvas.fill_rect(-200, 50, 400, 150)

  -- Sky
  canvas.set_color(100, 150, 255)
  canvas.fill_rect(-200, -150, 400, 200)

  -- Sun
  canvas.set_color(255, 220, 100)
  canvas.fill_circle(120, -80, 30)

  -- House body
  canvas.set_color(180, 100, 80)
  canvas.fill_rect(-60, -20, 80, 70)

  -- Roof
  canvas.set_color(120, 60, 40)
  canvas.draw_line(-70, -20, -20, -60)
  canvas.draw_line(-20, -60, 30, -20)
  canvas.set_line_width(5)
  canvas.draw_line(-70, -20, 30, -20)

  -- Door
  canvas.set_color(80, 50, 30)
  canvas.fill_rect(-35, 10, 25, 40)

  -- Window
  canvas.set_color(150, 200, 255)
  canvas.fill_rect(-5, -5, 20, 20)
  canvas.set_color(80, 50, 30)
  canvas.set_line_width(2)
  canvas.draw_rect(-5, -5, 20, 20)
  canvas.draw_line(5, -5, 5, 15)
  canvas.draw_line(-5, 5, 15, 5)

  -- Tree
  canvas.set_color(100, 70, 40)
  canvas.fill_rect(80, -10, 15, 60)
  canvas.set_color(40, 150, 40)
  canvas.fill_circle(87, -30, 35)
end

local function user_input()
  local dt = canvas.get_delta()

  -- Handle zoom controls
  if canvas.is_key_down('ArrowUp') or canvas.is_key_down('w') then
    zoom = zoom + zoom_speed * dt
  end
  if canvas.is_key_down('ArrowDown') or canvas.is_key_down('s') then
    zoom = zoom - zoom_speed * dt
  end
  if canvas.is_key_pressed('r') then
    zoom = 1.0
  end
end

local function update()
  -- Clamp zoom
  if zoom < min_zoom then zoom = min_zoom end
  if zoom > max_zoom then zoom = max_zoom end
end

local function draw()
  canvas.clear()

  -- Apply zoom transformation
  canvas.save()

  -- Translate to center, then scale
  canvas.translate(300, 200)
  canvas.scale(zoom, zoom)

  -- Draw the scene (centered at origin)
  draw_scene()

  canvas.restore()

  -- Draw UI (not affected by zoom)
  canvas.set_color(200, 200, 200)
  canvas.draw_text(10, 20, "Zoom Effect using scale()")
  canvas.draw_text(10, 40, string.format("Zoom: %.2fx", zoom))
  canvas.draw_text(10, 370, "UP/DOWN: Zoom | R: Reset")
end

local function game()
  user_input()
  update()
  draw()
end

canvas.set_size(600, 400)
canvas.tick(game)
canvas.start()
