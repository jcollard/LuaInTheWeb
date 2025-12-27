-- canvas/pixels/clone-image-data.lua
-- Demonstrates: clone_image_data() for copying pixel buffers
-- Features: clone_image_data, get_image_data, put_image_data, set_pixel

local canvas = require("canvas")

-- Store our image data objects
local original_data = nil
local cloned_data = nil
local modified_clone = nil

local initialized = false

local function initialize()
  -- Draw something colorful to capture
  canvas.set_color(255, 100, 100)
  canvas.fill_rect(10, 10, 30, 30)
  canvas.set_color(100, 255, 100)
  canvas.fill_rect(25, 25, 30, 30)
  canvas.set_color(100, 100, 255)
  canvas.fill_rect(40, 10, 30, 30)

  -- Capture the original image data
  original_data = canvas.get_image_data(10, 10, 60, 45)

  -- Clone it (independent copy)
  cloned_data = canvas.clone_image_data(original_data)

  -- Clone again and modify
  modified_clone = canvas.clone_image_data(original_data)

  -- Apply an effect to the modified clone (invert colors)
  for y = 0, modified_clone.height - 1 do
    for x = 0, modified_clone.width - 1 do
      local r, g, b, a = modified_clone:get_pixel(x, y)
      -- Invert RGB values
      modified_clone:set_pixel(x, y, 255 - r, 255 - g, 255 - b, a)
    end
  end

  initialized = true
end

local function draw()
  canvas.clear()

  -- Background
  canvas.set_color(30, 30, 45)
  canvas.fill_rect(0, 0, 400, 350)

  -- Title
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(14)
  canvas.draw_text(10, 25, "clone_image_data() - Copy pixel buffers")

  if not initialized then
    initialize()
  end

  -- Section 1: Original
  canvas.set_color(200, 200, 200)
  canvas.set_font_size(11)
  canvas.draw_text(20, 70, "Original:")
  canvas.put_image_data(original_data, 20, 80)

  -- Section 2: Cloned (identical copy)
  canvas.set_color(200, 200, 200)
  canvas.draw_text(100, 70, "Cloned (identical):")
  canvas.put_image_data(cloned_data, 100, 80)

  -- Section 3: Modified clone
  canvas.set_color(200, 200, 200)
  canvas.draw_text(200, 70, "Modified clone:")
  canvas.put_image_data(modified_clone, 200, 80)

  -- Verify original is unchanged
  canvas.set_color(200, 200, 200)
  canvas.draw_text(300, 70, "Original (again):")
  canvas.put_image_data(original_data, 300, 80)

  -- Explanation
  canvas.set_color(180, 180, 180)
  canvas.set_font_size(11)
  local y = 150
  canvas.draw_text(20, y, "clone_image_data() creates an independent copy.")
  y = y + 18
  canvas.draw_text(20, y, "Modifying the clone does NOT affect the original.")
  y = y + 30

  -- Use case: Multiple effects from same source
  canvas.set_color(255, 255, 100)
  canvas.draw_text(20, y, "Use case: Apply different effects to same source")
  y = y + 25

  -- Show multiple effect variations
  if original_data then
    -- Effect 1: Grayscale
    local gray = canvas.clone_image_data(original_data)
    for py = 0, gray.height - 1 do
      for px = 0, gray.width - 1 do
        local r, g, b, a = gray:get_pixel(px, py)
        local avg = math.floor((r + g + b) / 3)
        gray:set_pixel(px, py, avg, avg, avg, a)
      end
    end
    canvas.set_color(150, 150, 150)
    canvas.draw_text(20, y, "Grayscale:")
    canvas.put_image_data(gray, 20, y + 10)

    -- Effect 2: Red channel only
    local red_only = canvas.clone_image_data(original_data)
    for py = 0, red_only.height - 1 do
      for px = 0, red_only.width - 1 do
        local r, _, _, a = red_only:get_pixel(px, py)
        red_only:set_pixel(px, py, r, 0, 0, a)
      end
    end
    canvas.draw_text(100, y, "Red only:")
    canvas.put_image_data(red_only, 100, y + 10)

    -- Effect 3: Brighten
    local bright = canvas.clone_image_data(original_data)
    for py = 0, bright.height - 1 do
      for px = 0, bright.width - 1 do
        local r, g, b, a = bright:get_pixel(px, py)
        r = math.min(255, r + 50)
        g = math.min(255, g + 50)
        b = math.min(255, b + 50)
        bright:set_pixel(px, py, r, g, b, a)
      end
    end
    canvas.draw_text(180, y, "Brightened:")
    canvas.put_image_data(bright, 180, y + 10)

    -- Show original is still intact
    canvas.draw_text(280, y, "Original intact:")
    canvas.put_image_data(original_data, 280, y + 10)
  end

  -- Footer
  canvas.set_color(120, 120, 120)
  canvas.set_font_size(10)
  canvas.draw_text(20, 330, "Each clone is independent - perfect for effect previews or undo systems")
end

local function game()
  draw()
end

canvas.set_size(400, 350)
canvas.tick(game)
canvas.start()
