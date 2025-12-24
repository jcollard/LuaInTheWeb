-- Line Styles Demo
-- Demonstrates line cap, line join, and miter limit settings

local canvas = require("canvas")

canvas.set_size(500, 400)

canvas.tick(function()
  canvas.clear()

  local lineWidth = 15
  canvas.set_line_width(lineWidth)

  -- ===========================================
  -- LINE CAP STYLES (how line endpoints look)
  -- ===========================================

  canvas.set_color(80, 80, 80)
  canvas.set_font_size(16)
  canvas.draw_text(20, 25, "Line Cap Styles")

  -- Draw reference lines to show line extent
  canvas.set_color(200, 200, 200)
  canvas.set_line_width(1)
  canvas.draw_line(50, 50, 50, 170)   -- Start reference
  canvas.draw_line(200, 50, 200, 170) -- End reference
  canvas.set_line_width(lineWidth)

  local caps = {"butt", "round", "square"}
  local capColors = {
    {100, 150, 255},  -- Blue for butt
    {100, 255, 150},  -- Green for round
    {255, 150, 100},  -- Orange for square
  }

  for i, cap in ipairs(caps) do
    local y = 30 + i * 40
    canvas.set_line_cap(cap)
    canvas.set_color(capColors[i][1], capColors[i][2], capColors[i][3])
    canvas.begin_path()
    canvas.move_to(50, y)
    canvas.line_to(200, y)
    canvas.stroke()

    -- Label
    canvas.set_color(60, 60, 60)
    canvas.set_font_size(12)
    canvas.draw_text(210, y - 5, cap)
  end

  -- ===========================================
  -- LINE JOIN STYLES (how corners look)
  -- ===========================================

  canvas.set_color(80, 80, 80)
  canvas.set_font_size(16)
  canvas.draw_text(20, 210, "Line Join Styles")

  local joins = {"miter", "round", "bevel"}
  local joinColors = {
    {255, 100, 100},  -- Red for miter
    {100, 200, 255},  -- Cyan for round
    {200, 100, 255},  -- Purple for bevel
  }

  canvas.set_line_cap("butt")  -- Reset cap

  for i, join in ipairs(joins) do
    local baseX = 30 + (i - 1) * 160
    local baseY = 280

    canvas.set_line_join(join)
    canvas.set_color(joinColors[i][1], joinColors[i][2], joinColors[i][3])

    -- Draw a V-shape to show the corner
    canvas.begin_path()
    canvas.move_to(baseX, baseY)
    canvas.line_to(baseX + 50, baseY - 50)
    canvas.line_to(baseX + 100, baseY)
    canvas.stroke()

    -- Label
    canvas.set_color(60, 60, 60)
    canvas.set_font_size(12)
    canvas.draw_text(baseX + 30, baseY + 20, join)
  end

  -- ===========================================
  -- MITER LIMIT (controls sharp corner behavior)
  -- ===========================================

  canvas.set_color(80, 80, 80)
  canvas.set_font_size(16)
  canvas.draw_text(20, 340, "Miter Limit: 2 vs 20 (sharp angle)")

  canvas.set_line_join("miter")
  canvas.set_line_width(10)

  -- Low miter limit (becomes bevel on sharp angles)
  canvas.set_miter_limit(2)
  canvas.set_color(255, 180, 100)
  canvas.begin_path()
  canvas.move_to(50, 380)
  canvas.line_to(80, 355)
  canvas.line_to(110, 380)
  canvas.stroke()
  canvas.set_color(60, 60, 60)
  canvas.set_font_size(10)
  canvas.draw_text(60, 395, "limit=2")

  -- High miter limit (preserves sharp corner)
  canvas.set_miter_limit(20)
  canvas.set_color(100, 255, 180)
  canvas.begin_path()
  canvas.move_to(170, 380)
  canvas.line_to(200, 355)
  canvas.line_to(230, 380)
  canvas.stroke()
  canvas.set_color(60, 60, 60)
  canvas.draw_text(175, 395, "limit=20")
end)

canvas.start()
