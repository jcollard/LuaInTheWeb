-- canvas/path/quadratic-curves.lua
-- Demonstrates quadratic bezier curves with single control point

local canvas = require("canvas")

function draw()
  -- Clear and draw background
  canvas.clear()
  canvas.set_color(30, 30, 40)
  canvas.fill_rect(0, 0, 400, 400)

  -- Draw a simple arc using quadratic curve
  canvas.set_color(255, 150, 50)
  canvas.set_line_width(4)
  canvas.begin_path()
  canvas.move_to(50, 200)
  canvas.quadratic_curve_to(200, 50, 350, 200)
  canvas.stroke()

  -- Draw control point visualization
  canvas.set_color(100, 100, 255, 150)
  canvas.set_line_width(1)
  canvas.begin_path()
  canvas.move_to(50, 200)
  canvas.line_to(200, 50)
  canvas.line_to(350, 200)
  canvas.stroke()

  -- Control point
  canvas.set_color(100, 200, 255)
  canvas.fill_circle(200, 50, 6)

  -- End points
  canvas.set_color(255, 255, 100)
  canvas.fill_circle(50, 200, 6)
  canvas.fill_circle(350, 200, 6)

  -- Draw a speech bubble tail using quadratic curve
  canvas.set_color(255, 255, 255)
  canvas.set_line_width(2)

  -- Bubble body
  canvas.begin_path()
  canvas.move_to(100, 280)
  canvas.line_to(300, 280)
  canvas.line_to(300, 350)
  -- Tail using quadratic curve
  canvas.quadratic_curve_to(200, 350, 180, 380)
  canvas.quadratic_curve_to(220, 350, 100, 350)
  canvas.line_to(100, 280)
  canvas.close_path()
  canvas.stroke()

  -- Bubble text
  canvas.set_color(200, 200, 200)
  canvas.draw_text(120, 305, "Speech bubble")
  canvas.draw_text(120, 325, "with curved tail")

  -- Labels
  canvas.set_color(255, 255, 255)
  canvas.draw_text(50, 20, "Quadratic Bezier Curves")
  canvas.set_color(200, 200, 200)
  canvas.draw_text(50, 380, "Uses single control point")
end

function game()
  draw()
end

function main()
  canvas.set_size(400, 400)
  canvas.tick(game)
  canvas.start()
end

main()
