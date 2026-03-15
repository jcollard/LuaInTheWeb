-- Melody: Play "Twinkle Twinkle Little Star" using a chip pattern
-- Demonstrates pattern building and playback controls

local ansi = require("ansi")
local chip = require("chip")

chip.init()

-- Build melody as a pattern
local rows = 64
local p = chip.pattern(1, rows, 180)

local melody = {
  {0,  "C-4"}, {4,  "C-4"}, {8,  "G-4"}, {12, "G-4"},
  {16, "A-4"}, {20, "A-4"}, {24, "G-4"},
  {32, "F-4"}, {36, "F-4"}, {40, "E-4"}, {44, "E-4"},
  {48, "D-4"}, {52, "D-4"}, {56, "C-4"},
}

for _, n in ipairs(melody) do
  p:set_note(n[1], 0, n[2], {instrument = 73, velocity = 58})
  p:set_note_off(n[1] + 3, 0)
end
p:build()

-- State
local current_row = 0
local bpm = 180
local playing = false

chip.on_row_change(function(row)
  current_row = row
end)

ansi.tick(function()
  -- Controls
  if ansi.is_key_pressed(" ") then
    if playing then chip.pause(); playing = false
    else chip.play({loop = true}); playing = true end
  end
  if ansi.is_key_pressed("s") then chip.stop(); playing = false; current_row = 0 end
  if ansi.is_key_pressed(ansi.keys.UP) then
    bpm = math.min(300, bpm + 10); chip.set_bpm(bpm)
  end
  if ansi.is_key_pressed(ansi.keys.DOWN) then
    bpm = math.max(60, bpm - 10); chip.set_bpm(bpm)
  end
  if ansi.is_key_pressed("q") or ansi.is_key_pressed(ansi.keys.ESCAPE) then
    chip.stop(); chip.destroy(); ansi.stop(); return
  end

  -- Draw
  ansi.clear()

  ansi.set_cursor(1, 1)
  ansi.foreground(255, 200, 50)
  ansi.print("=== Melody Player ===")

  -- Status
  ansi.set_cursor(3, 1)
  ansi.foreground(100, 150, 255)
  local status = playing and "Playing" or "Stopped"
  ansi.print("Status: " .. status .. "  |  BPM: " .. bpm)

  -- Progress bar
  ansi.set_cursor(5, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Row: " .. string.format("%2d", current_row) .. " / " .. rows)

  ansi.set_cursor(6, 1)
  local bar_width = 40
  local filled = math.floor((current_row / rows) * bar_width)
  ansi.foreground(85, 255, 85)
  ansi.print("[")
  ansi.print(string.rep("#", filled))
  ansi.foreground(85, 85, 85)
  ansi.print(string.rep("-", bar_width - filled))
  ansi.foreground(85, 255, 85)
  ansi.print("]")

  -- Pattern display
  ansi.set_cursor(8, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Pattern:")

  local display_start = math.max(0, current_row - 6)
  for i = 0, 15 do
    local row = display_start + i
    if row >= rows then break end

    ansi.set_cursor(9 + i, 3)

    local note_name = "---"
    for _, n in ipairs(melody) do
      if n[1] == row then note_name = n[2] end
    end

    if row == current_row and playing then
      ansi.foreground(255, 255, 85)
      ansi.print(string.format("> %2d | %s", row, note_name))
    else
      ansi.foreground(85, 85, 85)
      ansi.print(string.format("  %2d | %s", row, note_name))
    end
  end

  -- Controls
  ansi.set_cursor(26, 1)
  ansi.foreground(85, 85, 85)
  ansi.print("Space: Play/Pause | S: Stop | Up/Down: BPM | Q: Quit")
end)

ansi.start()
