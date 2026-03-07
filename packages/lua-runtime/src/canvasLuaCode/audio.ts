/**
 * Audio Lua code - sound effects and music playback.
 * DEPRECATED: Canvas audio functions now delegate to the standalone audio module.
 * Use require('audio') directly instead of canvas.play_sound(), etc.
 */

export const canvasLuaAudioCode = `
    -- ========================================================================
    -- Audio API (deprecated — delegates to standalone audio module)
    -- ========================================================================

    local _audio_ok, _audio_mod = pcall(require, 'audio')
    -- Only delegate if we got the built-in audio module (has play_sound).
    -- Games may provide their own 'audio' module with different API.
    if not _audio_ok or type(_audio_mod) ~= 'table' or not _audio_mod.play_sound then
      _audio_mod = nil
    end

    if _audio_mod then
    -- Sound effect playback
    _canvas.play_sound = _audio_mod.play_sound
    _canvas.get_sound_duration = _audio_mod.get_sound_duration

    -- Music playback
    _canvas.play_music = _audio_mod.play_music
    _canvas.stop_music = _audio_mod.stop_music
    _canvas.pause_music = _audio_mod.pause_music
    _canvas.resume_music = _audio_mod.resume_music
    _canvas.set_music_volume = _audio_mod.set_music_volume
    _canvas.is_music_playing = _audio_mod.is_music_playing
    _canvas.get_music_time = _audio_mod.get_music_time
    _canvas.get_music_duration = _audio_mod.get_music_duration

    -- Global audio control
    _canvas.set_master_volume = _audio_mod.set_master_volume
    _canvas.get_master_volume = _audio_mod.get_master_volume
    _canvas.mute = _audio_mod.mute
    _canvas.unmute = _audio_mod.unmute
    _canvas.is_muted = _audio_mod.is_muted

    -- Audio Channel API
    _canvas.channel_create = _audio_mod.channel_create
    _canvas.channel_get_parent = _audio_mod.channel_get_parent
    _canvas.channel_set_parent = _audio_mod.channel_set_parent
    _canvas.channel_get_effective_volume = _audio_mod.channel_get_effective_volume
    _canvas.channel_destroy = _audio_mod.channel_destroy
    _canvas.channel_play = _audio_mod.channel_play
    _canvas.channel_stop = _audio_mod.channel_stop
    _canvas.channel_pause = _audio_mod.channel_pause
    _canvas.channel_resume = _audio_mod.channel_resume
    _canvas.channel_set_volume = _audio_mod.channel_set_volume
    _canvas.channel_get_volume = _audio_mod.channel_get_volume
    _canvas.channel_fade_to = _audio_mod.channel_fade_to
    _canvas.channel_is_playing = _audio_mod.channel_is_playing
    _canvas.channel_is_fading = _audio_mod.channel_is_fading
    _canvas.channel_get_time = _audio_mod.channel_get_time
    _canvas.channel_get_duration = _audio_mod.channel_get_duration
    _canvas.channel_get_audio = _audio_mod.channel_get_audio
    end
`;
