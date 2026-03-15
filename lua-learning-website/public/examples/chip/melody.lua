-- Melody: Play a simple melody using note_on/note_off
-- Demonstrates low-level note control with timing

local chip = require("chip")

chip.init()

-- Use instrument 73 (Flute)
chip.set_instrument(0, 73)

-- Simple melody: "Twinkle Twinkle Little Star" fragment
local melody = {
  {"C-4", 0.4}, {"C-4", 0.4}, {"G-4", 0.4}, {"G-4", 0.4},
  {"A-4", 0.4}, {"A-4", 0.4}, {"G-4", 0.8},
  {"F-4", 0.4}, {"F-4", 0.4}, {"E-4", 0.4}, {"E-4", 0.4},
  {"D-4", 0.4}, {"D-4", 0.4}, {"C-4", 0.8},
}

print("Playing melody...")

for _, note_data in ipairs(melody) do
  local note, duration = note_data[1], note_data[2]
  chip.note_on(0, note, 64)

  local start = os.clock()
  while os.clock() - start < duration do end

  chip.note_off(0, note)

  -- Small gap between notes
  start = os.clock()
  while os.clock() - start < 0.05 do end
end

print("Done!")
chip.destroy()
