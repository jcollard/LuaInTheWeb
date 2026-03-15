-- Song Player: Load and play a .wcol collection file
-- Demonstrates file-based song loading and playback control
--
-- To use this example, place a .wcol file in an assets directory:
--   chip.add_path("assets")
--   chip.load_file("my_song", "my_song.wcol")
--   chip.start()
--
-- This example uses a programmatic pattern as a demo since
-- no .wcol file is bundled. See the Chip Composer app to create
-- .wcol files: https://github.com/CaptainCoderOrg/WebOPL

local chip = require("chip")

chip.init()

-- Build a small demo song programmatically
local p = chip.pattern(3, 64, 130)

-- Track 0: Lead (Organ - instrument 19)
local lead_notes = {
  {0, "C-5"}, {4, "D-5"}, {8, "E-5"}, {12, "G-5"},
  {16, "A-5"}, {20, "G-5"}, {24, "E-5"}, {28, "D-5"},
  {32, "C-5"}, {36, "E-5"}, {40, "G-5"}, {44, "A-5"},
  {48, "G-5"}, {52, "E-5"}, {56, "D-5"}, {60, "C-5"},
}
for _, n in ipairs(lead_notes) do
  p:set_note(n[1], 0, n[2], {instrument = 19, velocity = 58})
  p:set_note_off(n[1] + 3, 0)
end

-- Track 1: Bass (Acoustic Bass - instrument 32)
for row = 0, 60, 8 do
  local bass = row < 32 and "C-3" or "A-2"
  p:set_note(row, 1, bass, {instrument = 32, velocity = 50})
  p:set_note_off(row + 6, 1)
end

-- Track 2: Rhythm (Steel Drums - instrument 114)
for row = 0, 62, 2 do
  if row % 4 == 0 then
    p:set_note(row, 2, "C-6", {instrument = 114, velocity = 35})
  else
    p:set_note(row, 2, "G-5", {instrument = 114, velocity = 25})
  end
  p:set_note_off(row + 1, 2)
end

p:build()

print("Playing song... (Ctrl+C to stop)")
print("")

-- Track playback state
chip.on_row_change(function(row)
  local state = chip.get_state()
  io.write(string.format("\rRow %2d / %d  BPM: %d", row, state.totalRows, state.bpm))
end)

chip.play({loop = true})

-- Play for 15 seconds
local start = os.clock()
while os.clock() - start < 15 do end

chip.stop()
print("\nDone!")
chip.destroy()
