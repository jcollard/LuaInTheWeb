/**
 * Inline audio engine for standalone HTML exports.
 *
 * This file is converted to a TypeScript string export by generate-lua-exports.js
 * and embedded in exported HTML files.
 *
 * DO NOT import this file directly in TypeScript - use the generated export instead.
 *
 * @param {object} engine - The wasmoon LuaEngine instance
 * @param {object} state - The canvas runtime state (will have audioEngine added)
 * @param {Array} assetManifest - Array of {path: string} asset entries
 */
function setupAudioBridge(engine, state, assetManifest) {
  // Audio state
  let audioContext = null;
  const audioBuffers = new Map(); // name -> AudioBuffer
  let masterGainNode = null;
  let musicState = null;
  let masterVolume = 1;
  let isMuted = false;

  // Initialize audio context (called on first user interaction or canvas start)
  async function initAudio() {
    if (audioContext) return;
    audioContext = new AudioContext();
    masterGainNode = audioContext.createGain();
    masterGainNode.connect(audioContext.destination);
    masterGainNode.gain.value = masterVolume;
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  }

  // Helper to extract audio name from handle or string
  function extractAudioName(nameOrHandle) {
    if (typeof nameOrHandle === 'string') return nameOrHandle;
    if (typeof nameOrHandle === 'object' && nameOrHandle !== null && '_name' in nameOrHandle) {
      return nameOrHandle._name;
    }
    throw new Error('Invalid audio reference');
  }

  // Audio asset registration
  engine.global.set('__canvas_assets_loadSound', (name, filename) => {
    const assetPath = assetManifest.find(a => a.path.endsWith(filename));
    if (!assetPath) {
      console.error('Sound file not found:', filename);
      return { _type: 'sound', _name: name, _file: filename, _error: 'not found' };
    }

    // Load and decode audio
    fetch('assets/' + assetPath.path)
      .then(res => res.arrayBuffer())
      .then(async (buffer) => {
        await initAudio();
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        audioBuffers.set(name, audioBuffer);
        console.log('Loaded sound:', name);
      })
      .catch(err => console.error('Failed to load sound:', name, err));

    return { _type: 'sound', _name: name, _file: filename };
  });

  engine.global.set('__canvas_assets_loadMusic', (name, filename) => {
    const assetPath = assetManifest.find(a => a.path.endsWith(filename));
    if (!assetPath) {
      console.error('Music file not found:', filename);
      return { _type: 'music', _name: name, _file: filename, _error: 'not found' };
    }

    // Load and decode audio
    fetch('assets/' + assetPath.path)
      .then(res => res.arrayBuffer())
      .then(async (buffer) => {
        await initAudio();
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        audioBuffers.set(name, audioBuffer);
        console.log('Loaded music:', name);
      })
      .catch(err => console.error('Failed to load music:', name, err));

    return { _type: 'music', _name: name, _file: filename };
  });

  // Sound effect playback
  engine.global.set('__audio_playSound', (nameOrHandle, volume) => {
    if (!audioContext || !masterGainNode) return;
    const name = extractAudioName(nameOrHandle);
    const buffer = audioBuffers.get(name);
    if (!buffer) {
      console.warn('Sound not found:', name);
      return;
    }
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = (volume ?? 1) * (isMuted ? 0 : 1);
    source.connect(gainNode);
    gainNode.connect(masterGainNode);
    source.start(0);
  });

  engine.global.set('__audio_getSoundDuration', (nameOrHandle) => {
    const name = extractAudioName(nameOrHandle);
    const buffer = audioBuffers.get(name);
    return buffer ? buffer.duration : 0;
  });

  // Music playback
  engine.global.set('__audio_playMusic', (nameOrHandle, volume, loop) => {
    if (!audioContext || !masterGainNode) return;
    const name = extractAudioName(nameOrHandle);
    const buffer = audioBuffers.get(name);
    if (!buffer) {
      console.warn('Music not found:', name);
      return;
    }

    // Stop current music
    if (musicState && musicState.source) {
      try { musicState.source.stop(); } catch (e) {}
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop ?? false;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = (volume ?? 1) * (isMuted ? 0 : 1);
    source.connect(gainNode);
    gainNode.connect(masterGainNode);
    source.start(0);

    musicState = {
      buffer,
      source,
      gainNode,
      isPlaying: true,
      startTime: audioContext.currentTime,
      pausedAt: 0,
      loop: loop ?? false,
      volume: volume ?? 1
    };
  });

  engine.global.set('__audio_stopMusic', () => {
    if (musicState && musicState.source) {
      try { musicState.source.stop(); } catch (e) {}
      musicState.isPlaying = false;
    }
  });

  engine.global.set('__audio_pauseMusic', () => {
    if (!musicState || !musicState.isPlaying) return;
    const elapsed = audioContext.currentTime - musicState.startTime;
    musicState.pausedAt = elapsed % musicState.buffer.duration;
    try { musicState.source.stop(); } catch (e) {}
    musicState.source = null;
    musicState.isPlaying = false;
  });

  engine.global.set('__audio_resumeMusic', () => {
    if (!musicState || musicState.isPlaying || !audioContext) return;
    const source = audioContext.createBufferSource();
    source.buffer = musicState.buffer;
    source.loop = musicState.loop;
    source.connect(musicState.gainNode);
    source.start(0, musicState.pausedAt);
    musicState.source = source;
    musicState.startTime = audioContext.currentTime - musicState.pausedAt;
    musicState.isPlaying = true;
  });

  engine.global.set('__audio_setMusicVolume', (volume) => {
    if (musicState) {
      musicState.volume = volume;
      musicState.gainNode.gain.value = volume * (isMuted ? 0 : 1);
    }
  });

  engine.global.set('__audio_isMusicPlaying', () => musicState ? musicState.isPlaying : false);

  engine.global.set('__audio_getMusicTime', () => {
    if (!musicState || !musicState.isPlaying || !audioContext) return 0;
    return (audioContext.currentTime - musicState.startTime) % musicState.buffer.duration;
  });

  engine.global.set('__audio_getMusicDuration', () => {
    return musicState && musicState.buffer ? musicState.buffer.duration : 0;
  });

  // Global audio controls
  engine.global.set('__audio_setMasterVolume', (volume) => {
    masterVolume = volume;
    if (masterGainNode) masterGainNode.gain.value = volume * (isMuted ? 0 : 1);
  });

  engine.global.set('__audio_getMasterVolume', () => masterVolume);

  engine.global.set('__audio_mute', () => {
    isMuted = true;
    if (masterGainNode) masterGainNode.gain.value = 0;
  });

  engine.global.set('__audio_unmute', () => {
    isMuted = false;
    if (masterGainNode) masterGainNode.gain.value = masterVolume;
  });

  engine.global.set('__audio_isMuted', () => isMuted);

  // Store reference for cleanup
  state.audioEngine = {
    dispose: () => {
      if (musicState && musicState.source) {
        try { musicState.source.stop(); } catch (e) {}
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
      audioBuffers.clear();
    }
  };
}
