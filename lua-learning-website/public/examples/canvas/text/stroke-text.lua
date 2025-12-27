-- canvas/text/stroke-text.lua
-- Demonstrates: stroke_text() for outlined text
-- Features: stroke_text, draw_text, set_font_size, set_line_width

local canvas = require("canvas")

local function draw()
  canvas.clear()

  -- Gradient-like background
  canvas.set_color(40, 40, 80)
  canvas.fill_rect(0, 0, 400, 300)

  -- Title
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(14)
  canvas.draw_text(10, 25, "stroke_text() - Draw text outlines")

  -- Basic stroke text
  canvas.set_color(255, 200, 0)
  canvas.set_font_size(24)
  canvas.set_line_width(1)
  canvas.stroke_text(20, 70, "Outlined Text")

  -- Thicker outline
  canvas.set_color(0, 255, 200)
  canvas.set_font_size(28)
  canvas.set_line_width(2)
  canvas.stroke_text(20, 110, "Thick Outline")

  -- Very thick outline
  canvas.set_color(255, 100, 100)
  canvas.set_font_size(32)
  canvas.set_line_width(3)
  canvas.stroke_text(20, 155, "Bold Stroke")

  -- Combine stroke and fill for outline effect
  canvas.set_font_size(36)
  canvas.set_line_width(3)

  -- Draw stroke first (outline)
  canvas.set_color(0, 0, 0)
  canvas.stroke_text(20, 210, "Outlined Fill")

  -- Then draw fill on top
  canvas.set_color(255, 255, 100)
  canvas.draw_text(20, 210, "Outlined Fill")

  -- Another combination with different colors
  canvas.set_font_size(30)
  canvas.set_line_width(4)

  canvas.set_color(255, 255, 255)
  canvas.stroke_text(20, 260, "Game Title!")

  canvas.set_color(100, 50, 150)
  canvas.draw_text(20, 260, "Game Title!")

  -- Instructions
  canvas.set_color(150, 150, 150)
  canvas.set_font_size(12)
  canvas.draw_text(220, 280, "Tip: Draw stroke before fill")
end

local function game()
  draw()
end

canvas.set_size(400, 300)
canvas.tick(game)
canvas.start()
