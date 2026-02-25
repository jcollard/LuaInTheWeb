-- Layer Visibility Demo
-- Demonstrates screen:get_layers(), layer_on(), layer_off(), and layer_toggle()
-- with layer groups and nested group visibility cascading.

local ansi = require("ansi")

-- Build a V4 multi-layer image with groups and nested layers.
-- In real usage, you'd load a .ansi.lua file:
--   local screen = ansi.load_screen("my_art.ansi.lua")

-- Helper: create a full 25x80 grid filled with a single color
local function make_grid(char, fg, bg)
  local grid = {}
  for row = 1, 25 do
    grid[row] = {}
    for col = 1, 80 do
      grid[row][col] = { char = char, fg = fg, bg = bg }
    end
  end
  return grid
end

-- Background layer: blue gradient
local bg_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 25 do
  for col = 1, 80 do
    local b = math.floor(col / 80 * 200) + 55
    bg_grid[row][col] = { char = " ", fg = {170, 170, 170}, bg = {0, 0, b} }
  end
end

-- Title Bar layer: green bar across rows 2-3 (child of Decorations)
local title_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 2, 3 do
  for col = 1, 80 do
    title_grid[row][col] = { char = " ", fg = {255, 255, 255}, bg = {30, 100, 30} }
  end
end
-- Write "DECORATIONS GROUP" text centered on row 2
local title_text = "DECORATIONS GROUP"
local title_start = math.floor((80 - #title_text) / 2) + 1
for i = 1, #title_text do
  local col = title_start + i - 1
  title_grid[2][col] = { char = title_text:sub(i, i), fg = {255, 255, 255}, bg = {30, 100, 30} }
end

-- Stars layer: scattered yellow stars on transparent background (child of Decorations)
local stars_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
local star_positions = {
  {4, 5}, {4, 72}, {6, 15}, {6, 65}, {7, 35}, {7, 50},
  {10, 3}, {10, 77}, {12, 10}, {12, 70}, {14, 5}, {14, 75},
  {16, 12}, {16, 68}, {19, 8}, {19, 40}, {19, 73},
  {5, 25}, {5, 55}, {9, 45}, {11, 30}, {13, 50}, {15, 20},
  {17, 60}, {20, 35}, {20, 65}, {22, 15}, {22, 50},
}
for _, pos in ipairs(star_positions) do
  local row, col = pos[1], pos[2]
  if row >= 1 and row <= 25 and col >= 1 and col <= 80 then
    stars_grid[row][col] = { char = "*", fg = {255, 255, 0}, bg = {0, 0, 0} }
  end
end

-- Status Bar layer: red bar across rows 23-24 (child of Details sub-group)
local status_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 23, 24 do
  for col = 1, 80 do
    status_grid[row][col] = { char = " ", fg = {255, 255, 255}, bg = {120, 30, 30} }
  end
end
-- Write "STATUS BAR (Details group)" text centered on row 23
local status_text = "STATUS BAR (Details group)"
local status_start = math.floor((80 - #status_text) / 2) + 1
for i = 1, #status_text do
  local col = status_start + i - 1
  status_grid[23][col] = { char = status_text:sub(i, i), fg = {255, 255, 255}, bg = {120, 30, 30} }
end

-- Foreground layer: a box in the center
local fg_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 8, 18 do
  for col = 20, 60 do
    fg_grid[row][col] = { char = " ", fg = {255, 255, 255}, bg = {80, 40, 120} }
  end
end
-- Add border
for col = 20, 60 do
  fg_grid[8][col] = { char = "=", fg = {255, 255, 0}, bg = {80, 40, 120} }
  fg_grid[18][col] = { char = "=", fg = {255, 255, 0}, bg = {80, 40, 120} }
end
for row = 8, 18 do
  fg_grid[row][20] = { char = "|", fg = {255, 255, 0}, bg = {80, 40, 120} }
  fg_grid[row][60] = { char = "|", fg = {255, 255, 0}, bg = {80, 40, 120} }
end

-- Assemble as V4 format data with groups and nesting
local data = {
  version = 4,
  width = 80,
  height = 25,
  activeLayerId = "bg",
  layers = {
    { type = "drawn",  id = "bg",      name = "Background",   visible = true, grid = bg_grid },
    { type = "group",  id = "decor",   name = "Decorations",  visible = true, collapsed = false },
    { type = "drawn",  id = "title",   name = "Title Bar",    visible = true, grid = title_grid, parentId = "decor" },
    { type = "drawn",  id = "stars",   name = "Stars",        visible = true, grid = stars_grid, parentId = "decor" },
    { type = "group",  id = "details", name = "Details",      visible = true, collapsed = false, parentId = "decor" },
    { type = "drawn",  id = "status",  name = "Status Bar",   visible = true, grid = status_grid, parentId = "details" },
    { type = "drawn",  id = "fg",      name = "Foreground",   visible = true, grid = fg_grid },
  },
}

-- Create the screen
local screen = ansi.create_screen(data)
ansi.set_screen(screen)

-- Show layer info
local layers = screen:get_layers()
print("Layers in this screen:")
for i, layer in ipairs(layers) do
  local prefix = "  "
  if layer.parentId then
    prefix = prefix .. "  "
  end
  local tag = ""
  if layer.type == "group" then
    tag = " [GROUP]"
  end
  print(prefix .. i .. ". " .. layer.name .. " (" .. layer.type .. ")" .. tag .. " visible=" .. tostring(layer.visible))
end

-- Calculate indent depth by walking up the parentId chain
local function calc_depth(layer, all_layers)
  local depth = 0
  local pid = layer.parentId
  while pid do
    depth = depth + 1
    local found = false
    for _, l in ipairs(all_layers) do
      if l.id == pid then
        pid = l.parentId
        found = true
        break
      end
    end
    if not found then
      break
    end
  end
  return depth
end

ansi.tick(function()
  -- Draw instructions on top
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 255, 255)
  ansi.print("  Layer Groups Demo")

  ansi.set_cursor(3, 1)
  ansi.foreground(200, 200, 200)
  ansi.print("  1: Toggle Background    2: Toggle Decorations (group)")

  ansi.set_cursor(4, 1)
  ansi.print("  3: Toggle Details (sub-group)  4: Toggle Foreground")

  ansi.set_cursor(5, 1)
  ansi.print("  ESC: Exit")

  -- Show current layer states with hierarchy indentation
  local current = screen:get_layers()
  local row = 10
  ansi.set_cursor(row, 22)
  ansi.foreground(255, 255, 255)
  ansi.print("Layer Status:")
  row = row + 1

  for _, layer in ipairs(current) do
    local depth = calc_depth(layer, current)
    local indent = string.rep("  ", depth)
    local tag = ""
    if layer.type == "group" then
      tag = " [GROUP]"
    end

    ansi.set_cursor(row, 22)
    if layer.visible then
      ansi.foreground(85, 255, 85)
      ansi.print(indent .. "[ON]  " .. layer.name .. tag)
    else
      ansi.foreground(255, 85, 85)
      ansi.print(indent .. "[OFF] " .. layer.name .. tag)
    end
    row = row + 1
  end

  -- Handle input
  if ansi.is_key_pressed("1") then
    screen:layer_toggle("Background")
  end
  if ansi.is_key_pressed("2") then
    screen:layer_toggle("Decorations")
  end
  if ansi.is_key_pressed("3") then
    screen:layer_toggle("Details")
  end
  if ansi.is_key_pressed("4") then
    screen:layer_toggle("Foreground")
  end
  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

ansi.start()
print("Demo finished!")
