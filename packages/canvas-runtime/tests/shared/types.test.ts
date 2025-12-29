import { describe, it, expect } from 'vitest';
import {
  classifyFileType,
  isAssetHandle,
  isAudioAssetHandle,
  VALID_IMAGE_EXTENSIONS,
  VALID_FONT_EXTENSIONS,
  VALID_AUDIO_EXTENSIONS,
} from '../../src/shared/types.js';
import type { AssetHandle, AudioAssetHandle } from '../../src/shared/types.js';

describe('types', () => {
  describe('VALID_AUDIO_EXTENSIONS', () => {
    it('should include common audio formats', () => {
      expect(VALID_AUDIO_EXTENSIONS).toContain('.mp3');
      expect(VALID_AUDIO_EXTENSIONS).toContain('.wav');
      expect(VALID_AUDIO_EXTENSIONS).toContain('.ogg');
    });
  });

  describe('classifyFileType', () => {
    describe('image files', () => {
      it('should classify PNG files as image', () => {
        expect(classifyFileType('sprite.png')).toBe('image');
        expect(classifyFileType('sprite.PNG')).toBe('image');
      });

      it('should classify JPG/JPEG files as image', () => {
        expect(classifyFileType('photo.jpg')).toBe('image');
        expect(classifyFileType('photo.jpeg')).toBe('image');
      });

      it('should classify other image formats', () => {
        expect(classifyFileType('animation.gif')).toBe('image');
        expect(classifyFileType('texture.webp')).toBe('image');
        expect(classifyFileType('icon.bmp')).toBe('image');
      });
    });

    describe('font files', () => {
      it('should classify TTF files as font', () => {
        expect(classifyFileType('myfont.ttf')).toBe('font');
      });

      it('should classify other font formats', () => {
        expect(classifyFileType('myfont.otf')).toBe('font');
        expect(classifyFileType('myfont.woff')).toBe('font');
        expect(classifyFileType('myfont.woff2')).toBe('font');
      });
    });

    describe('audio files', () => {
      it('should classify MP3 files as audio', () => {
        expect(classifyFileType('music.mp3')).toBe('audio');
        expect(classifyFileType('SOUND.MP3')).toBe('audio');
      });

      it('should classify WAV files as audio', () => {
        expect(classifyFileType('effect.wav')).toBe('audio');
        expect(classifyFileType('EXPLOSION.WAV')).toBe('audio');
      });

      it('should classify OGG files as audio', () => {
        expect(classifyFileType('background.ogg')).toBe('audio');
        expect(classifyFileType('THEME.OGG')).toBe('audio');
      });

      it('should handle audio files in paths', () => {
        expect(classifyFileType('sounds/jump.mp3')).toBe('audio');
        expect(classifyFileType('/assets/music/level1.ogg')).toBe('audio');
      });
    });

    describe('unknown files', () => {
      it('should classify unrecognized extensions as unknown', () => {
        expect(classifyFileType('readme.txt')).toBe('unknown');
        expect(classifyFileType('data.json')).toBe('unknown');
        expect(classifyFileType('script.lua')).toBe('unknown');
      });

      it('should classify files without extension as unknown', () => {
        expect(classifyFileType('README')).toBe('unknown');
        expect(classifyFileType('Makefile')).toBe('unknown');
      });
    });
  });

  describe('isAssetHandle', () => {
    it('should return true for valid image handles', () => {
      const handle: AssetHandle = { _type: 'image', _name: 'player', _file: 'player.png' };
      expect(isAssetHandle(handle)).toBe(true);
    });

    it('should return true for valid font handles', () => {
      const handle: AssetHandle = { _type: 'font', _name: 'main', _file: 'arial.ttf' };
      expect(isAssetHandle(handle)).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(isAssetHandle(null)).toBe(false);
      expect(isAssetHandle(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isAssetHandle('string')).toBe(false);
      expect(isAssetHandle(123)).toBe(false);
      expect(isAssetHandle(true)).toBe(false);
    });

    it('should return false for objects missing required fields', () => {
      expect(isAssetHandle({ _type: 'image' })).toBe(false);
      expect(isAssetHandle({ _name: 'test' })).toBe(false);
      expect(isAssetHandle({ _file: 'test.png' })).toBe(false);
    });

    it('should return false for invalid _type values', () => {
      expect(isAssetHandle({ _type: 'invalid', _name: 'test', _file: 'test.png' })).toBe(false);
    });
  });

  describe('AudioAssetHandle', () => {
    it('should support sound asset handles', () => {
      const handle: AudioAssetHandle = { _type: 'sound', _name: 'jump', _file: 'jump.mp3' };
      expect(handle._type).toBe('sound');
      expect(handle._name).toBe('jump');
      expect(handle._file).toBe('jump.mp3');
    });

    it('should support music asset handles', () => {
      const handle: AudioAssetHandle = { _type: 'music', _name: 'theme', _file: 'theme.ogg' };
      expect(handle._type).toBe('music');
      expect(handle._name).toBe('theme');
      expect(handle._file).toBe('theme.ogg');
    });
  });

  describe('isAudioAssetHandle', () => {
    it('should return true for valid sound handles', () => {
      const handle: AudioAssetHandle = { _type: 'sound', _name: 'jump', _file: 'jump.mp3' };
      expect(isAudioAssetHandle(handle)).toBe(true);
    });

    it('should return true for valid music handles', () => {
      const handle: AudioAssetHandle = { _type: 'music', _name: 'theme', _file: 'theme.ogg' };
      expect(isAudioAssetHandle(handle)).toBe(true);
    });

    it('should return false for image/font handles', () => {
      const imageHandle: AssetHandle = { _type: 'image', _name: 'player', _file: 'player.png' };
      const fontHandle: AssetHandle = { _type: 'font', _name: 'main', _file: 'arial.ttf' };
      expect(isAudioAssetHandle(imageHandle)).toBe(false);
      expect(isAudioAssetHandle(fontHandle)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isAudioAssetHandle(null)).toBe(false);
      expect(isAudioAssetHandle(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isAudioAssetHandle('string')).toBe(false);
      expect(isAudioAssetHandle(123)).toBe(false);
    });
  });
});
