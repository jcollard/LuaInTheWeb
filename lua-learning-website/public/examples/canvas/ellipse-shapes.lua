-- Ellipse Shapes Demo
-- Demonstrates the canvas.ellipse() function for drawing ovals and partial arcs

local canvas = require('canvas')

canvas.set_size(600, 500)

canvas.tick(function()
  canvas.clear()

  -- Title
  canvas.set_color("#FFFFFF")
  canvas.set_font_size(24)
  canvas.draw_text(20, 20, "Ellipse Shapes Demo")
  canvas.set_font_size(14)
  canvas.draw_text(20, 50, "canvas.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle)")

  -- 1. Basic horizontal ellipse (oval)
  canvas.begin_path()
  canvas.ellipse(100, 150, 70, 40)  -- Wide oval
  canvas.set_color("#FF6B6B")
  canvas.fill()
  canvas.set_color("#FFFFFF")
  canvas.set_font_size(12)
  canvas.draw_text(40, 200, "Wide oval (70x40)")

  -- 2. Vertical ellipse
  canvas.begin_path()
  canvas.ellipse(250, 150, 35, 60)  -- Tall oval
  canvas.set_color("#4ECDC4")
  canvas.fill()
  canvas.draw_text(210, 220, "Tall oval (35x60)")

  -- 3. Rotated ellipse (45 degrees)
  canvas.begin_path()
  canvas.ellipse(400, 150, 60, 30, math.pi / 4)  -- Rotated 45 degrees
  canvas.set_color("#A8E6CF")
  canvas.fill()
  canvas.draw_text(350, 200, "Rotated 45 deg")

  -- 4. Perfect circle (radiusX == radiusY)
  canvas.begin_path()
  canvas.ellipse(530, 150, 40, 40)  -- Equal radii = circle
  canvas.set_color("#FFD93D")
  canvas.fill()
  canvas.draw_text(490, 200, "Circle (40x40)")

  -- 5. Partial ellipse arc
  canvas.begin_path()
  canvas.ellipse(100, 320, 50, 30, 0, 0, math.pi)  -- Half ellipse (0 to PI)
  canvas.set_color("#C9B1FF")
  canvas.fill()
  canvas.draw_text(50, 370, "Half ellipse (0 to PI)")

  -- 6. Quarter ellipse
  canvas.begin_path()
  canvas.ellipse(250, 320, 50, 30, 0, 0, math.pi / 2)  -- Quarter ellipse
  canvas.close_path()
  canvas.set_color("#FF9F43")
  canvas.fill()
  canvas.draw_text(200, 370, "Quarter (0 to PI/2)")

  -- 7. Stroked ellipse with thick line
  canvas.begin_path()
  canvas.ellipse(400, 320, 55, 35)
  canvas.set_line_width(4)
  canvas.set_color("#00CEC9")
  canvas.stroke()
  canvas.draw_text(350, 370, "Stroked ellipse")

  -- 8. Face using ellipses (fun example)
  -- Head
  canvas.begin_path()
  canvas.ellipse(300, 450, 60, 50)
  canvas.set_color("#FFE4B5")
  canvas.fill()
  canvas.set_color("#000000")
  canvas.stroke()

  -- Eyes (small ellipses)
  canvas.begin_path()
  canvas.ellipse(275, 440, 10, 15)
  canvas.set_color("#FFFFFF")
  canvas.fill()
  canvas.set_color("#000000")
  canvas.stroke()
  canvas.begin_path()
  canvas.ellipse(275, 440, 4, 6)
  canvas.fill()

  canvas.begin_path()
  canvas.ellipse(325, 440, 10, 15)
  canvas.set_color("#FFFFFF")
  canvas.fill()
  canvas.set_color("#000000")
  canvas.stroke()
  canvas.begin_path()
  canvas.ellipse(325, 440, 4, 6)
  canvas.fill()

  -- Smile (half ellipse arc)
  canvas.begin_path()
  canvas.ellipse(300, 460, 25, 15, 0, 0, math.pi)
  canvas.set_line_width(2)
  canvas.stroke()

  canvas.set_color("#FFFFFF")
  canvas.draw_text(250, 500, "Face using ellipses")
end)

canvas.start()
