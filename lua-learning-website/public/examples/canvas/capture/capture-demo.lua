-- canvas/capture/capture-demo.lua
-- Demonstrates canvas.capture() for taking snapshots as data URLs

local canvas = require("canvas")

-- Colors
local BG_COLOR = "#1a1a2e"
local TEXT_COLOR = "#FFFFFF"
local ACCENT_COLOR = "#4ECDC4"

canvas.set_size(550, 420)

-- State
local captured_url = nil
local capture_time = nil
local capture_format = "png"

-- Draw the test scene that will be captured
local function draw_test_scene()
  -- Colorful scene
  local sky = canvas.create_linear_gradient(100, 60, 100, 160)
  sky:add_color_stop(0, "#FF6B6B")
  sky:add_color_stop(0.5, "#FFD93D")
  sky:add_color_stop(1, "#6BCB77")
  canvas.set_fill_style(sky)
  canvas.fill_rect(100, 60, 200, 130)

  -- Shapes
  canvas.set_fill_style("#4D96FF")
  canvas.fill_circle(150, 100, 25)

  canvas.set_fill_style("#FF6B6B")
  canvas.fill_rect(200, 90, 40, 40)

  canvas.set_fill_style("#C3FF93")
  canvas.begin_path()
  canvas.move_to(270, 70)
  canvas.line_to(290, 120)
  canvas.line_to(250, 120)
  canvas.close_path()
  canvas.fill()

  -- Text
  canvas.set_fill_style("#FFFFFF")
  canvas.set_font_size(14)
  canvas.set_text_align("center")
  canvas.draw_text(200, 165, "Capture Me!")
end

canvas.tick(function()
  local w, h = canvas.get_width(), canvas.get_height()
  local time = canvas.get_time()

  -- Handle capture on key press
  if canvas.is_key_pressed("1") then
    capture_format = "png"
    captured_url = canvas.capture({format = "png"})
    capture_time = time
  elseif canvas.is_key_pressed("2") then
    capture_format = "jpeg"
    captured_url = canvas.capture({format = "jpeg", quality = 0.9})
    capture_time = time
  elseif canvas.is_key_pressed("3") then
    capture_format = "webp"
    captured_url = canvas.capture({format = "webp", quality = 0.85})
    capture_time = time
  elseif canvas.is_key_pressed("space") then
    capture_format = "png"
    captured_url = canvas.capture()
    capture_time = time
  end

  canvas.clear()

  -- Background
  canvas.set_fill_style(BG_COLOR)
  canvas.fill_rect(0, 0, w, h)

  -- Title
  canvas.set_fill_style(ACCENT_COLOR)
  canvas.set_font_size(22)
  canvas.set_text_align("center")
  canvas.set_text_baseline("top")
  canvas.draw_text(w / 2, 15, "Canvas Capture Demo")

  -- =========================================================================
  -- Draw the capturable scene
  -- =========================================================================
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_font_size(14)
  canvas.set_text_align("left")
  canvas.draw_text(100, 48, "Canvas Scene:")

  draw_test_scene()

  -- Border around scene
  canvas.set_stroke_style("#666666")
  canvas.set_line_width(2)
  canvas.begin_path()
  canvas.move_to(100, 60)
  canvas.line_to(300, 60)
  canvas.line_to(300, 190)
  canvas.line_to(100, 190)
  canvas.close_path()
  canvas.stroke()

  -- =========================================================================
  -- Capture status and info
  -- =========================================================================
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_font_size(14)
  canvas.set_text_align("left")
  canvas.draw_text(330, 60, "Capture Status:")

  if captured_url then
    canvas.set_fill_style("#4CAF50")
    canvas.set_font_size(12)
    canvas.draw_text(330, 82, "Captured!")

    canvas.set_fill_style("#888888")
    canvas.draw_text(330, 100, "Format: " .. capture_format)

    -- Show URL preview (truncated)
    local url_preview = captured_url:sub(1, 35) .. "..."
    canvas.draw_text(330, 118, "URL: " .. url_preview)

    -- Show length
    canvas.draw_text(330, 136, "Length: " .. #captured_url .. " chars")

    -- Flash effect
    if capture_time and (time - capture_time) < 0.3 then
      canvas.set_fill_style("#FFFFFF" .. string.format("%02X", math.floor((1 - (time - capture_time) / 0.3) * 128)))
      canvas.fill_rect(100, 60, 200, 130)
    end
  else
    canvas.set_fill_style("#888888")
    canvas.set_font_size(12)
    canvas.draw_text(330, 82, "Press a key to capture")
  end

  -- =========================================================================
  -- Format options
  -- =========================================================================
  canvas.set_fill_style("#2d2d44")
  canvas.fill_rect(20, 210, w - 40, 100)

  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_font_size(14)
  canvas.draw_text(30, 225, "Capture Options:")

  canvas.set_font_size(12)
  local options = {
    {key = "SPACE", desc = "Default (PNG)", code = "canvas.capture()"},
    {key = "1", desc = "PNG format", code = "canvas.capture({format = \"png\"})"},
    {key = "2", desc = "JPEG (quality 0.9)", code = "canvas.capture({format = \"jpeg\", quality = 0.9})"},
    {key = "3", desc = "WebP (quality 0.85)", code = "canvas.capture({format = \"webp\", quality = 0.85})"},
  }

  for i, opt in ipairs(options) do
    local y = 245 + (i - 1) * 16
    canvas.set_fill_style(ACCENT_COLOR)
    canvas.draw_text(35, y, "[" .. opt.key .. "]")
    canvas.set_fill_style("#888888")
    canvas.draw_text(90, y, opt.desc)
    canvas.set_fill_style("#00FF00")
    canvas.draw_text(240, y, opt.code)
  end

  -- =========================================================================
  -- Code example
  -- =========================================================================
  canvas.set_fill_style(TEXT_COLOR)
  canvas.set_font_size(14)
  canvas.set_text_align("left")
  canvas.draw_text(20, 330, "Usage Example:")

  canvas.set_fill_style("#2d2d44")
  canvas.fill_rect(20, 345, w - 40, 55)

  canvas.set_fill_style("#00FF00")
  canvas.set_font_size(11)
  canvas.draw_text(30, 358, "-- Capture canvas as data URL")
  canvas.draw_text(30, 372, "local url = canvas.capture({format = \"png\"})")
  canvas.draw_text(30, 386, "-- url is 'data:image/png;base64,...'")

  -- Footer
  canvas.set_fill_style("#666666")
  canvas.set_font_size(10)
  canvas.set_text_align("center")
  canvas.draw_text(w / 2, h - 12, "canvas.capture() returns a data URL for saving or displaying elsewhere")
end)

canvas.start()
