# Chip Library

The `chip` library provides OPL3 FM synthesis for creating authentic retro game music (AdLib/Sound Blaster compatible). It supports both low-level note control and high-level pattern/song playback.

## Using the Library

```lua
local chip = require("chip")
chip.init()

-- Play a note
chip.set_instrument(0, 0)  -- Track 0, instrument 0 (Piano)
chip.note_on(0, "C-4", 64) -- Track 0, note C-4, velocity 64
```

## Asset Loading

Load `.wcol` (collection) or `.wsng` (song) files from your project:

```lua
local chip = require("chip")
chip.add_path("assets")
chip.load_file("demo", "demo_song.wcol")
chip.start()  -- Loads assets and initializes engine

chip.load_collection("demo")
chip.play()
```

### Supported Formats

- **`.wcol`** - Collection files (multiple songs sharing patterns and instruments)
- **`.wsng`** - Single song files

## Direct Note Control

Control individual notes for procedural or interactive music:

```lua
local chip = require("chip")
chip.init()

-- Set instruments
chip.set_instrument(0, 0)  -- Piano
chip.set_instrument(1, 73) -- Flute

-- Play notes (supports note names or MIDI numbers)
chip.note_on(0, "C-4", 64)
chip.note_on(1, "E-4", 48)

-- Stop notes
chip.note_off(0, "C-4")
chip.all_notes_off()
```

### Note Format

Notes can be specified as:
- **Note names**: `"C-4"`, `"F#3"`, `"Bb2"`, `"D#5"`
- **MIDI numbers**: `60` (C-4), `69` (A-4), `48` (C-3)

## Pattern Building

Create patterns programmatically using the fluent builder API:

```lua
local chip = require("chip")
chip.init()

local pattern = chip.pattern(2, 16, 120)  -- 2 tracks, 16 rows, 120 BPM
pattern:set_note(0, 0, "C-4", {instrument = 0, velocity = 64})
pattern:set_note(4, 0, "E-4")
pattern:set_note(8, 0, "G-4")
pattern:set_note(12, 0, "C-5")
pattern:set_note(0, 1, "C-3", {instrument = 32})  -- Bass on track 1
pattern:set_note_off(2, 1)
pattern:build()

chip.play()
```

## Song/Collection Playback

Load and play pre-composed songs:

```lua
-- From pre-loaded assets
chip.load_collection("demo", 0)  -- Load song index 0 from collection
chip.play({loop = true})

-- From raw YAML string
chip.load_song_file(yaml_string)
chip.play({loop = false})
```

### Playback Control

```lua
chip.play()              -- Start (loops by default)
chip.play({loop = false}) -- Play once
chip.pause()             -- Pause
chip.stop()              -- Stop and reset
chip.seek_to_row(16)     -- Jump to row 16
chip.set_bpm(140)        -- Change tempo
```

### Playback State

```lua
local state = chip.get_state()
print("Playing: " .. tostring(state.playing))
print("Row: " .. state.currentRow .. " / " .. state.totalRows)
print("BPM: " .. state.bpm)

-- Row change callback
chip.on_row_change(function(row)
  print("Now at row " .. row)
end)
```

## Volume Control

```lua
chip.set_volume(0.5)  -- Master volume (0.0 to 1.0)
chip.set_gain(1.5)    -- Output gain multiplier
```

## Instrument Bank

The default GENMIDI bank includes 128 General MIDI instruments plus percussion. You can load custom banks:

```lua
chip.load_bank("/path/to/custom/GENMIDI.json")
```

## Using with Canvas

```lua
local canvas = require("canvas")
local chip = require("chip")

chip.init()
chip.set_instrument(0, 0)

canvas.start(400, 300)
canvas.on_key_down(function(key)
  if key == "Space" then
    chip.note_on(0, "C-4", 64)
  end
end)
canvas.on_key_up(function(key)
  if key == "Space" then
    chip.note_off(0, "C-4")
  end
end)
```

## Using with ANSI

```lua
local ansi = require("ansi")
local chip = require("chip")

chip.add_path("assets")
chip.load_file("song", "music.wcol")
chip.start()

ansi.start(80, 25)
chip.load_collection("song")
chip.play()

ansi.on_key(function(key)
  if key == "m" then
    local state = chip.get_state()
    if state.playing then chip.pause() else chip.play() end
  end
end)
```

## API Reference

### Asset Management

| Function | Description |
|----------|-------------|
| `chip.add_path(path)` | Register a directory to scan for music files |
| `chip.load_file(name, filename)` | Register a music file by name |
| `chip.start()` | Load assets and initialize the engine |

### Lifecycle

| Function | Description |
|----------|-------------|
| `chip.init()` | Initialize engine (without asset loading) |
| `chip.destroy()` | Release all resources |

### Note Control

| Function | Description |
|----------|-------------|
| `chip.set_instrument(track, id)` | Set track instrument (0-based) |
| `chip.note_on(track, note, velocity)` | Start a note |
| `chip.note_off(track, note)` | Stop a note (or all on track) |
| `chip.all_notes_off()` | Silence all tracks |

### Volume

| Function | Description |
|----------|-------------|
| `chip.set_volume(vol)` | Set master volume (0.0-1.0) |
| `chip.set_gain(gain)` | Set output gain multiplier |

### Pattern Builder

| Function | Description |
|----------|-------------|
| `chip.pattern(tracks, rows, bpm)` | Create a pattern builder |
| `builder:set_note(row, track, note, opts)` | Set a note |
| `builder:set_note_off(row, track)` | Set note off |
| `builder:build()` | Build and load pattern |

### File Loading

| Function | Description |
|----------|-------------|
| `chip.load_collection(name_or_yaml, idx)` | Load a .wcol collection |
| `chip.load_song_file(name_or_yaml)` | Load a .wsng song |

### Playback

| Function | Description |
|----------|-------------|
| `chip.play(options)` | Start playback |
| `chip.pause()` | Pause playback |
| `chip.stop()` | Stop and reset |
| `chip.seek_to_row(row)` | Seek to row |
| `chip.set_bpm(bpm)` | Set tempo |
| `chip.get_state()` | Get playback state |
| `chip.on_row_change(cb)` | Row change callback |

### Instrument Bank

| Function | Description |
|----------|-------------|
| `chip.load_bank(url)` | Load custom instrument bank |
