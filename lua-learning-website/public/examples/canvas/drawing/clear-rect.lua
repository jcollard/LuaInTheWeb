-- canvas/drawing/clear-rect.lua
-- Demonstrates: clear_rect() for erasing rectangular areas
-- Features: clear_rect, fill_rect, get_time

local canvas = require("canvas")

-- Animation state
local hole_x = 100
local hole_y = 100
local hole_speed_x = 120
local hole_speed_y = 80
local hole_width = 80
local hole_height = 60

local function draw()
  -- Draw a colorful background pattern
  canvas.set_color(50, 100, 150)
  canvas.fill_rect(0, 0, 400, 300)

  -- Draw a grid pattern
  canvas.set_color(80, 130, 180)
  for x = 0, 400, 20 do
    canvas.fill_rect(x, 0, 2, 300)
  end
  for y = 0, 300, 20 do
    canvas.fill_rect(0, y, 400, 2)
  end

  -- Draw some colored rectangles
  canvas.set_color(255, 100, 100)
  canvas.fill_rect(50, 50, 100, 80)

  canvas.set_color(100, 255, 100)
  canvas.fill_rect(200, 100, 120, 100)

  canvas.set_color(100, 100, 255)
  canvas.fill_rect(100, 180, 150, 80)

  -- Use clear_rect to "punch a hole" through everything
  -- This clears to transparent, showing whatever is behind the canvas
  canvas.clear_rect(hole_x, hole_y, hole_width, hole_height)

  -- Draw instructions
  canvas.set_color(255, 255, 255)
  canvas.draw_text(10, 20, "clear_rect() erases to transparent")
end

local function update()
  local dt = canvas.get_delta()

  -- Move the "hole" around
  hole_x = hole_x + hole_speed_x * dt
  hole_y = hole_y + hole_speed_y * dt

  -- Bounce off edges
  if hole_x < 0 or hole_x + hole_width > 400 then
    hole_speed_x = -hole_speed_x
    hole_x = math.max(0, math.min(hole_x, 400 - hole_width))
  end
  if hole_y < 0 or hole_y + hole_height > 300 then
    hole_speed_y = -hole_speed_y
    hole_y = math.max(0, math.min(hole_y, 300 - hole_height))
  end
end

local function game()
  update()
  draw()
end

canvas.set_size(400, 300)
canvas.tick(game)
canvas.start()
