-- canvas/styling/dashed-lines.lua
-- Demonstrates line dash patterns and animated marching ants effect

local canvas = require("canvas")

canvas.set_size(500, 400)

local offset = 0

canvas.tick(function()
  canvas.clear()

  -- ===========================================
  -- DASH PATTERNS (static, no animation)
  -- ===========================================

  canvas.set_color(80, 80, 80)
  canvas.set_font_size(16)
  canvas.draw_text(20, 25, "Dash Patterns")

  canvas.set_line_width(3)
  canvas.set_line_dash_offset(0)  -- Reset offset for static patterns

  -- Simple dashed line
  canvas.set_line_dash({10, 5})
  canvas.set_color(100, 150, 255)
  canvas.begin_path()
  canvas.move_to(50, 50)
  canvas.line_to(300, 50)
  canvas.stroke()
  canvas.set_color(60, 60, 60)
  canvas.set_font_size(12)
  canvas.draw_text(310, 45, "{10, 5}")

  -- Dotted line
  canvas.set_line_dash({2, 6})
  canvas.set_color(255, 150, 100)
  canvas.begin_path()
  canvas.move_to(50, 80)
  canvas.line_to(300, 80)
  canvas.stroke()
  canvas.set_color(60, 60, 60)
  canvas.draw_text(310, 75, "{2, 6}")

  -- Dash-dot pattern
  canvas.set_line_dash({15, 5, 5, 5})
  canvas.set_color(100, 200, 150)
  canvas.begin_path()
  canvas.move_to(50, 110)
  canvas.line_to(300, 110)
  canvas.stroke()
  canvas.set_color(60, 60, 60)
  canvas.draw_text(310, 105, "{15, 5, 5, 5}")

  -- Long dashes
  canvas.set_line_dash({25, 10})
  canvas.set_color(200, 100, 200)
  canvas.begin_path()
  canvas.move_to(50, 140)
  canvas.line_to(300, 140)
  canvas.stroke()
  canvas.set_color(60, 60, 60)
  canvas.draw_text(310, 135, "{25, 10}")

  -- ===========================================
  -- ANIMATED MARCHING ANTS
  -- ===========================================

  canvas.set_color(80, 80, 80)
  canvas.set_font_size(16)
  canvas.draw_text(20, 185, "Marching Ants Selection")

  -- Update offset for animation
  offset = offset + 0.5
  if offset > 16 then
    offset = 0
  end

  -- Selection rectangle with marching ants
  canvas.set_line_dash({4, 4})
  canvas.set_line_dash_offset(offset)
  canvas.set_line_width(2)
  canvas.set_color(0, 120, 255)
  canvas.begin_path()
  canvas.draw_rect(50, 210, 200, 100)
  canvas.stroke()

  -- Second selection with different speed
  canvas.set_line_dash_offset(-offset * 1.5)
  canvas.set_color(255, 100, 100)
  canvas.begin_path()
  canvas.draw_rect(270, 210, 150, 100)
  canvas.stroke()

  -- ===========================================
  -- SOLID LINE (RESET)
  -- ===========================================

  canvas.set_color(80, 80, 80)
  canvas.set_font_size(16)
  canvas.draw_text(20, 345, "Solid Line (reset)")

  -- Reset to solid line
  canvas.set_line_dash({})
  canvas.set_line_width(3)
  canvas.set_color(50, 50, 50)
  canvas.begin_path()
  canvas.move_to(50, 370)
  canvas.line_to(300, 370)
  canvas.stroke()
  canvas.set_color(60, 60, 60)
  canvas.set_font_size(12)
  canvas.draw_text(310, 365, "{} = solid")
end)

canvas.start()
