-- Hit Testing Demo
-- Demonstrates canvas.is_point_in_path() and canvas.is_point_in_stroke()
-- for detecting mouse hover and clicks on complex shapes

local canvas = require("canvas")

canvas.set_size(500, 420)

local time = 0
local clickedShape = nil
local clickTime = 0

canvas.tick(function()
  canvas.clear()
  time = time + canvas.get_delta()

  -- Get mouse position
  local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()

  -- Title
  canvas.set_color(50, 50, 50)
  canvas.set_font_size(18)
  canvas.draw_text(10, 10, "Hit Testing Demo")

  canvas.set_font_size(11)
  canvas.set_color(100, 100, 100)
  canvas.draw_text(10, 32, "Hover over shapes to highlight - Click to select")

  -- ===========================================
  -- Row 1: is_point_in_path examples
  -- ===========================================
  canvas.set_font_size(12)
  canvas.set_color(80, 80, 80)
  canvas.draw_text(10, 55, "is_point_in_path:")

  -- Triangle
  canvas.set_font_size(10)
  canvas.set_color(100, 100, 100)
  canvas.draw_text(40, 75, "Triangle")

  canvas.begin_path()
  canvas.move_to(70, 100)
  canvas.line_to(40, 160)
  canvas.line_to(100, 160)
  canvas.close_path()

  local inTriangle = canvas.is_point_in_path(mx, my)

  if canvas.is_mouse_pressed(0) and inTriangle then
    clickedShape = "triangle"
    clickTime = time
  end

  if inTriangle then
    canvas.set_color(255, 100, 100)
  elseif clickedShape == "triangle" and time - clickTime < 0.5 then
    canvas.set_color(255, 200, 100)
  else
    canvas.set_color(150, 150, 150)
  end
  canvas.fill()
  canvas.set_color(50, 50, 50)
  canvas.set_line_width(2)
  canvas.stroke()

  -- Star
  canvas.set_color(100, 100, 100)
  canvas.draw_text(155, 75, "Star")

  canvas.begin_path()
  local cx, cy = 175, 130
  local outerR, innerR = 35, 14
  local points = 5

  for i = 0, points * 2 - 1 do
    local angle = (i * math.pi / points) - math.pi / 2
    local r = (i % 2 == 0) and outerR or innerR
    local px = cx + r * math.cos(angle)
    local py = cy + r * math.sin(angle)
    if i == 0 then
      canvas.move_to(px, py)
    else
      canvas.line_to(px, py)
    end
  end
  canvas.close_path()

  local inStar = canvas.is_point_in_path(mx, my)

  if canvas.is_mouse_pressed(0) and inStar then
    clickedShape = "star"
    clickTime = time
  end

  if inStar then
    canvas.set_color(255, 215, 0)
  elseif clickedShape == "star" and time - clickTime < 0.5 then
    canvas.set_color(255, 255, 150)
  else
    canvas.set_color(180, 150, 100)
  end
  canvas.fill()
  canvas.set_color(50, 50, 50)
  canvas.set_line_width(2)
  canvas.stroke()

  -- Circle
  canvas.set_color(100, 100, 100)
  canvas.draw_text(255, 75, "Circle")

  canvas.begin_path()
  canvas.arc(280, 130, 30, 0, math.pi * 2)

  local inCircle = canvas.is_point_in_path(mx, my)

  if canvas.is_mouse_pressed(0) and inCircle then
    clickedShape = "circle"
    clickTime = time
  end

  if inCircle then
    canvas.set_color(100, 200, 255)
  elseif clickedShape == "circle" and time - clickTime < 0.5 then
    canvas.set_color(200, 255, 255)
  else
    canvas.set_color(100, 150, 180)
  end
  canvas.fill()
  canvas.set_color(50, 50, 50)
  canvas.set_line_width(2)
  canvas.stroke()

  -- Ring (evenodd)
  canvas.set_color(100, 100, 100)
  canvas.draw_text(340, 75, "Ring (evenodd)")
  canvas.draw_text(340, 87, "hole = no hit")

  -- Outer circle
  canvas.begin_path()
  canvas.arc(380, 130, 35, 0, math.pi * 2)
  -- Inner circle (creates hole with evenodd)
  canvas.arc(380, 130, 15, 0, math.pi * 2)

  local inRing = canvas.is_point_in_path(mx, my, "evenodd")

  if canvas.is_mouse_pressed(0) and inRing then
    clickedShape = "ring"
    clickTime = time
  end

  if inRing then
    canvas.set_color(150, 255, 150)
  elseif clickedShape == "ring" and time - clickTime < 0.5 then
    canvas.set_color(200, 255, 200)
  else
    canvas.set_color(100, 180, 100)
  end
  canvas.fill("evenodd")
  canvas.set_color(50, 50, 50)
  canvas.set_line_width(2)
  canvas.stroke()

  -- ===========================================
  -- Row 2: is_point_in_stroke examples
  -- ===========================================
  canvas.set_color(80, 80, 80)
  canvas.set_font_size(12)
  canvas.draw_text(10, 190, "is_point_in_stroke:")

  -- Line 1 (diagonal)
  canvas.set_font_size(10)
  canvas.set_color(100, 100, 100)
  canvas.draw_text(40, 210, "Lines")

  canvas.set_line_width(6)
  canvas.begin_path()
  canvas.move_to(50, 230)
  canvas.line_to(110, 290)

  local onLine1 = canvas.is_point_in_stroke(mx, my)

  if canvas.is_mouse_pressed(0) and onLine1 then
    clickedShape = "line1"
    clickTime = time
  end

  if onLine1 then
    canvas.set_color(255, 100, 100)
  elseif clickedShape == "line1" and time - clickTime < 0.5 then
    canvas.set_color(255, 200, 100)
  else
    canvas.set_color(80, 80, 80)
  end
  canvas.stroke()

  -- Line 2 (other diagonal)
  canvas.begin_path()
  canvas.move_to(50, 290)
  canvas.line_to(110, 230)

  local onLine2 = canvas.is_point_in_stroke(mx, my)

  if canvas.is_mouse_pressed(0) and onLine2 then
    clickedShape = "line2"
    clickTime = time
  end

  if onLine2 then
    canvas.set_color(100, 100, 255)
  elseif clickedShape == "line2" and time - clickTime < 0.5 then
    canvas.set_color(150, 150, 255)
  else
    canvas.set_color(80, 80, 80)
  end
  canvas.stroke()

  -- Bezier curve
  canvas.set_color(100, 100, 100)
  canvas.draw_text(160, 210, "Curve")

  canvas.set_line_width(6)
  canvas.begin_path()
  canvas.move_to(150, 260)
  canvas.bezier_curve_to(180, 210, 220, 310, 250, 260)

  local onCurve = canvas.is_point_in_stroke(mx, my)

  if canvas.is_mouse_pressed(0) and onCurve then
    clickedShape = "curve"
    clickTime = time
  end

  if onCurve then
    canvas.set_color(255, 100, 255)
  elseif clickedShape == "curve" and time - clickTime < 0.5 then
    canvas.set_color(255, 200, 255)
  else
    canvas.set_color(150, 50, 150)
  end
  canvas.stroke()

  -- Rectangle outline
  canvas.set_color(100, 100, 100)
  canvas.draw_text(300, 210, "Rect outline")

  canvas.set_line_width(5)
  canvas.begin_path()
  canvas.move_to(300, 235)
  canvas.line_to(380, 235)
  canvas.line_to(380, 295)
  canvas.line_to(300, 295)
  canvas.close_path()

  local onRect = canvas.is_point_in_stroke(mx, my)

  if canvas.is_mouse_pressed(0) and onRect then
    clickedShape = "rect"
    clickTime = time
  end

  if onRect then
    canvas.set_color(255, 180, 100)
  elseif clickedShape == "rect" and time - clickTime < 0.5 then
    canvas.set_color(255, 220, 150)
  else
    canvas.set_color(180, 120, 60)
  end
  canvas.stroke()

  -- ===========================================
  -- Status display
  -- ===========================================
  canvas.set_font_size(11)
  canvas.set_color(80, 80, 80)
  canvas.draw_text(10, 320, string.format("Mouse: (%.0f, %.0f)", mx, my))

  if clickedShape then
    canvas.draw_text(10, 335, "Last clicked: " .. clickedShape)
  end

  -- Instructions
  canvas.set_color(60, 60, 60)
  canvas.set_font_size(10)
  canvas.draw_text(10, 360, "- Top row: hover inside shapes (is_point_in_path)")
  canvas.draw_text(10, 375, "- Bottom row: hover ON the lines (is_point_in_stroke)")
  canvas.draw_text(10, 390, "- Ring: hover the green part, NOT the center hole")
end)

canvas.start()
