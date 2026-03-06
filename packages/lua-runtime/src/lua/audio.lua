---@meta audio
--- audio.lua - Standalone Audio Library
--- Load with: local audio = require('audio')
---
--- This library provides audio playback functions for sound effects,
--- music, volume control, and audio channels.
---
--- The audio API works in both canvas and ANSI modes.
--- In canvas mode, canvas.play_sound() etc. delegate to this module.

---@class audio
local audio = {}

-- =============================================================================
-- Table of Contents
-- =============================================================================
-- 1. Asset Management (add_path, load_sound, load_music, start)
-- 2. Sound Effects (play_sound, get_sound_duration)
-- 3. Music Playback (play_music, stop_music, pause_music, resume_music)
-- 4. Global Audio Control (set_master_volume, mute, unmute)
-- 5. Audio Channels (channel_create, channel_play, channel_stop, etc.)
-- =============================================================================

-- =============================================================================
-- Asset Management
-- =============================================================================

--- Register a directory path to scan for audio files.
--- Must be called BEFORE audio.start().
---@param path string Directory path containing audio files
---@return nil
---@usage audio.add_path("sounds")
---@usage audio.add_path("music/tracks")
function audio.add_path(path) end

--- Create a named reference to a discovered sound file.
--- Must be called BEFORE audio.start().
---@param name string Unique name to reference this sound
---@param filename string Filename of the audio file (must exist in a scanned path)
---@return AudioAssetHandle handle Asset handle for use with play_sound()
---@usage local explosion = audio.load_sound("explosion", "boom.wav")
function audio.load_sound(name, filename) end

--- Create a named reference to a discovered music file.
--- Must be called BEFORE audio.start().
---@param name string Unique name to reference this music track
---@param filename string Filename of the audio file (must exist in a scanned path)
---@return AudioAssetHandle handle Asset handle for use with play_music()
---@usage local theme = audio.load_music("theme", "background.mp3")
function audio.load_music(name, filename) end

--- Initialize the audio engine and load all registered audio assets.
--- Must be called after add_path/load_sound/load_music and before playback.
--- In canvas mode, this is called automatically by canvas.start().
---@return nil
---@usage audio.add_path("sounds")
---@usage audio.load_sound("click", "click.wav")
---@usage audio.start()
---@usage audio.play_sound("click")
function audio.start() end

-- =============================================================================
-- Sound Effects (can overlap - multiple sounds can play at once)
-- =============================================================================

--- Play a sound effect.
--- Sound effects can overlap - calling play_sound multiple times will layer the sounds.
--- The sound must be registered via audio.load_sound() before audio.start().
---@param nameOrHandle string|AudioAssetHandle Sound name or asset handle
---@param volume? number Volume level from 0.0 to 1.0 (default: 1.0)
---@return nil
---@usage audio.play_sound("explosion")
---@usage audio.play_sound("explosion", 0.5)
function audio.play_sound(nameOrHandle, volume) end

--- Get the duration of a sound in seconds.
---@param nameOrHandle string|AudioAssetHandle Sound name or asset handle
---@return number duration Duration in seconds
---@usage local duration = audio.get_sound_duration("explosion")
function audio.get_sound_duration(nameOrHandle) end

-- =============================================================================
-- Music Playback (one track at a time)
-- =============================================================================

---@class PlayMusicOptions
---@field volume? number Volume level from 0.0 to 1.0 (default: 1.0)
---@field loop? boolean Whether to loop the music (default: false)

--- Play background music.
--- Only one music track can play at a time - calling play_music will stop any current music.
---@param nameOrHandle string|AudioAssetHandle Music name or asset handle
---@param options? PlayMusicOptions Playback options (volume, loop)
---@return nil
---@usage audio.play_music("menu_theme")
---@usage audio.play_music("background", { loop = true })
---@usage audio.play_music("boss_theme", { volume = 0.7, loop = true })
function audio.play_music(nameOrHandle, options) end

--- Stop the currently playing music.
---@return nil
---@usage audio.stop_music()
function audio.stop_music() end

--- Pause the currently playing music.
---@return nil
---@usage audio.pause_music()
function audio.pause_music() end

--- Resume paused music.
---@return nil
---@usage audio.resume_music()
function audio.resume_music() end

--- Set the volume of the currently playing music.
---@param volume number Volume level from 0.0 to 1.0
---@return nil
---@usage audio.set_music_volume(0.5)
function audio.set_music_volume(volume) end

--- Check if music is currently playing.
---@return boolean isPlaying True if music is playing, false if stopped or paused
---@usage if not audio.is_music_playing() then
---@usage   audio.play_music("background", { loop = true })
---@usage end
function audio.is_music_playing() end

--- Get the current playback position of the music in seconds.
---@return number time Current playback position in seconds
---@usage local pos = audio.get_music_time()
function audio.get_music_time() end

--- Get the total duration of the current music track in seconds.
---@return number duration Total duration in seconds
---@usage local duration = audio.get_music_duration()
function audio.get_music_duration() end

-- =============================================================================
-- Global Audio Control
-- =============================================================================

--- Set the master volume for all audio (sounds and music).
---@param volume number Volume level from 0.0 to 1.0 (default: 1.0)
---@return nil
---@usage audio.set_master_volume(0.5)
function audio.set_master_volume(volume) end

--- Get the current master volume.
---@return number volume Current master volume (0.0 to 1.0)
---@usage local vol = audio.get_master_volume()
function audio.get_master_volume() end

--- Mute all audio.
---@return nil
---@usage audio.mute()
function audio.mute() end

--- Unmute all audio.
---@return nil
---@usage audio.unmute()
function audio.unmute() end

--- Check if audio is currently muted.
---@return boolean isMuted True if audio is muted
---@usage if audio.is_muted() then print("Audio is muted") end
function audio.is_muted() end

-- =============================================================================
-- Audio Channels
-- =============================================================================

--- Create a named audio channel.
---@param name string Unique channel name (e.g., "bgm", "sfx", "voice")
---@param options? { parent?: string } Optional parent channel
---@return nil
---@usage audio.channel_create("bgm")
---@usage audio.channel_create("sfx", { parent = "master" })
function audio.channel_create(name, options) end

--- Get the parent channel name.
---@param name string Channel name
---@return string|nil parent Parent channel name, or nil if connected to master
function audio.channel_get_parent(name) end

--- Set the parent channel (reparent).
---@param name string Channel name
---@param parent string|nil New parent name, or nil for master
function audio.channel_set_parent(name, parent) end

--- Get effective volume (this channel's volume * all ancestor volumes * master).
---@param name string Channel name
---@return number volume Effective volume (0.0 to 1.0)
function audio.channel_get_effective_volume(name) end

--- Destroy an audio channel and free its resources.
---@param name string Channel name to destroy
---@return nil
function audio.channel_destroy(name) end

---@class ChannelPlayOptions
---@field volume? number Volume level from 0.0 to 1.0 (default: 1.0)
---@field loop? boolean Whether to loop the audio (default: false)
---@field start_time? number Start time in seconds (default: 0)

--- Play audio on a channel.
---@param channel string Channel name
---@param audio string|AudioAssetHandle Audio name or asset handle
---@param options? ChannelPlayOptions Playback options
---@return nil
---@usage audio.channel_play("bgm", "theme_music", { loop = true, volume = 0.8 })
function audio.channel_play(channel, audio, options) end

--- Stop playback on a channel.
---@param channel string Channel name
---@return nil
function audio.channel_stop(channel) end

--- Pause playback on a channel.
---@param channel string Channel name
---@return nil
function audio.channel_pause(channel) end

--- Resume paused playback on a channel.
---@param channel string Channel name
---@return nil
function audio.channel_resume(channel) end

--- Set the volume of a channel (immediate).
---@param channel string Channel name
---@param volume number Volume level from 0.0 to 1.0
---@return nil
function audio.channel_set_volume(channel, volume) end

--- Get the current volume of a channel.
---@param channel string Channel name
---@return number volume Current volume (0.0 to 1.0)
function audio.channel_get_volume(channel) end

--- Smoothly fade a channel's volume over time.
---@param channel string Channel name
---@param targetVolume number Target volume (0.0 to 1.0)
---@param duration number Fade duration in seconds
---@return nil
---@usage audio.channel_fade_to("bgm", 0, 2.0)  -- Fade out over 2 seconds
function audio.channel_fade_to(channel, targetVolume, duration) end

--- Check if a channel is currently playing.
---@param channel string Channel name
---@return boolean isPlaying True if the channel is playing
function audio.channel_is_playing(channel) end

--- Check if a channel is currently fading.
---@param channel string Channel name
---@return boolean isFading True if a fade is in progress
function audio.channel_is_fading(channel) end

--- Get the current playback time of a channel in seconds.
---@param channel string Channel name
---@return number time Current playback position in seconds
function audio.channel_get_time(channel) end

--- Get the duration of the audio currently loaded on a channel.
---@param channel string Channel name
---@return number duration Duration in seconds (0 if nothing loaded)
function audio.channel_get_duration(channel) end

--- Get the name of the audio currently loaded on a channel.
---@param channel string Channel name
---@return string audioName Name of the current audio (empty string if none)
function audio.channel_get_audio(channel) end

return audio
