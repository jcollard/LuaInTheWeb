-- canvas/text/stroke-text.lua
-- Demonstrates stroke_text() and draw_text() with max_width option

local canvas = require("canvas")

-- Colors
local BG_COLOR = "#1a1a2e"
local TEXT_COLOR = "#FFFFFF"
local ACCENT_COLOR = "#4ECDC4"
local STROKE_COLOR = "#FF6B6B"

canvas.set_size(550, 450)

canvas.tick(function()
  canvas.clear()

  local w, h = canvas.get_width(), canvas.get_height()

  -- Background
  canvas.set_fill_style(BG_COLOR)
  canvas.fill_rect(0, 0, w, h)

  -- Title
  canvas.set_fill_style(ACCENT_COLOR)
  canvas.set_font_size(22)
  canvas.set_text_align("center")
  canvas.set_text_baseline("top")
  canvas.draw_text(w / 2, 15, "Stroke Text & Max Width Demo")

  -- =========================================================================
  -- Section 1: Basic stroke_text vs draw_text
  -- =========================================================================
  local section1Y = 60
  canvas.set_font_size(14)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.draw_text(30, section1Y, "1. stroke_text() vs draw_text()")

  -- Filled text
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_font_size(32)
  canvas.set_text_baseline("middle")
  canvas.draw_text(50, section1Y + 40, "Filled Text")

  -- Stroked text
  canvas.set_stroke_style(STROKE_COLOR)
  canvas.set_line_width(2)
  canvas.stroke_text(50, section1Y + 80, "Stroked Text", {font_size = 32})

  -- =========================================================================
  -- Section 2: Combining fill and stroke
  -- =========================================================================
  local section2Y = 160
  canvas.set_font_size(14)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.draw_text(30, section2Y, "2. Combined Fill + Stroke (Outline Effect)")

  -- Draw filled text first, then stroke on top
  canvas.set_font_size(36)
  canvas.set_text_baseline("middle")
  canvas.set_fill_style("#4ECDC4")
  canvas.draw_text(50, section2Y + 45, "Outlined Text")
  canvas.set_stroke_style("#000000")
  canvas.set_line_width(2)
  canvas.stroke_text(50, section2Y + 45, "Outlined Text", {font_size = 36})

  -- =========================================================================
  -- Section 3: max_width option
  -- =========================================================================
  local section3Y = 230
  canvas.set_font_size(14)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.draw_text(30, section3Y, "3. max_width Option (Text Compression)")

  -- Draw bounding box
  local boxX = 50
  local boxWidth = 200
  canvas.set_stroke_style("#444444")
  canvas.set_line_width(1)
  canvas.begin_path()
  canvas.move_to(boxX, section3Y + 25)
  canvas.line_to(boxX + boxWidth, section3Y + 25)
  canvas.line_to(boxX + boxWidth, section3Y + 90)
  canvas.line_to(boxX, section3Y + 90)
  canvas.close_path()
  canvas.stroke()

  -- Label for box width
  canvas.set_fill_style("#888888")
  canvas.set_font_size(10)
  canvas.draw_text(boxX + boxWidth + 10, section3Y + 52, "max_width: 200px")

  -- Text without max_width (normal)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_font_size(16)
  canvas.set_text_baseline("middle")
  canvas.draw_text(boxX + 5, section3Y + 40, "Normal Text")

  -- Text with max_width (compressed)
  canvas.set_fill_style(ACCENT_COLOR)
  canvas.draw_text(boxX + 5, section3Y + 60, "This Long Text Gets Compressed", {max_width = boxWidth - 10})

  -- Stroked text with max_width
  canvas.set_stroke_style(STROKE_COLOR)
  canvas.set_line_width(1)
  canvas.stroke_text(boxX + 5, section3Y + 80, "Stroked Compressed Text", {max_width = boxWidth - 10, font_size = 16})

  -- =========================================================================
  -- Section 4: Different line widths
  -- =========================================================================
  local section4Y = 330
  canvas.set_font_size(14)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.draw_text(30, section4Y, "4. Stroke Line Width Variations")

  local lineWidths = {1, 2, 3, 5}
  local textX = 50
  canvas.set_stroke_style(STROKE_COLOR)
  canvas.set_font_size(24)
  canvas.set_text_baseline("middle")

  for i, lw in ipairs(lineWidths) do
    local tx = textX + (i - 1) * 120
    canvas.set_line_width(lw)
    canvas.stroke_text(tx, section4Y + 45, "Width", {font_size = 24})
    -- Label
    canvas.set_fill_style("#888888")
    canvas.set_font_size(10)
    canvas.set_text_baseline("top")
    canvas.draw_text(tx, section4Y + 65, "line_width: " .. lw)
    canvas.set_text_baseline("middle")
  end

  -- Footer
  canvas.set_fill_style("#666666")
  canvas.set_font_size(10)
  canvas.set_text_align("center")
  canvas.draw_text(w / 2, h - 15, "stroke_text() draws text outlines, max_width compresses text to fit")
end)

canvas.start()
