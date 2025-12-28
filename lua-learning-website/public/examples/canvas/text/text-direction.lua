-- canvas/text/text-direction.lua
-- Demonstrates set_direction() for RTL (right-to-left) and LTR (left-to-right) text

local canvas = require("canvas")

-- Colors
local BG_COLOR = "#1a1a2e"
local TEXT_COLOR = "#FFFFFF"
local ACCENT_COLOR = "#4ECDC4"
local GUIDE_COLOR = "#FF6B6B"

canvas.set_size(500, 400)

canvas.tick(function()
  canvas.clear()

  local w, h = canvas.get_width(), canvas.get_height()

  -- Background
  canvas.set_fill_style(BG_COLOR)
  canvas.fill_rect(0, 0, w, h)

  -- Title
  canvas.set_fill_style(ACCENT_COLOR)
  canvas.set_font_size(20)
  canvas.set_text_align("center")
  canvas.set_text_baseline("top")
  canvas.draw_text(w / 2, 15, "Text Direction Demo")

  -- =========================================================================
  -- Section 1: LTR (Left-to-Right) - Default
  -- =========================================================================
  local section1Y = 60
  canvas.set_font_size(14)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.draw_text(30, section1Y, "1. LTR (Left-to-Right) - Default")

  -- Draw reference line
  local refX = 250
  canvas.set_stroke_style(GUIDE_COLOR)
  canvas.set_line_width(1)
  canvas.begin_path()
  canvas.move_to(refX, section1Y + 25)
  canvas.line_to(refX, section1Y + 70)
  canvas.stroke()

  -- LTR text examples
  canvas.set_direction("ltr")
  canvas.set_font_size(16)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("middle")
  canvas.draw_text(refX, section1Y + 35, "Hello World")
  canvas.draw_text(refX, section1Y + 55, "Left-to-Right")

  -- Label
  canvas.set_fill_style("#888888")
  canvas.set_font_size(10)
  canvas.draw_text(refX + 5, section1Y + 75, "anchor point")

  -- =========================================================================
  -- Section 2: RTL (Right-to-Left)
  -- =========================================================================
  local section2Y = 150
  canvas.set_font_size(14)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.draw_text(30, section2Y, "2. RTL (Right-to-Left)")

  -- Draw reference line
  canvas.set_stroke_style(GUIDE_COLOR)
  canvas.begin_path()
  canvas.move_to(refX, section2Y + 25)
  canvas.line_to(refX, section2Y + 70)
  canvas.stroke()

  -- RTL text examples
  canvas.set_direction("rtl")
  canvas.set_font_size(16)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("middle")
  canvas.draw_text(refX, section2Y + 35, "Hello World")
  canvas.draw_text(refX, section2Y + 55, "Right-to-Left")

  -- Label
  canvas.set_fill_style("#888888")
  canvas.set_font_size(10)
  canvas.draw_text(refX + 5, section2Y + 75, "anchor point")

  -- =========================================================================
  -- Section 3: Inherit Mode
  -- =========================================================================
  local section3Y = 240
  canvas.set_font_size(14)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.set_direction("ltr")
  canvas.draw_text(30, section3Y, "3. Inherit Mode")

  -- Draw reference line
  canvas.set_stroke_style(GUIDE_COLOR)
  canvas.begin_path()
  canvas.move_to(refX, section3Y + 25)
  canvas.line_to(refX, section3Y + 55)
  canvas.stroke()

  -- Inherit mode
  canvas.set_direction("inherit")
  canvas.set_font_size(16)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("middle")
  canvas.draw_text(refX, section3Y + 40, "Inherits from context")

  -- =========================================================================
  -- Section 4: Practical Use - Mixed Text
  -- =========================================================================
  local section4Y = 310
  canvas.set_font_size(14)
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.set_direction("ltr")
  canvas.draw_text(30, section4Y, "4. Practical Example")

  -- Description
  canvas.set_font_size(12)
  canvas.set_fill_style("#888888")
  canvas.draw_text(30, section4Y + 25, "RTL is essential for languages like Arabic and Hebrew")
  canvas.draw_text(30, section4Y + 42, "Use set_direction('rtl') before drawing RTL text")

  -- Footer
  canvas.set_fill_style("#666666")
  canvas.set_font_size(10)
  canvas.set_text_align("center")
  canvas.set_direction("ltr")
  canvas.draw_text(w / 2, h - 15, "Direction affects how text flows from its anchor point")
end)

canvas.start()
