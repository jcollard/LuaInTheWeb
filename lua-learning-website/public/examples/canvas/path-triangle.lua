-- canvas/path-triangle.lua
-- Demonstrates the path API with a simple triangle

local canvas = require("canvas")

-- Triangle position and size
local cx, cy = 400, 300  -- Center of canvas
local size = 100         -- Triangle size

function draw()
  -- Clear the screen
  canvas.clear()

  -- Dark background
  canvas.set_color(30, 30, 50)
  canvas.fill_rect(0, 0, 800, 600)

  -- Draw a filled triangle using the path API
  canvas.begin_path()
  canvas.move_to(cx, cy - size)           -- Top vertex
  canvas.line_to(cx - size, cy + size/2)  -- Bottom-left vertex
  canvas.line_to(cx + size, cy + size/2)  -- Bottom-right vertex
  canvas.close_path()                     -- Close the path back to start

  -- Fill with a nice blue
  canvas.set_color(100, 150, 255)
  canvas.fill()

  -- Stroke with a darker blue outline
  canvas.set_color(50, 100, 200)
  canvas.set_line_width(3)
  canvas.stroke()

  -- Draw instruction text
  canvas.set_color(255, 255, 255)
  canvas.draw_text(10, 10, "Path API Demo: Triangle")
  canvas.draw_text(10, 30, "Uses: begin_path, move_to, line_to, close_path, fill, stroke")
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
