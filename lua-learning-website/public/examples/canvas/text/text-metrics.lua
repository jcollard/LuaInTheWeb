-- canvas/text/text-metrics.lua
-- Demonstrates: get_text_metrics() for detailed text measurements
-- Features: get_text_metrics, get_text_width, set_font_size

local canvas = require("canvas")

local sample_text = "Hello, Canvas!"
local font_size = 24

local function draw()
  canvas.clear()

  -- Background
  canvas.set_color(30, 30, 50)
  canvas.fill_rect(0, 0, 500, 400)

  -- Title
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(16)
  canvas.draw_text(10, 25, "get_text_metrics() - Detailed text measurements")

  -- Set font for sample text
  canvas.set_font_size(font_size)

  -- Get metrics
  local metrics = canvas.get_text_metrics(sample_text)
  local simple_width = canvas.get_text_width(sample_text)

  -- Draw the sample text
  local text_x = 50
  local text_y = 120

  canvas.set_color(255, 255, 100)
  canvas.draw_text(text_x, text_y, sample_text)

  -- Visualize the metrics with lines and boxes

  -- Width line (using actualBoundingBoxLeft + actualBoundingBoxRight)
  local actual_width = (metrics.actualBoundingBoxLeft or 0) + (metrics.actualBoundingBoxRight or metrics.width)
  canvas.set_color(0, 255, 0, 150)
  canvas.set_line_width(2)
  canvas.draw_line(text_x, text_y + 5, text_x + actual_width, text_y + 5)

  -- Baseline indicator
  canvas.set_color(255, 0, 0)
  canvas.set_line_width(1)
  canvas.draw_line(text_x - 10, text_y, text_x + actual_width + 10, text_y)

  -- Ascent line (above baseline)
  local ascent = metrics.actualBoundingBoxAscent or metrics.fontBoundingBoxAscent or font_size * 0.8
  canvas.set_color(0, 200, 255)
  canvas.draw_line(text_x - 10, text_y - ascent, text_x + actual_width + 10, text_y - ascent)

  -- Descent line (below baseline)
  local descent = metrics.actualBoundingBoxDescent or metrics.fontBoundingBoxDescent or font_size * 0.2
  canvas.set_color(255, 100, 255)
  canvas.draw_line(text_x - 10, text_y + descent, text_x + actual_width + 10, text_y + descent)

  -- Display metrics values
  canvas.set_font_size(12)
  canvas.set_color(200, 200, 200)

  local y = 180
  local line_height = 18

  canvas.draw_text(20, y, "Text Metrics for: \"" .. sample_text .. "\"")
  y = y + line_height + 5

  canvas.set_color(150, 255, 150)
  canvas.draw_text(20, y, string.format("width: %.1f", metrics.width or 0))
  y = y + line_height

  canvas.draw_text(20, y, string.format("get_text_width(): %.1f", simple_width))
  y = y + line_height

  canvas.set_color(100, 200, 255)
  canvas.draw_text(20, y, string.format("actualBoundingBoxAscent: %.1f", metrics.actualBoundingBoxAscent or 0))
  y = y + line_height

  canvas.set_color(255, 100, 255)
  canvas.draw_text(20, y, string.format("actualBoundingBoxDescent: %.1f", metrics.actualBoundingBoxDescent or 0))
  y = y + line_height

  canvas.set_color(200, 200, 100)
  canvas.draw_text(20, y, string.format("actualBoundingBoxLeft: %.1f", metrics.actualBoundingBoxLeft or 0))
  y = y + line_height

  canvas.draw_text(20, y, string.format("actualBoundingBoxRight: %.1f", metrics.actualBoundingBoxRight or 0))
  y = y + line_height + 5

  -- Font bounding box (full font metrics)
  canvas.set_color(180, 180, 180)
  canvas.draw_text(20, y, string.format("fontBoundingBoxAscent: %.1f", metrics.fontBoundingBoxAscent or 0))
  y = y + line_height

  canvas.draw_text(20, y, string.format("fontBoundingBoxDescent: %.1f", metrics.fontBoundingBoxDescent or 0))

  -- Legend
  canvas.set_font_size(10)
  canvas.set_color(255, 0, 0)
  canvas.draw_text(320, 180, "Red: Baseline")
  canvas.set_color(0, 200, 255)
  canvas.draw_text(320, 195, "Cyan: Ascent")
  canvas.set_color(255, 100, 255)
  canvas.draw_text(320, 210, "Pink: Descent")
  canvas.set_color(0, 255, 0)
  canvas.draw_text(320, 225, "Green: Width")
end

local function game()
  draw()
end

canvas.set_size(500, 400)
canvas.tick(game)
canvas.start()
