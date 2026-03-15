/**
 * Standalone chip (OPL3 FM synthesis) Lua code - defines the chip module.
 * This code creates the `_chip` table with all chip functions,
 * delegating to `__chip_*` bridge functions registered in setupChipAPI.ts
 * and `__chip_assets_*` bridge functions registered in setupChipAssetAPI.ts.
 */

export const chipLuaCode = `
    -- ========================================================================
    -- Chip Module (OPL3 FM Synthesis)
    -- ========================================================================
    local _chip = {}

    -- ========================================================================
    -- Note name parsing helper
    -- Supports: "C-4", "C#4", "Db4", "F#3", "Bb2", or raw MIDI numbers
    -- ========================================================================
    local _chip_note_names = { C=0, D=2, E=4, F=5, G=7, A=9, B=11 }

    local function _chip_parse_note(note)
      if type(note) == "number" then return note end
      if type(note) ~= "string" then
        error("Invalid note: expected string or number, got " .. type(note))
      end

      -- Try pattern: letter + optional accidental + optional dash + octave
      -- e.g. "C-4", "C#4", "Db4", "F#3", "Bb2"
      local letter, accidental, octave = note:match("^([A-Ga-g])([#b]?)%-?(%d+)$")
      if not letter then
        -- Try as raw number string
        local num = tonumber(note)
        if num then return num end
        error("Invalid note format: " .. note .. " (expected e.g. 'C-4', 'F#3', or MIDI number)")
      end

      local base = _chip_note_names[letter:upper()]
      if not base then
        error("Invalid note letter: " .. letter)
      end

      if accidental == "#" then
        base = base + 1
      elseif accidental == "b" then
        base = base - 1
      end

      return base + (tonumber(octave) + 1) * 12
    end

    -- ========================================================================
    -- Asset management (follows ail_audio pattern)
    -- ========================================================================
    function _chip.add_path(path)
      __chip_assets_addPath(path)
    end

    function _chip.load_file(name, filename)
      __chip_assets_loadFile(name, filename)
    end

    function _chip.start()
      __chip_assets_start()
      __chip_initAndLoadBank()
    end

    -- ========================================================================
    -- Lifecycle
    -- ========================================================================
    function _chip.init()
      -- __chip_initAndLoadBank is async: awaits player import, init, and bank loading.
      -- wasmoon awaits the returned Promise so Lua blocks until everything is ready.
      __chip_initAndLoadBank()
    end

    function _chip.destroy()
      __chip_destroy()
    end

    -- ========================================================================
    -- Direct note control
    -- ========================================================================
    function _chip.set_instrument(track, id)
      __chip_setInstrument(track, id)
    end

    function _chip.note_on(track, note, velocity)
      local midi = _chip_parse_note(note)
      __chip_noteOn(track, midi, velocity)
    end

    function _chip.note_off(track, note)
      if note ~= nil then
        local midi = _chip_parse_note(note)
        __chip_noteOff(track, midi)
      else
        -- If no note specified, silence all notes on the track
        for n = 0, 127 do
          __chip_noteOff(track, n)
        end
      end
    end

    function _chip.all_notes_off()
      __chip_allNotesOff()
    end

    -- ========================================================================
    -- Volume / effects
    -- ========================================================================
    function _chip.set_volume(vol)
      __chip_setVolume(vol)
    end

    function _chip.set_gain(gain)
      __chip_setGain(gain)
    end

    -- ========================================================================
    -- Pattern building (programmatic)
    -- ========================================================================
    function _chip.pattern(tracks, rows, bpm)
      local handle = __chip_buildPattern(tracks, rows, bpm)
      local builder = {}

      function builder:set_note(row, track, note, opts)
        local midi = _chip_parse_note(note)
        local instrument = opts and opts.instrument or nil
        local velocity = opts and opts.velocity or nil
        local effect = opts and opts.effect or nil
        __chip_patternSetNote(handle, row, track, midi, instrument, velocity, effect)
        return self
      end

      function builder:set_note_off(row, track)
        __chip_patternSetNoteOff(handle, row, track)
        return self
      end

      function builder:build()
        __chip_patternBuild(handle)
      end

      return builder
    end

    -- ========================================================================
    -- File loading (from pre-loaded assets or raw YAML strings)
    -- ========================================================================
    function _chip.load_collection(name_or_yaml, song_index)
      -- Check if it's a pre-loaded asset name
      local content = __chip_assets_getFileContent(name_or_yaml)
      if content then
        __chip_loadCollection(content, song_index)
      else
        -- Treat as raw YAML string
        __chip_loadCollection(name_or_yaml, song_index)
      end
    end

    function _chip.load_song_file(name_or_yaml)
      -- Check if it's a pre-loaded asset name
      local content = __chip_assets_getFileContent(name_or_yaml)
      if content then
        __chip_loadSongFile(content)
      else
        -- Treat as raw YAML string
        __chip_loadSongFile(name_or_yaml)
      end
    end

    -- ========================================================================
    -- Playback control
    -- ========================================================================
    function _chip.play(options)
      local loop = true
      if options then
        if options.loop ~= nil then loop = options.loop end
      end
      __chip_play(loop)
    end

    function _chip.pause()
      __chip_pause()
    end

    function _chip.stop()
      __chip_stop()
    end

    function _chip.seek_to_row(row)
      __chip_seekToRow(row)
    end

    function _chip.set_bpm(bpm)
      __chip_setBPM(bpm)
    end

    function _chip.get_state()
      return __chip_getState()
    end

    function _chip.on_row_change(cb)
      return __chip_onRowChange(cb)
    end

    -- ========================================================================
    -- Instrument bank
    -- ========================================================================
    function _chip.load_bank(url)
      return __chip_loadBankFromUrl(url)
    end

    -- Register chip as a module so require('chip') works
    package.preload['chip'] = function()
      return _chip
    end
`
