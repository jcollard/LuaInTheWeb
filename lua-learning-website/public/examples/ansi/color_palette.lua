-- ansi/color_palette.lua
-- Demonstrates: Full color capabilities of the ANSI terminal
-- Features: foreground, background, reset, colors table, hex colors

local ansi = require("ansi")

ansi.tick(function()
  ansi.clear()

  -- Title
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 255, 255)
  ansi.print("ANSI Terminal Color Palette")

  -- RGB gradient bar
  ansi.set_cursor(3, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("RGB Gradient:")
  ansi.set_cursor(4, 1)
  for i = 0, 79 do
    local r = math.floor(i / 79 * 255)
    local g = math.floor(math.abs(i / 79 * 2 - 1) * 255)
    local b = 255 - math.floor(i / 79 * 255)
    ansi.background(r, g, b)
    ansi.print(" ")
  end
  ansi.reset()

  -- CGA palette
  ansi.set_cursor(6, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("CGA/VGA Colors (ansi.colors.*):")

  local names = {
    "BLACK", "BLUE", "GREEN", "CYAN",
    "RED", "MAGENTA", "BROWN", "LIGHT_GRAY",
    "DARK_GRAY", "BRIGHT_BLUE", "BRIGHT_GREEN", "BRIGHT_CYAN",
    "BRIGHT_RED", "BRIGHT_MAGENTA", "YELLOW", "WHITE",
  }

  for i, name in ipairs(names) do
    local c = ansi.colors[name]
    local row = 7 + math.floor((i - 1) / 4)
    local col = 1 + ((i - 1) % 4) * 20
    ansi.set_cursor(row, col)
    ansi.foreground(c[1], c[2], c[3])
    ansi.print(string.format("%-18s", name))
  end

  -- Background color blocks
  ansi.set_cursor(13, 1)
  ansi.reset()
  ansi.foreground(170, 170, 170)
  ansi.print("Background blocks:")
  ansi.set_cursor(14, 1)
  for i, name in ipairs(names) do
    local c = ansi.colors[name]
    ansi.background(c[1], c[2], c[3])
    -- Use contrasting text color
    if c[1] + c[2] + c[3] > 384 then
      ansi.foreground(0, 0, 0)
    else
      ansi.foreground(255, 255, 255)
    end
    ansi.print(string.format(" %02d ", i))
  end
  ansi.reset()

  -- Hex color examples
  ansi.set_cursor(16, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Hex colors (#RGB and #RRGGBB):")
  ansi.set_cursor(17, 1)
  local hexes = {"#F00", "#0F0", "#00F", "#FF0", "#F0F", "#0FF", "#FFF",
                 "#FF8800", "#8844FF", "#44FF88"}
  for _, hex in ipairs(hexes) do
    ansi.foreground(hex)
    ansi.print(string.format("%-8s", hex))
  end

  -- Animated rainbow
  local t = ansi.get_time()
  ansi.set_cursor(19, 1)
  ansi.reset()
  ansi.foreground(170, 170, 170)
  ansi.print("Animated rainbow:")
  ansi.set_cursor(20, 1)
  for i = 0, 79 do
    local hue = (i / 80 + t * 0.2) % 1.0
    local r = math.floor(math.max(0, math.min(1, math.abs(hue * 6 - 3) - 1)) * 255)
    local g = math.floor(math.max(0, math.min(1, 2 - math.abs(hue * 6 - 2))) * 255)
    local b = math.floor(math.max(0, math.min(1, 2 - math.abs(hue * 6 - 4))) * 255)
    ansi.background(r, g, b)
    ansi.print(" ")
  end
  ansi.reset()

  -- Footer
  ansi.set_cursor(25, 1)
  ansi.foreground(85, 85, 85)
  ansi.print(string.format("Time: %.1fs | Press Ctrl+C to exit", t))
end)

ansi.start()
