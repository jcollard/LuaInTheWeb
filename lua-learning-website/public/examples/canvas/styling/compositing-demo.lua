-- canvas/styling/compositing-demo.lua
-- Demonstrates alpha transparency and blend modes

local canvas = require("canvas")

canvas.set_size(450, 350)

canvas.tick(function()
  canvas.clear()

  -- Dark background
  canvas.set_fill_style("#1a1a2e")
  canvas.fill_rect(0, 0, 450, 350)

  -- Title
  canvas.set_fill_style("#FFFFFF")
  canvas.set_font_size(18)
  canvas.draw_text(20, 30, "Compositing Demo")
  canvas.set_font_size(12)

  -- Alpha Transparency Section
  canvas.set_fill_style("#888888")
  canvas.draw_text(20, 60, "Alpha Transparency:")

  -- Draw overlapping circles with transparency
  canvas.set_global_alpha(0.6)

  canvas.set_fill_style("#FF6B6B")
  canvas.fill_circle(60, 110, 40)

  canvas.set_fill_style("#4ECDC4")
  canvas.fill_circle(100, 110, 40)

  canvas.set_fill_style("#FFE66D")
  canvas.fill_circle(80, 145, 40)

  canvas.set_global_alpha(1.0) -- Reset

  -- Blend Modes Section
  canvas.set_fill_style("#888888")
  canvas.draw_text(180, 60, "Blend Modes:")

  -- Base shape for blend demos
  local function draw_blend_demo(x, y, mode, label)
    -- Draw a green base circle
    canvas.set_composite_operation("source-over")
    canvas.set_fill_style("#00CC66")
    canvas.fill_circle(x, y, 25)

    -- Apply blend mode and draw red circle
    canvas.set_composite_operation(mode)
    canvas.set_fill_style("#FF4444")
    canvas.fill_circle(x + 20, y, 25)

    -- Reset and draw label
    canvas.set_composite_operation("source-over")
    canvas.set_fill_style("#AAAAAA")
    canvas.set_font_size(10)
    canvas.draw_text(x - 20, y + 40, label)
  end

  draw_blend_demo(220, 110, "multiply", "multiply")
  draw_blend_demo(320, 110, "screen", "screen")
  draw_blend_demo(220, 190, "lighter", "lighter")
  draw_blend_demo(320, 190, "overlay", "overlay")

  -- Glow Effect Demo
  canvas.set_composite_operation("source-over")
  canvas.set_fill_style("#888888")
  canvas.set_font_size(12)
  canvas.draw_text(20, 210, "Glow Effect (lighter):")

  -- Create glow with lighter blend mode
  canvas.set_composite_operation("lighter")
  canvas.set_fill_style("#4400FF20")
  for i = 1, 6 do
    canvas.fill_circle(80, 270, 15 + i * 8)
  end

  -- Bright core
  canvas.set_fill_style("#8855FF")
  canvas.fill_circle(80, 270, 15)

  canvas.set_composite_operation("source-over")

  -- Fade Demo
  canvas.set_fill_style("#888888")
  canvas.draw_text(180, 250, "Alpha Fade:")

  for i = 0, 4 do
    canvas.set_global_alpha((i + 1) / 5)
    canvas.set_fill_style("#FF6B6B")
    canvas.fill_rect(220 + i * 40, 270, 30, 30)
  end

  canvas.set_global_alpha(1.0) -- Reset

  -- Instructions
  canvas.set_fill_style("#666666")
  canvas.set_font_size(10)
  canvas.draw_text(20, 340, "Compositing controls how colors blend together")
end)

canvas.start()
