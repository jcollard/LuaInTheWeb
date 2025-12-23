-- canvas/path-star.lua
-- Demonstrates the path API with a multi-point star

local canvas = require("canvas")

-- Star parameters
local cx, cy = 400, 300  -- Center of canvas
local outerRadius = 120  -- Outer points
local innerRadius = 50   -- Inner points
local points = 5         -- Number of points
local rotation = 0       -- Current rotation angle

-- Draw a star with the given number of points
function drawStar(x, y, outer, inner, numPoints, angle)
  canvas.begin_path()

  local step = math.pi / numPoints  -- Angle between each point

  for i = 0, numPoints * 2 - 1 do
    local r = (i % 2 == 0) and outer or inner
    local a = angle + i * step - math.pi / 2  -- Start from top
    local px = x + r * math.cos(a)
    local py = y + r * math.sin(a)

    if i == 0 then
      canvas.move_to(px, py)
    else
      canvas.line_to(px, py)
    end
  end

  canvas.close_path()
end

function draw()
  -- Clear the screen
  canvas.clear()

  -- Gradient-like background
  canvas.set_color(20, 20, 40)
  canvas.fill_rect(0, 0, 800, 600)

  -- Animate rotation
  rotation = rotation + canvas.get_delta() * 0.5

  -- Draw the star
  drawStar(cx, cy, outerRadius, innerRadius, points, rotation)

  -- Fill with golden yellow
  canvas.set_color(255, 215, 0)
  canvas.fill()

  -- Stroke with orange outline
  canvas.set_color(255, 140, 0)
  canvas.set_line_width(2)
  canvas.stroke()

  -- Draw instruction text
  canvas.set_color(255, 255, 255)
  canvas.draw_text(10, 10, "Path API Demo: Animated Star")
  canvas.draw_text(10, 30, "A 5-pointed star using move_to and line_to in a loop")
end

function game()
  draw()
end

function main()
  canvas.set_size(800, 600)
  canvas.tick(game)
  canvas.start()
end

main()
