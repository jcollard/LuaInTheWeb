-- Hello Chip: Interactive OPL3 FM synthesis keyboard
-- Play notes with your keyboard using classic FM instruments

local ansi = require("ansi")
local chip = require("chip")

chip.init()

-- Instrument table: id, name
local instruments = {
  {0,  "Acoustic Piano"}, {19, "Church Organ"}, {73, "Flute"},
  {56, "Trumpet"},        {80, "Square Lead"},  {38, "Synth Bass"},
  {14, "Tubular Bells"},  {114,"Steel Drums"},
}
local inst_index = 1

-- Note key mappings: keyboard row Z-M maps to C4-B4
local key_notes = {
  {key = "z", note = "C-4", label = "C"},
  {key = "x", note = "D-4", label = "D"},
  {key = "c", note = "E-4", label = "E"},
  {key = "v", note = "F-4", label = "F"},
  {key = "b", note = "G-4", label = "G"},
  {key = "n", note = "A-4", label = "A"},
  {key = "m", note = "B-4", label = "B"},
}

-- State
local active_notes = {}  -- key -> true when held

ansi.tick(function()
  -- Instrument selection: 1-8
  for i, inst in ipairs(instruments) do
    if ansi.is_key_pressed(tostring(i)) then
      inst_index = i
      chip.set_instrument(0, inst[1])
      chip.note_off(0)  -- silence when switching
      active_notes = {}
    end
  end

  -- Note input: use is_key_down for held state
  for _, mapping in ipairs(key_notes) do
    local held = ansi.is_key_down(mapping.key)
    if held and not active_notes[mapping.key] then
      chip.note_on(0, mapping.note, 64)
      active_notes[mapping.key] = true
    elseif not held and active_notes[mapping.key] then
      chip.note_off(0, mapping.note)
      active_notes[mapping.key] = nil
    end
  end

  -- Quit
  if ansi.is_key_pressed("q") or ansi.is_key_pressed(ansi.keys.ESCAPE) then
    chip.all_notes_off()
    chip.destroy()
    ansi.stop()
    return
  end

  -- Draw UI
  ansi.clear()

  ansi.set_cursor(1, 1)
  ansi.foreground(255, 200, 50)
  ansi.print("=== Hello Chip: FM Keyboard ===")

  -- Instrument list
  ansi.set_cursor(3, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Instruments (press 1-8):")

  for i, inst in ipairs(instruments) do
    ansi.set_cursor(4 + i, 3)
    if i == inst_index then
      ansi.foreground(85, 255, 85)
      ansi.print("> " .. i .. ": " .. inst[2])
    else
      ansi.foreground(170, 170, 170)
      ansi.print("  " .. i .. ": " .. inst[2])
    end
  end

  -- Keyboard display
  ansi.set_cursor(14, 1)
  ansi.foreground(100, 150, 255)
  ansi.print("Keys (Z X C V B N M):")

  ansi.set_cursor(16, 3)
  for _, mapping in ipairs(key_notes) do
    if active_notes[mapping.key] then
      ansi.foreground(255, 100, 100)
      ansi.print("[" .. mapping.label .. "] ")
    else
      ansi.foreground(85, 85, 85)
      ansi.print(" " .. mapping.label .. "  ")
    end
  end

  -- Controls
  ansi.set_cursor(19, 1)
  ansi.foreground(85, 85, 85)
  ansi.print("Z-M: Play notes | 1-8: Change instrument | Q: Quit")
end)

ansi.start()
