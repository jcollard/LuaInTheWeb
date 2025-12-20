-- Mirror Effect Example
-- Demonstrates canvas.scale() with negative values for mirroring
--
-- Negative scale values flip the coordinate system:
-- scale(-1, 1) = horizontal flip (mirror)
-- scale(1, -1) = vertical flip
-- scale(-1, -1) = both (180 degree rotation)

local canvas = require('canvas')

canvas.set_size(600, 400)

local time = 0

-- Draw a simple arrow shape (points right)
local function draw_arrow()
  canvas.fill_rect(-30, -10, 40, 20)  -- Body
  -- Arrowhead
  canvas.draw_line(10, -25, 40, 0)
  canvas.draw_line(40, 0, 10, 25)
  canvas.draw_line(10, -25, 10, 25)
end

canvas.tick(function()
  canvas.clear()
  time = time + canvas.get_delta()

  -- Bouncing offset for animation
  local bounce = math.sin(time * 3) * 10

  -- Original (no mirror)
  canvas.save()
  canvas.translate(100, 100 + bounce)
  canvas.set_color(255, 100, 100)
  canvas.set_line_width(3)
  draw_arrow()
  canvas.restore()

  -- Horizontal mirror (scale -1, 1)
  canvas.save()
  canvas.translate(300, 100 + bounce)
  canvas.scale(-1, 1)  -- Flip horizontally
  canvas.set_color(100, 255, 100)
  canvas.set_line_width(3)
  draw_arrow()
  canvas.restore()

  -- Vertical mirror (scale 1, -1)
  canvas.save()
  canvas.translate(100, 300 - bounce)
  canvas.scale(1, -1)  -- Flip vertically
  canvas.set_color(100, 100, 255)
  canvas.set_line_width(3)
  draw_arrow()
  canvas.restore()

  -- Both mirrors (scale -1, -1) = 180 degree rotation
  canvas.save()
  canvas.translate(300, 300 - bounce)
  canvas.scale(-1, -1)  -- Flip both
  canvas.set_color(255, 255, 100)
  canvas.set_line_width(3)
  draw_arrow()
  canvas.restore()

  -- Draw labels
  canvas.set_color(200, 200, 200)
  canvas.draw_text(60, 160, "Original")
  canvas.draw_text(240, 160, "scale(-1, 1)")
  canvas.draw_text(60, 360, "scale(1, -1)")
  canvas.draw_text(240, 360, "scale(-1, -1)")

  canvas.draw_text(400, 100, "Horizontal flip")
  canvas.draw_text(400, 300, "Both = 180 deg")

  canvas.draw_text(10, 20, "Mirror Effect using negative scale()")
end)

canvas.start()
