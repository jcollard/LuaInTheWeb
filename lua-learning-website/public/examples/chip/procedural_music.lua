-- Procedural Music: Generate random melodies with the chip library
-- Demonstrates procedural music generation using patterns

local chip = require("chip")

chip.init()

-- Define a scale (C major pentatonic)
local scale = {60, 62, 64, 67, 69, 72, 74, 76}  -- MIDI notes

math.randomseed(os.time())

-- Generate a random pattern
local tracks = 3
local rows = 32
local bpm = 120

local p = chip.pattern(tracks, rows, bpm)

-- Track 0: Random melody (Marimba - instrument 12)
for row = 0, rows - 1, 2 do
  if math.random() > 0.3 then  -- 70% chance of a note
    local note = scale[math.random(#scale)]
    local vel = math.random(40, 64)
    p:set_note(row, 0, note, {instrument = 12, velocity = vel})
  end
end

-- Track 1: Bass pattern (Electric Bass - instrument 33)
local bass_notes = {48, 48, 55, 55, 53, 53, 50, 50}  -- C, G, F, D bass
for row = 0, rows - 1, 4 do
  local idx = math.floor(row / 4) % #bass_notes + 1
  p:set_note(row, 1, bass_notes[idx], {instrument = 33, velocity = 50})
  p:set_note_off(row + 3, 1)
end

-- Track 2: Sparse high bell accents (Tubular Bells - instrument 14)
for row = 0, rows - 1, 8 do
  local note = scale[math.random(5, #scale)]  -- Higher notes
  p:set_note(row, 2, note, {instrument = 14, velocity = 30})
  p:set_note_off(row + 1, 2)
end

-- Build and play
p:build()

print("Playing procedural music... (loops)")
chip.play({loop = true})

-- Let it play
local start = os.clock()
while os.clock() - start < 10 do end

chip.stop()
print("Done!")
chip.destroy()
