/**
 * Standalone audio Lua code - defines the audio module.
 * This code creates the `_audio` table with all audio functions,
 * delegating to `__audio_*` bridge functions registered in setupAudioAPI.ts
 * and `__audio_assets_*` bridge functions registered in setupAudioAssetAPI.ts.
 */

export const audioLuaCode = `
    -- ========================================================================
    -- Audio Module (standalone)
    -- ========================================================================
    local _audio = {}

    -- Asset management
    function _audio.add_path(path)
      __audio_assets_addPath(path)
    end

    function _audio.load_sound(name, filename)
      return __audio_assets_loadSound(name, filename)
    end

    function _audio.load_music(name, filename)
      return __audio_assets_loadMusic(name, filename)
    end

    function _audio.start()
      __audio_assets_start()
    end

    -- Sound effect playback (can overlap)
    function _audio.play_sound(name, volume)
      __audio_playSound(name, volume)
    end

    function _audio.get_sound_duration(name)
      return __audio_getSoundDuration(name)
    end

    -- Music playback (one track at a time)
    function _audio.play_music(name, options)
      local volume = 1
      local loop = false
      if options then
        if options.volume then volume = options.volume end
        if options.loop then loop = options.loop end
      end
      __audio_playMusic(name, volume, loop)
    end

    function _audio.stop_music()
      __audio_stopMusic()
    end

    function _audio.pause_music()
      __audio_pauseMusic()
    end

    function _audio.resume_music()
      __audio_resumeMusic()
    end

    function _audio.set_music_volume(volume)
      __audio_setMusicVolume(volume)
    end

    function _audio.is_music_playing()
      return __audio_isMusicPlaying()
    end

    function _audio.get_music_time()
      return __audio_getMusicTime()
    end

    function _audio.get_music_duration()
      return __audio_getMusicDuration()
    end

    -- Global audio control
    function _audio.set_master_volume(volume)
      __audio_setMasterVolume(volume)
    end

    function _audio.get_master_volume()
      return __audio_getMasterVolume()
    end

    function _audio.mute()
      __audio_mute()
    end

    function _audio.unmute()
      __audio_unmute()
    end

    function _audio.is_muted()
      return __audio_isMuted()
    end

    -- Audio Channel API
    function _audio.channel_create(name, options)
      local parent = nil
      if options and options.parent then
        parent = options.parent
      end
      __audio_channelCreate(name, parent)
    end

    function _audio.channel_get_parent(name)
      return __audio_channelGetParent(name)
    end

    function _audio.channel_set_parent(name, parent)
      __audio_channelSetParent(name, parent)
    end

    function _audio.channel_get_effective_volume(name)
      return __audio_channelGetEffectiveVolume(name)
    end

    function _audio.channel_destroy(name)
      __audio_channelDestroy(name)
    end

    function _audio.channel_play(channel, audio, options)
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

    function _audio.channel_stop(channel)
      __audio_channelStop(channel)
    end

    function _audio.channel_pause(channel)
      __audio_channelPause(channel)
    end

    function _audio.channel_resume(channel)
      __audio_channelResume(channel)
    end

    function _audio.channel_set_volume(channel, volume)
      __audio_channelSetVolume(channel, volume)
    end

    function _audio.channel_get_volume(channel)
      return __audio_channelGetVolume(channel)
    end

    function _audio.channel_fade_to(channel, targetVolume, duration)
      __audio_channelFadeTo(channel, targetVolume, duration)
    end

    function _audio.channel_is_playing(channel)
      return __audio_channelIsPlaying(channel)
    end

    function _audio.channel_is_fading(channel)
      return __audio_channelIsFading(channel)
    end

    function _audio.channel_get_time(channel)
      return __audio_channelGetTime(channel)
    end

    function _audio.channel_get_duration(channel)
      return __audio_channelGetDuration(channel)
    end

    function _audio.channel_get_audio(channel)
      return __audio_channelGetAudio(channel)
    end

    -- Register audio as a module so require('audio') works
    package.preload['audio'] = function()
      return _audio
    end
`
