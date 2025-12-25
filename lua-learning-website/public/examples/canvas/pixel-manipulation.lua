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

-- Lazy cache: store computed effects by mode number
-- Each effect is computed once on first access, then reused
local cached_effects = {}
local gradient_img = nil

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

-- Get or compute the effect for a given mode (lazy caching)
local function get_effect_image(effect_mode)
  -- Return cached if available
  if cached_effects[effect_mode] then
    return cached_effects[effect_mode]
  end

  -- Compute the effect
  local img = canvas.get_image_data(0, 40, 250, 200)
  if not img then return nil end

  if effect_mode == 2 then
    apply_invert(img)
  elseif effect_mode == 3 then
    apply_grayscale(img)
  elseif effect_mode == 4 then
    apply_red_channel(img)
  elseif effect_mode == 5 then
    apply_noise(img)
  end
  -- Mode 1 (Original) is just the base image, no effect applied

  -- Cache for future use
  cached_effects[effect_mode] = img
  return img
end

canvas.tick(function()
  -- Handle input first for responsive feel
  if canvas.is_key_pressed("space") or canvas.is_mouse_pressed(0) then
    mode = mode + 1
    if mode > mode_count then
      mode = 1
    end
  end

  -- Only redraw when mode changes (or first frame)
  if mode ~= last_mode then
    last_mode = mode

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

    -- Get effect image (cached or computed)
    local effect_img = get_effect_image(mode)

    -- Draw processed image on right side
    if effect_img then
      canvas.put_image_data(effect_img, 250, 40)
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

    -- Show cache status
    local cached_count = 0
    for i = 1, mode_count do
      if cached_effects[i] then cached_count = cached_count + 1 end
    end

    -- Draw procedural gradient demo (only create once)
    canvas.set_font_size(14)
    canvas.draw_text(250, 285, "Procedural Gradient (create_image_data)")

    if not gradient_img then
      gradient_img = create_gradient_texture()
    end
    canvas.put_image_data(gradient_img, 200, 300)

    -- Instructions
    canvas.set_font_size(12)
    canvas.set_color(80, 80, 80)
    canvas.draw_text(250, 380, "Press SPACE or click to cycle effects: " .. mode .. "/" .. mode_count .. " (cached: " .. cached_count .. ")")
  end
end)

canvas.start()
