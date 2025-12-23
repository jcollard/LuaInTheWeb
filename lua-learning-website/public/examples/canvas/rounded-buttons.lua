-- Rounded Buttons Demo
-- Demonstrates the canvas.round_rect() function for UI elements

local canvas = require('canvas')

canvas.set_size(600, 550)

-- Button hover state (for interactive demo)
local hover_button = 0

canvas.tick(function()
  canvas.clear()

  -- Title
  canvas.set_color("#FFFFFF")
  canvas.set_font_size(24)
  canvas.draw_text(20, 20, "Rounded Rectangle Demo")
  canvas.set_font_size(14)
  canvas.draw_text(20, 50, "canvas.round_rect(x, y, width, height, radii)")

  -- Check mouse position for hover effects
  local mx = canvas.get_mouse_x()
  local my = canvas.get_mouse_y()

  -- 1. Uniform rounded corners (single number)
  local btn1_x, btn1_y = 50, 100
  local btn1_hover = mx >= btn1_x and mx <= btn1_x + 180 and my >= btn1_y and my <= btn1_y + 50

  canvas.begin_path()
  canvas.round_rect(btn1_x, btn1_y, 180, 50, 10)  -- 10px radius on all corners
  canvas.set_color(btn1_hover and "#7B8FEE" or "#667EEA")
  canvas.fill()
  canvas.set_color("#FFFFFF")
  canvas.set_font_size(16)
  canvas.draw_text(btn1_x + 35, btn1_y + 17, "Uniform (10px)")

  canvas.set_color("#AAAAAA")
  canvas.set_font_size(12)
  canvas.draw_text(btn1_x, btn1_y + 60, "round_rect(x, y, w, h, 10)")

  -- 2. Pill button (large radius)
  local btn2_x, btn2_y = 50, 200
  local btn2_hover = mx >= btn2_x and mx <= btn2_x + 180 and my >= btn2_y and my <= btn2_y + 50

  canvas.begin_path()
  canvas.round_rect(btn2_x, btn2_y, 180, 50, 25)  -- Large radius = pill shape
  canvas.set_color(btn2_hover and "#FF7F7F" or "#FF6B6B")
  canvas.fill()
  canvas.set_color("#FFFFFF")
  canvas.set_font_size(16)
  canvas.draw_text(btn2_x + 45, btn2_y + 17, "Pill Shape")

  canvas.set_color("#AAAAAA")
  canvas.set_font_size(12)
  canvas.draw_text(btn2_x, btn2_y + 60, "round_rect(x, y, w, h, 25)")

  -- 3. Two different radii (diagonal corners)
  local btn3_x, btn3_y = 50, 300
  local btn3_hover = mx >= btn3_x and mx <= btn3_x + 180 and my >= btn3_y and my <= btn3_y + 50

  canvas.begin_path()
  canvas.round_rect(btn3_x, btn3_y, 180, 50, {20, 5})  -- TL/BR=20, TR/BL=5
  canvas.set_color(btn3_hover and "#5DE0D9" or "#4ECDC4")
  canvas.fill()
  canvas.set_color("#FFFFFF")
  canvas.set_font_size(16)
  canvas.draw_text(btn3_x + 30, btn3_y + 17, "Diagonal {20, 5}")

  canvas.set_color("#AAAAAA")
  canvas.set_font_size(12)
  canvas.draw_text(btn3_x, btn3_y + 60, "radii = {20, 5}")

  -- 4. Four different radii (each corner different)
  local btn4_x, btn4_y = 50, 400
  local btn4_hover = mx >= btn4_x and mx <= btn4_x + 180 and my >= btn4_y and my <= btn4_y + 50

  canvas.begin_path()
  canvas.round_rect(btn4_x, btn4_y, 180, 50, {25, 10, 25, 10})  -- All corners different
  canvas.set_color(btn4_hover and "#FFE066" or "#FFD93D")
  canvas.fill()
  canvas.set_color("#333333")
  canvas.set_font_size(16)
  canvas.draw_text(btn4_x + 5, btn4_y + 17, "Custom {25,10,25,10}")

  canvas.set_color("#AAAAAA")
  canvas.set_font_size(12)
  canvas.draw_text(btn4_x, btn4_y + 60, "radii = {25, 10, 25, 10}")

  -- Right column - more examples

  -- 5. Sharp top corners, rounded bottom
  local btn5_x, btn5_y = 320, 100
  canvas.begin_path()
  canvas.round_rect(btn5_x, btn5_y, 180, 50, {0, 0, 15, 15})
  canvas.set_color("#A8E6CF")
  canvas.fill()
  canvas.set_color("#333333")
  canvas.set_font_size(16)
  canvas.draw_text(btn5_x + 15, btn5_y + 17, "Bottom rounded")

  canvas.set_color("#AAAAAA")
  canvas.set_font_size(12)
  canvas.draw_text(btn5_x, btn5_y + 60, "radii = {0, 0, 15, 15}")

  -- 6. Rounded top only (tab style)
  local btn6_x, btn6_y = 320, 200
  canvas.begin_path()
  canvas.round_rect(btn6_x, btn6_y, 180, 50, {15, 15, 0, 0})
  canvas.set_color("#C9B1FF")
  canvas.fill()
  canvas.set_color("#333333")
  canvas.set_font_size(16)
  canvas.draw_text(btn6_x + 35, btn6_y + 17, "Tab Style")

  canvas.set_color("#AAAAAA")
  canvas.set_font_size(12)
  canvas.draw_text(btn6_x, btn6_y + 60, "radii = {15, 15, 0, 0}")

  -- 7. One corner rounded (dialog bubble style)
  local btn7_x, btn7_y = 320, 300
  canvas.begin_path()
  canvas.round_rect(btn7_x, btn7_y, 180, 50, {15, 15, 15, 0})
  canvas.set_color("#FF9F43")
  canvas.fill()
  canvas.set_color("#FFFFFF")
  canvas.set_font_size(16)
  canvas.draw_text(btn7_x + 25, btn7_y + 17, "Speech Bubble")

  canvas.set_color("#AAAAAA")
  canvas.set_font_size(12)
  canvas.draw_text(btn7_x, btn7_y + 60, "radii = {15, 15, 15, 0}")

  -- 8. Zero radius (sharp corners - same as fill_rect)
  local btn8_x, btn8_y = 320, 400
  canvas.begin_path()
  canvas.round_rect(btn8_x, btn8_y, 180, 50, 0)
  canvas.set_color("#00CEC9")
  canvas.fill()
  canvas.set_color("#FFFFFF")
  canvas.set_font_size(16)
  canvas.draw_text(btn8_x + 30, btn8_y + 17, "Sharp (radii=0)")

  canvas.set_color("#AAAAAA")
  canvas.set_font_size(12)
  canvas.draw_text(btn8_x, btn8_y + 60, "round_rect(x, y, w, h, 0)")

  -- Card with rounded corners at bottom
  canvas.set_color("#FFFFFF")
  canvas.set_font_size(14)
  canvas.draw_text(20, 490, "Tip: Hover over buttons on the left to see color change!")
  canvas.draw_text(20, 510, "Radii format: {top-left, top-right, bottom-right, bottom-left}")
end)

canvas.start()
