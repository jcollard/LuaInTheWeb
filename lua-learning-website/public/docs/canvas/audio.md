# Audio

The canvas library provides audio playback for games and interactive applications. Play sound effects, background music, and use advanced channel-based audio mixing.

**Tip**: For convenient audio management with fading and crossfading, see the [Audio Mixer Library](../audio_mixer.md).

## Loading Audio Assets

Audio files must be registered before `canvas.start()`:

```lua
local canvas = require("canvas")

-- Set asset directory (relative to your script)
canvas.assets.add_path("assets")

-- Register sound effects (can overlap when played multiple times)
canvas.assets.load_sound("explosion", "sfx/explosion.ogg")
canvas.assets.load_sound("coin", "sfx/coin.ogg")

-- Register music (only one music track plays at a time)
canvas.assets.load_music("theme", "music/theme.ogg")
canvas.assets.load_music("battle", "music/battle.ogg")

canvas.start()
```

### Supported Formats

- **OGG Vorbis** (`.ogg`) - Recommended, best browser support
- **MP3** (`.mp3`) - Widely supported
- **WAV** (`.wav`) - Uncompressed, larger files
- **WebM** (`.webm`) - Good compression

## Sound Effects

Sound effects are for short audio clips that can overlap (play multiple times simultaneously).

### Playing Sounds

```lua
-- Play at full volume
canvas.play_sound("explosion")

-- Play at reduced volume (0.0 to 1.0)
canvas.play_sound("coin", 0.5)

-- Sounds can overlap
canvas.play_sound("footstep")
canvas.play_sound("footstep")  -- Both play simultaneously
```

### Sound Duration

```lua
local duration = canvas.get_sound_duration("explosion")
print("Sound is " .. duration .. " seconds long")
```

## Music Playback

Music is for longer audio tracks. Only one music track can play at a time - starting new music stops the current track.

### Playing Music

```lua
-- Play music once
canvas.play_music("victory")

-- Play music on loop
canvas.play_music("theme", { loop = true })

-- Play at specific volume
canvas.play_music("battle", { volume = 0.7, loop = true })

-- Switch tracks (automatically stops current music)
canvas.play_music("boss_theme")
```

### Music Control

```lua
-- Stop music completely
canvas.stop_music()

-- Pause and resume
canvas.pause_music()
-- Later...
canvas.resume_music()

-- Adjust volume during playback
canvas.set_music_volume(0.5)  -- Half volume
canvas.set_music_volume(1.0)  -- Full volume
```

### Music State

```lua
-- Check if playing
if canvas.is_music_playing() then
  print("Music is playing")
end

-- Get playback position
local currentTime = canvas.get_music_time()
local totalDuration = canvas.get_music_duration()
local progress = currentTime / totalDuration
```

## Global Audio Control

Control all audio output with master volume and mute.

```lua
-- Master volume affects all sounds and music
canvas.set_master_volume(0.5)  -- All audio at half volume
canvas.set_master_volume(1.0)  -- Full volume

local vol = canvas.get_master_volume()

-- Mute/unmute all audio
canvas.mute()
if canvas.is_muted() then
  print("Audio is muted")
end
canvas.unmute()
```

## Audio Channels (Advanced)

For more control, use named audio channels. Each channel is an independent audio bus with its own volume and playback state.

**Note**: For most use cases, the [Audio Mixer Library](../audio_mixer.md) provides a more convenient API built on top of channels.

### Creating Channels

```lua
-- Create named channels
canvas.channel_create("bgm")
canvas.channel_create("sfx")
canvas.channel_create("voice")
```

### Playing on Channels

```lua
-- Play on a channel (stops any previous audio on that channel)
canvas.channel_play("bgm", "theme", { loop = true, volume = 0.8 })
canvas.channel_play("sfx", "explosion")
```

### Channel Volume and Fading

```lua
-- Set volume immediately
canvas.channel_set_volume("bgm", 0.5)

-- Smooth fade (uses Web Audio for frame-independent fading)
canvas.channel_fade_to("bgm", 0.0, 2.0)  -- Fade out over 2 seconds
canvas.channel_fade_to("bgm", 1.0, 1.0)  -- Fade in over 1 second

-- Check fade status
if canvas.channel_is_fading("bgm") then
  print("BGM is fading")
end
```

### Channel Control

```lua
-- Stop, pause, resume
canvas.channel_stop("bgm")
canvas.channel_pause("bgm")
canvas.channel_resume("bgm")

-- Check state
if canvas.channel_is_playing("bgm") then
  local time = canvas.channel_get_time("bgm")
  print("Playing at " .. time .. " seconds")
end
```

### Cleanup

```lua
-- Destroy channel when no longer needed
canvas.channel_destroy("bgm")
```

## Complete Example

```lua
local canvas = require("canvas")

canvas.assets.add_path("assets")
canvas.assets.load_sound("coin", "sfx/coin.ogg")
canvas.assets.load_music("theme", "music/theme.ogg")

canvas.set_size(400, 200)

local coinCount = 0

canvas.tick(function()
  canvas.clear()

  -- Play music on first frame
  if not canvas.is_music_playing() then
    canvas.play_music("theme", { loop = true, volume = 0.6 })
  end

  -- Click to collect coins
  if canvas.is_mouse_pressed(0) then
    coinCount = coinCount + 1
    canvas.play_sound("coin", 0.8)
  end

  canvas.set_fill_style("#ffffff")
  canvas.set_font_size(24)
  canvas.draw_text("Coins: " .. coinCount, 20, 100)
  canvas.set_font_size(12)
  canvas.draw_text("Click anywhere to collect coins!", 20, 140)
end)

canvas.start()
```

## API Reference

### Sound Effects
| Function | Description |
|----------|-------------|
| `canvas.play_sound(name, volume?)` | Play sound (can overlap) |
| `canvas.get_sound_duration(name)` | Get duration in seconds |

### Music
| Function | Description |
|----------|-------------|
| `canvas.play_music(name, opts?)` | Play music (opts: volume, loop) |
| `canvas.stop_music()` | Stop music |
| `canvas.pause_music()` | Pause music |
| `canvas.resume_music()` | Resume music |
| `canvas.set_music_volume(vol)` | Set music volume (0-1) |
| `canvas.is_music_playing()` | Check if playing |
| `canvas.get_music_time()` | Get playback position |
| `canvas.get_music_duration()` | Get total duration |

### Global Control
| Function | Description |
|----------|-------------|
| `canvas.set_master_volume(vol)` | Set master volume (0-1) |
| `canvas.get_master_volume()` | Get master volume |
| `canvas.mute()` | Mute all audio |
| `canvas.unmute()` | Unmute all audio |
| `canvas.is_muted()` | Check if muted |

### Channels
| Function | Description |
|----------|-------------|
| `canvas.channel_create(name)` | Create channel |
| `canvas.channel_destroy(name)` | Destroy channel |
| `canvas.channel_play(ch, audio, opts?)` | Play on channel |
| `canvas.channel_stop(ch)` | Stop channel |
| `canvas.channel_pause(ch)` | Pause channel |
| `canvas.channel_resume(ch)` | Resume channel |
| `canvas.channel_set_volume(ch, vol)` | Set volume |
| `canvas.channel_get_volume(ch)` | Get volume |
| `canvas.channel_fade_to(ch, vol, dur)` | Fade over duration |
| `canvas.channel_is_playing(ch)` | Check if playing |
| `canvas.channel_is_fading(ch)` | Check if fading |
| `canvas.channel_get_time(ch)` | Get playback time |
| `canvas.channel_get_duration(ch)` | Get audio duration |
