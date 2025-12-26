-- canvas/styling/conic-gradient.lua
-- Demonstrates conic gradients for color wheels and pie charts

local canvas = require("canvas")

canvas.set_size(400, 400)

canvas.tick(function()
  canvas.clear()

  -- Dark background
  canvas.set_fill_style("#1a1a2e")
  canvas.fill_rect(0, 0, 400, 400)

  -- Color wheel (full spectrum)
  local wheel = canvas.create_conic_gradient(0, 200, 150)
  wheel:add_color_stop(0, "#FF0000")
  wheel:add_color_stop(0.17, "#FFFF00")
  wheel:add_color_stop(0.33, "#00FF00")
  wheel:add_color_stop(0.5, "#00FFFF")
  wheel:add_color_stop(0.67, "#0000FF")
  wheel:add_color_stop(0.83, "#FF00FF")
  wheel:add_color_stop(1, "#FF0000")
  canvas.set_fill_style(wheel)
  canvas.begin_path()
  canvas.arc(200, 150, 100, 0, math.pi * 2)
  canvas.fill()

  -- Pie chart style (offset start angle to start from top)
  local pie = canvas.create_conic_gradient(-math.pi/2, 200, 320)
  pie:add_color_stop(0, "#4dabf7")
  pie:add_color_stop(0.3, "#4dabf7")
  pie:add_color_stop(0.3, "#ff6b6b")
  pie:add_color_stop(0.6, "#ff6b6b")
  pie:add_color_stop(0.6, "#51cf66")
  pie:add_color_stop(1, "#51cf66")
  canvas.set_fill_style(pie)
  canvas.begin_path()
  canvas.arc(200, 320, 60, 0, math.pi * 2)
  canvas.fill()

  -- Title
  canvas.set_fill_style("#ffffff")
  canvas.set_font_size(20)
  canvas.draw_text(120, 20, "Conic Gradients")
end)

canvas.start()
