-- Radial Gradient Demo
-- Demonstrates radial gradients for 3D effects and spotlights

local canvas = require("canvas")

canvas.set_size(400, 400)

canvas.tick(function()
  canvas.clear()

  -- Dark background
  canvas.set_fill_style("#1a1a2e")
  canvas.fill_rect(0, 0, 400, 400)

  -- 3D sphere effect (offset highlight)
  local sphere = canvas.create_radial_gradient(150, 120, 10, 200, 200, 80)
  sphere:add_color_stop(0, "#ffffff")
  sphere:add_color_stop(0.3, "#4dabf7")
  sphere:add_color_stop(1, "#1864ab")
  canvas.set_fill_style(sphere)
  canvas.fill_circle(200, 200, 80)

  -- Spotlight effect
  local spotlight = canvas.create_radial_gradient(320, 100, 0, 320, 100, 100)
  spotlight:add_color_stop(0, "rgba(255, 255, 200, 0.8)")
  spotlight:add_color_stop(0.5, "rgba(255, 200, 100, 0.3)")
  spotlight:add_color_stop(1, "rgba(0, 0, 0, 0)")
  canvas.set_fill_style(spotlight)
  canvas.fill_rect(220, 0, 180, 200)

  -- Glowing orb (red)
  local orb = canvas.create_radial_gradient(100, 320, 0, 100, 320, 50)
  orb:add_color_stop(0, "#ffffff")
  orb:add_color_stop(0.2, "#ff6b6b")
  orb:add_color_stop(0.6, "#c0392b")
  orb:add_color_stop(1, "rgba(0, 0, 0, 0)")
  canvas.set_fill_style(orb)
  canvas.fill_circle(100, 320, 50)

  -- Glowing orb (green)
  local orb2 = canvas.create_radial_gradient(300, 320, 0, 300, 320, 40)
  orb2:add_color_stop(0, "#ffffff")
  orb2:add_color_stop(0.2, "#2ecc71")
  orb2:add_color_stop(0.6, "#27ae60")
  orb2:add_color_stop(1, "rgba(0, 0, 0, 0)")
  canvas.set_fill_style(orb2)
  canvas.fill_circle(300, 320, 40)

  -- Title
  canvas.set_fill_style("#ffffff")
  canvas.set_font_size(20)
  canvas.draw_text(120, 20, "Radial Gradients")
end)

canvas.start()
