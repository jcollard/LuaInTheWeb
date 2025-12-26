-- canvas/text/text-metrics.lua
-- Demonstrates: get_text_metrics() for detailed text measurements
-- Features: get_text_metrics, get_text_width, set_font_size, set_font_family
-- Controls: Left/Right arrows to cycle through fonts

local canvas = require("canvas")

-- Register fonts from the fonts directory
local fonts = {
  { name = "Bitfantasy", file = "../fonts/10px-Bitfantasy.ttf", size = 20 },
  { name = "HelvetiPixel", file = "../fonts/10px-HelvetiPixel.ttf", size = 20 },
  { name = "Questgiver", file = "../fonts/11px-Questgiver.ttf", size = 22 },
  { name = "TimesNewPixel", file = "../fonts/12px-TimesNewPixel.ttf", size = 24 },
  { name = "OldWizard", file = "../fonts/13px-OldWizard.ttf", size = 26 },
  { name = "DungeonSlant", file = "../fonts/15px-DungeonSlant.ttf", size = 30 },
  { name = "Gothbit", file = "../fonts/16px-Gothbit.ttf", size = 32 },
  { name = "IBM_VGA", file = "../fonts/16px-IBM_VGA_8x16.ttf", size = 32 },
}

-- Register all fonts
for _, font in ipairs(fonts) do
  canvas.assets.font(font.name, font.file)
end

local current_font_index = 1
local sample_text = "Hello, Canvas!"

local function draw()
  canvas.clear()

  local font = fonts[current_font_index]

  -- Background
  canvas.set_color(30, 30, 50)
  canvas.fill_rect(0, 0, 500, 400)

  -- Title
  canvas.set_color(255, 255, 255)
  canvas.set_font_family("monospace")
  canvas.set_font_size(14)
  canvas.draw_text(10, 15, "get_text_metrics() - Detailed text measurements")

  -- Font selector
  canvas.set_color(255, 200, 100)
  canvas.draw_text(10, 35, string.format("< Font %d/%d: %s (size %d) >",
    current_font_index, #fonts, font.name, font.size))
  canvas.set_color(150, 150, 150)
  canvas.draw_text(10, 52, "Use LEFT/RIGHT arrows to change font")

  -- Set font for sample text
  canvas.set_font_family(font.name)
  canvas.set_font_size(font.size)

  -- Get metrics
  local metrics = canvas.get_text_metrics(sample_text)
  local simple_width = canvas.get_text_width(sample_text)

  -- Draw the sample text
  local text_x = 50
  local text_y = 110

  canvas.set_color(255, 255, 100)
  canvas.draw_text(text_x, text_y, sample_text)

  -- Visualize the metrics with lines and boxes
  local actual_width = (metrics.actualBoundingBoxLeft or 0) + (metrics.actualBoundingBoxRight or metrics.width)

  -- Width line (green)
  canvas.set_color(0, 255, 0, 150)
  canvas.set_line_width(2)
  canvas.draw_line(text_x, text_y + 5, text_x + actual_width, text_y + 5)

  -- Baseline indicator (red)
  canvas.set_color(255, 0, 0)
  canvas.set_line_width(1)
  canvas.draw_line(text_x - 10, text_y, text_x + actual_width + 10, text_y)

  -- Ascent line (cyan)
  local ascent = metrics.actualBoundingBoxAscent or metrics.fontBoundingBoxAscent or font.size * 0.8
  canvas.set_color(0, 200, 255)
  canvas.draw_line(text_x - 10, text_y - ascent, text_x + actual_width + 10, text_y - ascent)

  -- Descent line (pink)
  local descent = metrics.actualBoundingBoxDescent or metrics.fontBoundingBoxDescent or font.size * 0.2
  canvas.set_color(255, 100, 255)
  canvas.draw_line(text_x - 10, text_y + descent, text_x + actual_width + 10, text_y + descent)

  -- Display metrics values
  canvas.set_font_family("monospace")
  canvas.set_font_size(11)
  canvas.set_color(200, 200, 200)

  local y = 160
  local line_height = 16

  canvas.draw_text(20, y, "Text Metrics for: \"" .. sample_text .. "\"")
  y = y + line_height + 5

  canvas.set_color(150, 255, 150)
  canvas.draw_text(20, y, string.format("width: %.1f", metrics.width or 0))
  y = y + line_height

  canvas.draw_text(20, y, string.format("get_text_width(): %.1f", simple_width))
  y = y + line_height

  canvas.set_color(100, 200, 255)
  canvas.draw_text(20, y, string.format("actualBoundingBoxAscent: %.1f", metrics.actualBoundingBoxAscent or 0))
  y = y + line_height

  canvas.set_color(255, 100, 255)
  canvas.draw_text(20, y, string.format("actualBoundingBoxDescent: %.1f", metrics.actualBoundingBoxDescent or 0))
  y = y + line_height

  canvas.set_color(200, 200, 100)
  canvas.draw_text(20, y, string.format("actualBoundingBoxLeft: %.1f", metrics.actualBoundingBoxLeft or 0))
  y = y + line_height

  canvas.draw_text(20, y, string.format("actualBoundingBoxRight: %.1f", metrics.actualBoundingBoxRight or 0))
  y = y + line_height + 5

  -- Font bounding box (full font metrics)
  canvas.set_color(180, 180, 180)
  canvas.draw_text(20, y, string.format("fontBoundingBoxAscent: %.1f", metrics.fontBoundingBoxAscent or 0))
  y = y + line_height

  canvas.draw_text(20, y, string.format("fontBoundingBoxDescent: %.1f", metrics.fontBoundingBoxDescent or 0))

  -- Legend
  canvas.set_font_size(10)
  canvas.set_color(255, 0, 0)
  canvas.draw_text(320, 160, "Red: Baseline")
  canvas.set_color(0, 200, 255)
  canvas.draw_text(320, 175, "Cyan: Ascent")
  canvas.set_color(255, 100, 255)
  canvas.draw_text(320, 190, "Pink: Descent")
  canvas.set_color(0, 255, 0)
  canvas.draw_text(320, 205, "Green: Width")
end

local function update()
  -- Cycle fonts with left/right arrows
  if canvas.is_key_pressed(canvas.keys.LEFT) or canvas.is_key_pressed(canvas.keys.ARROW_LEFT) then
    current_font_index = current_font_index - 1
    if current_font_index < 1 then
      current_font_index = #fonts
    end
  end

  if canvas.is_key_pressed(canvas.keys.RIGHT) or canvas.is_key_pressed(canvas.keys.ARROW_RIGHT) then
    current_font_index = current_font_index + 1
    if current_font_index > #fonts then
      current_font_index = 1
    end
  end
end

local function game()
  update()
  draw()
end

canvas.set_size(500, 400)
canvas.tick(game)
canvas.start()
