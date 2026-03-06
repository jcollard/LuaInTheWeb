# Audio Library

The `audio` library provides standalone audio playback for sound effects, music, volume control, and audio channels. It works in both canvas and ANSI modes.

## Using the Library

Load the library with `require()`:

```lua
local audio = require("audio")

-- Register asset directory
audio.add_path("assets")

-- Register sounds and music
audio.load_sound("coin", "sfx/coin.ogg")
audio.load_music("theme", "music/theme.ogg")

-- Initialize audio engine
audio.start()

-- Now play sounds
audio.play_sound("coin")
audio.play_music("theme", { loop = true })
```

## Loading Audio Assets

Audio files must be registered before `audio.start()`:

```lua
local audio = require("audio")

-- Set asset directory (relative to your script)
audio.add_path("assets")

-- Register sound effects (can overlap when played multiple times)
audio.load_sound("explosion", "sfx/explosion.ogg")
audio.load_sound("coin", "sfx/coin.ogg")

-- Register music (only one music track plays at a time)
audio.load_music("theme", "music/theme.ogg")
audio.load_music("battle", "music/battle.ogg")

audio.start()
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
audio.play_sound("explosion")

-- Play at reduced volume (0.0 to 1.0)
audio.play_sound("coin", 0.5)

-- Sounds can overlap
audio.play_sound("footstep")
audio.play_sound("footstep")  -- Both play simultaneously
```

### Sound Duration

```lua
local duration = audio.get_sound_duration("explosion")
print("Sound is " .. duration .. " seconds long")
```

## Music Playback

Music is for longer audio tracks. Only one music track can play at a time - starting new music stops the current track.

### Playing Music

```lua
-- Play music once
audio.play_music("victory")

-- Play music on loop
audio.play_music("theme", { loop = true })

-- Play at specific volume
audio.play_music("battle", { volume = 0.7, loop = true })

-- Switch tracks (automatically stops current music)
audio.play_music("boss_theme")
```

### Music Control

```lua
-- Stop music completely
audio.stop_music()

-- Pause and resume
audio.pause_music()
-- Later...
audio.resume_music()

-- Adjust volume during playback
audio.set_music_volume(0.5)  -- Half volume
audio.set_music_volume(1.0)  -- Full volume
```

### Music State

```lua
-- Check if playing
if audio.is_music_playing() then
  print("Music is playing")
end

-- Get playback position
local currentTime = audio.get_music_time()
local totalDuration = audio.get_music_duration()
local progress = currentTime / totalDuration
```

## Global Audio Control

Control all audio output with master volume and mute.

```lua
-- Master volume affects all sounds and music
audio.set_master_volume(0.5)  -- All audio at half volume
audio.set_master_volume(1.0)  -- Full volume

local vol = audio.get_master_volume()

-- Mute/unmute all audio
audio.mute()
if audio.is_muted() then
  print("Audio is muted")
end
audio.unmute()
```

## Audio Channels (Advanced)

For more control, use named audio channels. Each channel is an independent audio bus with its own volume and playback state.

### Creating Channels

```lua
-- Create named channels
audio.channel_create("bgm")
audio.channel_create("sfx")
audio.channel_create("voice")
```

### Playing on Channels

```lua
-- Play on a channel (stops any previous audio on that channel)
audio.channel_play("bgm", "theme", { loop = true, volume = 0.8 })
audio.channel_play("sfx", "explosion")
```

### Channel Volume and Fading

```lua
-- Set volume immediately
audio.channel_set_volume("bgm", 0.5)

-- Smooth fade (uses Web Audio for frame-independent fading)
audio.channel_fade_to("bgm", 0.0, 2.0)  -- Fade out over 2 seconds
audio.channel_fade_to("bgm", 1.0, 1.0)  -- Fade in over 1 second

-- Check fade status
if audio.channel_is_fading("bgm") then
  print("BGM is fading")
end
```

### Channel Control

```lua
-- Stop, pause, resume
audio.channel_stop("bgm")
audio.channel_pause("bgm")
audio.channel_resume("bgm")

-- Check state
if audio.channel_is_playing("bgm") then
  local time = audio.channel_get_time("bgm")
  print("Playing at " .. time .. " seconds")
end
```

### Cleanup

```lua
-- Destroy channel when no longer needed
audio.channel_destroy("bgm")
```

## Using with Canvas

In canvas mode, you can use either the standalone `audio` module or the canvas audio functions. They share the same audio engine.

```lua
local canvas = require("canvas")
local audio = require("audio")

-- Canvas asset loading still works
canvas.assets.add_path("assets")
canvas.assets.load_sound("coin", "sfx/coin.ogg")

canvas.tick(function()
  -- Both work - they use the same engine
  canvas.play_sound("coin")
  audio.play_sound("coin")
end)

canvas.start()
```

## Using with ANSI

The `audio` module enables sound in ANSI terminal applications:

```lua
local ansi = require("ansi")
local audio = require("audio")

audio.add_path("assets")
audio.load_sound("beep", "beep.ogg")
audio.start()

ansi.tick(function()
  if ansi.is_key_pressed("space") then
    audio.play_sound("beep")
  end
end)

ansi.start()
```

## API Reference

### Asset Management
| Function | Description |
|----------|-------------|
| `audio.add_path(path)` | Register directory for audio files |
| `audio.load_sound(name, file)` | Register a sound effect |
| `audio.load_music(name, file)` | Register a music track |
| `audio.start()` | Initialize engine and load assets |

### Sound Effects
| Function | Description |
|----------|-------------|
| `audio.play_sound(name, volume?)` | Play sound (can overlap) |
| `audio.get_sound_duration(name)` | Get duration in seconds |

### Music
| Function | Description |
|----------|-------------|
| `audio.play_music(name, opts?)` | Play music (opts: volume, loop) |
| `audio.stop_music()` | Stop music |
| `audio.pause_music()` | Pause music |
| `audio.resume_music()` | Resume music |
| `audio.set_music_volume(vol)` | Set music volume (0-1) |
| `audio.is_music_playing()` | Check if playing |
| `audio.get_music_time()` | Get playback position |
| `audio.get_music_duration()` | Get total duration |

### Global Control
| Function | Description |
|----------|-------------|
| `audio.set_master_volume(vol)` | Set master volume (0-1) |
| `audio.get_master_volume()` | Get master volume |
| `audio.mute()` | Mute all audio |
| `audio.unmute()` | Unmute all audio |
| `audio.is_muted()` | Check if muted |

### Channels
| Function | Description |
|----------|-------------|
| `audio.channel_create(name)` | Create channel |
| `audio.channel_destroy(name)` | Destroy channel |
| `audio.channel_play(ch, audio, opts?)` | Play on channel |
| `audio.channel_stop(ch)` | Stop channel |
| `audio.channel_pause(ch)` | Pause channel |
| `audio.channel_resume(ch)` | Resume channel |
| `audio.channel_set_volume(ch, vol)` | Set volume |
| `audio.channel_get_volume(ch)` | Get volume |
| `audio.channel_fade_to(ch, vol, dur)` | Fade over duration |
| `audio.channel_is_playing(ch)` | Check if playing |
| `audio.channel_is_fading(ch)` | Check if fading |
| `audio.channel_get_time(ch)` | Get playback time |
| `audio.channel_get_duration(ch)` | Get audio duration |
| `audio.channel_get_audio(ch)` | Get current audio name |
