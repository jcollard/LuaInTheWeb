/**
 * Audio Lua code - canvas backward-compatibility wrappers.
 * Delegates all audio functions to require('ail_audio'), which must be
 * registered before this code runs (setupCanvasAPI ensures this).
 */

export const canvasLuaAudioCode = `
    -- ========================================================================
    -- Audio API (delegates to ail_audio module)
    -- ========================================================================

    local _ail_audio = require('ail_audio')

    -- Copy all audio functions onto _canvas for backward compatibility
    local _audio_funcs = {
      'play_sound', 'get_sound_duration',
      'play_music', 'stop_music', 'pause_music', 'resume_music',
      'set_music_volume', 'is_music_playing', 'get_music_time', 'get_music_duration',
      'set_master_volume', 'get_master_volume', 'mute', 'unmute', 'is_muted',
      'channel_create', 'channel_get_parent', 'channel_set_parent',
      'channel_get_effective_volume', 'channel_destroy',
      'channel_play', 'channel_stop', 'channel_pause', 'channel_resume',
      'channel_set_volume', 'channel_get_volume', 'channel_fade_to',
      'channel_is_playing', 'channel_is_fading',
      'channel_get_time', 'channel_get_duration', 'channel_get_audio',
    }
    for _, name in ipairs(_audio_funcs) do
      _canvas[name] = _ail_audio[name]
    end
`;
