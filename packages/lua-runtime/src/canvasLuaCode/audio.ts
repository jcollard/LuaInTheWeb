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
`;
