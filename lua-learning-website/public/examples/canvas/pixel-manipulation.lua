-- Pixel Manipulation Demo
-- Demonstrates create_image_data, get_image_data, put_image_data
-- and the ImageData:get_pixel/set_pixel helper methods

local canvas = require('canvas')

canvas.set_size(500, 400)

-- Current effect mode
local mode = 1
local last_mode = 0  -- Track previous mode to detect changes
local modes = {"Original", "Invert", "Grayscale", "Red Channel", "Noise Overlay"}
local mode_count = #modes

-- Cached images - all effects pre-computed on load
local cached_effects = {}  -- indexed 1-5 for each mode
local gradient_img = nil
local loading = true  -- Show loading on first frame
local load_frame = 0  -- Track frames during load

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

-- Pre-compute all effect images
local function precompute_effects()
  -- Draw base scene first
  canvas.save()
  canvas.translate(0, 40)
  draw_base_scene()
  canvas.restore()

  -- Get the base image
  local base_img = canvas.get_image_data(0, 40, 250, 200)
  if not base_img then return false end

  -- Mode 1: Original (just copy the base)
  cached_effects[1] = base_img

  -- Mode 2: Invert
  local img2 = canvas.get_image_data(0, 40, 250, 200)
  apply_invert(img2)
  cached_effects[2] = img2

  -- Mode 3: Grayscale
  local img3 = canvas.get_image_data(0, 40, 250, 200)
  apply_grayscale(img3)
  cached_effects[3] = img3

  -- Mode 4: Red Channel
  local img4 = canvas.get_image_data(0, 40, 250, 200)
  apply_red_channel(img4)
  cached_effects[4] = img4

  -- Mode 5: Noise
  local img5 = canvas.get_image_data(0, 40, 250, 200)
  apply_noise(img5)
  cached_effects[5] = img5

  -- Create gradient texture
  gradient_img = create_gradient_texture()

  return true
end

-- Draw the full scene using cached images
local function draw_scene()
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
  canvas.put_image_data(gradient_img, 200, 300)

  -- Instructions
  canvas.set_font_size(12)
  canvas.set_color(80, 80, 80)
  canvas.draw_text(250, 380, "Press SPACE or click to cycle effects: " .. mode .. "/" .. mode_count)
end

canvas.tick(function()
  -- Loading phase
  if loading then
    load_frame = load_frame + 1

    if load_frame == 1 then
      -- First frame: show loading message
      canvas.clear()
      canvas.set_color(0, 0, 0)
      canvas.set_font_size(24)
      canvas.set_text_align("center")
      canvas.set_text_baseline("middle")
      canvas.draw_text(250, 200, "Loading...")
    elseif load_frame == 2 then
      -- Second frame: precompute all effects
      precompute_effects()
      loading = false
      last_mode = 0  -- Force initial draw
    end
    return
  end

  -- Handle input
  if canvas.is_key_pressed("space") or canvas.is_mouse_pressed(0) then
    mode = mode + 1
    if mode > mode_count then
      mode = 1
    end
  end

  -- Only redraw when mode changes
  if mode ~= last_mode then
    last_mode = mode
    draw_scene()
  end
end)

canvas.start()
