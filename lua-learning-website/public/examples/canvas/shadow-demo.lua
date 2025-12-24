-- Shadow Demo
-- Demonstrates shadow effects for depth and visual polish

local canvas = require("canvas")

canvas.set_size(400, 300)

canvas.tick(function()
  canvas.clear()

  -- Dark background
  canvas.set_fill_style("#1a1a2e")
  canvas.fill_rect(0, 0, 400, 300)

  -- Drop shadow on rectangle
  canvas.set_shadow("#000000", 10, 5, 5)
  canvas.set_fill_style("#4ECDC4")
  canvas.fill_rect(30, 30, 120, 80)

  -- Soft shadow on another rectangle
  canvas.set_shadow("#00000080", 15, 8, 8)
  canvas.set_fill_style("#FF6B6B")
  canvas.fill_rect(30, 140, 120, 80)

  -- Glow effect on circle (no offset)
  canvas.set_shadow("#FFD700", 20, 0, 0)
  canvas.set_fill_style("#FFD700")
  canvas.fill_circle(250, 70, 40)

  -- Blue glow effect
  canvas.set_shadow("#00BFFF", 25, 0, 0)
  canvas.set_fill_style("#00BFFF")
  canvas.fill_circle(250, 180, 40)

  -- Text with shadow
  canvas.set_shadow("#000000", 3, 2, 2)
  canvas.set_fill_style("#FFFFFF")
  canvas.set_font_size(24)
  canvas.draw_text(120, 270, "Shadow Effects")

  -- Clear shadow for label
  canvas.clear_shadow()
  canvas.set_font_size(12)
  canvas.set_fill_style("#888888")
  canvas.draw_text(30, 125, "Drop Shadow")
  canvas.draw_text(30, 235, "Soft Shadow")
  canvas.draw_text(315, 75, "Glow")
  canvas.draw_text(315, 185, "Glow")
end)

canvas.start()
