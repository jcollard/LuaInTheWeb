import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetLoader } from '../../src/shared/AssetLoader.js';
import type { IFileSystem } from '@lua-learning/shell-core';
import type { AssetDefinition } from '../../src/shared/types.js';

/**
 * Creates a mock IFileSystem for testing.
 */
function createMockFileSystem(overrides: Partial<IFileSystem> = {}): IFileSystem {
  return {
    getCurrentDirectory: vi.fn(() => '/'),
    setCurrentDirectory: vi.fn(),
    exists: vi.fn(() => false),
    isDirectory: vi.fn(() => false),
    isFile: vi.fn(() => false),
    listDirectory: vi.fn(() => []),
    readFile: vi.fn(() => ''),
    writeFile: vi.fn(),
    createDirectory: vi.fn(),
    delete: vi.fn(),
    isBinaryFile: vi.fn(() => false),
    readBinaryFile: vi.fn(() => new Uint8Array()),
    writeBinaryFile: vi.fn(),
    ...overrides,
  };
}

describe('AssetLoader', () => {
  let mockFs: IFileSystem;
  let loader: AssetLoader;

  beforeEach(() => {
    mockFs = createMockFileSystem();
  });

  describe('constructor', () => {
    it('should create an AssetLoader instance', () => {
      loader = new AssetLoader(mockFs, '/my-files/games');
      expect(loader).toBeDefined();
    });
  });

  describe('resolvePath', () => {
    describe('relative paths', () => {
      it('should resolve relative path from script directory', () => {
        loader = new AssetLoader(mockFs, '/my-files/games');
        const resolved = loader.resolvePath('sprites/player.png');
        expect(resolved).toBe('/my-files/games/sprites/player.png');
      });

      it('should resolve simple filename from script directory', () => {
        loader = new AssetLoader(mockFs, '/my-files/games');
        const resolved = loader.resolvePath('player.png');
        expect(resolved).toBe('/my-files/games/player.png');
      });

      it('should handle script directory at root', () => {
        loader = new AssetLoader(mockFs, '/');
        const resolved = loader.resolvePath('sprites/player.png');
        expect(resolved).toBe('/sprites/player.png');
      });

      it('should handle script directory with trailing slash', () => {
        loader = new AssetLoader(mockFs, '/my-files/games/');
        const resolved = loader.resolvePath('sprites/player.png');
        expect(resolved).toBe('/my-files/games/sprites/player.png');
      });

      it('should handle nested relative path', () => {
        loader = new AssetLoader(mockFs, '/projects/game');
        const resolved = loader.resolvePath('assets/images/ui/button.png');
        expect(resolved).toBe('/projects/game/assets/images/ui/button.png');
      });
    });

    describe('absolute paths', () => {
      it('should return absolute path unchanged', () => {
        loader = new AssetLoader(mockFs, '/my-files/games');
        const resolved = loader.resolvePath('/shared/sprites/enemy.png');
        expect(resolved).toBe('/shared/sprites/enemy.png');
      });

      it('should return root path unchanged', () => {
        loader = new AssetLoader(mockFs, '/my-files/games');
        const resolved = loader.resolvePath('/player.png');
        expect(resolved).toBe('/player.png');
      });
    });

    describe('edge cases', () => {
      it('should throw on empty path', () => {
        loader = new AssetLoader(mockFs, '/my-files/games');
        expect(() => loader.resolvePath('')).toThrow('Path cannot be empty');
      });

      it('should throw on whitespace-only path', () => {
        loader = new AssetLoader(mockFs, '/my-files/games');
        expect(() => loader.resolvePath('   ')).toThrow('Path cannot be empty');
      });

      it('should normalize path with ./ prefix', () => {
        loader = new AssetLoader(mockFs, '/my-files/games');
        const resolved = loader.resolvePath('./sprites/player.png');
        expect(resolved).toBe('/my-files/games/sprites/player.png');
      });
    });
  });

  describe('getMimeType', () => {
    beforeEach(() => {
      loader = new AssetLoader(mockFs, '/my-files/games');
    });

    describe('image formats', () => {
      it('should return image/png for .png files', () => {
        expect(loader.getMimeType('player.png')).toBe('image/png');
      });

      it('should return image/jpeg for .jpg files', () => {
        expect(loader.getMimeType('background.jpg')).toBe('image/jpeg');
      });

      it('should return image/jpeg for .jpeg files', () => {
        expect(loader.getMimeType('background.jpeg')).toBe('image/jpeg');
      });

      it('should return image/gif for .gif files', () => {
        expect(loader.getMimeType('animation.gif')).toBe('image/gif');
      });

      it('should return image/webp for .webp files', () => {
        expect(loader.getMimeType('modern.webp')).toBe('image/webp');
      });

      it('should return image/bmp for .bmp files', () => {
        expect(loader.getMimeType('bitmap.bmp')).toBe('image/bmp');
      });

      it('should return image/svg+xml for .svg files', () => {
        expect(loader.getMimeType('vector.svg')).toBe('image/svg+xml');
      });
    });

    describe('audio formats', () => {
      it('should return audio/mpeg for .mp3 files', () => {
        expect(loader.getMimeType('music.mp3')).toBe('audio/mpeg');
      });

      it('should return audio/wav for .wav files', () => {
        expect(loader.getMimeType('sound.wav')).toBe('audio/wav');
      });

      it('should return audio/ogg for .ogg files', () => {
        expect(loader.getMimeType('audio.ogg')).toBe('audio/ogg');
      });
    });

    describe('font formats', () => {
      it('should return font/ttf for .ttf files', () => {
        expect(loader.getMimeType('game.ttf')).toBe('font/ttf');
      });

      it('should return font/otf for .otf files', () => {
        expect(loader.getMimeType('custom.otf')).toBe('font/otf');
      });

      it('should return font/woff for .woff files', () => {
        expect(loader.getMimeType('webfont.woff')).toBe('font/woff');
      });

      it('should return font/woff2 for .woff2 files', () => {
        expect(loader.getMimeType('modern.woff2')).toBe('font/woff2');
      });
    });

    describe('text/data formats', () => {
      it('should return application/json for .json files', () => {
        expect(loader.getMimeType('data.json')).toBe('application/json');
      });

      it('should return text/plain for .txt files', () => {
        expect(loader.getMimeType('readme.txt')).toBe('text/plain');
      });

      it('should return application/xml for .xml files', () => {
        expect(loader.getMimeType('config.xml')).toBe('application/xml');
      });
    });

    describe('case handling', () => {
      it('should handle mixed case extensions', () => {
        expect(loader.getMimeType('player.PNG')).toBe('image/png');
        expect(loader.getMimeType('background.JPG')).toBe('image/jpeg');
        expect(loader.getMimeType('music.MP3')).toBe('audio/mpeg');
      });

      it('should handle paths with directories', () => {
        expect(loader.getMimeType('/sprites/player.png')).toBe('image/png');
        expect(loader.getMimeType('assets/audio/music.mp3')).toBe('audio/mpeg');
      });
    });

    describe('unknown formats', () => {
      it('should return undefined for unknown extensions', () => {
        expect(loader.getMimeType('script.lua')).toBeUndefined();
        expect(loader.getMimeType('data.csv')).toBeUndefined();
      });

      it('should return undefined for files without extension', () => {
        expect(loader.getMimeType('noextension')).toBeUndefined();
      });

      it('should return undefined for hidden files', () => {
        expect(loader.getMimeType('.gitignore')).toBeUndefined();
      });
    });
  });

  describe('loadAsset', () => {
    const validPngData = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x10, // width: 16
      0x00, 0x00, 0x00, 0x20, // height: 32
      0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
      0x1f, 0xf3, 0xff, 0x61, // CRC
    ]);

    const validJpegData = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, // SOI + APP0 marker
      0x00, 0x10, // APP0 length
      0x4a, 0x46, 0x49, 0x46, 0x00, // JFIF identifier
      0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // JFIF header
      0xff, 0xc0, // SOF0 marker
      0x00, 0x0b, // SOF0 length
      0x08, // precision
      0x00, 0x40, // height: 64
      0x00, 0x30, // width: 48
      0x01, 0x01, 0x00, // components
    ]);

    const validGifData = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
      0x08, 0x00, // width: 8
      0x10, 0x00, // height: 16
      0x00, 0x00, 0x00, // flags, background, aspect
    ]);

    // Valid WebP (lossy VP8) - 100x80
    const validWebpVp8Data = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00, // File size (placeholder)
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, 0x38, 0x20, // VP8 (with space)
      0x18, 0x00, 0x00, 0x00, // Chunk size
      0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, // VP8 bitstream header
      0x64, 0x00, // width: 100 (little-endian, masked with 0x3fff)
      0x50, 0x00, // height: 80 (little-endian, masked with 0x3fff)
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Padding
    ]);

    const textFileData = new Uint8Array([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, // "Hello"
    ]);

    const jsonFileData = new Uint8Array([
      0x7b, 0x22, 0x6b, 0x65, 0x79, 0x22, 0x3a, 0x31, 0x7d, // {"key":1}
    ]);

    describe('image files', () => {
      it('should load a valid PNG file with dimensions', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => validPngData),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'player',
          path: 'sprites/player.png',
          type: 'image',
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('player');
        expect(result.mimeType).toBe('image/png');
        expect(result.data).toBeInstanceOf(ArrayBuffer);
        expect(result.width).toBe(16);
        expect(result.height).toBe(32);
      });

      it('should load a valid JPEG file with dimensions', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => validJpegData),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'background',
          path: 'bg.jpg',
          type: 'image',
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('background');
        expect(result.mimeType).toBe('image/jpeg');
        expect(result.width).toBe(48);
        expect(result.height).toBe(64);
      });

      it('should load a valid GIF file with dimensions', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => validGifData),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'animation',
          path: 'anim.gif',
          type: 'image',
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('animation');
        expect(result.mimeType).toBe('image/gif');
        expect(result.width).toBe(8);
        expect(result.height).toBe(16);
      });

      it('should load a valid WebP file with dimensions', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => validWebpVp8Data),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'sprite',
          path: 'sprite.webp',
          type: 'image',
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('sprite');
        expect(result.mimeType).toBe('image/webp');
        expect(result.width).toBe(100);
        expect(result.height).toBe(80);
      });
    });

    describe('non-image files', () => {
      it('should load a text file without dimensions', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => textFileData),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'readme',
          path: 'readme.txt',
          type: 'image', // Type doesn't affect loading behavior
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('readme');
        expect(result.mimeType).toBe('text/plain');
        expect(result.data).toBeInstanceOf(ArrayBuffer);
        expect(result.width).toBeUndefined();
        expect(result.height).toBeUndefined();
      });

      it('should load a JSON file without dimensions', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => jsonFileData),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'config',
          path: 'config.json',
          type: 'image',
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('config');
        expect(result.mimeType).toBe('application/json');
        expect(result.data).toBeInstanceOf(ArrayBuffer);
        expect(result.width).toBeUndefined();
        expect(result.height).toBeUndefined();
      });

      it('should load a file with unknown extension', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => textFileData),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'script',
          path: 'main.lua',
          type: 'image',
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('script');
        expect(result.mimeType).toBeUndefined();
        expect(result.data).toBeInstanceOf(ArrayBuffer);
        expect(result.width).toBeUndefined();
        expect(result.height).toBeUndefined();
      });
    });

    describe('corrupted image files', () => {
      it('should load corrupted PNG without dimensions (not throw)', async () => {
        const corruptedPng = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => corruptedPng),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'player',
          path: 'player.png',
          type: 'image',
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('player');
        expect(result.mimeType).toBe('image/png');
        expect(result.data).toBeInstanceOf(ArrayBuffer);
        expect(result.width).toBeUndefined();
        expect(result.height).toBeUndefined();
      });

      it('should load empty file without dimensions', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => new Uint8Array(0)),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'empty',
          path: 'empty.png',
          type: 'image',
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('empty');
        expect(result.data.byteLength).toBe(0);
        expect(result.width).toBeUndefined();
        expect(result.height).toBeUndefined();
      });
    });

    describe('path resolution', () => {
      it('should resolve relative path correctly', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => validPngData),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'player',
          path: 'sprites/player.png',
          type: 'image',
        };

        await loader.loadAsset(definition);

        expect(mockFs.exists).toHaveBeenCalledWith(
          '/my-files/games/sprites/player.png'
        );
      });

      it('should handle absolute path', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => validPngData),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'shared',
          path: '/shared/sprites/enemy.png',
          type: 'image',
        };

        await loader.loadAsset(definition);

        expect(mockFs.exists).toHaveBeenCalledWith('/shared/sprites/enemy.png');
      });
    });

    describe('error cases', () => {
      it('should throw when file does not exist', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => false),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'player',
          path: 'sprites/player.png',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Asset 'player' not found: sprites/player.png"
        );
      });

      it('should throw when path is a directory', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => false),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'sprites',
          path: 'sprites',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Asset 'sprites' not found: sprites"
        );
      });

      it('should throw when readBinaryFile is not available', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: undefined,
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'player',
          path: 'player.png',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          'Filesystem does not support binary file reading'
        );
      });
    });
  });

  describe('scanDirectory', () => {
    it('should discover image and font files in a directory', () => {
      mockFs = createMockFileSystem({
        exists: vi.fn(() => true),
        isFile: vi.fn(() => false), // It's a directory
        listDirectory: vi.fn(() => [
          { name: 'player.png', path: '/assets/player.png', type: 'file' as const },
          { name: 'enemy.png', path: '/assets/enemy.png', type: 'file' as const },
          { name: 'game.ttf', path: '/assets/game.ttf', type: 'file' as const },
          { name: 'readme.txt', path: '/assets/readme.txt', type: 'file' as const },
        ]),
      });
      loader = new AssetLoader(mockFs, '/my-files/games');

      const files = loader.scanDirectory('assets');

      expect(files).toHaveLength(3); // Should exclude readme.txt
      expect(files.map(f => f.filename)).toEqual(['player.png', 'enemy.png', 'game.ttf']);
      expect(files.map(f => f.type)).toEqual(['image', 'image', 'font']);
    });

    it('should compute relativePath as filename for files directly in base path', () => {
      mockFs = createMockFileSystem({
        exists: vi.fn(() => true),
        isFile: vi.fn(() => false),
        listDirectory: vi.fn(() => [
          { name: 'player.png', path: '/assets/player.png', type: 'file' as const },
        ]),
      });
      loader = new AssetLoader(mockFs, '/my-files/games');

      const files = loader.scanDirectory('assets');

      expect(files).toHaveLength(1);
      expect(files[0].filename).toBe('player.png');
      expect(files[0].relativePath).toBe('player.png');
      expect(files[0].basePath).toBe('assets');
    });

    it('should compute relativePath with subdirectory prefix for nested files', () => {
      mockFs = createMockFileSystem({
        exists: vi.fn((path: string) => true),
        isFile: vi.fn((path: string) => false),
        listDirectory: vi.fn((path: string) => {
          if (path === '/my-files/games/assets') {
            return [
              { name: 'images', path: '/my-files/games/assets/images', type: 'directory' as const },
              { name: 'fonts', path: '/my-files/games/assets/fonts', type: 'directory' as const },
            ];
          } else if (path === '/my-files/games/assets/images') {
            return [
              { name: 'player.png', path: '/my-files/games/assets/images/player.png', type: 'file' as const },
              { name: 'enemy.png', path: '/my-files/games/assets/images/enemy.png', type: 'file' as const },
            ];
          } else if (path === '/my-files/games/assets/fonts') {
            return [
              { name: 'game.ttf', path: '/my-files/games/assets/fonts/game.ttf', type: 'file' as const },
            ];
          }
          return [];
        }),
      });
      loader = new AssetLoader(mockFs, '/my-files/games');

      const files = loader.scanDirectory('assets');

      expect(files).toHaveLength(3);

      // Check relativePaths include subdirectory
      const playerFile = files.find(f => f.filename === 'player.png');
      const enemyFile = files.find(f => f.filename === 'enemy.png');
      const fontFile = files.find(f => f.filename === 'game.ttf');

      expect(playerFile?.relativePath).toBe('images/player.png');
      expect(enemyFile?.relativePath).toBe('images/enemy.png');
      expect(fontFile?.relativePath).toBe('fonts/game.ttf');

      // All files should have the same basePath
      expect(files.every(f => f.basePath === 'assets')).toBe(true);
    });

    it('should handle deeply nested subdirectories', () => {
      mockFs = createMockFileSystem({
        exists: vi.fn(() => true),
        isFile: vi.fn(() => false),
        listDirectory: vi.fn((path: string) => {
          if (path === '/my-files/games/assets') {
            return [
              { name: 'images', path: '/my-files/games/assets/images', type: 'directory' as const },
            ];
          } else if (path === '/my-files/games/assets/images') {
            return [
              { name: 'ui', path: '/my-files/games/assets/images/ui', type: 'directory' as const },
            ];
          } else if (path === '/my-files/games/assets/images/ui') {
            return [
              { name: 'button.png', path: '/my-files/games/assets/images/ui/button.png', type: 'file' as const },
            ];
          }
          return [];
        }),
      });
      loader = new AssetLoader(mockFs, '/my-files/games');

      const files = loader.scanDirectory('assets');

      expect(files).toHaveLength(1);
      expect(files[0].filename).toBe('button.png');
      expect(files[0].relativePath).toBe('images/ui/button.png');
    });

    it('should throw when path does not exist', () => {
      mockFs = createMockFileSystem({
        exists: vi.fn(() => false),
      });
      loader = new AssetLoader(mockFs, '/my-files/games');

      expect(() => loader.scanDirectory('nonexistent')).toThrow(
        'Asset path not found: nonexistent'
      );
    });

    it('should throw when path is a file, not a directory', () => {
      mockFs = createMockFileSystem({
        exists: vi.fn(() => true),
        isFile: vi.fn(() => true),
      });
      loader = new AssetLoader(mockFs, '/my-files/games');

      expect(() => loader.scanDirectory('file.png')).toThrow(
        'Asset path is not a directory: file.png'
      );
    });
  });
});
