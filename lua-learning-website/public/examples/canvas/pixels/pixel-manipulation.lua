-- canvas/pixels/pixel-manipulation.lua
-- Demonstrates create_image_data, get_image_data, put_image_data
-- and the ImageData:get_pixel/set_pixel helper methods

local canvas = require('canvas')

canvas.set_size(500, 400)

-- Current effect mode
local mode = 1
local last_mode = 0  -- Track previous mode to detect changes
local modes = {"Original", "Invert", "Grayscale", "Red Channel", "Noise Overlay"}
local mode_count = #modes

-- Pre-cached effects (computed during loading)
local cached_effects = {}
local gradient_img = nil

-- Frame counter for loading sequence
local frame = 0
local loading_complete = false

-- Base shapes to apply effects to
local function draw_base_scene()
  -- Sky gradient background
  local sky = canvas.create_linear_gradient(0, 0, 0, 200)
  sky:add_color_stop(0, "#87CEEB")
  sky:add_color_stop(1, "#1E90FF")
  canvas.set_fill_style(sky)
  canvas.fill_rect(0, 0, 250, 200)

  -- Sun
  canvas.set_color(255, 220, 50)
  canvas.fill_circle(200, 50, 30)

  -- Grass
  canvas.set_color(76, 175, 80)
  canvas.fill_rect(0, 150, 250, 50)

  -- House
  canvas.set_color(139, 90, 43)
  canvas.fill_rect(50, 100, 80, 70)

  -- Roof
  canvas.set_color(165, 42, 42)
  canvas.begin_path()
  canvas.move_to(40, 100)
  canvas.line_to(90, 60)
  canvas.line_to(140, 100)
  canvas.close_path()
  canvas.fill()

  -- Door
  canvas.set_color(101, 67, 33)
  canvas.fill_rect(80, 130, 20, 40)

  -- Windows
  canvas.set_color(173, 216, 230)
  canvas.fill_rect(55, 110, 20, 20)
  canvas.fill_rect(105, 110, 20, 20)
end

-- Apply invert effect
local function apply_invert(img)
  for y = 0, img.height - 1 do
    for x = 0, img.width - 1 do
      local r, g, b, a = img:get_pixel(x, y)
      img:set_pixel(x, y, 255 - r, 255 - g, 255 - b, a)
    end
  end
end

-- Apply grayscale effect
local function apply_grayscale(img)
  for y = 0, img.height - 1 do
    for x = 0, img.width - 1 do
      local r, g, b, a = img:get_pixel(x, y)
      local gray = 0.299 * r + 0.587 * g + 0.114 * b
      img:set_pixel(x, y, gray, gray, gray, a)
    end
  end
end

-- Show only red channel
local function apply_red_channel(img)
  for y = 0, img.height - 1 do
    for x = 0, img.width - 1 do
      local r, g, b, a = img:get_pixel(x, y)
      img:set_pixel(x, y, r, 0, 0, a)
    end
  end
end

-- Add noise overlay
local function apply_noise(img)
  for y = 0, img.height - 1 do
    for x = 0, img.width - 1 do
      local r, g, b, a = img:get_pixel(x, y)
      local noise = math.random(-30, 30)
      r = math.max(0, math.min(255, r + noise))
      g = math.max(0, math.min(255, g + noise))
      b = math.max(0, math.min(255, b + noise))
      img:set_pixel(x, y, r, g, b, a)
    end
  end
end

-- Create procedural gradient using create_image_data
local function create_gradient_texture()
  local img = canvas.create_image_data(100, 100)
  for y = 0, 99 do
    for x = 0, 99 do
      local r = (x / 100) * 255
      local g = (y / 100) * 255
      local b = 128
      img:set_pixel(x, y, r, g, b, 255)
    end
  end
  return img
end

-- Precalculate all effects from the base image
local function precalculate_all_effects()
  -- Get the base image from the left side
  local base_img = canvas.get_image_data(0, 40, 250, 200)
  if not base_img then return end

  -- Mode 1: Original (just copy the base)
  cached_effects[1] = base_img

  -- Mode 2: Invert
  local invert_img = canvas.get_image_data(0, 40, 250, 200)
  apply_invert(invert_img)
  cached_effects[2] = invert_img

  -- Mode 3: Grayscale
  local gray_img = canvas.get_image_data(0, 40, 250, 200)
  apply_grayscale(gray_img)
  cached_effects[3] = gray_img

  -- Mode 4: Red Channel
  local red_img = canvas.get_image_data(0, 40, 250, 200)
  apply_red_channel(red_img)
  cached_effects[4] = red_img

  -- Mode 5: Noise Overlay
  local noise_img = canvas.get_image_data(0, 40, 250, 200)
  apply_noise(noise_img)
  cached_effects[5] = noise_img

  -- Also create the gradient texture
  gradient_img = create_gradient_texture()
end

-- Draw the full UI with the current effect
local function draw_main_ui()
  canvas.clear()

  -- Draw title
  canvas.set_color(0, 0, 0)
  canvas.set_font_size(18)
  canvas.set_text_align("center")
  canvas.draw_text(250, 15, "Pixel Manipulation Demo")

  -- Draw base scene on left side
  canvas.save()
  canvas.translate(0, 40)
  draw_base_scene()
  canvas.restore()

  -- Draw cached effect on right side
  if cached_effects[mode] then
    canvas.put_image_data(cached_effects[mode], 250, 40)
  end

  -- Draw divider line
  canvas.set_color(100, 100, 100)
  canvas.set_line_width(2)
  canvas.draw_line(250, 40, 250, 240)

  -- Labels
  canvas.set_font_size(14)
  canvas.set_text_align("center")
  canvas.set_color(0, 0, 0)
  canvas.draw_text(125, 255, "Original")
  canvas.draw_text(375, 255, modes[mode])

  -- Draw procedural gradient demo
  canvas.set_font_size(14)
  canvas.draw_text(250, 285, "Procedural Gradient (create_image_data)")
  if gradient_img then
    canvas.put_image_data(gradient_img, 200, 300)
  end

  -- Instructions
  canvas.set_font_size(12)
  canvas.set_color(80, 80, 80)
  canvas.draw_text(250, 380, "Press SPACE or click to cycle effects: " .. mode .. "/" .. mode_count)
end

canvas.tick(function()
  frame = frame + 1

  -- Frame 1: Draw base scene on left side
  if frame == 1 then
    canvas.clear()
    canvas.set_color(0, 0, 0)
    canvas.set_font_size(18)
    canvas.set_text_align("center")
    canvas.draw_text(250, 15, "Pixel Manipulation Demo")

    canvas.save()
    canvas.translate(0, 40)
    draw_base_scene()
    canvas.restore()
    return
  end

  -- Frame 2: Show loading message
  if frame == 2 then
    canvas.set_font_size(24)
    canvas.set_text_align("center")
    canvas.set_color(100, 100, 100)
    canvas.draw_text(375, 140, "Loading...")
    return
  end

  -- Frame 3: Precalculate all effects
  if frame == 3 then
    precalculate_all_effects()
    loading_complete = true
    return
  end

  -- Frame 4+: Main interactive loop
  if loading_complete then
    -- Handle input
    if canvas.is_key_pressed("space") or canvas.is_mouse_pressed(0) then
      mode = mode + 1
      if mode > mode_count then
        mode = 1
      end
    end

    -- Only redraw when mode changes (or first interactive frame)
    if mode ~= last_mode then
      last_mode = mode
      draw_main_ui()
    end
  end
end)

canvas.start()
