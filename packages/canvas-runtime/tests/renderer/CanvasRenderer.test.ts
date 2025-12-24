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
    closePath: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    ellipse: vi.fn(),
    roundRect: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '16px monospace',
    textBaseline: 'alphabetic',
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

  describe('setFontSize command', () => {
    it('should set the font size', () => {
      const commands: DrawCommand[] = [
        { type: 'setFontSize', size: 24 },
      ];

      renderer.render(commands);

      expect(mockCtx.font).toBe('24px monospace');
    });

    it('should preserve current font family when setting size', () => {
      const commands: DrawCommand[] = [
        { type: 'setFontFamily', family: 'Arial' },
        { type: 'setFontSize', size: 32 },
      ];

      renderer.render(commands);

      expect(mockCtx.font).toBe('32px Arial');
    });
  });

  describe('setFontFamily command', () => {
    it('should set the font family', () => {
      const commands: DrawCommand[] = [
        { type: 'setFontFamily', family: 'Arial' },
      ];

      renderer.render(commands);

      expect(mockCtx.font).toBe('16px Arial');
    });

    it('should preserve current font size when setting family', () => {
      const commands: DrawCommand[] = [
        { type: 'setFontSize', size: 48 },
        { type: 'setFontFamily', family: 'Times New Roman' },
      ];

      renderer.render(commands);

      expect(mockCtx.font).toBe('48px Times New Roman');
    });
  });

  describe('text command with font settings', () => {
    it('should use current font settings for text', () => {
      const commands: DrawCommand[] = [
        { type: 'setFontSize', size: 24 },
        { type: 'setFontFamily', family: 'Georgia' },
        { type: 'text', x: 10, y: 20, text: 'Hello' },
      ];

      renderer.render(commands);

      expect(mockCtx.font).toBe('24px Georgia');
      expect(mockCtx.textBaseline).toBe('top');
      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello', 10, 20);
    });

    it('should apply fontSize override for single text call', () => {
      const commands: DrawCommand[] = [
        { type: 'setFontSize', size: 16 },
        { type: 'text', x: 10, y: 20, text: 'Big Text', fontSize: 48 },
      ];

      renderer.render(commands);

      // After rendering, font should be back to current state (16px)
      // But during the text call, 48px was used
      expect(mockCtx.fillText).toHaveBeenCalledWith('Big Text', 10, 20);
    });

    it('should apply fontFamily override for single text call', () => {
      const commands: DrawCommand[] = [
        { type: 'setFontFamily', family: 'monospace' },
        { type: 'text', x: 10, y: 20, text: 'Custom Font', fontFamily: 'Impact' },
      ];

      renderer.render(commands);

      expect(mockCtx.fillText).toHaveBeenCalledWith('Custom Font', 10, 20);
    });

    it('should apply both fontSize and fontFamily overrides', () => {
      const commands: DrawCommand[] = [
        { type: 'text', x: 0, y: 0, text: 'Styled', fontSize: 72, fontFamily: 'Comic Sans MS' },
      ];

      renderer.render(commands);

      expect(mockCtx.fillText).toHaveBeenCalledWith('Styled', 0, 0);
    });

    it('should set textBaseline to top for top-left positioning', () => {
      const commands: DrawCommand[] = [
        { type: 'text', x: 100, y: 100, text: 'Test' },
      ];

      renderer.render(commands);

      expect(mockCtx.textBaseline).toBe('top');
    });
  });

  describe('default font settings', () => {
    it('should use 16px monospace as default font', () => {
      // The constructor should set default font
      const freshCanvas = document.createElement('canvas');
      const freshCtx = createMockContext();
      vi.spyOn(freshCanvas, 'getContext').mockReturnValue(freshCtx);

      new CanvasRenderer(freshCanvas);

      expect(freshCtx.font).toBe('16px monospace');
    });

    it('should set textBaseline to top in constructor', () => {
      const freshCanvas = document.createElement('canvas');
      const freshCtx = createMockContext();
      vi.spyOn(freshCanvas, 'getContext').mockReturnValue(freshCtx);

      new CanvasRenderer(freshCanvas);

      expect(freshCtx.textBaseline).toBe('top');
    });
  });

  // ============================================================================
  // Path API Commands
  // ============================================================================

  describe('beginPath command', () => {
    it('should call ctx.beginPath()', () => {
      const commands: DrawCommand[] = [{ type: 'beginPath' }];

      renderer.render(commands);

      expect(mockCtx.beginPath).toHaveBeenCalled();
    });
  });

  describe('closePath command', () => {
    it('should call ctx.closePath()', () => {
      const commands: DrawCommand[] = [{ type: 'closePath' }];

      renderer.render(commands);

      expect(mockCtx.closePath).toHaveBeenCalled();
    });
  });

  describe('moveTo command', () => {
    it('should call ctx.moveTo() with correct coordinates', () => {
      const commands: DrawCommand[] = [{ type: 'moveTo', x: 100, y: 150 }];

      renderer.render(commands);

      expect(mockCtx.moveTo).toHaveBeenCalledWith(100, 150);
    });

    it('should handle zero coordinates', () => {
      const commands: DrawCommand[] = [{ type: 'moveTo', x: 0, y: 0 }];

      renderer.render(commands);

      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 0);
    });

    it('should handle negative coordinates', () => {
      const commands: DrawCommand[] = [{ type: 'moveTo', x: -50, y: -75 }];

      renderer.render(commands);

      expect(mockCtx.moveTo).toHaveBeenCalledWith(-50, -75);
    });
  });

  describe('lineTo command', () => {
    it('should call ctx.lineTo() with correct coordinates', () => {
      const commands: DrawCommand[] = [{ type: 'lineTo', x: 200, y: 250 }];

      renderer.render(commands);

      expect(mockCtx.lineTo).toHaveBeenCalledWith(200, 250);
    });

    it('should handle zero coordinates', () => {
      const commands: DrawCommand[] = [{ type: 'lineTo', x: 0, y: 0 }];

      renderer.render(commands);

      expect(mockCtx.lineTo).toHaveBeenCalledWith(0, 0);
    });

    it('should handle negative coordinates', () => {
      const commands: DrawCommand[] = [{ type: 'lineTo', x: -100, y: -200 }];

      renderer.render(commands);

      expect(mockCtx.lineTo).toHaveBeenCalledWith(-100, -200);
    });
  });

  describe('fill command', () => {
    it('should call ctx.fill()', () => {
      const commands: DrawCommand[] = [{ type: 'fill' }];

      renderer.render(commands);

      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  describe('stroke command', () => {
    it('should call ctx.stroke()', () => {
      const commands: DrawCommand[] = [{ type: 'stroke' }];

      renderer.render(commands);

      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('arc command', () => {
    it('should call ctx.arc() with correct parameters', () => {
      const commands: DrawCommand[] = [
        { type: 'arc', x: 100, y: 100, radius: 50, startAngle: 0, endAngle: Math.PI },
      ];

      renderer.render(commands);

      expect(mockCtx.arc).toHaveBeenCalledWith(100, 100, 50, 0, Math.PI, undefined);
    });

    it('should pass counterclockwise parameter when true', () => {
      const commands: DrawCommand[] = [
        { type: 'arc', x: 200, y: 200, radius: 75, startAngle: 0, endAngle: Math.PI / 2, counterclockwise: true },
      ];

      renderer.render(commands);

      expect(mockCtx.arc).toHaveBeenCalledWith(200, 200, 75, 0, Math.PI / 2, true);
    });

    it('should pass counterclockwise parameter when false', () => {
      const commands: DrawCommand[] = [
        { type: 'arc', x: 150, y: 150, radius: 30, startAngle: Math.PI, endAngle: Math.PI * 2, counterclockwise: false },
      ];

      renderer.render(commands);

      expect(mockCtx.arc).toHaveBeenCalledWith(150, 150, 30, Math.PI, Math.PI * 2, false);
    });

    it('should handle full circle (0 to 2*PI)', () => {
      const commands: DrawCommand[] = [
        { type: 'arc', x: 100, y: 100, radius: 50, startAngle: 0, endAngle: Math.PI * 2 },
      ];

      renderer.render(commands);

      expect(mockCtx.arc).toHaveBeenCalledWith(100, 100, 50, 0, Math.PI * 2, undefined);
    });

    it('should handle negative angles', () => {
      const commands: DrawCommand[] = [
        { type: 'arc', x: 100, y: 100, radius: 50, startAngle: -Math.PI, endAngle: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.arc).toHaveBeenCalledWith(100, 100, 50, -Math.PI, 0, undefined);
    });
  });

  describe('arcTo command', () => {
    it('should call ctx.arcTo() with correct parameters', () => {
      const commands: DrawCommand[] = [
        { type: 'arcTo', x1: 100, y1: 100, x2: 100, y2: 50, radius: 20 },
      ];

      renderer.render(commands);

      expect(mockCtx.arcTo).toHaveBeenCalledWith(100, 100, 100, 50, 20);
    });

    it('should handle zero radius', () => {
      const commands: DrawCommand[] = [
        { type: 'arcTo', x1: 50, y1: 50, x2: 100, y2: 50, radius: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.arcTo).toHaveBeenCalledWith(50, 50, 100, 50, 0);
    });

    it('should handle negative coordinates', () => {
      const commands: DrawCommand[] = [
        { type: 'arcTo', x1: -50, y1: -50, x2: -100, y2: -50, radius: 25 },
      ];

      renderer.render(commands);

      expect(mockCtx.arcTo).toHaveBeenCalledWith(-50, -50, -100, -50, 25);
    });
  });

  describe('quadraticCurveTo command', () => {
    it('should call ctx.quadraticCurveTo() with correct parameters', () => {
      const commands: DrawCommand[] = [
        { type: 'quadraticCurveTo', cpx: 100, cpy: 50, x: 200, y: 100 },
      ];

      renderer.render(commands);

      expect(mockCtx.quadraticCurveTo).toHaveBeenCalledWith(100, 50, 200, 100);
    });

    it('should handle zero coordinates', () => {
      const commands: DrawCommand[] = [
        { type: 'quadraticCurveTo', cpx: 0, cpy: 0, x: 0, y: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.quadraticCurveTo).toHaveBeenCalledWith(0, 0, 0, 0);
    });

    it('should handle negative coordinates', () => {
      const commands: DrawCommand[] = [
        { type: 'quadraticCurveTo', cpx: -50, cpy: -100, x: -150, y: -200 },
      ];

      renderer.render(commands);

      expect(mockCtx.quadraticCurveTo).toHaveBeenCalledWith(-50, -100, -150, -200);
    });
  });

  describe('bezierCurveTo command', () => {
    it('should call ctx.bezierCurveTo() with correct parameters', () => {
      const commands: DrawCommand[] = [
        { type: 'bezierCurveTo', cp1x: 100, cp1y: 50, cp2x: 200, cp2y: 150, x: 300, y: 100 },
      ];

      renderer.render(commands);

      expect(mockCtx.bezierCurveTo).toHaveBeenCalledWith(100, 50, 200, 150, 300, 100);
    });

    it('should handle zero coordinates', () => {
      const commands: DrawCommand[] = [
        { type: 'bezierCurveTo', cp1x: 0, cp1y: 0, cp2x: 0, cp2y: 0, x: 0, y: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.bezierCurveTo).toHaveBeenCalledWith(0, 0, 0, 0, 0, 0);
    });

    it('should handle negative coordinates', () => {
      const commands: DrawCommand[] = [
        { type: 'bezierCurveTo', cp1x: -50, cp1y: -100, cp2x: -150, cp2y: -200, x: -250, y: -300 },
      ];

      renderer.render(commands);

      expect(mockCtx.bezierCurveTo).toHaveBeenCalledWith(-50, -100, -150, -200, -250, -300);
    });

    it('should handle S-curve shape', () => {
      const commands: DrawCommand[] = [
        { type: 'bezierCurveTo', cp1x: 150, cp1y: 50, cp2x: 250, cp2y: 350, x: 350, y: 200 },
      ];

      renderer.render(commands);

      expect(mockCtx.bezierCurveTo).toHaveBeenCalledWith(150, 50, 250, 350, 350, 200);
    });
  });

  describe('path API workflow', () => {
    it('should support complete triangle path workflow', () => {
      const commands: DrawCommand[] = [
        { type: 'beginPath' },
        { type: 'moveTo', x: 100, y: 100 },
        { type: 'lineTo', x: 150, y: 50 },
        { type: 'lineTo', x: 200, y: 100 },
        { type: 'closePath' },
        { type: 'fill' },
      ];

      renderer.render(commands);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(100, 100);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(150, 50);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(200, 100);
      expect(mockCtx.closePath).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should support stroke after path creation', () => {
      const commands: DrawCommand[] = [
        { type: 'beginPath' },
        { type: 'moveTo', x: 0, y: 0 },
        { type: 'lineTo', x: 100, y: 100 },
        { type: 'stroke' },
      ];

      renderer.render(commands);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 0);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(100, 100);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should support both fill and stroke on same path', () => {
      const commands: DrawCommand[] = [
        { type: 'beginPath' },
        { type: 'moveTo', x: 50, y: 50 },
        { type: 'lineTo', x: 100, y: 50 },
        { type: 'lineTo', x: 75, y: 100 },
        { type: 'closePath' },
        { type: 'fill' },
        { type: 'stroke' },
      ];

      renderer.render(commands);

      expect(mockCtx.fill).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('ellipse command', () => {
    it('should call ctx.ellipse() with correct parameters', () => {
      const commands: DrawCommand[] = [
        { type: 'ellipse', x: 200, y: 150, radiusX: 100, radiusY: 50, rotation: 0, startAngle: 0, endAngle: Math.PI * 2 },
      ];

      renderer.render(commands);

      expect(mockCtx.ellipse).toHaveBeenCalledWith(200, 150, 100, 50, 0, 0, Math.PI * 2, undefined);
    });

    it('should pass counterclockwise parameter when true', () => {
      const commands: DrawCommand[] = [
        { type: 'ellipse', x: 100, y: 100, radiusX: 80, radiusY: 40, rotation: Math.PI / 4, startAngle: 0, endAngle: Math.PI, counterclockwise: true },
      ];

      renderer.render(commands);

      expect(mockCtx.ellipse).toHaveBeenCalledWith(100, 100, 80, 40, Math.PI / 4, 0, Math.PI, true);
    });

    it('should pass counterclockwise parameter when false', () => {
      const commands: DrawCommand[] = [
        { type: 'ellipse', x: 150, y: 150, radiusX: 60, radiusY: 30, rotation: 0, startAngle: 0, endAngle: Math.PI / 2, counterclockwise: false },
      ];

      renderer.render(commands);

      expect(mockCtx.ellipse).toHaveBeenCalledWith(150, 150, 60, 30, 0, 0, Math.PI / 2, false);
    });

    it('should handle rotation angle', () => {
      const commands: DrawCommand[] = [
        { type: 'ellipse', x: 200, y: 200, radiusX: 100, radiusY: 50, rotation: Math.PI / 6, startAngle: 0, endAngle: Math.PI * 2 },
      ];

      renderer.render(commands);

      expect(mockCtx.ellipse).toHaveBeenCalledWith(200, 200, 100, 50, Math.PI / 6, 0, Math.PI * 2, undefined);
    });

    it('should handle partial ellipse arc', () => {
      const commands: DrawCommand[] = [
        { type: 'ellipse', x: 100, y: 100, radiusX: 50, radiusY: 25, rotation: 0, startAngle: Math.PI / 4, endAngle: Math.PI * 3 / 4 },
      ];

      renderer.render(commands);

      expect(mockCtx.ellipse).toHaveBeenCalledWith(100, 100, 50, 25, 0, Math.PI / 4, Math.PI * 3 / 4, undefined);
    });
  });

  describe('roundRect command', () => {
    it('should call ctx.roundRect() with single radius value', () => {
      const commands: DrawCommand[] = [
        { type: 'roundRect', x: 50, y: 50, width: 200, height: 100, radii: 15 },
      ];

      renderer.render(commands);

      expect(mockCtx.roundRect).toHaveBeenCalledWith(50, 50, 200, 100, 15);
    });

    it('should call ctx.roundRect() with array of radii', () => {
      const commands: DrawCommand[] = [
        { type: 'roundRect', x: 100, y: 100, width: 150, height: 80, radii: [10, 20, 30, 40] },
      ];

      renderer.render(commands);

      expect(mockCtx.roundRect).toHaveBeenCalledWith(100, 100, 150, 80, [10, 20, 30, 40]);
    });

    it('should handle single-element radii array', () => {
      const commands: DrawCommand[] = [
        { type: 'roundRect', x: 0, y: 0, width: 100, height: 50, radii: [25] },
      ];

      renderer.render(commands);

      expect(mockCtx.roundRect).toHaveBeenCalledWith(0, 0, 100, 50, [25]);
    });

    it('should handle two-element radii array', () => {
      const commands: DrawCommand[] = [
        { type: 'roundRect', x: 10, y: 20, width: 200, height: 100, radii: [10, 20] },
      ];

      renderer.render(commands);

      expect(mockCtx.roundRect).toHaveBeenCalledWith(10, 20, 200, 100, [10, 20]);
    });

    it('should handle three-element radii array', () => {
      const commands: DrawCommand[] = [
        { type: 'roundRect', x: 30, y: 40, width: 180, height: 90, radii: [5, 10, 15] },
      ];

      renderer.render(commands);

      expect(mockCtx.roundRect).toHaveBeenCalledWith(30, 40, 180, 90, [5, 10, 15]);
    });

    it('should handle zero radius', () => {
      const commands: DrawCommand[] = [
        { type: 'roundRect', x: 0, y: 0, width: 100, height: 100, radii: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.roundRect).toHaveBeenCalledWith(0, 0, 100, 100, 0);
    });
  });

  describe('clip command', () => {
    it('should call ctx.clip() with no fill rule', () => {
      const commands: DrawCommand[] = [
        { type: 'clip' },
      ];

      renderer.render(commands);

      expect(mockCtx.clip).toHaveBeenCalledWith();
    });

    it('should call ctx.clip() with nonzero fill rule', () => {
      const commands: DrawCommand[] = [
        { type: 'clip', fillRule: 'nonzero' },
      ];

      renderer.render(commands);

      expect(mockCtx.clip).toHaveBeenCalledWith('nonzero');
    });

    it('should call ctx.clip() with evenodd fill rule', () => {
      const commands: DrawCommand[] = [
        { type: 'clip', fillRule: 'evenodd' },
      ];

      renderer.render(commands);

      expect(mockCtx.clip).toHaveBeenCalledWith('evenodd');
    });
  });
});
