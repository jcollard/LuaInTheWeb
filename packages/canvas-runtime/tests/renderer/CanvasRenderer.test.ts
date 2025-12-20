/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasRenderer } from '../../src/renderer/CanvasRenderer.js';
import { ImageCache } from '../../src/renderer/ImageCache.js';
import type { DrawCommand } from '../../src/shared/types.js';

// Mock CanvasRenderingContext2D
function createMockContext(): CanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    // Transformation methods
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('CanvasRenderer', () => {
  let canvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let renderer: CanvasRenderer;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Create and inject mock context
    mockCtx = createMockContext();
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx);

    renderer = new CanvasRenderer(canvas);
  });

  describe('constructor', () => {
    it('should create renderer with canvas', () => {
      expect(renderer).toBeDefined();
    });

    it('should throw if canvas has no 2d context', () => {
      const badCanvas = document.createElement('canvas');
      vi.spyOn(badCanvas, 'getContext').mockReturnValue(null);

      expect(() => new CanvasRenderer(badCanvas)).toThrow(
        'Could not get 2D rendering context'
      );
    });
  });

  describe('clear command', () => {
    it('should clear the entire canvas', () => {
      const commands: DrawCommand[] = [{ type: 'clear' }];

      renderer.render(commands);

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });
  });

  describe('setColor command', () => {
    it('should set fill and stroke style with RGB', () => {
      const commands: DrawCommand[] = [
        { type: 'setColor', r: 255, g: 128, b: 64 },
      ];

      renderer.render(commands);

      expect(mockCtx.fillStyle).toBe('#ff8040');
      expect(mockCtx.strokeStyle).toBe('#ff8040');
    });

    it('should set fill and stroke style with RGBA (alpha 0-255)', () => {
      const commands: DrawCommand[] = [
        { type: 'setColor', r: 255, g: 0, b: 0, a: 128 },
      ];

      renderer.render(commands);

      // Alpha 128/255 ≈ 0.502
      expect(mockCtx.fillStyle).toMatch(/^rgba\(255, 0, 0, 0\.50/);
      expect(mockCtx.strokeStyle).toMatch(/^rgba\(255, 0, 0, 0\.50/);
    });

    it('should handle alpha of 255 as RGB (fully opaque)', () => {
      const commands: DrawCommand[] = [
        { type: 'setColor', r: 0, g: 255, b: 0, a: 255 },
      ];

      renderer.render(commands);

      expect(mockCtx.fillStyle).toBe('#00ff00');
    });

    it('should convert alpha from 0-255 to 0-1 for CSS rgba()', () => {
      const commands: DrawCommand[] = [
        { type: 'setColor', r: 255, g: 0, b: 0, a: 68 },
      ];

      renderer.render(commands);

      // Alpha 68/255 ≈ 0.267
      const expectedAlpha = 68 / 255;
      expect(mockCtx.fillStyle).toBe(`rgba(255, 0, 0, ${expectedAlpha})`);
      expect(mockCtx.strokeStyle).toBe(`rgba(255, 0, 0, ${expectedAlpha})`);
    });

    it('should handle fully transparent (alpha 0)', () => {
      const commands: DrawCommand[] = [
        { type: 'setColor', r: 255, g: 255, b: 255, a: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.fillStyle).toBe('rgba(255, 255, 255, 0)');
      expect(mockCtx.strokeStyle).toBe('rgba(255, 255, 255, 0)');
    });
  });

  describe('rect command', () => {
    it('should draw stroked rectangle', () => {
      const commands: DrawCommand[] = [
        { type: 'rect', x: 10, y: 20, width: 100, height: 50 },
      ];

      renderer.render(commands);

      expect(mockCtx.strokeRect).toHaveBeenCalledWith(10, 20, 100, 50);
    });
  });

  describe('fillRect command', () => {
    it('should draw filled rectangle', () => {
      const commands: DrawCommand[] = [
        { type: 'fillRect', x: 10, y: 20, width: 100, height: 50 },
      ];

      renderer.render(commands);

      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 100, 50);
    });
  });

  describe('circle command', () => {
    it('should draw stroked circle', () => {
      const commands: DrawCommand[] = [
        { type: 'circle', x: 100, y: 100, radius: 50 },
      ];

      renderer.render(commands);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalledWith(100, 100, 50, 0, Math.PI * 2);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('fillCircle command', () => {
    it('should draw filled circle', () => {
      const commands: DrawCommand[] = [
        { type: 'fillCircle', x: 100, y: 100, radius: 50 },
      ];

      renderer.render(commands);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalledWith(100, 100, 50, 0, Math.PI * 2);
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  describe('line command', () => {
    it('should draw line between two points', () => {
      const commands: DrawCommand[] = [
        { type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 },
      ];

      renderer.render(commands);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 0);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(100, 100);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('text command', () => {
    it('should draw text at position', () => {
      const commands: DrawCommand[] = [
        { type: 'text', x: 50, y: 50, text: 'Hello World' },
      ];

      renderer.render(commands);

      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello World', 50, 50);
    });
  });

  describe('multiple commands', () => {
    it('should execute commands in order', () => {
      const commands: DrawCommand[] = [
        { type: 'clear' },
        { type: 'setColor', r: 255, g: 0, b: 0 },
        { type: 'fillRect', x: 10, y: 10, width: 50, height: 50 },
      ];

      renderer.render(commands);

      expect(mockCtx.clearRect).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 10, 50, 50);
    });
  });

  describe('unknown command', () => {
    it('should ignore unknown command types', () => {
      const commands = [
        { type: 'unknownCommand' } as unknown as DrawCommand,
      ];

      // Should not throw
      expect(() => renderer.render(commands)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty command array', () => {
      expect(() => renderer.render([])).not.toThrow();
    });

    it('should clamp color values to valid range', () => {
      const commands: DrawCommand[] = [
        { type: 'setColor', r: 300, g: -50, b: 128 },
      ];

      renderer.render(commands);

      // 300 should clamp to 255 (ff), -50 should clamp to 0 (00)
      expect(mockCtx.fillStyle).toBe('#ff0080');
    });
  });

  describe('drawImage command', () => {
    let imageCache: ImageCache;
    let rendererWithCache: CanvasRenderer;
    let mockImage: HTMLImageElement;

    beforeEach(() => {
      imageCache = new ImageCache();
      mockImage = new Image();
      mockImage.width = 64;
      mockImage.height = 64;
      imageCache.set('player', mockImage);
      rendererWithCache = new CanvasRenderer(canvas, imageCache);
    });

    it('should draw image at position without scaling', () => {
      const commands: DrawCommand[] = [
        { type: 'drawImage', name: 'player', x: 100, y: 200 },
      ];

      rendererWithCache.render(commands);

      expect(mockCtx.drawImage).toHaveBeenCalledWith(mockImage, 100, 200);
    });

    it('should draw image with scaling when width and height provided', () => {
      const commands: DrawCommand[] = [
        { type: 'drawImage', name: 'player', x: 50, y: 75, width: 128, height: 96 },
      ];

      rendererWithCache.render(commands);

      expect(mockCtx.drawImage).toHaveBeenCalledWith(mockImage, 50, 75, 128, 96);
    });

    it('should silently skip if image not in cache', () => {
      const commands: DrawCommand[] = [
        { type: 'drawImage', name: 'nonexistent', x: 0, y: 0 },
      ];

      // Should not throw, just skip
      expect(() => rendererWithCache.render(commands)).not.toThrow();
      expect(mockCtx.drawImage).not.toHaveBeenCalled();
    });

    it('should work without image cache (backward compatibility)', () => {
      const commands: DrawCommand[] = [
        { type: 'drawImage', name: 'player', x: 0, y: 0 },
      ];

      // Renderer without cache
      expect(() => renderer.render(commands)).not.toThrow();
      expect(mockCtx.drawImage).not.toHaveBeenCalled();
    });
  });

  describe('translate command', () => {
    it('should translate the canvas origin', () => {
      const commands: DrawCommand[] = [
        { type: 'translate', dx: 100, dy: 50 },
      ];

      renderer.render(commands);

      expect(mockCtx.translate).toHaveBeenCalledWith(100, 50);
    });

    it('should handle negative translation values', () => {
      const commands: DrawCommand[] = [
        { type: 'translate', dx: -25, dy: -75 },
      ];

      renderer.render(commands);

      expect(mockCtx.translate).toHaveBeenCalledWith(-25, -75);
    });
  });

  describe('rotate command', () => {
    it('should rotate the canvas by the given angle', () => {
      const commands: DrawCommand[] = [
        { type: 'rotate', angle: Math.PI / 4 },
      ];

      renderer.render(commands);

      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 4);
    });

    it('should handle negative angles', () => {
      const commands: DrawCommand[] = [
        { type: 'rotate', angle: -Math.PI / 2 },
      ];

      renderer.render(commands);

      expect(mockCtx.rotate).toHaveBeenCalledWith(-Math.PI / 2);
    });

    it('should handle large angles (wrapping)', () => {
      const commands: DrawCommand[] = [
        { type: 'rotate', angle: Math.PI * 4 }, // Two full rotations
      ];

      renderer.render(commands);

      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI * 4);
    });
  });

  describe('scale command', () => {
    it('should scale the canvas', () => {
      const commands: DrawCommand[] = [
        { type: 'scale', sx: 2, sy: 3 },
      ];

      renderer.render(commands);

      expect(mockCtx.scale).toHaveBeenCalledWith(2, 3);
    });

    it('should handle fractional scale values', () => {
      const commands: DrawCommand[] = [
        { type: 'scale', sx: 0.5, sy: 0.25 },
      ];

      renderer.render(commands);

      expect(mockCtx.scale).toHaveBeenCalledWith(0.5, 0.25);
    });

    it('should handle negative scale values (mirroring)', () => {
      const commands: DrawCommand[] = [
        { type: 'scale', sx: -1, sy: 1 },
      ];

      renderer.render(commands);

      expect(mockCtx.scale).toHaveBeenCalledWith(-1, 1);
    });
  });

  describe('save command', () => {
    it('should save the current transformation state', () => {
      const commands: DrawCommand[] = [{ type: 'save' }];

      renderer.render(commands);

      expect(mockCtx.save).toHaveBeenCalled();
    });
  });

  describe('restore command', () => {
    it('should restore the previous transformation state', () => {
      const commands: DrawCommand[] = [{ type: 'restore' }];

      renderer.render(commands);

      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });

  describe('save/restore workflow', () => {
    it('should support nested save/restore operations', () => {
      const commands: DrawCommand[] = [
        { type: 'save' },
        { type: 'translate', dx: 100, dy: 100 },
        { type: 'save' },
        { type: 'rotate', angle: Math.PI / 4 },
        { type: 'restore' },
        { type: 'restore' },
      ];

      renderer.render(commands);

      expect(mockCtx.save).toHaveBeenCalledTimes(2);
      expect(mockCtx.translate).toHaveBeenCalledWith(100, 100);
      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 4);
      expect(mockCtx.restore).toHaveBeenCalledTimes(2);
    });
  });

  describe('transform command', () => {
    it('should apply transformation matrix', () => {
      const commands: DrawCommand[] = [
        { type: 'transform', a: 1, b: 0, c: 0, d: 1, e: 100, f: 50 },
      ];

      renderer.render(commands);

      expect(mockCtx.transform).toHaveBeenCalledWith(1, 0, 0, 1, 100, 50);
    });

    it('should handle rotation matrix values', () => {
      // 45-degree rotation matrix
      const cos45 = Math.cos(Math.PI / 4);
      const sin45 = Math.sin(Math.PI / 4);
      const commands: DrawCommand[] = [
        { type: 'transform', a: cos45, b: sin45, c: -sin45, d: cos45, e: 0, f: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.transform).toHaveBeenCalledWith(cos45, sin45, -sin45, cos45, 0, 0);
    });
  });

  describe('setTransform command', () => {
    it('should set transformation matrix (resetting first)', () => {
      const commands: DrawCommand[] = [
        { type: 'setTransform', a: 2, b: 0, c: 0, d: 2, e: 50, f: 50 },
      ];

      renderer.render(commands);

      expect(mockCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 50, 50);
    });
  });

  describe('resetTransform command', () => {
    it('should reset transformation matrix to identity', () => {
      const commands: DrawCommand[] = [{ type: 'resetTransform' }];

      renderer.render(commands);

      expect(mockCtx.resetTransform).toHaveBeenCalled();
    });
  });

  describe('transformation with drawing', () => {
    it('should execute transforms before drawing commands', () => {
      const callOrder: string[] = [];
      (mockCtx.translate as ReturnType<typeof vi.fn>).mockImplementation(() => callOrder.push('translate'));
      (mockCtx.rotate as ReturnType<typeof vi.fn>).mockImplementation(() => callOrder.push('rotate'));
      (mockCtx.fillRect as ReturnType<typeof vi.fn>).mockImplementation(() => callOrder.push('fillRect'));

      const commands: DrawCommand[] = [
        { type: 'translate', dx: 100, dy: 100 },
        { type: 'rotate', angle: Math.PI / 4 },
        { type: 'fillRect', x: -25, y: -25, width: 50, height: 50 },
      ];

      renderer.render(commands);

      expect(callOrder).toEqual(['translate', 'rotate', 'fillRect']);
    });
  });
});
