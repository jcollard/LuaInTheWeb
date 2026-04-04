-- Pattern Builder: Create and play a multi-track pattern
-- Demonstrates the PatternBuilder API with 4 instrument tracks

local ansi = require("ansi")
local chip = require("chip")

chip.init()

local rows = 32
local track_names = {"Lead", "Bass", "Pad", "Bell"}
local track_data = {
  {{0,"C-5"},{4,"E-5"},{8,"G-5"},{12,"E-5"},{16,"C-5"},{20,"D-5"},{24,"E-5"},{28,"C-5"}},
  {{0,"C-3"},{4,"C-3"},{8,"G-2"},{12,"G-2"},{16,"A-2"},{20,"A-2"},{24,"F-2"},{28,"G-2"}},
  {{0,"E-4"},{16,"F-4"}},
  {{0,"C-6"},{4,"E-6"},{8,"G-6"},{12,"C-7"},{16,"C-6"},{20,"E-6"},{24,"G-6"},{28,"C-7"}},
}

local current_row = 0
local bpm = 140
local playing = false
local ready = false

local function build_pattern()
  local p = chip.pattern(4, rows, 140)
  if not p then return false end

  p:set_note(0,  0, "C-5", {instrument = 80, velocity = 64})
  p:set_note(4,  0, "E-5"); p:set_note(8,  0, "G-5")
  p:set_note(12, 0, "E-5"); p:set_note(16, 0, "C-5")
  p:set_note(20, 0, "D-5"); p:set_note(24, 0, "E-5")
  p:set_note(28, 0, "C-5")

  for row = 0, 28, 4 do
    local notes = {"C-3","C-3","G-2","G-2","A-2","A-2","F-2","G-2"}
    p:set_note(row, 1, notes[row/4+1], {instrument = 38, velocity = 50})
    p:set_note_off(row + 2, 1)
  end

  p:set_note(0,  2, "E-4", {instrument = 89, velocity = 40})
  p:set_note(16, 2, "F-4")

  for row = 0, 28, 4 do
    local notes = {"C-6", "E-6", "G-6", "C-7"}
    local idx = (row / 4) % 4 + 1
    p:set_note(row, 3, notes[idx], {instrument = 14, velocity = 32})
    p:set_note_off(row + 1, 3)
  end

  p:build()
  chip.on_row_change(function(row) current_row = row end)
  return true
end

local function note_at(track, row)
  for _, n in ipairs(track_data[track]) do
    if n[1] == row then return n[2] end
  end
  return nil
end

ansi.tick(function()
  if not ready then
    if not chip.ready() then
      ansi.clear()
      ansi.set_cursor(1, 1)
      ansi.foreground(255, 200, 50)
      ansi.print("Loading...")
      return
    end
    ready = build_pattern()
  end

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

  ansi.clear()
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 200, 50)
  ansi.print("=== Pattern Builder ===")

  ansi.set_cursor(3, 1)
  ansi.foreground(100, 150, 255)
  local status = playing and "Playing" or "Stopped"
  ansi.print(status .. " | BPM: " .. bpm .. " | Row: " .. current_row .. "/" .. rows)

  ansi.set_cursor(5, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Row  ")
  for _, name in ipairs(track_names) do
    ansi.print(string.format("%-6s", name))
  end

  local win_start = math.max(0, current_row - 7)
  for i = 0, 17 do
    local row = win_start + i
    if row >= rows then break end
    ansi.set_cursor(6 + i, 1)
    local is_current = (row == current_row and playing)
    if is_current then
      ansi.foreground(255, 255, 85)
      ansi.print(string.format(">%2d  ", row))
    else
      ansi.foreground(85, 85, 85)
      ansi.print(string.format(" %2d  ", row))
    end
    for t = 1, 4 do
      local note = note_at(t, row)
      if note then
        if is_current then
          ansi.foreground(255, 255, 85)
        else
          local colors = {{85,255,85},{100,150,255},{200,100,255},{255,200,50}}
          ansi.foreground(colors[t][1], colors[t][2], colors[t][3])
        end
        ansi.print(string.format("%-6s", note))
      else
        ansi.foreground(50, 50, 50)
        ansi.print("---   ")
      end
    end
  end

  ansi.set_cursor(25, 1)
  ansi.foreground(85, 85, 85)
  ansi.print("Space: Play/Pause | S: Stop | Up/Down: BPM | Q: Quit")
end)

ansi.start()
