-- canvas/pixels/dirty-rect-demo.lua
-- Demonstrates put_image_data() with dirty rectangle parameters

local canvas = require('canvas')

canvas.set_size(550, 400)

-- State
local frame = 0
local full_image = nil
local demo_ready = false
local animation_offset = 0

-- Create a colorful checkerboard pattern
local function create_checkerboard()
  local img = canvas.create_image_data(100, 100)
  local colors = {
    {255, 100, 100, 255},  -- Red
    {100, 255, 100, 255},  -- Green
    {100, 100, 255, 255},  -- Blue
    {255, 255, 100, 255},  -- Yellow
  }
  for y = 0, 99 do
    for x = 0, 99 do
      local cx = math.floor(x / 25) % 2
      local cy = math.floor(y / 25) % 2
      local colorIdx = (cx + cy * 2) % 4 + 1
      local c = colors[colorIdx]
      img:set_pixel(x, y, c[1], c[2], c[3], c[4])
    end
  end
  return img
end

canvas.tick(function()
  frame = frame + 1

  -- Frame 1: Initialize
  if frame == 1 then
    canvas.clear()
    canvas.set_fill_style("#1a1a2e")
    canvas.fill_rect(0, 0, 550, 400)

    canvas.set_fill_style("#4ECDC4")
    canvas.set_font_size(20)
    canvas.set_text_align("center")
    canvas.draw_text(275, 20, "Dirty Rectangle Demo")

    canvas.set_fill_style("#888888")
    canvas.set_font_size(14)
    canvas.draw_text(275, 200, "Creating image data...")
    return
  end

  -- Frame 2: Create the image
  if frame == 2 then
    full_image = create_checkerboard()
    demo_ready = true
    return
  end

  -- Main demo loop
  if demo_ready then
    -- Animate the dirty rect region
    animation_offset = math.floor(canvas.get_time() * 30) % 50

    canvas.clear()

    -- Background
    canvas.set_fill_style("#1a1a2e")
    canvas.fill_rect(0, 0, 550, 400)

    -- Title
    canvas.set_fill_style("#4ECDC4")
    canvas.set_font_size(20)
    canvas.set_text_align("center")
    canvas.draw_text(275, 20, "Dirty Rectangle Demo")

    -- =========================================================================
    -- Left side: Full image (no dirty rect)
    -- =========================================================================
    canvas.set_fill_style("#FFFFFF")
    canvas.set_font_size(14)
    canvas.set_text_align("center")
    canvas.draw_text(100, 60, "Full Image")

    -- Gray background to show image bounds
    canvas.set_fill_style("#333333")
    canvas.fill_rect(50, 80, 100, 100)

    -- Put entire image
    canvas.put_image_data(full_image, 50, 80)

    -- Draw border
    canvas.set_stroke_style("#666666")
    canvas.set_line_width(1)
    canvas.begin_path()
    canvas.move_to(50, 80)
    canvas.line_to(150, 80)
    canvas.line_to(150, 180)
    canvas.line_to(50, 180)
    canvas.close_path()
    canvas.stroke()

    -- Code example
    canvas.set_fill_style("#00FF00")
    canvas.set_font_size(10)
    canvas.set_text_align("left")
    canvas.draw_text(30, 195, "put_image_data(img, 50, 80)")

    -- =========================================================================
    -- Center: Dirty rect - fixed region
    -- =========================================================================
    canvas.set_fill_style("#FFFFFF")
    canvas.set_font_size(14)
    canvas.set_text_align("center")
    canvas.draw_text(275, 60, "With Dirty Rect")

    -- Gray background
    canvas.set_fill_style("#333333")
    canvas.fill_rect(225, 80, 100, 100)

    -- Put only center 50x50 region
    canvas.put_image_data(full_image, 225, 80, {
      dirty_x = 25,
      dirty_y = 25,
      dirty_width = 50,
      dirty_height = 50
    })

    -- Draw border for full image area
    canvas.set_stroke_style("#666666")
    canvas.set_line_width(1)
    canvas.begin_path()
    canvas.move_to(225, 80)
    canvas.line_to(325, 80)
    canvas.line_to(325, 180)
    canvas.line_to(225, 180)
    canvas.close_path()
    canvas.stroke()

    -- Highlight dirty region
    canvas.set_stroke_style("#FF6B6B")
    canvas.set_line_width(2)
    canvas.begin_path()
    canvas.move_to(250, 105)
    canvas.line_to(300, 105)
    canvas.line_to(300, 155)
    canvas.line_to(250, 155)
    canvas.close_path()
    canvas.stroke()

    -- Code example
    canvas.set_fill_style("#00FF00")
    canvas.set_font_size(10)
    canvas.set_text_align("left")
    canvas.draw_text(195, 195, "put_image_data(img, 225, 80, {")
    canvas.draw_text(200, 207, "  dirty_x = 25, dirty_y = 25,")
    canvas.draw_text(200, 219, "  dirty_width = 50, dirty_height = 50")
    canvas.draw_text(195, 231, "})")

    -- =========================================================================
    -- Right: Animated dirty rect
    -- =========================================================================
    canvas.set_fill_style("#FFFFFF")
    canvas.set_font_size(14)
    canvas.set_text_align("center")
    canvas.draw_text(450, 60, "Animated Region")

    -- Gray background
    canvas.set_fill_style("#333333")
    canvas.fill_rect(400, 80, 100, 100)

    -- Animated dirty rect
    canvas.put_image_data(full_image, 400, 80, {
      dirty_x = animation_offset,
      dirty_y = animation_offset,
      dirty_width = 50,
      dirty_height = 50
    })

    -- Draw border
    canvas.set_stroke_style("#666666")
    canvas.set_line_width(1)
    canvas.begin_path()
    canvas.move_to(400, 80)
    canvas.line_to(500, 80)
    canvas.line_to(500, 180)
    canvas.line_to(400, 180)
    canvas.close_path()
    canvas.stroke()

    -- Highlight moving dirty region
    canvas.set_stroke_style("#4ECDC4")
    canvas.set_line_width(2)
    canvas.begin_path()
    canvas.move_to(400 + animation_offset, 80 + animation_offset)
    canvas.line_to(450 + animation_offset, 80 + animation_offset)
    canvas.line_to(450 + animation_offset, 130 + animation_offset)
    canvas.line_to(400 + animation_offset, 130 + animation_offset)
    canvas.close_path()
    canvas.stroke()

    -- =========================================================================
    -- Explanation section
    -- =========================================================================
    canvas.set_fill_style("#2d2d44")
    canvas.fill_rect(20, 260, 510, 90)

    canvas.set_fill_style("#FFFFFF")
    canvas.set_font_size(13)
    canvas.set_text_align("left")
    canvas.draw_text(30, 280, "Dirty Rectangle Parameters:")

    canvas.set_fill_style("#888888")
    canvas.set_font_size(11)
    canvas.draw_text(30, 300, "dirty_x, dirty_y: Top-left corner of region within image data")
    canvas.draw_text(30, 315, "dirty_width, dirty_height: Size of region to copy")
    canvas.draw_text(30, 330, "Use case: Update only changed portions for better performance")

    -- Footer
    canvas.set_fill_style("#666666")
    canvas.set_font_size(10)
    canvas.set_text_align("center")
    canvas.draw_text(275, 375, "Dirty rectangles allow partial image updates for efficiency")
  end
end)

canvas.start()
