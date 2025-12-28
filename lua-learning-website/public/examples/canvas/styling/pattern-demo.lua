-- canvas/styling/pattern-demo.lua
-- Demonstrates image patterns for textured fills

local canvas = require("canvas")

canvas.set_size(400, 300)

-- Register the asset directory and load the meteor image
canvas.assets.add_path("../assets/images")
canvas.assets.load_image("meteor", "meteor.png")

canvas.tick(function()
  canvas.clear()

  -- Dark background
  canvas.set_fill_style("#1a1a2e")
  canvas.fill_rect(0, 0, 400, 300)

  -- Create patterns with different repetition modes
  local repeat_pattern = canvas.create_pattern("meteor", "repeat")
  local repeat_x = canvas.create_pattern("meteor", "repeat-x")
  local repeat_y = canvas.create_pattern("meteor", "repeat-y")
  local no_repeat = canvas.create_pattern("meteor", "no-repeat")

  -- Top left: repeat (tiles in both directions)
  canvas.set_fill_style(repeat_pattern)
  canvas.fill_rect(10, 10, 180, 125)

  -- Top right: repeat-x (tiles horizontally)
  canvas.set_fill_style(repeat_x)
  canvas.fill_rect(210, 10, 180, 125)

  -- Bottom left: repeat-y (tiles vertically)
  canvas.set_fill_style(repeat_y)
  canvas.fill_rect(10, 160, 180, 125)

  -- Bottom right: no-repeat (single image)
  canvas.set_fill_style(no_repeat)
  canvas.fill_rect(210, 160, 180, 125)

  -- Labels
  canvas.set_fill_style("#ffffff")
  canvas.set_font_size(12)
  canvas.draw_text(55, 140, "repeat")
  canvas.draw_text(255, 140, "repeat-x")
  canvas.draw_text(50, 290, "repeat-y")
  canvas.draw_text(250, 290, "no-repeat")
end)

canvas.start()
