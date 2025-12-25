# Pixel Manipulation

Direct pixel access for image processing, filters, and procedural textures.

## Overview

The pixel manipulation API allows direct access to individual pixel data on the canvas. This enables advanced effects like color filters, procedural textures, and image processing.

## ImageData Object

The `ImageData` object represents a rectangular area of pixel data. It has the following properties:

- `width` (number): Width of the image in pixels
- `height` (number): Height of the image in pixels

### ImageData:get_pixel(x, y)

Get the RGBA values of a pixel at the specified coordinates. Coordinates are 0-indexed (matching canvas coordinates).

**Parameters:**
- `x` (number): X coordinate (0 to width-1)
- `y` (number): Y coordinate (0 to height-1)

**Returns:**
- `r` (number): Red component (0-255)
- `g` (number): Green component (0-255)
- `b` (number): Blue component (0-255)
- `a` (number): Alpha component (0-255)

Returns `0, 0, 0, 0` for out-of-bounds coordinates.

```lua
local img = canvas.get_image_data(0, 0, 100, 100)
local r, g, b, a = img:get_pixel(50, 50)
print("Pixel color: " .. r .. ", " .. g .. ", " .. b .. ", " .. a)
```

### ImageData:set_pixel(x, y, r, g, b, a?)

Set the RGBA values of a pixel at the specified coordinates. Coordinates are 0-indexed.

**Parameters:**
- `x` (number): X coordinate (0 to width-1)
- `y` (number): Y coordinate (0 to height-1)
- `r` (number): Red component (0-255)
- `g` (number): Green component (0-255)
- `b` (number): Blue component (0-255)
- `a` (number, optional): Alpha component (0-255, default: 255)

Does nothing for out-of-bounds coordinates.

```lua
local img = canvas.create_image_data(100, 100)
img:set_pixel(50, 50, 255, 0, 0)       -- Opaque red pixel
img:set_pixel(51, 50, 0, 255, 0, 128)  -- Semi-transparent green pixel
```

## Functions

### canvas.create_image_data(width, height)

Create a new empty ImageData buffer filled with transparent black.

**Parameters:**
- `width` (number): Width in pixels
- `height` (number): Height in pixels

**Returns:**
- (ImageData): New ImageData filled with transparent black (0, 0, 0, 0)

```lua
-- Create a gradient texture procedurally
local img = canvas.create_image_data(100, 100)
for y = 0, 99 do
  for x = 0, 99 do
    local r = (x / 100) * 255
    local g = (y / 100) * 255
    img:set_pixel(x, y, r, g, 0, 255)
  end
end
canvas.put_image_data(img, 50, 50)
```

### canvas.get_image_data(x, y, width, height)

Read pixel data from a region of the canvas.

**Parameters:**
- `x` (number): X coordinate of top-left corner
- `y` (number): Y coordinate of top-left corner
- `width` (number): Width of region to read
- `height` (number): Height of region to read

**Returns:**
- (ImageData|nil): Pixel data, or nil if canvas not ready

```lua
-- Read a region of the canvas
local img = canvas.get_image_data(100, 100, 50, 50)
if img then
  local r, g, b, a = img:get_pixel(25, 25)  -- Center pixel
  print("Color at center: " .. r .. ", " .. g .. ", " .. b)
end
```

### canvas.put_image_data(image_data, dx, dy)

Write pixel data to the canvas at the specified position.

**Parameters:**
- `image_data` (ImageData): The pixel data to write
- `dx` (number): Destination X coordinate
- `dy` (number): Destination Y coordinate

```lua
-- Copy a region to another location
local img = canvas.get_image_data(0, 0, 100, 100)
canvas.put_image_data(img, 200, 200)
```

## Examples

### Invert Colors

```lua
-- Invert all colors in a region
local img = canvas.get_image_data(0, 0, 200, 200)
for y = 0, img.height - 1 do
  for x = 0, img.width - 1 do
    local r, g, b, a = img:get_pixel(x, y)
    img:set_pixel(x, y, 255 - r, 255 - g, 255 - b, a)
  end
end
canvas.put_image_data(img, 0, 0)
```

### Grayscale Filter

```lua
-- Convert to grayscale
local img = canvas.get_image_data(0, 0, 200, 200)
for y = 0, img.height - 1 do
  for x = 0, img.width - 1 do
    local r, g, b, a = img:get_pixel(x, y)
    -- Use luminance formula for natural grayscale
    local gray = 0.299 * r + 0.587 * g + 0.114 * b
    img:set_pixel(x, y, gray, gray, gray, a)
  end
end
canvas.put_image_data(img, 0, 0)
```

### Procedural Noise

```lua
-- Generate random noise texture
local noise = canvas.create_image_data(64, 64)
for y = 0, 63 do
  for x = 0, 63 do
    local v = math.random(0, 255)
    noise:set_pixel(x, y, v, v, v, 255)
  end
end
canvas.put_image_data(noise, 100, 100)
```

### Sepia Tone

```lua
-- Apply sepia tone filter
local img = canvas.get_image_data(0, 0, 200, 200)
for y = 0, img.height - 1 do
  for x = 0, img.width - 1 do
    local r, g, b, a = img:get_pixel(x, y)

    local tr = 0.393 * r + 0.769 * g + 0.189 * b
    local tg = 0.349 * r + 0.686 * g + 0.168 * b
    local tb = 0.272 * r + 0.534 * g + 0.131 * b

    img:set_pixel(x, y,
      math.min(255, tr),
      math.min(255, tg),
      math.min(255, tb),
      a
    )
  end
end
canvas.put_image_data(img, 0, 0)
```

### Brightness Adjustment

```lua
-- Increase brightness by 50
local brightness = 50
local img = canvas.get_image_data(0, 0, 200, 200)
for y = 0, img.height - 1 do
  for x = 0, img.width - 1 do
    local r, g, b, a = img:get_pixel(x, y)
    img:set_pixel(x, y,
      math.min(255, r + brightness),
      math.min(255, g + brightness),
      math.min(255, b + brightness),
      a
    )
  end
end
canvas.put_image_data(img, 0, 0)
```

## Performance Tips

- **Keep images small**: Pixel manipulation can be slow for large images. For real-time effects, keep image sizes small (e.g., 100x100 or less) or process only portions of the canvas.

- **Cache processed images**: If you apply the same filter multiple times, process it once and cache the result.

- **Use ImageData for batch operations**: Reading/writing individual pixels with `get_pixel`/`set_pixel` is slower than processing the entire ImageData at once.

```lua
-- Cache effect results for instant switching
local original = canvas.get_image_data(0, 0, 100, 100)
local grayscale = apply_grayscale(original)  -- Process once
local inverted = apply_invert(original)      -- Process once

-- Now switching is instant
canvas.put_image_data(grayscale, 0, 0)  -- O(1) operation
```

---

[← Back to Canvas Library](../canvas.md)
