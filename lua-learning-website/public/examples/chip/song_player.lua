-- Song Player: Visual music player with transport controls
-- Demonstrates canvas UI with chip playback and state tracking

local canvas = require("canvas")
local chip = require("chip")

chip.init()
canvas.set_size(400, 300)

-- Build a demo song programmatically
local total_rows = 64
local p = chip.pattern(3, total_rows, 130)

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

-- Colors
local bg = "#1a1a2e"
local panel = "#16213e"
local accent = "#e94560"
local green = "#4ade80"
local text_col = "#eaeaea"
local dim = "#666666"
local track_rgb = {
  {74, 222, 128},
  {96, 165, 250},
  {251, 191, 36},
}

-- State
local current_row = 0
local playing = false
local bpm = 130
local track_labels = {"Organ", "Bass", "Drums"}

chip.on_row_change(function(row)
  current_row = row
end)

local function draw_button(x, y, w, h, label, is_active, is_hovered)
  if is_active then canvas.set_color(accent)
  elseif is_hovered then canvas.set_color("#1a5490")
  else canvas.set_color("#0f3460") end
  canvas.begin_path()
  canvas.round_rect(x, y, w, h, 6)
  canvas.fill()
  canvas.set_color(text_col)
  canvas.set_font_size(13)
  canvas.set_text_align("center")
  canvas.set_text_baseline("middle")
  canvas.draw_text(x + w / 2, y + h / 2, label)
end

local function in_rect(mx, my, x, y, w, h)
  return mx >= x and mx <= x + w and my >= y and my <= y + h
end

canvas.tick(function()
  local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()
  local clicked = canvas.is_mouse_pressed(0)

  -- Keyboard controls
  if canvas.is_key_pressed(" ") then
    if playing then chip.pause(); playing = false
    else chip.play({loop = true}); playing = true end
  end
  if canvas.is_key_pressed("s") then
    chip.stop(); playing = false; current_row = 0
  end
  if canvas.is_key_pressed(canvas.keys.ESCAPE) then
    chip.stop(); chip.destroy(); canvas.stop(); return
  end

  -- Mouse clicks
  if clicked then
    if in_rect(mx, my, 30, 50, 70, 32) then chip.play({loop = true}); playing = true end
    if in_rect(mx, my, 110, 50, 70, 32) then chip.pause(); playing = false end
    if in_rect(mx, my, 190, 50, 70, 32) then chip.stop(); playing = false; current_row = 0 end
  end

  local play_hover = in_rect(mx, my, 30, 50, 70, 32)
  local pause_hover = in_rect(mx, my, 110, 50, 70, 32)
  local stop_hover = in_rect(mx, my, 190, 50, 70, 32)

  -- Background
  canvas.set_color(bg)
  canvas.fill_rect(0, 0, 400, 300)

  -- Title
  canvas.set_color(accent)
  canvas.set_font_size(22)
  canvas.set_text_align("center")
  canvas.set_text_baseline("top")
  canvas.draw_text(200, 10, "Song Player")

  -- Transport buttons
  draw_button(30, 50, 70, 32, "Play", playing, play_hover)
  draw_button(110, 50, 70, 32, "Pause", false, pause_hover)
  draw_button(190, 50, 70, 32, "Stop", false, stop_hover)

  -- BPM
  canvas.set_color(dim)
  canvas.set_font_size(13)
  canvas.set_text_align("left")
  canvas.set_text_baseline("middle")
  canvas.draw_text(280, 66, "BPM: " .. bpm)

  -- Progress bar
  local bar_x, bar_y, bar_w, bar_h = 30, 95, 340, 14
  canvas.set_color(panel)
  canvas.begin_path()
  canvas.round_rect(bar_x, bar_y, bar_w, bar_h, 4)
  canvas.fill()

  local progress = current_row / total_rows
  if progress > 0 then
    canvas.set_color(green)
    canvas.begin_path()
    canvas.round_rect(bar_x, bar_y, bar_w * progress, bar_h, 4)
    canvas.fill()
  end

  canvas.set_color(text_col)
  canvas.set_font_size(11)
  canvas.set_text_align("center")
  canvas.set_text_baseline("middle")
  canvas.draw_text(200, bar_y + bar_h / 2, current_row .. " / " .. total_rows)

  -- Track info
  local info_y = 125
  canvas.set_color(text_col)
  canvas.set_font_size(14)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.draw_text(30, info_y, "Tracks")

  for t = 1, 3 do
    local ty = info_y + 24 + (t - 1) * 28
    local c = track_rgb[t]

    canvas.set_color(c[1], c[2], c[3])
    canvas.set_font_size(12)
    canvas.set_text_align("left")
    canvas.set_text_baseline("middle")
    canvas.draw_text(30, ty + 8, track_labels[t])

    canvas.set_color(panel)
    canvas.fill_rect(100, ty, 270, 16)

    if t == 1 then
      for _, n in ipairs(lead_notes) do
        local nx = 100 + (n[1] / total_rows) * 270
        local nw = (3 / total_rows) * 270
        canvas.set_color(c[1], c[2], c[3], 153)
        canvas.fill_rect(nx, ty + 1, nw, 14)
      end
    elseif t == 2 then
      for row = 0, 60, 8 do
        local nx = 100 + (row / total_rows) * 270
        local nw = (6 / total_rows) * 270
        canvas.set_color(c[1], c[2], c[3], 153)
        canvas.fill_rect(nx, ty + 1, nw, 14)
      end
    elseif t == 3 then
      for row = 0, 62, 2 do
        local nx = 100 + (row / total_rows) * 270
        local nw = (1 / total_rows) * 270
        canvas.set_color(c[1], c[2], c[3], 153)
        canvas.fill_rect(nx, ty + 1, nw, 14)
      end
    end

    if playing then
      local px = 100 + (current_row / total_rows) * 270
      canvas.set_color(255, 255, 255, 204)
      canvas.fill_rect(px, ty, 2, 16)
    end
  end

  -- Now playing
  local np_y = 240
  canvas.set_font_size(12)
  canvas.set_text_align("center")
  canvas.set_text_baseline("top")

  if playing then
    local current_note = "---"
    for _, n in ipairs(lead_notes) do
      if current_row >= n[1] and current_row < n[1] + 4 then
        current_note = n[2]
      end
    end
    canvas.set_color(text_col)
    canvas.draw_text(200, np_y, "Now playing: " .. current_note)
  else
    canvas.set_color(dim)
    canvas.draw_text(200, np_y, "Press Play or Space to start")
  end

  canvas.set_color(dim)
  canvas.set_font_size(10)
  canvas.draw_text(200, 280, "Space: Play/Pause | S: Stop | Esc: Quit | Click buttons")
end)

canvas.start()
