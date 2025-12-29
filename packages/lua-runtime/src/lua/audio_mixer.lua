---@meta mixer
--- audio_mixer.lua - Audio Mixer Library
--- Load with: local mixer = require('audio_mixer')
---
--- This library provides a high-level interface for managing audio channels,
--- crossfading between tracks, and controlling audio playback.
---
--- Built on top of canvas.channel_* functions.

local canvas = require('canvas')

---@class Channel
---@field name string The channel name
---@field _volume number Current logical volume (before fades)
---@field _crossfade_pending table|nil Pending crossfade operation

---@class mixer
local mixer = {}

local Channel = {}
Channel.__index = Channel

-- =============================================================================
-- Channel Creation
-- =============================================================================

--- Create a new audio channel.
---@param name string Unique name for the channel
---@return Channel channel The created channel object
---@usage local bgm = mixer.create_channel("bgm")
function mixer.create_channel(name)
  canvas.channel_create(name)
  local channel = setmetatable({
    name = name,
    _volume = 1.0,
    _crossfade_pending = nil,
  }, Channel)
  return channel
end

--- Destroy a channel and stop its audio.
---@param channel Channel The channel to destroy
---@usage mixer.destroy_channel(bgm)
function mixer.destroy_channel(channel)
  canvas.channel_destroy(channel.name)
end

-- =============================================================================
-- Playback Control
-- =============================================================================

--- Play audio on a channel.
---@param channel Channel The channel
---@param audio string|table Audio asset name or handle to play
---@param options? table { volume?: number, loop?: boolean, fade_in?: number }
---@usage mixer.play(bgm, "music/theme.mp3", { loop = true, fade_in = 1.0 })
function mixer.play(channel, audio, options)
  local opts = options or {}
  local start_volume = opts.fade_in and 0 or (opts.volume or channel._volume)
  local target_volume = opts.volume or channel._volume

  canvas.channel_play(channel.name, audio, {
    volume = start_volume,
    loop = opts.loop or false,
  })

  if opts.fade_in and opts.fade_in > 0 then
    canvas.channel_fade_to(channel.name, target_volume, opts.fade_in)
  end

  channel._volume = target_volume
end

--- Stop audio on a channel.
---@param channel Channel The channel
---@param options? table { fade_out?: number }
---@usage mixer.stop(bgm, { fade_out = 1.0 })
function mixer.stop(channel, options)
  local opts = options or {}
  if opts.fade_out and opts.fade_out > 0 then
    canvas.channel_fade_to(channel.name, 0, opts.fade_out)
    -- Note: After fade completes, user should call mixer.stop(channel) again
    -- or check is_fading() and call stop when done
  else
    canvas.channel_stop(channel.name)
  end
end

--- Pause audio on a channel.
---@param channel Channel The channel
---@usage mixer.pause(bgm)
function mixer.pause(channel)
  canvas.channel_pause(channel.name)
end

--- Resume audio on a channel.
---@param channel Channel The channel
---@usage mixer.resume(bgm)
function mixer.resume(channel)
  canvas.channel_resume(channel.name)
end

-- =============================================================================
-- Volume Control
-- =============================================================================

--- Set channel volume immediately.
---@param channel Channel The channel
---@param volume number Volume from 0.0 to 1.0
---@usage mixer.set_volume(bgm, 0.5)
function mixer.set_volume(channel, volume)
  channel._volume = volume
  canvas.channel_set_volume(channel.name, volume)
end

--- Get channel volume.
---@param channel Channel The channel
---@return number volume Current volume
---@usage local vol = mixer.get_volume(bgm)
function mixer.get_volume(channel)
  return canvas.channel_get_volume(channel.name)
end

--- Fade channel volume over time.
---@param channel Channel The channel
---@param volume number Target volume from 0.0 to 1.0
---@param duration number Duration in seconds
---@usage mixer.fade_to(bgm, 0.0, 2.0)  -- Fade out over 2 seconds
function mixer.fade_to(channel, volume, duration)
  canvas.channel_fade_to(channel.name, volume, duration)
  channel._volume = volume
end

-- =============================================================================
-- Crossfade
-- =============================================================================

--- Crossfade from current audio to new audio on the same channel.
--- The old audio fades out while new audio fades in on a temporary channel.
--- Call mixer.update_crossfade(channel) each frame to complete the crossfade.
---@param channel Channel The channel
---@param audio string|table New audio asset to crossfade to
---@param duration number Crossfade duration in seconds
---@param options? table { loop?: boolean }
---@usage mixer.crossfade(bgm, "music/battle.mp3", 1.5, { loop = true })
function mixer.crossfade(channel, audio, duration, options)
  local opts = options or {}
  local current_volume = channel._volume

  -- Fade out current audio on the main channel
  canvas.channel_fade_to(channel.name, 0, duration)

  -- Create a temporary crossfade channel
  local xfade_channel = channel.name .. "_xfade"
  canvas.channel_create(xfade_channel)
  canvas.channel_play(xfade_channel, audio, {
    volume = 0,
    loop = opts.loop or false,
  })
  canvas.channel_fade_to(xfade_channel, current_volume, duration)

  -- Store crossfade info for cleanup
  channel._crossfade_pending = {
    temp_channel = xfade_channel,
    new_audio = audio,
    duration = duration,
    started_at = canvas.get_time(),
    loop = opts.loop or false,
    target_volume = current_volume,
  }
end

--- Update crossfade state and clean up when complete.
--- Call this each frame if using crossfade.
---@param channel Channel The channel
---@return boolean complete True if crossfade finished this frame
---@usage
--- canvas.tick(function()
---   if mixer.update_crossfade(bgm) then
---     print("Crossfade complete!")
---   end
--- end)
function mixer.update_crossfade(channel)
  if not channel._crossfade_pending then
    return false
  end

  local xf = channel._crossfade_pending
  local elapsed = canvas.get_time() - xf.started_at

  if elapsed >= xf.duration then
    -- Crossfade complete - swap channels
    canvas.channel_stop(channel.name)
    canvas.channel_play(channel.name, xf.new_audio, {
      volume = xf.target_volume,
      loop = xf.loop,
    })
    canvas.channel_destroy(xf.temp_channel)
    channel._crossfade_pending = nil
    return true
  end

  return false
end

--- Check if a crossfade is in progress.
---@param channel Channel The channel
---@return boolean inProgress True if crossfade is pending
function mixer.is_crossfading(channel)
  return channel._crossfade_pending ~= nil
end

-- =============================================================================
-- State Queries
-- =============================================================================

--- Check if channel is playing.
---@param channel Channel The channel
---@return boolean isPlaying
---@usage if mixer.is_playing(bgm) then ... end
function mixer.is_playing(channel)
  return canvas.channel_is_playing(channel.name)
end

--- Check if channel is fading.
---@param channel Channel The channel
---@return boolean isFading
---@usage if mixer.is_fading(bgm) then ... end
function mixer.is_fading(channel)
  return canvas.channel_is_fading(channel.name)
end

--- Get playback time.
---@param channel Channel The channel
---@return number time Playback time in seconds
---@usage local time = mixer.get_time(bgm)
function mixer.get_time(channel)
  return canvas.channel_get_time(channel.name)
end

--- Get audio duration.
---@param channel Channel The channel
---@return number duration Duration in seconds
---@usage local duration = mixer.get_duration(bgm)
function mixer.get_duration(channel)
  return canvas.channel_get_duration(channel.name)
end

--- Get name of current audio on channel.
---@param channel Channel The channel
---@return string audioName Name of current audio, or "" if none
---@usage local name = mixer.get_audio(bgm)
function mixer.get_audio(channel)
  return canvas.channel_get_audio(channel.name)
end

return mixer
