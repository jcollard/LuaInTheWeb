-- Label Text Demo
-- Demonstrates screen:set_label() and ansi.create_label()
-- Features: set_label, create_label, color markup, CGA_ALT alternating colors

local ansi = require("ansi")

-- Build a V4 screen with text layers that act as dynamic labels.
-- In real usage, you'd create text layers in the ANSI Graphics Editor.

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

-- Background: dark blue
local bg_grid = make_grid(" ", {170, 170, 170}, {10, 10, 40})

-- Draw a decorative border
for col = 1, 80 do
  bg_grid[1][col]  = { char = "=", fg = {85, 85, 255}, bg = {10, 10, 40} }
  bg_grid[25][col] = { char = "=", fg = {85, 85, 255}, bg = {10, 10, 40} }
end
for row = 1, 25 do
  bg_grid[row][1]  = { char = "|", fg = {85, 85, 255}, bg = {10, 10, 40} }
  bg_grid[row][80] = { char = "|", fg = {85, 85, 255}, bg = {10, 10, 40} }
end
bg_grid[1][1]   = { char = "+", fg = {85, 85, 255}, bg = {10, 10, 40} }
bg_grid[1][80]  = { char = "+", fg = {85, 85, 255}, bg = {10, 10, 40} }
bg_grid[25][1]  = { char = "+", fg = {85, 85, 255}, bg = {10, 10, 40} }
bg_grid[25][80] = { char = "+", fg = {85, 85, 255}, bg = {10, 10, 40} }

-- Draw section separators
for col = 2, 79 do
  bg_grid[5][col]  = { char = "-", fg = {0, 170, 170}, bg = {10, 10, 40} }
  bg_grid[10][col] = { char = "-", fg = {0, 170, 170}, bg = {10, 10, 40} }
  bg_grid[17][col] = { char = "-", fg = {0, 170, 170}, bg = {10, 10, 40} }
end

-- Assemble as V4 format with text layers for dynamic content
local data = {
  version = 4,
  width = 80,
  height = 25,
  activeLayerId = "bg",
  layers = {
    -- Background drawn layer
    { type = "drawn", id = "bg", name = "Background", visible = true, grid = bg_grid },

    -- Text layer: title (row 3, centered, wide)
    {
      type = "text", id = "title", name = "Title", visible = true,
      text = "Label Text Demo",
      bounds = { r0 = 2, c0 = 2, r1 = 2, c1 = 77 },
      textFg = {255, 255, 85},
      textAlign = "center",
      tags = { "title" },
    },

    -- Text layer: subtitle
    {
      type = "text", id = "subtitle", name = "Subtitle", visible = true,
      text = "Press LEFT/RIGHT to change direction, 1-4 to change theme",
      bounds = { r0 = 3, c0 = 2, r1 = 3, c1 = 77 },
      textFg = {170, 170, 170},
      textAlign = "center",
      tags = { "subtitle" },
    },

    -- Text layer: direction label (plain text, updated each frame)
    {
      type = "text", id = "direction", name = "Direction", visible = true,
      text = "NORTH",
      bounds = { r0 = 7, c0 = 10, r1 = 7, c1 = 69 },
      textFg = {255, 255, 255},
      textAlign = "center",
      tags = { "direction" },
    },

    -- Text layer: description (colored markup, updated each frame)
    {
      type = "text", id = "description", name = "Description", visible = true,
      text = "A cold wind blows from the north...",
      bounds = { r0 = 8, c0 = 10, r1 = 8, c1 = 69 },
      textFg = {170, 170, 170},
      textAlign = "center",
      tags = { "description" },
    },

    -- Text layer: color showcase (multi-line, shows all color features)
    {
      type = "text", id = "showcase", name = "Showcase", visible = true,
      text = "Color markup showcase",
      bounds = { r0 = 11, c0 = 4, r1 = 15, c1 = 75 },
      textFg = {170, 170, 170},
      tags = { "showcase" },
    },

    -- Text layer: status bar
    {
      type = "text", id = "status", name = "Status", visible = true,
      text = "Theme: Classic  |  ESC to exit",
      bounds = { r0 = 18, c0 = 4, r1 = 23, c1 = 75 },
      textFg = {85, 85, 85},
      tags = { "status" },
    },
  },
}

-- Create the screen
local screen = ansi.create_screen(data)
ansi.set_screen(screen)

-- Game state
local directions = {"NORTH", "EAST", "SOUTH", "WEST"}
local dir_index = 1
local theme_index = 1

-- Direction descriptions with color markup
local descriptions = {
  NORTH = "A [color=BRIGHT_CYAN]cold wind[/color] blows from the [color=CGA_ALT_CYAN]frozen north[/color]...",
  EAST  = "The [color=YELLOW]golden sun[/color] rises over [color=CGA_ALT_BROWN]sandy dunes[/color]...",
  SOUTH = "Waves of [color=BRIGHT_RED]heat[/color] shimmer across the [color=CGA_ALT_RED]scorched earth[/color]...",
  WEST  = "A [color=BRIGHT_GREEN]lush forest[/color] stretches into the [color=CGA_ALT_GREEN]emerald distance[/color]...",
}

-- Direction colors for the plain label
local dir_colors = {
  NORTH = ansi.colors.BRIGHT_CYAN,
  EAST  = ansi.colors.YELLOW,
  SOUTH = ansi.colors.BRIGHT_RED,
  WEST  = ansi.colors.BRIGHT_GREEN,
}

-- Theme configurations for the color showcase
local themes = {
  {
    name = "Classic CGA",
    markup = "[color=RED]Red[/color] [color=GREEN]Green[/color] [color=BLUE]Blue[/color] "
          .. "[color=CYAN]Cyan[/color] [color=MAGENTA]Magenta[/color] [color=YELLOW]Yellow[/color] "
          .. "[color=WHITE]White[/color]",
  },
  {
    name = "Bright CGA",
    markup = "[color=BRIGHT_RED]Red[/color] [color=BRIGHT_GREEN]Green[/color] "
          .. "[color=BRIGHT_BLUE]Blue[/color] [color=BRIGHT_CYAN]Cyan[/color] "
          .. "[color=BRIGHT_MAGENTA]Magenta[/color] [color=YELLOW]Yellow[/color] "
          .. "[color=WHITE]White[/color]",
  },
  {
    name = "Alternating",
    markup = "[color=CGA_ALT_RED]Fire[/color]  [color=CGA_ALT_GREEN]Forest[/color]  "
          .. "[color=CGA_ALT_BLUE]Ocean[/color]  [color=CGA_ALT_CYAN]Ice[/color]  "
          .. "[color=CGA_ALT_BROWN]Earth[/color]  [color=CGA_ALT_GRAY]Mist[/color]",
  },
  {
    name = "Hex Colors",
    markup = "[color=#FF6600]Orange[/color] [color=#9900FF]Purple[/color] "
          .. "[color=#FF1493]Pink[/color] [color=#00CED1]Teal[/color] "
          .. "[color=#FFD700]Gold[/color] [color=#7FFF00]Lime[/color]",
  },
}

local function update_labels()
  local dir = directions[dir_index]
  local theme = themes[theme_index]

  -- Update direction with colored text
  local color = dir_colors[dir]
  screen:set_label("direction", ansi.create_label(
    "[color=#" .. string.format("%02X%02X%02X", color[1], color[2], color[3]) .. "]"
    .. ">> " .. dir .. " <<"
    .. "[/color]"
  ))

  -- Update description with rich color markup
  screen:set_label("description", ansi.create_label(descriptions[dir]))

  -- Update color showcase
  screen:set_label("showcase", ansi.create_label(theme.markup))

  -- Update status bar
  screen:set_label("status", ansi.create_label(
    "Theme: [color=WHITE]" .. theme.name .. "[/color]"
    .. "  |  Direction: [color=WHITE]" .. dir .. "[/color]"
    .. "  |  [color=DARK_GRAY]ESC to exit[/color]"
  ))
end

-- Initial update
update_labels()

ansi.tick(function()
  local changed = false

  if ansi.is_key_pressed("right") then
    dir_index = (dir_index % 4) + 1
    changed = true
  end
  if ansi.is_key_pressed("left") then
    dir_index = ((dir_index - 2) % 4) + 1
    changed = true
  end

  -- Theme switching with number keys
  for i = 1, 4 do
    if ansi.is_key_pressed(tostring(i)) then
      theme_index = i
      changed = true
    end
  end

  if changed then
    update_labels()
  end

  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

ansi.start()
print("Demo finished!")
