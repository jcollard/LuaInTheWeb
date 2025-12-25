-- canvas/rotating_square.lua
-- Demonstrates: Canvas transformations with translate() and rotate()
-- Features: translate, rotate, save, restore, fill_rect, fill_circle
--
-- The square rotates around its center by:
-- 1. Translating to the center of the canvas
-- 2. Rotating by an angle that increases over time
-- 3. Drawing the square centered at the origin

local canvas = require('canvas')

local angle = 0

local function update()
  -- Update rotation angle (2 radians per second)
  angle = angle + canvas.get_delta() * 2
end

local function draw()
  canvas.clear()

  -- Save the current transformation state
  canvas.save()

  -- Move origin to center of canvas
  canvas.translate(200, 200)

  -- Rotate around the new origin
  canvas.rotate(angle)

  -- Draw a square centered at origin
  canvas.set_color(255, 100, 50)
  canvas.fill_rect(-50, -50, 100, 100)

  -- Draw center point
  canvas.set_color(255, 255, 255)
  canvas.fill_circle(0, 0, 5)

  -- Restore transformation (back to normal)
  canvas.restore()

  -- Draw instructions (not affected by transforms after restore)
  canvas.set_color(200, 200, 200)
  canvas.draw_text(10, 20, "Rotating Square")
  canvas.draw_text(10, 40, "Using translate() and rotate()")
end

local function game()
  update()
  draw()
end

canvas.set_size(400, 400)
canvas.tick(game)
canvas.start()
