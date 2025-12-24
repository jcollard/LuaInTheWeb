-- Linear Gradient Demo
-- Demonstrates linear gradients for backgrounds and visual effects

local canvas = require("canvas")

canvas.set_size(400, 400)

canvas.tick(function()
  canvas.clear()

  -- Sky gradient (vertical)
  local sky = canvas.create_linear_gradient(0, 0, 0, 200)
  sky:add_color_stop(0, "#1a1a2e")
  sky:add_color_stop(0.5, "#16213e")
  sky:add_color_stop(1, "#0f3460")
  canvas.set_fill_style(sky)
  canvas.fill_rect(0, 0, 400, 200)

  -- Sunset gradient (horizontal)
  local sunset = canvas.create_linear_gradient(0, 200, 400, 200)
  sunset:add_color_stop(0, "#ff6b6b")
  sunset:add_color_stop(0.5, "#feca57")
  sunset:add_color_stop(1, "#48dbfb")
  canvas.set_fill_style(sunset)
  canvas.fill_rect(0, 200, 400, 100)

  -- Ground gradient
  local ground = canvas.create_linear_gradient(0, 300, 0, 400)
  ground:add_color_stop(0, "#2d5016")
  ground:add_color_stop(1, "#1a3009")
  canvas.set_fill_style(ground)
  canvas.fill_rect(0, 300, 400, 100)

  -- Rainbow stroke
  local rainbow = canvas.create_linear_gradient(50, 0, 350, 0)
  rainbow:add_color_stop(0, "#ff0000")
  rainbow:add_color_stop(0.17, "#ff7f00")
  rainbow:add_color_stop(0.33, "#ffff00")
  rainbow:add_color_stop(0.5, "#00ff00")
  rainbow:add_color_stop(0.67, "#0000ff")
  rainbow:add_color_stop(0.83, "#4b0082")
  rainbow:add_color_stop(1, "#9400d3")
  canvas.set_line_width(8)
  canvas.set_stroke_style(rainbow)
  canvas.begin_path()
  canvas.move_to(50, 350)
  canvas.line_to(350, 350)
  canvas.stroke()

  -- Title
  canvas.set_fill_style("#ffffff")
  canvas.set_font_size(20)
  canvas.draw_text(120, 20, "Linear Gradients")
end)

canvas.start()
