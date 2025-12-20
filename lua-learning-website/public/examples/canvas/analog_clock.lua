-- Analog Clock Example
-- Demonstrates practical use of translate() and rotate()
--
-- Uses transformations to draw clock hands at the correct angles.
-- Each hand is drawn pointing up (12 o'clock) and rotated to position.

local canvas = require('canvas')

canvas.set_size(400, 400)

local center_x = 200
local center_y = 200
local radius = 150

-- Draw a clock hand
local function draw_hand(length, width, color)
  canvas.set_color(color[1], color[2], color[3])
  canvas.fill_rect(-width/2, -length, width, length)
end

canvas.tick(function()
  canvas.clear()

  local time = canvas.get_time()

  -- Calculate hand angles (in radians)
  -- Multiply by different speeds to simulate clock movement
  local seconds_angle = (time % 60) / 60 * math.pi * 2
  local minutes_angle = (time / 60 % 60) / 60 * math.pi * 2
  local hours_angle = (time / 3600 % 12) / 12 * math.pi * 2

  -- Draw clock face
  canvas.set_color(40, 40, 50)
  canvas.fill_circle(center_x, center_y, radius)
  canvas.set_color(80, 80, 100)
  canvas.set_line_width(4)
  canvas.draw_circle(center_x, center_y, radius)

  -- Draw hour markers
  for i = 0, 11 do
    canvas.save()
    canvas.translate(center_x, center_y)
    canvas.rotate(i / 12 * math.pi * 2)
    canvas.set_color(200, 200, 200)
    if i % 3 == 0 then
      canvas.fill_rect(-4, -radius + 10, 8, 20)  -- Large marker at 12, 3, 6, 9
    else
      canvas.fill_rect(-2, -radius + 15, 4, 10)  -- Small marker
    end
    canvas.restore()
  end

  -- Draw hour hand
  canvas.save()
  canvas.translate(center_x, center_y)
  canvas.rotate(hours_angle)
  draw_hand(80, 8, {255, 255, 255})
  canvas.restore()

  -- Draw minute hand
  canvas.save()
  canvas.translate(center_x, center_y)
  canvas.rotate(minutes_angle)
  draw_hand(110, 6, {200, 200, 220})
  canvas.restore()

  -- Draw second hand
  canvas.save()
  canvas.translate(center_x, center_y)
  canvas.rotate(seconds_angle)
  draw_hand(130, 2, {255, 80, 80})
  canvas.restore()

  -- Draw center dot
  canvas.set_color(255, 255, 255)
  canvas.fill_circle(center_x, center_y, 8)

  -- Draw title
  canvas.set_color(200, 200, 200)
  canvas.draw_text(10, 20, "Analog Clock")
  canvas.draw_text(10, 40, "Using translate() and rotate()")
end)

canvas.start()
