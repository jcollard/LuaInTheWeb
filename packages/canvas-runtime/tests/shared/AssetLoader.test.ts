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

  describe('validateFormat', () => {
    beforeEach(() => {
      loader = new AssetLoader(mockFs, '/my-files/games');
    });

    describe('supported formats', () => {
      it('should return image/png for .png files', () => {
        expect(loader.validateFormat('player.png')).toBe('image/png');
      });

      it('should return image/jpeg for .jpg files', () => {
        expect(loader.validateFormat('background.jpg')).toBe('image/jpeg');
      });

      it('should return image/jpeg for .jpeg files', () => {
        expect(loader.validateFormat('background.jpeg')).toBe('image/jpeg');
      });

      it('should return image/gif for .gif files', () => {
        expect(loader.validateFormat('animation.gif')).toBe('image/gif');
      });

      it('should return image/webp for .webp files', () => {
        expect(loader.validateFormat('modern.webp')).toBe('image/webp');
      });

      it('should handle mixed case extensions', () => {
        expect(loader.validateFormat('player.PNG')).toBe('image/png');
        expect(loader.validateFormat('background.JPG')).toBe('image/jpeg');
        expect(loader.validateFormat('animation.GIF')).toBe('image/gif');
        expect(loader.validateFormat('modern.WebP')).toBe('image/webp');
      });

      it('should handle paths with directories', () => {
        expect(loader.validateFormat('/sprites/player.png')).toBe('image/png');
        expect(loader.validateFormat('assets/images/bg.jpg')).toBe('image/jpeg');
      });
    });

    describe('unsupported formats', () => {
      it('should throw for .txt files', () => {
        expect(() => loader.validateFormat('data.txt')).toThrow(
          "Cannot load 'data.txt': unsupported format (expected PNG, JPG, GIF, or WebP)"
        );
      });

      it('should throw for .lua files', () => {
        expect(() => loader.validateFormat('script.lua')).toThrow(
          "Cannot load 'script.lua': unsupported format (expected PNG, JPG, GIF, or WebP)"
        );
      });

      it('should throw for .bmp files', () => {
        expect(() => loader.validateFormat('image.bmp')).toThrow(
          "Cannot load 'image.bmp': unsupported format (expected PNG, JPG, GIF, or WebP)"
        );
      });

      it('should throw for files without extension', () => {
        expect(() => loader.validateFormat('noextension')).toThrow(
          "Cannot load 'noextension': unsupported format (expected PNG, JPG, GIF, or WebP)"
        );
      });

      it('should throw for empty filename with extension', () => {
        expect(() => loader.validateFormat('.png')).toThrow(
          "Cannot load '.png': unsupported format (expected PNG, JPG, GIF, or WebP)"
        );
      });

      it('should throw for unsupported format with path', () => {
        expect(() => loader.validateFormat('/assets/data.json')).toThrow(
          "Cannot load 'data.json': unsupported format (expected PNG, JPG, GIF, or WebP)"
        );
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

    // Valid WebP (lossless VP8L) - 50x40
    const validWebpVp8lData = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x20, 0x00, 0x00, 0x00, // File size (placeholder)
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, 0x38, 0x4c, // VP8L
      0x10, 0x00, 0x00, 0x00, // Chunk size
      0x2f, // Signature byte
      // Width-1 and height-1 encoded in 28 bits: 49 | (39 << 14)
      // 49 = 0x31, 39 << 14 = 0x9C000
      // Combined: 0x31 | 0x9C000 = 0x9C031
      // Little-endian: 0x31 0xC0 0x09 0x00
      0x31, 0xc0, 0x09, 0x00,
      0x00, 0x00, 0x00, 0x00, // Padding
    ]);

    // Valid WebP (extended VP8X) - 200x150
    const validWebpVp8xData = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00, // File size (placeholder)
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, 0x38, 0x58, // VP8X
      0x0a, 0x00, 0x00, 0x00, // Chunk size (10 bytes)
      0x00, 0x00, 0x00, 0x00, // Flags
      // Canvas width-1 = 199 (0xC7), stored as 24-bit little-endian
      0xc7, 0x00, 0x00,
      // Canvas height-1 = 149 (0x95), stored as 24-bit little-endian
      0x95, 0x00, 0x00,
    ]);

    describe('success cases', () => {
      it('should load a valid PNG file', async () => {
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

      it('should load a valid JPEG file', async () => {
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

      it('should load a valid GIF file', async () => {
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

      it('should load a valid WebP file (VP8 lossy)', async () => {
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

      it('should load a valid WebP file (VP8L lossless)', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => validWebpVp8lData),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'icon',
          path: 'icon.webp',
          type: 'image',
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('icon');
        expect(result.mimeType).toBe('image/webp');
        expect(result.width).toBe(50);
        expect(result.height).toBe(40);
      });

      it('should load a valid WebP file (VP8X extended)', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => validWebpVp8xData),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'background',
          path: 'bg.webp',
          type: 'image',
        };

        const result = await loader.loadAsset(definition);

        expect(result.name).toBe('background');
        expect(result.mimeType).toBe('image/webp');
        expect(result.width).toBe(200);
        expect(result.height).toBe(150);
      });

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

        // Format error comes first since we validate format before checking existence
        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Cannot load 'sprites': unsupported format"
        );
      });

      it('should throw for unsupported format', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'data',
          path: 'data.txt',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Cannot load 'data.txt': unsupported format (expected PNG, JPG, GIF, or WebP)"
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

      it('should throw for corrupted PNG (invalid signature)', async () => {
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

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'player.png': invalid image data"
        );
      });

      it('should throw for corrupted JPEG (invalid marker)', async () => {
        const corruptedJpeg = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => corruptedJpeg),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'bg',
          path: 'bg.jpg',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'bg.jpg': invalid image data"
        );
      });

      it('should throw for corrupted GIF (invalid header)', async () => {
        const corruptedGif = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => corruptedGif),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'anim',
          path: 'anim.gif',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'anim.gif': invalid image data"
        );
      });

      it('should throw for empty file', async () => {
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

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'empty.png': invalid image data"
        );
      });

      it('should throw for corrupted WebP (invalid RIFF header)', async () => {
        const corruptedWebp = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => corruptedWebp),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'broken',
          path: 'broken.webp',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'broken.webp': invalid image data"
        );
      });

      it('should throw for WebP with invalid WEBP signature', async () => {
        // Valid RIFF but invalid WEBP signature
        const invalidWebp = new Uint8Array([
          0x52, 0x49, 0x46, 0x46, // RIFF
          0x10, 0x00, 0x00, 0x00, // Size
          0x00, 0x00, 0x00, 0x00, // Invalid WEBP signature
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => invalidWebp),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'invalid',
          path: 'invalid.webp',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'invalid.webp': invalid image data"
        );
      });

      it('should throw for WebP with unknown chunk type', async () => {
        // Valid RIFF + WEBP but unknown chunk type
        const unknownChunkWebp = new Uint8Array([
          0x52, 0x49, 0x46, 0x46, // RIFF
          0x14, 0x00, 0x00, 0x00, // Size
          0x57, 0x45, 0x42, 0x50, // WEBP
          0x58, 0x58, 0x58, 0x58, // Unknown chunk "XXXX"
          0x04, 0x00, 0x00, 0x00, // Chunk size
          0x00, 0x00, 0x00, 0x00, // Data
        ]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => unknownChunkWebp),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'unknown',
          path: 'unknown.webp',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'unknown.webp': invalid image data"
        );
      });

      it('should throw when isFile returns false for existing path', async () => {
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => false),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'dir',
          path: 'folder.png', // Has valid extension but is a directory
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Asset 'dir' not found: folder.png"
        );
      });

      it('should throw for PNG that is too short for dimensions', async () => {
        // Valid PNG signature but not enough bytes for IHDR
        const shortPng = new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
          0x00, 0x00, 0x00, 0x0d, // Partial IHDR
        ]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => shortPng),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'short',
          path: 'short.png',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'short.png': invalid image data"
        );
      });

      it('should throw for JPEG that is too short', async () => {
        // Only SOI marker, missing SOF
        const shortJpeg = new Uint8Array([0xff, 0xd8, 0xff]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => shortJpeg),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'short',
          path: 'short.jpg',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'short.jpg': invalid image data"
        );
      });

      it('should throw for JPEG with invalid marker sequence', async () => {
        // Valid SOI but next byte is not 0xff
        const invalidJpeg = new Uint8Array([
          0xff, 0xd8, // SOI
          0x00, 0x00, // Invalid - should be 0xff followed by marker
        ]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => invalidJpeg),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'invalid',
          path: 'invalid.jpg',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'invalid.jpg': invalid image data"
        );
      });

      it('should throw for JPEG with SOF marker but truncated data', async () => {
        // Valid SOI, has SOF0 marker but truncated before dimensions
        const truncatedJpeg = new Uint8Array([
          0xff, 0xd8, // SOI
          0xff, 0xc0, // SOF0 marker
          0x00, 0x0b, // Length
          0x08, // Precision only, missing dimensions
        ]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => truncatedJpeg),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'truncated',
          path: 'truncated.jpg',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'truncated.jpg': invalid image data"
        );
      });

      it('should throw for GIF with wrong header', async () => {
        // Wrong GIF header (GIF87b instead of GIF87a or GIF89a)
        const wrongGif = new Uint8Array([
          0x47, 0x49, 0x46, 0x38, 0x37, 0x62, // GIF87b (invalid)
          0x08, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00,
        ]);
        mockFs = createMockFileSystem({
          exists: vi.fn(() => true),
          isFile: vi.fn(() => true),
          readBinaryFile: vi.fn(() => wrongGif),
        });
        loader = new AssetLoader(mockFs, '/my-files/games');

        const definition: AssetDefinition = {
          name: 'wrong',
          path: 'wrong.gif',
          type: 'image',
        };

        await expect(loader.loadAsset(definition)).rejects.toThrow(
          "Failed to load 'wrong.gif': invalid image data"
        );
      });
    });
  });
});
