-- canvas/bezier-curves.lua
-- Demonstrates cubic bezier curves for smooth shapes

local canvas = require("canvas")

function draw()
  -- Clear and draw background
  canvas.clear()
  canvas.set_color(30, 30, 40)
  canvas.fill_rect(0, 0, 400, 400)

  -- Draw an S-curve
  canvas.set_color(255, 100, 100)
  canvas.set_line_width(4)
  canvas.begin_path()
  canvas.move_to(50, 200)
  canvas.bezier_curve_to(150, 50, 250, 350, 350, 200)
  canvas.stroke()

  -- Draw control point visualization
  canvas.set_color(100, 100, 255, 150)
  canvas.set_line_width(1)
  -- Lines to control points
  canvas.begin_path()
  canvas.move_to(50, 200)
  canvas.line_to(150, 50)
  canvas.move_to(350, 200)
  canvas.line_to(250, 350)
  canvas.stroke()

  -- Control points as circles
  canvas.set_color(100, 200, 255)
  canvas.fill_circle(150, 50, 6)
  canvas.fill_circle(250, 350, 6)

  -- End points
  canvas.set_color(255, 255, 100)
  canvas.fill_circle(50, 200, 6)
  canvas.fill_circle(350, 200, 6)

  -- Draw a smooth wave using multiple bezier curves
  canvas.set_color(100, 255, 150)
  canvas.set_line_width(3)
  canvas.begin_path()
  canvas.move_to(20, 320)
  canvas.bezier_curve_to(70, 280, 110, 360, 160, 320)
  canvas.bezier_curve_to(210, 280, 250, 360, 300, 320)
  canvas.bezier_curve_to(350, 280, 370, 340, 380, 320)
  canvas.stroke()

  -- Labels
  canvas.set_color(255, 255, 255)
  canvas.draw_text(50, 20, "Cubic Bezier Curves")
  canvas.set_color(200, 200, 200)
  canvas.draw_text(50, 380, "Yellow = endpoints, Blue = control points")
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
