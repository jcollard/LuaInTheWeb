-- ansi/hello.lua
-- Demonstrates: Basic ANSI terminal output with colors and timing
-- Features: start, clear, set_cursor, foreground, background, reset, print, get_time

local ansi = require("ansi")

ansi.tick(function()
  ansi.clear()

  -- Title in bright green
  ansi.set_cursor(1, 1)
  ansi.foreground(85, 255, 85)
  ansi.print("=== Hello ANSI Terminal! ===")

  -- Description in default color
  ansi.set_cursor(3, 1)
  ansi.reset()
  ansi.print("This is an 80x25 text terminal using ANSI escape codes.")
  ansi.set_cursor(4, 1)
  ansi.print("It supports true color (24-bit RGB) for text and backgrounds.")

  -- Show RGB colors
  ansi.set_cursor(6, 1)
  ansi.foreground(255, 85, 85)
  ansi.print("Red text ")
  ansi.foreground(85, 255, 85)
  ansi.print("Green text ")
  ansi.foreground(85, 85, 255)
  ansi.print("Blue text ")
  ansi.reset()

  -- Show hex colors
  ansi.set_cursor(8, 1)
  ansi.foreground("#FF8800")
  ansi.print("Orange (hex) ")
  ansi.foreground("#FF00FF")
  ansi.print("Magenta (hex) ")
  ansi.foreground("#00FFFF")
  ansi.print("Cyan (hex)")
  ansi.reset()

  -- Show background colors
  ansi.set_cursor(10, 1)
  ansi.foreground(255, 255, 255)
  ansi.background(170, 0, 0)
  ansi.print(" Red BG ")
  ansi.background(0, 170, 0)
  ansi.print(" Green BG ")
  ansi.background(0, 0, 170)
  ansi.print(" Blue BG ")
  ansi.reset()

  -- Show timer
  ansi.set_cursor(12, 1)
  ansi.foreground(170, 170, 170)
  ansi.print(string.format("Time: %.1f seconds", ansi.get_time()))

  -- Show color palette
  ansi.set_cursor(14, 1)
  ansi.foreground(255, 255, 85)
  ansi.print("CGA/VGA Color Palette:")

  local palette_row = 15
  local col = 1
  for name, color in pairs(ansi.colors) do
    if col > 70 then
      col = 1
      palette_row = palette_row + 1
    end
    ansi.set_cursor(palette_row, col)
    ansi.foreground(color[1], color[2], color[3])
    local label = string.format("%-12s", name)
    ansi.print(label)
    col = col + 12
  end

  -- Footer
  ansi.set_cursor(25, 1)
  ansi.foreground(85, 85, 85)
  ansi.print("Press Ctrl+C to exit")
end)

ansi.start()
