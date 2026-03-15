-- Pattern Builder: Create and play a pattern programmatically
-- Demonstrates the PatternBuilder fluent API

local chip = require("chip")

chip.init()

-- Create a 4-track, 32-row pattern at 140 BPM
local p = chip.pattern(4, 32, 140)

-- Track 0: Lead melody (Synth Lead - instrument 80)
p:set_note(0,  0, "C-5", {instrument = 80, velocity = 64})
p:set_note(4,  0, "E-5")
p:set_note(8,  0, "G-5")
p:set_note(12, 0, "E-5")
p:set_note(16, 0, "C-5")
p:set_note(20, 0, "D-5")
p:set_note(24, 0, "E-5")
p:set_note(28, 0, "C-5")

-- Track 1: Bass (Synth Bass - instrument 38)
p:set_note(0,  1, "C-3", {instrument = 38, velocity = 50})
p:set_note_off(2, 1)
p:set_note(4,  1, "C-3")
p:set_note_off(6, 1)
p:set_note(8,  1, "G-2")
p:set_note_off(10, 1)
p:set_note(12, 1, "G-2")
p:set_note_off(14, 1)
p:set_note(16, 1, "A-2")
p:set_note_off(18, 1)
p:set_note(20, 1, "A-2")
p:set_note_off(22, 1)
p:set_note(24, 1, "F-2")
p:set_note_off(26, 1)
p:set_note(28, 1, "G-2")
p:set_note_off(30, 1)

-- Track 2: Pad chords (Pad - instrument 89)
p:set_note(0,  2, "E-4", {instrument = 89, velocity = 40})
p:set_note(16, 2, "F-4")

-- Track 3: Arpeggiated accent (Bell - instrument 14)
for row = 0, 28, 4 do
  local notes = {"C-6", "E-6", "G-6", "C-7"}
  local idx = (row / 4) % 4 + 1
  p:set_note(row, 3, notes[idx], {instrument = 14, velocity = 32})
  p:set_note_off(row + 1, 3)
end

-- Build and play
p:build()

print("Playing pattern... (loops)")
chip.play({loop = true})

-- Let it play for a few loops
local start = os.clock()
while os.clock() - start < 8 do end

chip.stop()
print("Done!")
chip.destroy()
