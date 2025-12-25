-- canvas/path/arc-smiley.lua
-- Demonstrates the arc API with a smiley face

local canvas = require("canvas")

-- Face settings
local cx, cy = 400, 300  -- Center of face
local faceRadius = 150
local eyeRadius = 20
local time = 0

function draw()
  -- Clear the screen
  canvas.clear()

  -- Sky blue background
  canvas.set_color(135, 206, 235)
  canvas.fill_rect(0, 0, 800, 600)

  -- Draw the face (yellow circle)
  canvas.set_color("#FFD93D")
  canvas.begin_path()
  canvas.arc(cx, cy, faceRadius, 0, math.pi * 2)
  canvas.fill()

  -- Face outline
  canvas.set_color("#E6B800")
  canvas.set_line_width(4)
  canvas.stroke()

  -- Left eye
  canvas.set_color(50, 50, 50)
  canvas.begin_path()
  canvas.arc(cx - 50, cy - 30, eyeRadius, 0, math.pi * 2)
  canvas.fill()

  -- Right eye
  canvas.begin_path()
  canvas.arc(cx + 50, cy - 30, eyeRadius, 0, math.pi * 2)
  canvas.fill()

  -- Eye shine (small white circles)
  canvas.set_color(255, 255, 255)
  canvas.begin_path()
  canvas.arc(cx - 55, cy - 35, 6, 0, math.pi * 2)
  canvas.fill()
  canvas.begin_path()
  canvas.arc(cx + 45, cy - 35, 6, 0, math.pi * 2)
  canvas.fill()

  -- Animated smile - changes between smile and bigger smile
  local smileAmount = 0.8 + math.sin(time * 2) * 0.2
  local smileStartAngle = math.pi * 0.15
  local smileEndAngle = math.pi * (1 - 0.15)

  canvas.set_color(50, 50, 50)
  canvas.set_line_width(6)
  canvas.begin_path()
  canvas.arc(cx, cy + 10, 80 * smileAmount, smileStartAngle, smileEndAngle)
  canvas.stroke()

  -- Rosy cheeks
  canvas.set_color(255, 150, 150, 150)  -- Semi-transparent pink
  canvas.begin_path()
  canvas.arc(cx - 100, cy + 30, 25, 0, math.pi * 2)
  canvas.fill()
  canvas.begin_path()
  canvas.arc(cx + 100, cy + 30, 25, 0, math.pi * 2)
  canvas.fill()

  -- Draw title
  canvas.set_color(50, 50, 100)
  canvas.draw_text(10, 10, "Arc API Demo: Smiley Face")
  canvas.draw_text(10, 30, "Uses: arc() for circles and curved smile")

  -- Update time for animation
  time = time + canvas.get_delta()
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
