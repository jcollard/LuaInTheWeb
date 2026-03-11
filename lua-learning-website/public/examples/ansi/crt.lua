-- ansi/crt.lua
-- Demonstrates: CRT monitor effect with WebGL post-processing shader
-- Features: crt, per-effect config, scanlines, bloom, curvature, phosphor

local ansi = require("ansi")

-- Enable CRT with custom settings before start()
-- These values override project.lua defaults (if any)
ansi.crt({
  curvature = 0.08,        -- barrel distortion (0-0.5)
  scanlineIntensity = 0.4, -- scanline darkness (0-1)
  scanlineCount = 200,     -- number of scanlines (50-1200)
  bloomIntensity = 0.5,    -- bright pixel glow (0-1.5)
  bloomThreshold = 0.3,    -- bloom luminance threshold (0-1)
  rgbShift = 0.8,          -- chromatic aberration (0-1)
  vignetteStrength = 0.4,  -- edge darkening (0-2)
  phosphor = 0.3,          -- RGB phosphor mask (0-1)
  brightness = 1.2,        -- brightness multiplier (0.6-1.8)
})

local time = 0

ansi.tick(function()
  ansi.clear()
  time = ansi.get_time()

  -- Title
  ansi.set_cursor(1, 1)
  ansi.foreground(85, 255, 85)
  ansi.print("=== CRT Monitor Effect Demo ===")

  -- Description
  ansi.set_cursor(3, 1)
  ansi.reset()
  ansi.print("This terminal uses a WebGL CRT shader with:")

  -- List active effects
  ansi.set_cursor(5, 3)
  ansi.foreground(255, 255, 85)
  ansi.print("* Barrel distortion (curvature)")
  ansi.set_cursor(6, 3)
  ansi.print("* Horizontal scanlines")
  ansi.set_cursor(7, 3)
  ansi.print("* Bloom / glow on bright pixels")
  ansi.set_cursor(8, 3)
  ansi.print("* Chromatic aberration (RGB shift)")
  ansi.set_cursor(9, 3)
  ansi.print("* Vignette (edge darkening)")
  ansi.set_cursor(10, 3)
  ansi.print("* RGB phosphor mask")

  -- Color bars to show bloom and phosphor
  ansi.set_cursor(12, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Color bars (notice bloom and phosphor):")

  ansi.set_cursor(13, 1)
  for i = 0, 79 do
    local r = math.floor(255 * (i / 79))
    ansi.foreground(r, 0, 0)
    ansi.background(r, 0, 0)
    ansi.print(" ")
  end

  ansi.set_cursor(14, 1)
  for i = 0, 79 do
    local g = math.floor(255 * (i / 79))
    ansi.foreground(0, g, 0)
    ansi.background(0, g, 0)
    ansi.print(" ")
  end

  ansi.set_cursor(15, 1)
  for i = 0, 79 do
    local b = math.floor(255 * (i / 79))
    ansi.foreground(0, 0, b)
    ansi.background(0, 0, b)
    ansi.print(" ")
  end
  ansi.reset()

  -- Scrolling text to show scanline interaction
  ansi.set_cursor(17, 1)
  ansi.foreground(85, 255, 255)
  ansi.print("Scrolling highlight (watch scanline interaction):")

  local highlight_row = 18 + math.floor(time * 3) % 5
  for row = 18, 22 do
    ansi.set_cursor(row, 1)
    if row == highlight_row then
      ansi.foreground(255, 255, 255)
      ansi.background(0, 80, 160)
      ansi.print(string.rep(" ", 80))
      ansi.set_cursor(row, 3)
      ansi.print(">>> Active line <<<")
    else
      ansi.background(0, 0, 0)
      ansi.foreground(60, 60, 60)
      ansi.print(string.rep("-", 80))
    end
  end
  ansi.reset()

  -- Timer
  ansi.set_cursor(24, 1)
  ansi.foreground(170, 170, 170)
  ansi.print(string.format("Time: %.1fs", time))

  -- Footer
  ansi.set_cursor(25, 1)
  ansi.foreground(85, 85, 85)
  ansi.print("Press Ctrl+C to exit")
end)

ansi.start()
