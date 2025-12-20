-- Transform Reset Example
-- Demonstrates reset_transform() and set_transform()
--
-- Shows how reset_transform() clears all transformations
-- and how set_transform() can set an absolute transformation

local canvas = require('canvas')

canvas.set_size(600, 400)

local time = 0

canvas.tick(function()
  canvas.clear()
  time = time + canvas.get_delta()

  -- Apply some transformations
  canvas.translate(150, 200)
  canvas.rotate(time)
  canvas.scale(1.5, 1.5)

  -- Draw a shape with the accumulated transforms
  canvas.set_color(255, 100, 100)
  canvas.fill_rect(-30, -30, 60, 60)

  -- Use reset_transform to clear ALL transformations
  canvas.reset_transform()

  -- Now drawing at absolute screen coordinates again
  canvas.set_color(100, 255, 100)
  canvas.fill_rect(350, 150, 100, 100)

  -- Use set_transform to set an absolute transformation matrix
  -- Parameters: a, b, c, d, e, f
  -- This creates a sheared rectangle
  local shear = math.sin(time) * 0.3
  canvas.set_transform(1, 0, shear, 1, 450, 280)
  canvas.set_color(100, 100, 255)
  canvas.fill_rect(0, 0, 80, 40)

  -- Reset again for UI text
  canvas.reset_transform()

  -- Draw labels
  canvas.set_color(200, 200, 200)
  canvas.draw_text(10, 20, "Transform Reset Demo")

  canvas.draw_text(80, 350, "Rotating + scaled")
  canvas.draw_text(330, 350, "After reset_transform()")

  canvas.draw_text(430, 340, "set_transform()")
  canvas.draw_text(430, 360, "(shear effect)")
end)

canvas.start()
