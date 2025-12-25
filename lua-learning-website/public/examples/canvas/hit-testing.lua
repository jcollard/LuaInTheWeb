-- Hit Testing Demo
-- Demonstrates canvas.is_point_in_path() and canvas.is_point_in_stroke()
-- for detecting mouse hover and clicks on complex shapes

local canvas = require("canvas")

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
  canvas.set_font_size(20)
  canvas.draw_text(10, 10, "Hit Testing Demo")

  canvas.set_font_size(12)
  canvas.set_color(100, 100, 100)
  canvas.draw_text(10, 35, "Hover over shapes to highlight - Click to select")

  -- ===========================================
  -- Example 1: Triangle with is_point_in_path
  -- ===========================================
  canvas.set_font_size(14)
  canvas.set_color(100, 100, 100)
  canvas.draw_text(50, 70, "Triangle (is_point_in_path)")

  canvas.begin_path()
  canvas.move_to(100, 100)
  canvas.line_to(50, 180)
  canvas.line_to(150, 180)
  canvas.close_path()

  local inTriangle = canvas.is_point_in_path(mx, my)

  if canvas.is_mouse_pressed(0) and inTriangle then
    clickedShape = "triangle"
    clickTime = time
  end

  if inTriangle then
    canvas.set_color(255, 100, 100)  -- Red on hover
  elseif clickedShape == "triangle" and time - clickTime < 0.5 then
    canvas.set_color(255, 200, 100)  -- Orange flash on click
  else
    canvas.set_color(150, 150, 150)  -- Gray default
  end
  canvas.fill()

  canvas.set_color(0, 0, 0)
  canvas.set_line_width(2)
  canvas.stroke()

  -- ===========================================
  -- Example 2: Star with is_point_in_path
  -- ===========================================
  canvas.set_color(100, 100, 100)
  canvas.draw_text(200, 70, "Star (is_point_in_path)")

  canvas.begin_path()
  local cx, cy = 250, 140
  local outerR, innerR = 45, 18
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
    canvas.set_color(255, 215, 0)  -- Gold on hover
  elseif clickedShape == "star" and time - clickTime < 0.5 then
    canvas.set_color(255, 255, 150)  -- Bright flash
  else
    canvas.set_color(180, 150, 100)  -- Tan default
  end
  canvas.fill()

  canvas.set_color(0, 0, 0)
  canvas.set_line_width(2)
  canvas.stroke()

  -- ===========================================
  -- Example 3: Circle with is_point_in_path
  -- ===========================================
  canvas.set_color(100, 100, 100)
  canvas.draw_text(330, 70, "Circle (is_point_in_path)")

  canvas.begin_path()
  canvas.arc(380, 140, 40, 0, math.pi * 2)

  local inCircle = canvas.is_point_in_path(mx, my)

  if canvas.is_mouse_pressed(0) and inCircle then
    clickedShape = "circle"
    clickTime = time
  end

  if inCircle then
    canvas.set_color(100, 200, 255)  -- Light blue on hover
  elseif clickedShape == "circle" and time - clickTime < 0.5 then
    canvas.set_color(200, 255, 255)  -- Bright flash
  else
    canvas.set_color(100, 150, 180)  -- Steel blue default
  end
  canvas.fill()

  canvas.set_color(0, 0, 0)
  canvas.set_line_width(2)
  canvas.stroke()

  -- ===========================================
  -- Example 4: Ring with evenodd fill rule
  -- ===========================================
  canvas.set_color(100, 100, 100)
  canvas.draw_text(50, 210, "Ring (evenodd fill rule)")

  -- Outer circle
  canvas.begin_path()
  canvas.arc(100, 280, 45, 0, math.pi * 2)
  -- Inner circle (creates hole)
  canvas.arc(100, 280, 20, 0, math.pi * 2)

  local inRing = canvas.is_point_in_path(mx, my, "evenodd")

  if canvas.is_mouse_pressed(0) and inRing then
    clickedShape = "ring"
    clickTime = time
  end

  if inRing then
    canvas.set_color(150, 255, 150)  -- Green on hover
  elseif clickedShape == "ring" and time - clickTime < 0.5 then
    canvas.set_color(200, 255, 200)  -- Bright flash
  else
    canvas.set_color(100, 180, 100)  -- Dark green default
  end
  canvas.fill("evenodd")

  canvas.set_color(0, 0, 0)
  canvas.set_line_width(2)
  canvas.stroke()

  -- ===========================================
  -- Example 5: Lines with is_point_in_stroke
  -- ===========================================
  canvas.set_color(100, 100, 100)
  canvas.draw_text(200, 210, "Lines (is_point_in_stroke)")

  -- Line 1
  canvas.set_line_width(8)
  canvas.begin_path()
  canvas.move_to(220, 250)
  canvas.line_to(320, 310)

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

  -- Line 2
  canvas.begin_path()
  canvas.move_to(220, 310)
  canvas.line_to(320, 250)

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

  -- ===========================================
  -- Example 6: Bezier curve with is_point_in_stroke
  -- ===========================================
  canvas.set_color(100, 100, 100)
  canvas.draw_text(350, 210, "Curve (is_point_in_stroke)")

  canvas.set_line_width(6)
  canvas.begin_path()
  canvas.move_to(350, 280)
  canvas.bezier_curve_to(380, 220, 420, 340, 450, 280)

  local onCurve = canvas.is_point_in_stroke(mx, my)

  if canvas.is_mouse_pressed(0) and onCurve then
    clickedShape = "curve"
    clickTime = time
  end

  if onCurve then
    canvas.set_color(255, 100, 255)  -- Magenta on hover
  elseif clickedShape == "curve" and time - clickTime < 0.5 then
    canvas.set_color(255, 200, 255)  -- Bright flash
  else
    canvas.set_color(150, 50, 150)  -- Purple default
  end
  canvas.stroke()

  -- ===========================================
  -- Status display
  -- ===========================================
  canvas.set_font_size(12)
  canvas.set_color(50, 50, 50)
  canvas.draw_text(10, 350, string.format("Mouse: (%.0f, %.0f)", mx, my))

  if clickedShape then
    canvas.draw_text(10, 370, "Last clicked: " .. clickedShape)
  end
end)

canvas.start()
