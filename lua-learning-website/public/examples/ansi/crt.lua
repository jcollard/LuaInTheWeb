-- ansi/crt.lua
-- Demonstrates: CRT monitor effect with WebGL post-processing shader
-- Features: all 14 CRT config parameters

local ansi = require("ansi")

-- Enable CRT with all 14 configurable parameters before start()
-- These values override project.lua defaults (if any)
ansi.crt({
  smoothing = true,          -- texture filtering: true=LINEAR, false=NEAREST
  scanlineIntensity = 0.4,   -- scanline darkness (0-1)
  scanlineCount = 200,       -- number of scanlines (50-1200)
  adaptiveIntensity = 0.8,   -- scanline adaptive modulation (0-1)
  brightness = 1.2,          -- brightness multiplier (0.6-1.8)
  contrast = 1.1,            -- contrast adjustment (0.5-1.5)
  saturation = 1.15,         -- color saturation (0-2)
  bloomIntensity = 0.5,      -- bright pixel glow (0-1.5)
  bloomThreshold = 0.3,      -- bloom luminance threshold (0-1)
  rgbShift = 0.8,            -- chromatic aberration (0-1)
  vignetteStrength = 0.4,    -- edge darkening (0-2)
  curvature = 0.08,          -- barrel distortion (0-0.5)
  flickerStrength = 0.02,    -- temporal flicker (0-0.15)
  phosphor = 0.3,            -- RGB phosphor mask strength (0-1)
})

ansi.tick(function()
  ansi.clear()
  local time = ansi.get_time()

  -- Title
  ansi.set_cursor(1, 1)
  ansi.foreground(85, 255, 85)
  ansi.print("=== CRT Monitor Effect Demo (all 14 parameters) ===")

  -- Two-column effect list
  local left = {
    "smoothing=true",    "scanlineIntensity=0.4",
    "scanlineCount=200", "adaptiveIntensity=0.8",
    "brightness=1.2",    "contrast=1.1",
    "saturation=1.15",
  }
  local right = {
    "bloomIntensity=0.5",  "bloomThreshold=0.3",
    "rgbShift=0.8",        "vignetteStrength=0.4",
    "curvature=0.08",      "flickerStrength=0.02",
    "phosphor=0.3",
  }
  ansi.foreground(255, 255, 85)
  for i = 1, 7 do
    ansi.set_cursor(2 + i, 2)
    ansi.print(string.format("%-22s", left[i]))
    ansi.set_cursor(2 + i, 42)
    ansi.print(right[i])
  end

  -- Color gradient bars to show bloom, phosphor, and saturation
  ansi.set_cursor(11, 1)
  ansi.reset()
  ansi.print("Color gradients (notice bloom, phosphor, saturation):")

  ansi.set_cursor(12, 1)
  for i = 0, 79 do
    local v = math.floor(255 * (i / 79))
    ansi.foreground(v, 0, 0)
    ansi.background(v, 0, 0)
    ansi.print(" ")
  end

  ansi.set_cursor(13, 1)
  for i = 0, 79 do
    local v = math.floor(255 * (i / 79))
    ansi.foreground(0, v, 0)
    ansi.background(0, v, 0)
    ansi.print(" ")
  end

  ansi.set_cursor(14, 1)
  for i = 0, 79 do
    local v = math.floor(255 * (i / 79))
    ansi.foreground(0, 0, v)
    ansi.background(0, 0, v)
    ansi.print(" ")
  end
  ansi.reset()

  -- Scrolling highlight to show scanline interaction
  ansi.set_cursor(16, 1)
  ansi.foreground(85, 255, 255)
  ansi.print("Scrolling highlight (watch scanline + flicker):")

  local highlight_row = 17 + math.floor(time * 3) % 5
  for row = 17, 21 do
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

  -- Bright text to show curvature + vignette at edges
  ansi.set_cursor(23, 1)
  ansi.foreground(255, 255, 255)
  ansi.print("Bright edge text shows curvature + vignette darkening -->")

  -- Timer + footer
  ansi.set_cursor(24, 1)
  ansi.foreground(170, 170, 170)
  ansi.print(string.format("Time: %.1fs", time))
  ansi.set_cursor(25, 1)
  ansi.foreground(85, 85, 85)
  ansi.print("Press Ctrl+C to exit")
end)

ansi.start()
