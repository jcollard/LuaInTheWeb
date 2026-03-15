-- Hello Chip: Minimal OPL3 FM synthesis example
-- Plays a simple chord using direct note control

local chip = require("chip")

-- Initialize the chip engine
chip.init()

-- Set instrument 0 (Acoustic Grand Piano) on tracks 0-2
chip.set_instrument(0, 0)
chip.set_instrument(1, 0)
chip.set_instrument(2, 0)

-- Play a C major chord
print("Playing C major chord...")
chip.note_on(0, "C-4", 64)   -- C
chip.note_on(1, "E-4", 64)   -- E
chip.note_on(2, "G-4", 64)   -- G

-- Wait 2 seconds
local start = os.clock()
while os.clock() - start < 2 do end

-- Stop all notes
chip.all_notes_off()
print("Done!")

chip.destroy()
