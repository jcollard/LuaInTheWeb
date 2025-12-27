-- canvas/path/rect-path.lua
-- Demonstrates: rect() path method for adding rectangles to paths
-- Features: rect, begin_path, fill, stroke, close_path

local canvas = require("canvas")

local function draw()
  canvas.clear()

  -- Background
  canvas.set_color(35, 35, 55)
  canvas.fill_rect(0, 0, 450, 350)

  -- Title
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(14)
  canvas.draw_text(10, 25, "rect() - Add rectangles to paths")

  -- Example 1: Simple filled rectangle path
  canvas.set_color(200, 200, 200)
  canvas.set_font_size(11)
  canvas.draw_text(20, 55, "Filled rect path:")

  canvas.begin_path()
  canvas.rect(20, 65, 80, 50)
  canvas.set_color(100, 200, 100)
  canvas.fill()

  -- Example 2: Stroked rectangle path
  canvas.set_color(200, 200, 200)
  canvas.draw_text(120, 55, "Stroked rect path:")

  canvas.begin_path()
  canvas.rect(120, 65, 80, 50)
  canvas.set_color(100, 150, 255)
  canvas.set_line_width(3)
  canvas.stroke()

  -- Example 3: Multiple rectangles in one path
  canvas.set_color(200, 200, 200)
  canvas.draw_text(220, 55, "Multiple rects, one path:")

  canvas.begin_path()
  canvas.rect(220, 65, 40, 50)
  canvas.rect(270, 65, 40, 50)
  canvas.rect(320, 65, 40, 50)
  canvas.set_color(255, 200, 100)
  canvas.fill()
  canvas.set_color(100, 50, 0)
  canvas.set_line_width(2)
  canvas.stroke()

  -- Example 4: Combining rect with other path operations
  canvas.set_color(200, 200, 200)
  canvas.draw_text(20, 145, "Combined with lines:")

  canvas.begin_path()
  canvas.rect(20, 155, 60, 40)
  canvas.move_to(80, 175)
  canvas.line_to(120, 155)
  canvas.line_to(120, 195)
  canvas.close_path()
  canvas.set_color(200, 100, 200)
  canvas.fill()

  -- Example 5: Nested rectangles (using even-odd fill)
  canvas.set_color(200, 200, 200)
  canvas.draw_text(150, 145, "Nested rectangles:")

  canvas.begin_path()
  canvas.rect(150, 155, 80, 60)
  canvas.rect(165, 170, 50, 30)
  canvas.set_color(255, 100, 100)
  canvas.fill("evenodd")  -- Creates a "donut" effect

  -- Example 6: Building a simple shape with rect
  canvas.set_color(200, 200, 200)
  canvas.draw_text(260, 145, "Building shapes:")

  -- Draw a simple house using rect paths
  canvas.begin_path()
  -- House body
  canvas.rect(280, 180, 60, 40)
  canvas.set_color(200, 150, 100)
  canvas.fill()

  canvas.begin_path()
  -- Door
  canvas.rect(300, 195, 20, 25)
  canvas.set_color(100, 70, 50)
  canvas.fill()

  canvas.begin_path()
  -- Window
  canvas.rect(285, 185, 12, 12)
  canvas.set_color(150, 200, 255)
  canvas.fill()
  canvas.set_color(80, 80, 80)
  canvas.set_line_width(1)
  canvas.stroke()

  -- Example 7: Animated rectangles
  canvas.set_color(200, 200, 200)
  canvas.draw_text(20, 240, "Animated path rectangles:")

  local time = canvas.get_time()
  local pulse = math.sin(time * 3) * 0.3 + 0.7

  canvas.begin_path()
  local size = 30 * pulse
  local offset = (30 - size) / 2
  canvas.rect(20 + offset, 255 + offset, size, size)
  canvas.rect(60 + offset, 255 + offset, size, size)
  canvas.rect(100 + offset, 255 + offset, size, size)
  canvas.set_color(100, 255, 200)
  canvas.fill()

  -- Usage note
  canvas.set_color(150, 150, 150)
  canvas.set_font_size(10)
  canvas.draw_text(20, 320, "rect() adds to current path - use fill() or stroke() to render")
end

local function game()
  draw()
end

canvas.set_size(450, 350)
canvas.tick(game)
canvas.start()
