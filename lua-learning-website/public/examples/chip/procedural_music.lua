-- Procedural Music: Generate random melodies with a visual grid
-- Demonstrates procedural generation with canvas visualization

local canvas = require("canvas")
local chip = require("chip")

chip.init()
canvas.set_size(400, 300)

-- Pentatonic scale (MIDI notes)
local scale = {60, 62, 64, 67, 69, 72, 74, 76}
math.randomseed(os.time())

-- Pattern config
local tracks = 3
local rows = 32

-- Track colors (RGB 0-255)
local track_colors = {
  {84, 255, 84},    -- green: melody
  {102, 153, 255},  -- blue: bass
  {255, 204, 51},   -- yellow: bells
}

-- Store note data for visualization
local grid = {}

local function generate_pattern()
  grid = {}
  for r = 0, rows - 1 do grid[r] = {} end

  local p = chip.pattern(tracks, rows, 120)
  local gen_bpm = 120 + math.random(-20, 20)

  -- Track 0: Random melody (Marimba)
  for row = 0, rows - 1, 2 do
    if math.random() > 0.3 then
      local note = scale[math.random(#scale)]
      p:set_note(row, 0, note, {instrument = 12, velocity = math.random(40, 64)})
      grid[row][1] = note
    end
  end

  -- Track 1: Bass pattern (Electric Bass)
  local bass_notes = {48, 48, 55, 55, 53, 53, 50, 50}
  for row = 0, rows - 1, 4 do
    local idx = math.floor(row / 4) % #bass_notes + 1
    local note = bass_notes[idx]
    p:set_note(row, 1, note, {instrument = 33, velocity = 50})
    p:set_note_off(row + 3, 1)
    grid[row][2] = note
  end

  -- Track 2: Sparse bells (Tubular Bells)
  for row = 0, rows - 1, 8 do
    local note = scale[math.random(5, #scale)]
    p:set_note(row, 2, note, {instrument = 14, velocity = 30})
    p:set_note_off(row + 1, 2)
    grid[row][3] = note
  end

  p:build()
  return gen_bpm
end

-- State
local bpm = generate_pattern()
local current_row = 0
local prev_row = 0
local playing = false
local gen_count = 1

chip.on_row_change(function(row)
  -- Detect loop wrap: row jumped backward (end of pattern → start)
  if row < prev_row and playing then
    bpm = generate_pattern()
    chip.play({loop = true})
    gen_count = gen_count + 1
  end
  prev_row = row
  current_row = row
end)

local note_names = {"C","C#","D","D#","E","F","F#","G","G#","A","A#","B"}
local function midi_to_name(midi)
  local octave = math.floor(midi / 12) - 1
  local name = note_names[(midi % 12) + 1]
  return name .. octave
end

canvas.tick(function()
  -- Input
  if canvas.is_key_pressed(" ") then
    if playing then chip.pause(); playing = false
    else chip.play({loop = true}); playing = true end
  end
  if canvas.is_key_pressed("s") then
    chip.stop(); playing = false; current_row = 0
  end
  if canvas.is_key_pressed("r") then
    chip.stop(); playing = false; current_row = 0
    bpm = generate_pattern()
  end
  if canvas.is_key_pressed(canvas.keys.ESCAPE) then
    chip.stop(); chip.destroy(); canvas.stop(); return
  end

  -- Background
  canvas.set_color("#1a1a2e")
  canvas.fill_rect(0, 0, 400, 300)

  -- Title
  canvas.set_color("#e94560")
  canvas.set_font_size(20)
  canvas.set_text_align("center")
  canvas.set_text_baseline("top")
  canvas.draw_text(200, 8, "Procedural Music")



  -- Status bar
  canvas.set_color("#888888")
  canvas.set_font_size(12)
  canvas.draw_text(200, 32, (playing and "Playing" or "Stopped") .. "  BPM: " .. bpm .. "  #" .. gen_count)

  -- Grid visualizer
  local grid_x, grid_y = 20, 50
  local cell_w = math.floor(360 / rows)
  local cell_h = 7
  local grid_h = cell_h * tracks

  for row = 0, rows - 1 do
    for t = 1, tracks do
      local x = grid_x + row * cell_w
      local y = grid_y + (t - 1) * cell_h

      if grid[row] and grid[row][t] then
        local c = track_colors[t]
        local alpha = (row == current_row and playing) and 255 or 128
        canvas.set_color(c[1], c[2], c[3], alpha)
        canvas.fill_rect(x, y, cell_w - 1, cell_h - 1)
      else
        canvas.set_color(255, 255, 255, 13)
        canvas.fill_rect(x, y, cell_w - 1, cell_h - 1)
      end
    end
  end

  -- Current row indicator
  if playing then
    local cx = grid_x + current_row * cell_w
    canvas.set_color(255, 255, 255, 77)
    canvas.fill_rect(cx, grid_y - 2, cell_w, grid_h + 4)
  end

  -- Track labels
  canvas.set_font_size(10)
  canvas.set_text_align("left")
  canvas.set_text_baseline("middle")
  local labels = {"Melody", "Bass", "Bells"}
  for t = 1, tracks do
    local c = track_colors[t]
    canvas.set_color(c[1], c[2], c[3], 204)
    canvas.draw_text(grid_x, grid_y + grid_h + 8 + (t - 1) * 14, labels[t])
  end

  -- Note activity display
  canvas.set_font_size(14)
  canvas.set_text_align("center")
  canvas.set_text_baseline("top")

  local active_y = grid_y + grid_h + 52
  for t = 1, tracks do
    local x = 60 + (t - 1) * 130
    local c = track_colors[t]

    if grid[current_row] and grid[current_row][t] and playing then
      canvas.set_color(c[1], c[2], c[3])
      canvas.draw_text(x, active_y, midi_to_name(grid[current_row][t]))
    else
      canvas.set_color(c[1], c[2], c[3], 51)
      canvas.draw_text(x, active_y, "---")
    end
  end

  -- Progress bar
  local bar_y = 260
  canvas.set_color("#16213e")
  canvas.fill_rect(20, bar_y, 360, 8)
  if playing then
    local progress = current_row / rows
    canvas.set_color("#4ade80")
    canvas.fill_rect(20, bar_y, 360 * progress, 8)
  end

  -- Controls
  canvas.set_color("#666666")
  canvas.set_font_size(11)
  canvas.draw_text(200, 280, "Space: Play/Pause | S: Stop | R: Regenerate | Esc: Quit")
end)

canvas.start()
