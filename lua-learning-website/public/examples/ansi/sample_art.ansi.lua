-- Sample ANSI art file (V1 format)
-- A simple smiley face pixel art for demonstrating ansi.load_screen()

local BLACK = {0, 0, 0}
local YELLOW = {255, 220, 50}
local DARK_YELLOW = {200, 170, 30}
local BROWN = {140, 100, 20}
local WHITE = {255, 255, 255}
local BLUE = {50, 100, 220}
local RED = {220, 60, 60}
local DARK_BLUE = {20, 20, 60}

local grid = {}
for row = 1, 25 do
  grid[row] = {}
  for col = 1, 80 do
    grid[row][col] = { char = " ", fg = {170, 170, 170}, bg = DARK_BLUE }
  end
end

-- Helper: draw a filled circle of cells
local function fill_circle(cx, cy, rx, ry, color)
  for row = 1, 25 do
    for col = 1, 80 do
      local dx = (col - cx) / rx
      local dy = (row - cy) / ry
      if dx * dx + dy * dy <= 1 then
        grid[row][col] = { char = " ", fg = {170, 170, 170}, bg = color }
      end
    end
  end
end

-- Helper: draw a single cell
local function set_cell(row, col, char, fg, bg)
  if row >= 1 and row <= 25 and col >= 1 and col <= 80 then
    grid[row][col] = { char = char, fg = fg, bg = bg }
  end
end

-- Draw face (yellow circle)
fill_circle(40, 13, 18, 9, YELLOW)

-- Draw face outline (darker yellow ring)
for row = 1, 25 do
  for col = 1, 80 do
    local dx = (col - 40) / 18
    local dy = (row - 13) / 9
    local dist = dx * dx + dy * dy
    if dist <= 1 and dist > 0.85 then
      grid[row][col] = { char = " ", fg = {170, 170, 170}, bg = DARK_YELLOW }
    end
  end
end

-- Draw eyes (blue circles)
fill_circle(33, 10, 3, 2, WHITE)
fill_circle(47, 10, 3, 2, WHITE)
-- Pupils
fill_circle(34, 10, 1.5, 1, BLUE)
fill_circle(48, 10, 1.5, 1, BLUE)

-- Draw smile (curved line using brown cells)
for col = 31, 49 do
  local dx = (col - 40) / 9
  local smile_row = math.floor(15 + dx * dx * 3)
  if smile_row >= 1 and smile_row <= 25 then
    set_cell(smile_row, col, " ", {170, 170, 170}, BROWN)
    if smile_row + 1 <= 25 then
      set_cell(smile_row + 1, col, " ", {170, 170, 170}, BROWN)
    end
  end
end

-- Add some stars in the background
local stars = {
  {2, 5}, {2, 72}, {3, 15}, {3, 65}, {4, 8}, {4, 75},
  {22, 10}, {22, 70}, {23, 5}, {23, 60}, {24, 15}, {24, 75},
  {2, 35}, {2, 50}, {24, 40}, {24, 55},
}
for _, pos in ipairs(stars) do
  local row, col = pos[1], pos[2]
  set_cell(row, col, "*", YELLOW, DARK_BLUE)
end

-- Title at top
local title = "~ Sample ANSI Art ~"
local start_col = math.floor((80 - #title) / 2) + 1
for i = 1, #title do
  set_cell(1, start_col + i - 1, title:sub(i, i), WHITE, DARK_BLUE)
end

return { version = 1, width = 80, height = 25, grid = grid }
