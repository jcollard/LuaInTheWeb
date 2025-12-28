-- canvas/styling/filter-effects.lua
-- Demonstrates set_filter() for CSS filter effects on canvas

local canvas = require("canvas")

-- Colors
local BG_COLOR = "#1a1a2e"
local TEXT_COLOR = "#FFFFFF"
local ACCENT_COLOR = "#4ECDC4"

canvas.set_size(600, 450)

-- Current filter index
local current_filter = 1
local last_filter = 0

-- Filter presets to demonstrate
local filters = {
  {name = "None", value = "none"},
  {name = "Blur", value = "blur(3px)"},
  {name = "Brightness", value = "brightness(1.5)"},
  {name = "Contrast", value = "contrast(2)"},
  {name = "Grayscale", value = "grayscale(100%)"},
  {name = "Sepia", value = "sepia(100%)"},
  {name = "Saturate", value = "saturate(3)"},
  {name = "Hue Rotate", value = "hue-rotate(90deg)"},
  {name = "Invert", value = "invert(100%)"},
  {name = "Combined", value = "blur(1px) brightness(1.2) contrast(1.2)"},
}

-- Draw a colorful test scene
local function draw_test_scene(x, y, w, h)
  -- Sky gradient
  local sky = canvas.create_linear_gradient(x, y, x, y + h/2)
  sky:add_color_stop(0, "#87CEEB")
  sky:add_color_stop(1, "#4682B4")
  canvas.set_fill_style(sky)
  canvas.fill_rect(x, y, w, h/2)

  -- Ground
  canvas.set_fill_style("#228B22")
  canvas.fill_rect(x, y + h/2, w, h/2)

  -- Sun
  canvas.set_fill_style("#FFD700")
  canvas.fill_circle(x + w - 40, y + 40, 25)

  -- House
  canvas.set_fill_style("#8B4513")
  canvas.fill_rect(x + 30, y + h/2 - 50, 80, 60)

  -- Roof
  canvas.set_fill_style("#A52A2A")
  canvas.begin_path()
  canvas.move_to(x + 20, y + h/2 - 50)
  canvas.line_to(x + 70, y + h/2 - 90)
  canvas.line_to(x + 120, y + h/2 - 50)
  canvas.close_path()
  canvas.fill()

  -- Door
  canvas.set_fill_style("#654321")
  canvas.fill_rect(x + 55, y + h/2 - 30, 20, 40)

  -- Windows
  canvas.set_fill_style("#ADD8E6")
  canvas.fill_rect(x + 35, y + h/2 - 45, 15, 15)
  canvas.fill_rect(x + 80, y + h/2 - 45, 15, 15)

  -- Tree
  canvas.set_fill_style("#8B4513")
  canvas.fill_rect(x + 150, y + h/2 - 40, 15, 50)
  canvas.set_fill_style("#228B22")
  canvas.fill_circle(x + 157, y + h/2 - 55, 30)

  -- Flowers
  canvas.set_fill_style("#FF69B4")
  canvas.fill_circle(x + 200, y + h/2 + 15, 8)
  canvas.fill_circle(x + 220, y + h/2 + 10, 8)
  canvas.set_fill_style("#FFD700")
  canvas.fill_circle(x + 235, y + h/2 + 18, 8)
end

canvas.tick(function()
  local w, h = canvas.get_width(), canvas.get_height()

  -- Handle input
  if canvas.is_key_pressed("space") or canvas.is_mouse_pressed(0) then
    current_filter = current_filter + 1
    if current_filter > #filters then
      current_filter = 1
    end
  end
  if canvas.is_key_pressed("left") then
    current_filter = current_filter - 1
    if current_filter < 1 then
      current_filter = #filters
    end
  end
  if canvas.is_key_pressed("right") then
    current_filter = current_filter + 1
    if current_filter > #filters then
      current_filter = 1
    end
  end

  -- Only redraw on filter change
  if current_filter == last_filter then
    return
  end
  last_filter = current_filter

  canvas.clear()

  -- Background
  canvas.set_fill_style(BG_COLOR)
  canvas.fill_rect(0, 0, w, h)

  -- Title
  canvas.set_filter("none")
  canvas.set_fill_style(ACCENT_COLOR)
  canvas.set_font_size(22)
  canvas.set_text_align("center")
  canvas.set_text_baseline("top")
  canvas.draw_text(w / 2, 15, "CSS Filter Effects Demo")

  -- =========================================================================
  -- Left side: Original (no filter)
  -- =========================================================================
  canvas.set_filter("none")
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_font_size(14)
  canvas.set_text_align("center")
  canvas.draw_text(150, 55, "Original")

  -- Draw test scene
  draw_test_scene(20, 75, 260, 180)

  -- =========================================================================
  -- Right side: With filter applied
  -- =========================================================================
  local filter = filters[current_filter]
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_font_size(14)
  canvas.set_text_align("center")
  canvas.draw_text(450, 55, filter.name)

  -- Apply filter and draw scene
  canvas.set_filter(filter.value)
  draw_test_scene(320, 75, 260, 180)

  -- Clear filter for UI
  canvas.set_filter("none")

  -- =========================================================================
  -- Filter code example
  -- =========================================================================
  canvas.set_fill_style("#2d2d44")
  canvas.fill_rect(20, 275, w - 40, 50)

  canvas.set_fill_style("#00FF00")
  canvas.set_font_size(12)
  canvas.set_text_align("left")
  canvas.draw_text(30, 290, "canvas.set_filter(\"" .. filter.value .. "\")")

  -- =========================================================================
  -- Filter list
  -- =========================================================================
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_font_size(12)
  canvas.set_text_align("left")
  canvas.draw_text(20, 340, "Available filters:")

  local col = 0
  local row = 0
  for i, f in ipairs(filters) do
    local fx = 30 + col * 150
    local fy = 360 + row * 18

    if i == current_filter then
      canvas.set_fill_style(ACCENT_COLOR)
    else
      canvas.set_fill_style("#888888")
    end
    canvas.draw_text(fx, fy, i .. ". " .. f.name)

    col = col + 1
    if col >= 4 then
      col = 0
      row = row + 1
    end
  end

  -- Instructions
  canvas.set_fill_style("#666666")
  canvas.set_font_size(10)
  canvas.set_text_align("center")
  canvas.draw_text(w / 2, h - 20, "Press SPACE, click, or use LEFT/RIGHT arrows to cycle filters")
end)

canvas.start()
