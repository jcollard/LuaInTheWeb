import { describe, it, expect } from 'vitest';
import {
  classifyFileType,
  isAssetHandle,
  isAudioAssetHandle,
  VALID_AUDIO_EXTENSIONS,
  createEmptyGamepadState,
  createEmptyInputState,
  GAMEPAD_BUTTONS,
  GAMEPAD_AXES,
  MAX_GAMEPADS,
} from '../../src/shared/types.js';
import type { AssetHandle, AudioAssetHandle, GamepadState } from '../../src/shared/types.js';

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

  describe('GAMEPAD_BUTTONS', () => {
    it('should define position-based button constants', () => {
      expect(GAMEPAD_BUTTONS.SOUTH).toBe(0);
      expect(GAMEPAD_BUTTONS.EAST).toBe(1);
      expect(GAMEPAD_BUTTONS.WEST).toBe(2);
      expect(GAMEPAD_BUTTONS.NORTH).toBe(3);
    });

    it('should define Xbox button aliases', () => {
      expect(GAMEPAD_BUTTONS.A).toBe(0);
      expect(GAMEPAD_BUTTONS.B).toBe(1);
      expect(GAMEPAD_BUTTONS.X).toBe(2);
      expect(GAMEPAD_BUTTONS.Y).toBe(3);
    });

    it('should define PlayStation button aliases', () => {
      expect(GAMEPAD_BUTTONS.CROSS).toBe(0);
      expect(GAMEPAD_BUTTONS.CIRCLE).toBe(1);
      expect(GAMEPAD_BUTTONS.SQUARE).toBe(2);
      expect(GAMEPAD_BUTTONS.TRIANGLE).toBe(3);
    });

    it('should define shoulder and trigger buttons', () => {
      expect(GAMEPAD_BUTTONS.LEFT_BUMPER).toBe(4);
      expect(GAMEPAD_BUTTONS.RIGHT_BUMPER).toBe(5);
      expect(GAMEPAD_BUTTONS.LEFT_TRIGGER).toBe(6);
      expect(GAMEPAD_BUTTONS.RIGHT_TRIGGER).toBe(7);
      // Xbox aliases
      expect(GAMEPAD_BUTTONS.LB).toBe(4);
      expect(GAMEPAD_BUTTONS.RB).toBe(5);
      expect(GAMEPAD_BUTTONS.LT).toBe(6);
      expect(GAMEPAD_BUTTONS.RT).toBe(7);
      // PlayStation aliases
      expect(GAMEPAD_BUTTONS.L1).toBe(4);
      expect(GAMEPAD_BUTTONS.R1).toBe(5);
      expect(GAMEPAD_BUTTONS.L2).toBe(6);
      expect(GAMEPAD_BUTTONS.R2).toBe(7);
    });

    it('should define menu buttons', () => {
      expect(GAMEPAD_BUTTONS.BACK).toBe(8);
      expect(GAMEPAD_BUTTONS.START).toBe(9);
      expect(GAMEPAD_BUTTONS.SELECT).toBe(8);
      expect(GAMEPAD_BUTTONS.OPTIONS).toBe(9);
      expect(GAMEPAD_BUTTONS.SHARE).toBe(8);
    });

    it('should define stick buttons', () => {
      expect(GAMEPAD_BUTTONS.LEFT_STICK).toBe(10);
      expect(GAMEPAD_BUTTONS.RIGHT_STICK).toBe(11);
      expect(GAMEPAD_BUTTONS.L3).toBe(10);
      expect(GAMEPAD_BUTTONS.R3).toBe(11);
      expect(GAMEPAD_BUTTONS.LS).toBe(10);
      expect(GAMEPAD_BUTTONS.RS).toBe(11);
    });

    it('should define D-pad buttons', () => {
      expect(GAMEPAD_BUTTONS.DPAD_UP).toBe(12);
      expect(GAMEPAD_BUTTONS.DPAD_DOWN).toBe(13);
      expect(GAMEPAD_BUTTONS.DPAD_LEFT).toBe(14);
      expect(GAMEPAD_BUTTONS.DPAD_RIGHT).toBe(15);
    });

    it('should define home/guide button', () => {
      expect(GAMEPAD_BUTTONS.HOME).toBe(16);
      expect(GAMEPAD_BUTTONS.GUIDE).toBe(16);
    });
  });

  describe('GAMEPAD_AXES', () => {
    it('should define left stick axes', () => {
      expect(GAMEPAD_AXES.LEFT_STICK_X).toBe(0);
      expect(GAMEPAD_AXES.LEFT_STICK_Y).toBe(1);
    });

    it('should define right stick axes', () => {
      expect(GAMEPAD_AXES.RIGHT_STICK_X).toBe(2);
      expect(GAMEPAD_AXES.RIGHT_STICK_Y).toBe(3);
    });
  });

  describe('MAX_GAMEPADS', () => {
    it('should be 4 (standard limit)', () => {
      expect(MAX_GAMEPADS).toBe(4);
    });
  });

  describe('createEmptyGamepadState', () => {
    it('should return a disconnected gamepad state', () => {
      const state = createEmptyGamepadState();
      expect(state.connected).toBe(false);
      expect(state.id).toBe('');
    });

    it('should have 17 button values initialized to 0', () => {
      const state = createEmptyGamepadState();
      expect(state.buttons).toHaveLength(17);
      expect(state.buttons.every((v) => v === 0)).toBe(true);
    });

    it('should have empty buttonsPressed array', () => {
      const state = createEmptyGamepadState();
      expect(state.buttonsPressed).toEqual([]);
    });

    it('should have 4 axis values initialized to 0', () => {
      const state = createEmptyGamepadState();
      expect(state.axes).toHaveLength(4);
      expect(state.axes.every((v) => v === 0)).toBe(true);
    });

    it('should return a new object each time', () => {
      const state1 = createEmptyGamepadState();
      const state2 = createEmptyGamepadState();
      expect(state1).not.toBe(state2);
      expect(state1.buttons).not.toBe(state2.buttons);
      expect(state1.axes).not.toBe(state2.axes);
    });
  });

  describe('createEmptyInputState', () => {
    it('should include gamepads array', () => {
      const state = createEmptyInputState();
      expect(state.gamepads).toBeDefined();
      expect(Array.isArray(state.gamepads)).toBe(true);
    });

    it('should have MAX_GAMEPADS entries', () => {
      const state = createEmptyInputState();
      expect(state.gamepads).toHaveLength(MAX_GAMEPADS);
    });

    it('should have all gamepads disconnected initially', () => {
      const state = createEmptyInputState();
      for (const gamepad of state.gamepads) {
        expect(gamepad.connected).toBe(false);
      }
    });

    it('should still include keyboard and mouse state', () => {
      const state = createEmptyInputState();
      expect(state.keysDown).toEqual([]);
      expect(state.keysPressed).toEqual([]);
      expect(state.mouseX).toBe(0);
      expect(state.mouseY).toBe(0);
      expect(state.mouseButtonsDown).toEqual([]);
      expect(state.mouseButtonsPressed).toEqual([]);
    });
  });

  describe('GamepadState type', () => {
    it('should support connected gamepad with button values', () => {
      const state: GamepadState = {
        connected: true,
        id: 'Xbox Controller',
        buttons: [1, 0, 0.5, 0, 0, 0, 0.75, 0.8, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        buttonsPressed: [0, 6],
        axes: [-0.5, 0.3, 0, 0],
      };
      expect(state.connected).toBe(true);
      expect(state.buttons[GAMEPAD_BUTTONS.A]).toBe(1);
      expect(state.buttons[GAMEPAD_BUTTONS.LEFT_TRIGGER]).toBe(0.75);
      expect(state.axes[GAMEPAD_AXES.LEFT_STICK_X]).toBe(-0.5);
    });
  });
});
