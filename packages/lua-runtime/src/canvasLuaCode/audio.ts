/**
 * Audio Lua code - sound effects and music playback.
 */

export const canvasLuaAudioCode = `
    -- ========================================================================
    -- Audio API
    -- ========================================================================

    -- Sound effect playback (can overlap)
    function _canvas.play_sound(name, volume)
      __audio_playSound(name, volume)
    end

    -- Get the duration of a sound in seconds
    function _canvas.get_sound_duration(name)
      return __audio_getSoundDuration(name)
    end

    -- Music playback (one track at a time)
    function _canvas.play_music(name, options)
      local volume = 1
      local loop = false
      if options then
        if options.volume then volume = options.volume end
        if options.loop then loop = options.loop end
      end
      __audio_playMusic(name, volume, loop)
    end

    function _canvas.stop_music()
      __audio_stopMusic()
    end

    function _canvas.pause_music()
      __audio_pauseMusic()
    end

    function _canvas.resume_music()
      __audio_resumeMusic()
    end

    function _canvas.set_music_volume(volume)
      __audio_setMusicVolume(volume)
    end

    function _canvas.is_music_playing()
      return __audio_isMusicPlaying()
    end

    function _canvas.get_music_time()
      return __audio_getMusicTime()
    end

    function _canvas.get_music_duration()
      return __audio_getMusicDuration()
    end

    -- Global audio control
    function _canvas.set_master_volume(volume)
      __audio_setMasterVolume(volume)
    end

    function _canvas.get_master_volume()
      return __audio_getMasterVolume()
    end

    function _canvas.mute()
      __audio_mute()
    end

    function _canvas.unmute()
      __audio_unmute()
    end

    function _canvas.is_muted()
      return __audio_isMuted()
    end

    -- ========================================================================
    -- Audio Channel API
    -- ========================================================================

    function _canvas.channel_create(name, options)
      local parent = nil
      if options and options.parent then
        parent = options.parent
      end
      __audio_channelCreate(name, parent)
    end

    function _canvas.channel_get_parent(name)
      return __audio_channelGetParent(name)
    end

    function _canvas.channel_set_parent(name, parent)
      __audio_channelSetParent(name, parent)
    end

    function _canvas.channel_get_effective_volume(name)
      return __audio_channelGetEffectiveVolume(name)
    end

    function _canvas.channel_destroy(name)
      __audio_channelDestroy(name)
    end

    function _canvas.channel_play(channel, audio, options)
      local volume = 1
      local loop = false
      local start_time = 0
      if options then
        if options.volume then volume = options.volume end
        if options.loop then loop = options.loop end
        if options.start_time then start_time = options.start_time end
      end
      __audio_channelPlay(channel, audio, volume, loop, start_time)
    end

    function _canvas.channel_stop(channel)
      __audio_channelStop(channel)
    end

    function _canvas.channel_pause(channel)
      __audio_channelPause(channel)
    end

    function _canvas.channel_resume(channel)
      __audio_channelResume(channel)
    end

    function _canvas.channel_set_volume(channel, volume)
      __audio_channelSetVolume(channel, volume)
    end

    function _canvas.channel_get_volume(channel)
      return __audio_channelGetVolume(channel)
    end

    function _canvas.channel_fade_to(channel, targetVolume, duration)
      __audio_channelFadeTo(channel, targetVolume, duration)
    end

    function _canvas.channel_is_playing(channel)
      return __audio_channelIsPlaying(channel)
    end

    function _canvas.channel_is_fading(channel)
      return __audio_channelIsFading(channel)
    end

    function _canvas.channel_get_time(channel)
      return __audio_channelGetTime(channel)
    end

    function _canvas.channel_get_duration(channel)
      return __audio_channelGetDuration(channel)
    end

    function _canvas.channel_get_audio(channel)
      return __audio_channelGetAudio(channel)
    end
`;
