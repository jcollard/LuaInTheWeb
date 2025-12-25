-- canvas/path/clipping-demo.lua
-- Demonstrates canvas.clip() for constraining drawing regions

local canvas = require("canvas")

local time = 0

canvas.tick(function()
  canvas.clear()
  time = time + canvas.get_delta()

  -- Title
  canvas.set_color(50, 50, 50)
  canvas.set_font_size(20)
  canvas.draw_text(10, 10, "Clipping Demo")

  -- ===========================================
  -- Example 1: Circular Viewport
  -- ===========================================
  canvas.set_font_size(14)
  canvas.set_color(100, 100, 100)
  canvas.draw_text(50, 50, "Circular Viewport")

  canvas.save()

  -- Create circular clipping region
  canvas.begin_path()
  canvas.arc(120, 130, 50, 0, math.pi * 2)
  canvas.clip()

  -- Draw horizontal stripes (clipped to circle)
  for i = 0, 200, 10 do
    local hue = (i + time * 50) % 200
    canvas.set_color(200 - hue, 100, hue + 55)
    canvas.fill_rect(50, 60 + i, 140, 5)
  end

  canvas.restore()  -- Remove clipping

  -- Draw circle outline (not clipped)
  canvas.set_color(0, 0, 0)
  canvas.set_line_width(2)
  canvas.begin_path()
  canvas.arc(120, 130, 50, 0, math.pi * 2)
  canvas.stroke()

  -- ===========================================
  -- Example 2: Star Mask
  -- ===========================================
  canvas.set_color(100, 100, 100)
  canvas.draw_text(220, 50, "Star Clipping")

  canvas.save()

  -- Create star-shaped clipping region
  canvas.begin_path()
  local cx, cy = 290, 130
  local outerR, innerR = 50, 20
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
  canvas.clip()

  -- Draw gradient background (clipped to star)
  for y = 60, 200, 2 do
    local t = (y - 60) / 140
    canvas.set_color(255 * (1 - t), 100, 255 * t)
    canvas.fill_rect(220, y, 140, 2)
  end

  canvas.restore()

  -- Draw star outline
  canvas.set_color(0, 0, 0)
  canvas.set_line_width(2)
  canvas.begin_path()
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
  canvas.stroke()

  -- ===========================================
  -- Example 3: Animated Reveal
  -- ===========================================
  canvas.set_color(100, 100, 100)
  canvas.draw_text(50, 210, "Animated Reveal")

  canvas.save()

  -- Animated circular clip that grows and shrinks
  local radius = 30 + 20 * math.sin(time * 2)
  canvas.begin_path()
  canvas.arc(120, 280, radius, 0, math.pi * 2)
  canvas.clip()

  -- Draw checkerboard (clipped)
  for row = 0, 8 do
    for col = 0, 8 do
      if (row + col) % 2 == 0 then
        canvas.set_color(70, 130, 180)
      else
        canvas.set_color(255, 215, 0)
      end
      canvas.fill_rect(60 + col * 15, 220 + row * 15, 15, 15)
    end
  end

  canvas.restore()

  -- ===========================================
  -- Example 4: Nested Clipping
  -- ===========================================
  canvas.set_color(100, 100, 100)
  canvas.draw_text(220, 210, "Nested Clips")

  canvas.save()

  -- Outer rectangle clip
  canvas.begin_path()
  canvas.round_rect(230, 230, 120, 100, 10)
  canvas.clip()

  -- Draw base color
  canvas.set_color(200, 200, 220)
  canvas.fill_rect(230, 230, 120, 100)

  canvas.save()

  -- Inner circle clip (intersects with rectangle)
  canvas.begin_path()
  canvas.arc(290, 280, 40, 0, math.pi * 2)
  canvas.clip()

  -- Draw spinning lines (double-clipped)
  for i = 0, 11 do
    local angle = time + (i * math.pi / 6)
    canvas.set_color(255 * (i / 12), 100, 255 * (1 - i / 12))
    canvas.set_line_width(3)
    canvas.begin_path()
    canvas.move_to(290, 280)
    canvas.line_to(290 + 60 * math.cos(angle), 280 + 60 * math.sin(angle))
    canvas.stroke()
  end

  canvas.restore()  -- Remove inner clip
  canvas.restore()  -- Remove outer clip
end)

canvas.start()
