-- ANSI Escape Code Demo
-- Demonstrates using ANSI escape sequences in text layers
-- Features: create_label with ANSI escapes, 24-bit color, background colors, parse_ansi

local ansi = require("ansi")

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

-- Dark background grid
local bg_grid = make_grid(" ", {170, 170, 170}, {15, 15, 30})

-- Draw a border (Unicode box-drawing characters)
for col = 1, 80 do
  bg_grid[1][col]  = { char = "─", fg = {85, 85, 255}, bg = {15, 15, 30} }
  bg_grid[25][col] = { char = "─", fg = {85, 85, 255}, bg = {15, 15, 30} }
end
for row = 1, 25 do
  bg_grid[row][1]  = { char = "│", fg = {85, 85, 255}, bg = {15, 15, 30} }
  bg_grid[row][80] = { char = "│", fg = {85, 85, 255}, bg = {15, 15, 30} }
end
bg_grid[1][1]   = { char = "┌", fg = {85, 85, 255}, bg = {15, 15, 30} }
bg_grid[1][80]  = { char = "┐", fg = {85, 85, 255}, bg = {15, 15, 30} }
bg_grid[25][1]  = { char = "└", fg = {85, 85, 255}, bg = {15, 15, 30} }
bg_grid[25][80] = { char = "┘", fg = {85, 85, 255}, bg = {15, 15, 30} }

-- Section dividers
for col = 2, 79 do
  bg_grid[3][col]  = { char = "─", fg = {0, 85, 170}, bg = {15, 15, 30} }
  bg_grid[9][col]  = { char = "─", fg = {0, 85, 170}, bg = {15, 15, 30} }
  bg_grid[15][col] = { char = "─", fg = {0, 85, 170}, bg = {15, 15, 30} }
  bg_grid[21][col] = { char = "─", fg = {0, 85, 170}, bg = {15, 15, 30} }
end

-- ESC character for building ANSI sequences
local ESC = string.char(27)

-- Assemble as V4 format with text layers
local data = {
  version = 4,
  width = 80,
  height = 25,
  activeLayerId = "bg",
  layers = {
    { type = "drawn", id = "bg", name = "Background", visible = true, grid = bg_grid },

    -- Title
    {
      type = "text", id = "title", name = "Title", visible = true,
      text = "ANSI Escape Code Demo",
      bounds = { r0 = 1, c0 = 2, r1 = 1, c1 = 77 },
      textFg = {255, 255, 85},
      textAlign = "center",
    },

    -- Section 1: Standard colors
    {
      type = "text", id = "section1_header", name = "Section 1 Header", visible = true,
      text = "Standard CGA Colors (codes 30-37, 40-47)",
      bounds = { r0 = 3, c0 = 3, r1 = 3, c1 = 77 },
      textFg = {0, 170, 170},
    },
    {
      type = "text", id = "standard_fg", name = "Standard FG", visible = true,
      text = "foreground colors",
      bounds = { r0 = 4, c0 = 3, r1 = 5, c1 = 77 },
      textFg = {170, 170, 170},
    },
    {
      type = "text", id = "standard_bg", name = "Standard BG", visible = true,
      text = "background colors",
      bounds = { r0 = 6, c0 = 3, r1 = 8, c1 = 77 },
      textFg = {170, 170, 170},
    },

    -- Section 2: Bright colors
    {
      type = "text", id = "section2_header", name = "Section 2 Header", visible = true,
      text = "Bright Colors (codes 90-97, 100-107)",
      bounds = { r0 = 9, c0 = 3, r1 = 9, c1 = 77 },
      textFg = {0, 170, 170},
    },
    {
      type = "text", id = "bright_fg", name = "Bright FG", visible = true,
      text = "bright foreground",
      bounds = { r0 = 10, c0 = 3, r1 = 11, c1 = 77 },
      textFg = {170, 170, 170},
    },
    {
      type = "text", id = "bright_bg", name = "Bright BG", visible = true,
      text = "bright background",
      bounds = { r0 = 12, c0 = 3, r1 = 14, c1 = 77 },
      textFg = {170, 170, 170},
    },

    -- Section 3: 24-bit RGB colors
    {
      type = "text", id = "section3_header", name = "Section 3 Header", visible = true,
      text = "24-bit RGB Colors (codes 38;2;R;G;B and 48;2;R;G;B)",
      bounds = { r0 = 15, c0 = 3, r1 = 15, c1 = 77 },
      textFg = {0, 170, 170},
    },
    {
      type = "text", id = "rgb_demo", name = "RGB Demo", visible = true,
      text = "24-bit colors",
      bounds = { r0 = 16, c0 = 3, r1 = 20, c1 = 77 },
      textFg = {170, 170, 170},
    },

    -- Section 4: Combined and reset
    {
      type = "text", id = "section4_header", name = "Section 4 Header", visible = true,
      text = "Combined Codes & Reset",
      bounds = { r0 = 21, c0 = 3, r1 = 21, c1 = 77 },
      textFg = {0, 170, 170},
    },
    {
      type = "text", id = "combined_demo", name = "Combined Demo", visible = true,
      text = "combined demo",
      bounds = { r0 = 22, c0 = 3, r1 = 24, c1 = 77 },
      textFg = {170, 170, 170},
    },
  },
}

local screen = ansi.create_screen(data)
ansi.set_screen(screen)

-- Section 1: Standard foreground colors
local std_fg = ESC .. "[30mBlack " .. ESC .. "[31mRed "
  .. ESC .. "[32mGreen " .. ESC .. "[33mYellow "
  .. ESC .. "[34mBlue " .. ESC .. "[35mMagenta "
  .. ESC .. "[36mCyan " .. ESC .. "[37mWhite" .. ESC .. "[0m"
screen:set_label("standard_fg", ansi.create_escaped_label(std_fg))

-- Standard background colors
local std_bg = ESC .. "[40m Black " .. ESC .. "[41m Red "
  .. ESC .. "[42m Green " .. ESC .. "[43m Yellow "
  .. ESC .. "[44m Blue " .. ESC .. "[45m Magenta "
  .. ESC .. "[46m Cyan " .. ESC .. "[47m White " .. ESC .. "[0m"
screen:set_label("standard_bg", ansi.create_escaped_label(std_bg))

-- Section 2: Bright foreground colors
local bright_fg = ESC .. "[90mDkGray " .. ESC .. "[91mBrRed "
  .. ESC .. "[92mBrGreen " .. ESC .. "[93mBrYellow "
  .. ESC .. "[94mBrBlue " .. ESC .. "[95mBrMagenta "
  .. ESC .. "[96mBrCyan " .. ESC .. "[97mBrWhite" .. ESC .. "[0m"
screen:set_label("bright_fg", ansi.create_escaped_label(bright_fg))

-- Bright background colors
local bright_bg = ESC .. "[100m DkGray " .. ESC .. "[101m BrRed "
  .. ESC .. "[102m BrGreen " .. ESC .. "[103m BrYellow "
  .. ESC .. "[104m BrBlue " .. ESC .. "[105m BrMag "
  .. ESC .. "[106m BrCyan " .. ESC .. "[107m White " .. ESC .. "[0m"
screen:set_label("bright_bg", ansi.create_escaped_label(bright_bg))

-- Section 3: 24-bit RGB
local rgb_demo = ESC .. "[38;2;255;100;0mOrange " .. ESC .. "[0m"
  .. ESC .. "[38;2;148;0;211mPurple " .. ESC .. "[0m"
  .. ESC .. "[38;2;255;20;147mPink " .. ESC .. "[0m"
  .. ESC .. "[38;2;0;206;209mTeal " .. ESC .. "[0m"
  .. ESC .. "[38;2;255;215;0mGold " .. ESC .. "[0m"
  .. ESC .. "[38;2;127;255;0mChartreuse" .. ESC .. "[0m "
  .. ESC .. "[48;2;0;0;128m" .. ESC .. "[38;2;255;255;255m Navy BG " .. ESC .. "[0m "
  .. ESC .. "[48;2;139;0;0m" .. ESC .. "[38;2;255;255;200m DarkRed BG " .. ESC .. "[0m "
  .. ESC .. "[48;2;0;100;0m" .. ESC .. "[38;2;200;255;200m Forest BG " .. ESC .. "[0m"
screen:set_label("rgb_demo", ansi.create_escaped_label(rgb_demo))

-- Section 4: Combined codes and reset
local combined = ESC .. "[31;42m Red on Green " .. ESC .. "[0m "
  .. ESC .. "[1;33;44m Yellow on Blue " .. ESC .. "[0m "
  .. ESC .. "[38;2;255;255;0;48;2;128;0;128m Custom FG+BG " .. ESC .. "[0m "
  .. "Normal " .. ESC .. "[91mBright" .. ESC .. "[39m Default" .. ESC .. "[0m"
screen:set_label("combined_demo", ansi.create_escaped_label(combined))

ansi.tick(function()
  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

ansi.start()
print("Demo finished!")
