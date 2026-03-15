---@meta chip

---@class chip
---OPL3 FM synthesis library for authentic retro game music.
---Provides both low-level note control and high-level pattern/song playback
---using the OPL3 chip (AdLib/Sound Blaster compatible).
local chip = {}

-- ========================================================================
-- Table of Contents
-- ========================================================================
-- 1. Asset Management
-- 2. Lifecycle
-- 3. Direct Note Control
-- 4. Volume / Effects
-- 5. Pattern Building
-- 6. File Loading
-- 7. Playback Control
-- 8. Instrument Bank

-- ========================================================================
-- 1. Asset Management
-- ========================================================================

---Register a directory path to scan for chip music files (.wcol, .wsng).
---Must be called before chip.start().
---@param path string Directory path relative to the script
---@usage chip.add_path("assets")
function chip.add_path(path) end

---Register a chip music file by name.
---Must be called before chip.start().
---@param name string Name to reference the file by
---@param filename string Filename relative to a registered path
---@usage chip.load_file("demo", "demo_song.wcol")
function chip.load_file(name, filename) end

---Initialize the chip engine and load all registered assets.
---Must be called after add_path/load_file and before playback.
---@usage chip.start()
function chip.start() end

-- ========================================================================
-- 2. Lifecycle
-- ========================================================================

---Initialize the chip engine without asset loading.
---Use this for direct note control without pre-loaded files.
---@usage chip.init()
function chip.init() end

---Destroy the chip engine and release resources.
---@usage chip.destroy()
function chip.destroy() end

-- ========================================================================
-- 3. Direct Note Control
-- ========================================================================

---Set the instrument for a track.
---@param track integer Track number (0-17)
---@param id integer Instrument ID from the loaded bank (0-based)
---@usage chip.set_instrument(0, 0) -- Set track 0 to instrument 0 (Piano)
function chip.set_instrument(track, id) end

---Start playing a note on a track.
---@param track integer Track number (0-17)
---@param note string|integer Note name ("C-4", "F#3", "Bb2") or MIDI number (0-127)
---@param velocity? integer Velocity (0-127, default 64)
---@usage chip.note_on(0, "C-4", 64)
---@usage chip.note_on(0, 60, 100) -- MIDI note 60 = C-4
function chip.note_on(track, note, velocity) end

---Stop playing a note on a track.
---If no note is specified, silences all notes on the track.
---@param track integer Track number (0-17)
---@param note? string|integer Note name or MIDI number (optional)
---@usage chip.note_off(0, "C-4")
---@usage chip.note_off(0) -- Silence all notes on track 0
function chip.note_off(track, note) end

---Stop all notes on all tracks.
---@usage chip.all_notes_off()
function chip.all_notes_off() end

-- ========================================================================
-- 4. Volume / Effects
-- ========================================================================

---Set master volume.
---@param vol number Volume level (0.0 to 1.0)
---@usage chip.set_volume(0.5)
function chip.set_volume(vol) end

---Set output gain.
---@param gain number Gain multiplier
---@usage chip.set_gain(1.5)
function chip.set_gain(gain) end

-- ========================================================================
-- 5. Pattern Building
-- ========================================================================

---@class ChipPatternBuilder
---Fluent pattern builder for programmatic music creation.
local ChipPatternBuilder = {}

---Set a note at a specific position.
---@param row integer Row number (0-based)
---@param track integer Track number (0-based)
---@param note string|integer Note name ("C-4") or MIDI number
---@param opts? {instrument?: integer, velocity?: integer, effect?: string}
---@return ChipPatternBuilder self For method chaining
---@usage builder:set_note(0, 0, "C-4", {instrument = 0, velocity = 64})
function ChipPatternBuilder:set_note(row, track, note, opts) end

---Set a note-off at a specific position.
---@param row integer Row number (0-based)
---@param track integer Track number (0-based)
---@return ChipPatternBuilder self For method chaining
---@usage builder:set_note_off(4, 0)
function ChipPatternBuilder:set_note_off(row, track) end

---Build the pattern and load it into the player.
---@usage builder:build()
function ChipPatternBuilder:build() end

---Create a new pattern builder.
---@param tracks integer Number of tracks
---@param rows integer Number of rows
---@param bpm? integer Beats per minute (default 120)
---@return ChipPatternBuilder builder
---@usage local b = chip.pattern(4, 16, 120)
---  b:set_note(0, 0, "C-4", {instrument = 0})
---  b:set_note(4, 0, "E-4")
---  b:build()
function chip.pattern(tracks, rows, bpm) end

-- ========================================================================
-- 6. File Loading
-- ========================================================================

---Load a collection file (.wcol).
---Can pass a pre-loaded asset name or raw YAML string.
---@param name_or_yaml string Asset name or YAML content
---@param song_index? integer Song index within collection (0-based)
---@usage chip.load_collection("demo") -- Load pre-registered asset
---@usage chip.load_collection(yaml_string, 0) -- Load from YAML
function chip.load_collection(name_or_yaml, song_index) end

---Load a song file (.wsng).
---Can pass a pre-loaded asset name or raw YAML string.
---@param name_or_yaml string Asset name or YAML content
---@usage chip.load_song_file("my_song")
function chip.load_song_file(name_or_yaml) end

-- ========================================================================
-- 7. Playback Control
-- ========================================================================

---@class ChipPlayOptions
---@field loop? boolean Whether to loop playback (default true)

---Start playback of the loaded pattern/song.
---@param options? ChipPlayOptions
---@usage chip.play() -- Play with loop
---@usage chip.play({loop = false}) -- Play once
function chip.play(options) end

---Pause playback.
---@usage chip.pause()
function chip.pause() end

---Stop playback and reset position.
---@usage chip.stop()
function chip.stop() end

---Seek to a specific row.
---@param row integer Row number (0-based)
---@usage chip.seek_to_row(16)
function chip.seek_to_row(row) end

---Set the tempo.
---@param bpm integer Beats per minute
---@usage chip.set_bpm(140)
function chip.set_bpm(bpm) end

---@class ChipPlaybackState
---@field playing boolean Whether playback is active
---@field currentRow integer Current playback row
---@field bpm integer Current BPM
---@field totalRows integer Total rows in pattern

---Get the current playback state.
---@return ChipPlaybackState
---@usage local state = chip.get_state()
---  print("Row: " .. state.currentRow)
function chip.get_state() end

---Register a callback for row changes during playback.
---@param cb fun(row: integer) Callback function
---@return fun() unsubscribe Function to remove the callback
---@usage local unsub = chip.on_row_change(function(row)
---  print("Now at row " .. row)
---end)
function chip.on_row_change(cb) end

-- ========================================================================
-- 8. Instrument Bank
-- ========================================================================

---Load an instrument bank from a URL.
---@param url string URL to the GENMIDI JSON file
---@usage chip.load_bank("/instruments/legacy/GENMIDI.json")
function chip.load_bank(url) end

return chip
