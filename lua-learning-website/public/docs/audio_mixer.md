# Audio Mixer Library

The audio-mixer library provides a high-level API for managing game audio with channels, fading, and crossfading. Built on top of the [canvas audio API](canvas/audio.md), it simplifies common audio patterns.

## Loading the Library

```lua
local mixer = require("audio_mixer")
```

## Quick Start

```lua
local canvas = require("canvas")
local mixer = require("audio_mixer")

-- Register assets
canvas.assets.add_path("assets")
local theme = canvas.assets.load_music("theme", "music/theme.ogg")
local battle = canvas.assets.load_music("battle", "music/battle.ogg")
local coin = canvas.assets.load_sound("coin", "sfx/coin.ogg")

canvas.set_size(400, 200)

-- Create audio channels
local bgm = mixer.create_channel("bgm")
local sfx = mixer.create_channel("sfx")

-- Start playing
mixer.play(bgm, theme, { loop = true, fade_in = 1.0 })

canvas.tick(function()
  mixer.update_crossfade(bgm)  -- Required for crossfade completion

  canvas.clear()

  -- Click to crossfade to battle music
  if canvas.is_mouse_pressed(0) then
    mixer.crossfade(bgm, battle, 2.0, { loop = true })
    mixer.play(sfx, coin)
  end

  canvas.set_fill_style("#ffffff")
  canvas.draw_text("Click to crossfade!", 20, 100)
end)

canvas.start()
```

## Channels

Channels are named audio buses. Each channel can play one audio track at a time with independent volume control.

### Creating Channels

```lua
local bgm = mixer.create_channel("bgm")      -- Background music
local sfx = mixer.create_channel("sfx")      -- Sound effects
local voice = mixer.create_channel("voice")  -- Voice/dialogue
local ambient = mixer.create_channel("ambient")
```

The `create_channel` function returns a channel object that you pass to other mixer functions.

## Playback

### Basic Playback

```lua
-- Play a sound or music on a channel
mixer.play(sfx, coin_sound)

-- Play with options
mixer.play(bgm, theme_music, {
  loop = true,     -- Loop the audio
  volume = 0.8,    -- Start at 80% volume
  fade_in = 1.0    -- Fade in over 1 second
})
```

### Playback Control

```lua
-- Stop playback
mixer.stop(bgm)
mixer.stop(bgm, { fade_out = 2.0 })  -- Fade out before stopping

-- Pause and resume
mixer.pause(bgm)
mixer.resume(bgm)
```

### Playback State

```lua
if mixer.is_playing(bgm) then
  local time = mixer.get_time(bgm)
  local duration = mixer.get_duration(bgm)
  print(string.format("Playing: %.1f / %.1f seconds", time, duration))
end
```

## Volume Control

### Setting Volume

```lua
-- Set channel volume (0.0 to 1.0)
mixer.set_volume(bgm, 0.5)   -- 50% volume
mixer.set_volume(sfx, 1.0)   -- Full volume

-- Get current volume
local vol = mixer.get_volume(bgm)
```

### Fading

Fade volume smoothly over time using Web Audio's sample-accurate timing:

```lua
-- Fade to target volume over duration
mixer.fade_to(bgm, 0.0, 2.0)   -- Fade out over 2 seconds
mixer.fade_to(bgm, 1.0, 1.0)   -- Fade in over 1 second
mixer.fade_to(bgm, 0.5, 0.5)   -- Fade to 50% over 0.5 seconds

-- Check if fading
if mixer.is_fading(bgm) then
  print("BGM is fading")
end
```

## Crossfading

Smoothly transition between two audio tracks:

```lua
-- Crossfade to a new track over 2 seconds
mixer.crossfade(bgm, battle_music, 2.0, { loop = true })

-- The old track fades out while the new track fades in
```

### Crossfade Update

**Important**: Call `update_crossfade` in your tick function for crossfade completion handling:

```lua
canvas.tick(function()
  mixer.update_crossfade(bgm)  -- Required!

  -- Your game logic...
end)
```

### Crossfade State

```lua
if mixer.is_crossfading(bgm) then
  print("Crossfade in progress")
end
```

## Complete Example: Music Player

```lua
local canvas = require("canvas")
local mixer = require("audio_mixer")

canvas.assets.add_path("assets")

-- Load music tracks
local tracks = {
  canvas.assets.load_music("title", "music/title.ogg"),
  canvas.assets.load_music("level1", "music/level1.ogg"),
  canvas.assets.load_music("level2", "music/level2.ogg"),
}
local trackNames = { "Title", "Level 1", "Level 2" }
local currentTrack = 1

canvas.set_size(400, 300)

-- Create BGM channel
local bgm = mixer.create_channel("bgm")

-- Start with first track
mixer.play(bgm, tracks[1], { loop = true, fade_in = 1.0 })

canvas.tick(function()
  mixer.update_crossfade(bgm)

  canvas.clear()
  canvas.set_fill_style("#1a1a2e")
  canvas.fill_rect(0, 0, 400, 300)

  -- Draw UI
  canvas.set_fill_style("#ffffff")
  canvas.set_font_size(20)
  canvas.draw_text("Music Player", 20, 30)

  canvas.set_font_size(14)
  canvas.draw_text("Current: " .. trackNames[currentTrack], 20, 70)
  canvas.draw_text("Volume: " .. math.floor(mixer.get_volume(bgm) * 100) .. "%", 20, 90)

  -- Status
  local status = "Stopped"
  if mixer.is_crossfading(bgm) then
    status = "Crossfading..."
  elseif mixer.is_fading(bgm) then
    status = "Fading..."
  elseif mixer.is_playing(bgm) then
    status = string.format("Playing (%.1fs)", mixer.get_time(bgm))
  end
  canvas.draw_text("Status: " .. status, 20, 110)

  -- Controls
  canvas.draw_text("[1-3] Switch track  [UP/DOWN] Volume  [SPACE] Pause", 20, 280)

  -- Handle input
  if canvas.is_key_pressed(canvas.keys.D1) then
    currentTrack = 1
    mixer.crossfade(bgm, tracks[1], 1.5, { loop = true })
  elseif canvas.is_key_pressed(canvas.keys.D2) then
    currentTrack = 2
    mixer.crossfade(bgm, tracks[2], 1.5, { loop = true })
  elseif canvas.is_key_pressed(canvas.keys.D3) then
    currentTrack = 3
    mixer.crossfade(bgm, tracks[3], 1.5, { loop = true })
  end

  if canvas.is_key_pressed(canvas.keys.UP) then
    mixer.fade_to(bgm, math.min(1.0, mixer.get_volume(bgm) + 0.1), 0.2)
  elseif canvas.is_key_pressed(canvas.keys.DOWN) then
    mixer.fade_to(bgm, math.max(0.0, mixer.get_volume(bgm) - 0.1), 0.2)
  end

  if canvas.is_key_pressed(canvas.keys.SPACE) then
    if mixer.is_playing(bgm) then
      mixer.pause(bgm)
    else
      mixer.resume(bgm)
    end
  end
end)

canvas.start()
```

## API Reference

### Channel Creation
| Function | Description |
|----------|-------------|
| `mixer.create_channel(name)` | Create a named channel, returns channel object |

### Playback
| Function | Description |
|----------|-------------|
| `mixer.play(ch, audio, opts?)` | Play audio (opts: loop, volume, fade_in) |
| `mixer.stop(ch, opts?)` | Stop playback (opts: fade_out) |
| `mixer.pause(ch)` | Pause playback |
| `mixer.resume(ch)` | Resume playback |

### Volume
| Function | Description |
|----------|-------------|
| `mixer.set_volume(ch, vol)` | Set channel volume (0-1) |
| `mixer.get_volume(ch)` | Get channel volume |
| `mixer.fade_to(ch, vol, dur)` | Fade to volume over duration |

### Crossfade
| Function | Description |
|----------|-------------|
| `mixer.crossfade(ch, audio, dur, opts?)` | Crossfade to new audio |
| `mixer.update_crossfade(ch)` | Update crossfade (call in tick) |

### State Queries
| Function | Description |
|----------|-------------|
| `mixer.is_playing(ch)` | Check if channel is playing |
| `mixer.is_fading(ch)` | Check if volume fade in progress |
| `mixer.is_crossfading(ch)` | Check if crossfade in progress |
| `mixer.get_time(ch)` | Get playback position in seconds |
| `mixer.get_duration(ch)` | Get audio duration in seconds |

## Options Reference

### play() Options
```lua
{
  loop = false,     -- Loop audio (default: false)
  volume = 1.0,     -- Initial volume (default: 1.0)
  fade_in = 0       -- Fade-in duration in seconds (default: 0)
}
```

### stop() Options
```lua
{
  fade_out = 0      -- Fade-out duration in seconds (default: 0)
}
```

### crossfade() Options
```lua
{
  loop = false      -- Loop the new audio (default: false)
}
```
