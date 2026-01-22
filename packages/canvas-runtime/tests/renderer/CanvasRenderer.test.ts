/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasRenderer } from '../../src/renderer/CanvasRenderer.js';
import { ImageCache } from '../../src/renderer/ImageCache.js';
import type { DrawCommand } from '../../src/shared/types.js';

// Mock Path2D (not available in jsdom)
class MockPath2D {
  commands: unknown[] = [];
  moveTo(x: number, y: number) { this.commands.push(['moveTo', x, y]); }
  lineTo(x: number, y: number) { this.commands.push(['lineTo', x, y]); }
  closePath() { this.commands.push(['closePath']); }
  arc(...args: unknown[]) { this.commands.push(['arc', ...args]); }
  arcTo(...args: unknown[]) { this.commands.push(['arcTo', ...args]); }
  ellipse(...args: unknown[]) { this.commands.push(['ellipse', ...args]); }
  rect(...args: unknown[]) { this.commands.push(['rect', ...args]); }
  roundRect(...args: unknown[]) { this.commands.push(['roundRect', ...args]); }
  quadraticCurveTo(...args: unknown[]) { this.commands.push(['quadraticCurveTo', ...args]); }
  bezierCurveTo(...args: unknown[]) { this.commands.push(['bezierCurveTo', ...args]); }
}

// Assign to global for tests
(globalThis as unknown as { Path2D: typeof MockPath2D }).Path2D = MockPath2D;

// Mock ImageData (not available in jsdom)
class MockImageData {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;

  constructor(width: number, height: number);
  constructor(data: Uint8ClampedArray, width: number, height?: number);
  constructor(widthOrData: number | Uint8ClampedArray, widthOrHeight: number, height?: number) {
    if (typeof widthOrData === 'number') {
      this.width = widthOrData;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = widthOrData;
      this.width = widthOrHeight;
      this.height = height ?? (widthOrData.length / 4 / widthOrHeight);
    }
  }
}

(globalThis as unknown as { ImageData: typeof MockImageData }).ImageData = MockImageData;

// Mock CanvasGradient
function createMockGradient(): CanvasGradient {
  return {
    addColorStop: vi.fn(),
  } as unknown as CanvasGradient;
}

// Mock CanvasPattern
function createMockPattern(): CanvasPattern {
  return {} as unknown as CanvasPattern;
}

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
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    miterLimit: 10,
    lineDashOffset: 0,
    setLineDash: vi.fn(),
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
    // Gradient methods
    createLinearGradient: vi.fn(() => createMockGradient()),
    createRadialGradient: vi.fn(() => createMockGradient()),
    createConicGradient: vi.fn(() => createMockGradient()),
    // Pattern methods
    createPattern: vi.fn(() => createMockPattern()),
    // Shadow properties
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    // Compositing properties
    globalAlpha: 1,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
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

      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello World', 50, 50, undefined);
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
      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello', 10, 20, undefined);
    });

    it('should apply fontSize override for single text call', () => {
      const commands: DrawCommand[] = [
        { type: 'setFontSize', size: 16 },
        { type: 'text', x: 10, y: 20, text: 'Big Text', fontSize: 48 },
      ];

      renderer.render(commands);

      // After rendering, font should be back to current state (16px)
      // But during the text call, 48px was used
      expect(mockCtx.fillText).toHaveBeenCalledWith('Big Text', 10, 20, undefined);
    });

    it('should apply fontFamily override for single text call', () => {
      const commands: DrawCommand[] = [
        { type: 'setFontFamily', family: 'monospace' },
        { type: 'text', x: 10, y: 20, text: 'Custom Font', fontFamily: 'Impact' },
      ];

      renderer.render(commands);

      expect(mockCtx.fillText).toHaveBeenCalledWith('Custom Font', 10, 20, undefined);
    });

    it('should apply both fontSize and fontFamily overrides', () => {
      const commands: DrawCommand[] = [
        { type: 'text', x: 0, y: 0, text: 'Styled', fontSize: 72, fontFamily: 'Comic Sans MS' },
      ];

      renderer.render(commands);

      expect(mockCtx.fillText).toHaveBeenCalledWith('Styled', 0, 0, undefined);
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

  describe('setLineCap command', () => {
    it('should set lineCap to butt', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineCap', cap: 'butt' },
      ];

      renderer.render(commands);

      expect(mockCtx.lineCap).toBe('butt');
    });

    it('should set lineCap to round', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineCap', cap: 'round' },
      ];

      renderer.render(commands);

      expect(mockCtx.lineCap).toBe('round');
    });

    it('should set lineCap to square', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineCap', cap: 'square' },
      ];

      renderer.render(commands);

      expect(mockCtx.lineCap).toBe('square');
    });
  });

  describe('setLineJoin command', () => {
    it('should set lineJoin to miter', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineJoin', join: 'miter' },
      ];

      renderer.render(commands);

      expect(mockCtx.lineJoin).toBe('miter');
    });

    it('should set lineJoin to round', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineJoin', join: 'round' },
      ];

      renderer.render(commands);

      expect(mockCtx.lineJoin).toBe('round');
    });

    it('should set lineJoin to bevel', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineJoin', join: 'bevel' },
      ];

      renderer.render(commands);

      expect(mockCtx.lineJoin).toBe('bevel');
    });
  });

  describe('setMiterLimit command', () => {
    it('should set miterLimit', () => {
      const commands: DrawCommand[] = [
        { type: 'setMiterLimit', limit: 15 },
      ];

      renderer.render(commands);

      expect(mockCtx.miterLimit).toBe(15);
    });

    it('should set miterLimit to default value of 10', () => {
      const commands: DrawCommand[] = [
        { type: 'setMiterLimit', limit: 10 },
      ];

      renderer.render(commands);

      expect(mockCtx.miterLimit).toBe(10);
    });
  });

  describe('setLineDash command', () => {
    it('should set line dash with simple pattern', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineDash', segments: [10, 5] },
      ];

      renderer.render(commands);

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([10, 5]);
    });

    it('should set line dash with complex pattern', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineDash', segments: [15, 5, 5, 5] },
      ];

      renderer.render(commands);

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([15, 5, 5, 5]);
    });

    it('should set line dash with empty array for solid line', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineDash', segments: [] },
      ];

      renderer.render(commands);

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
    });

    it('should set line dash with dotted pattern', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineDash', segments: [2, 4] },
      ];

      renderer.render(commands);

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([2, 4]);
    });
  });

  describe('setLineDashOffset command', () => {
    it('should set lineDashOffset', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineDashOffset', offset: 5 },
      ];

      renderer.render(commands);

      expect(mockCtx.lineDashOffset).toBe(5);
    });

    it('should set lineDashOffset to zero', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineDashOffset', offset: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.lineDashOffset).toBe(0);
    });

    it('should set negative lineDashOffset', () => {
      const commands: DrawCommand[] = [
        { type: 'setLineDashOffset', offset: -10 },
      ];

      renderer.render(commands);

      expect(mockCtx.lineDashOffset).toBe(-10);
    });
  });

  // ============================================================================
  // Gradient Commands
  // ============================================================================

  describe('setFillStyle command', () => {
    it('should set fillStyle with a string color', () => {
      const commands: DrawCommand[] = [
        { type: 'setFillStyle', style: '#ff0000' },
      ];

      renderer.render(commands);

      expect(mockCtx.fillStyle).toBe('#ff0000');
    });

    it('should set fillStyle with named color', () => {
      const commands: DrawCommand[] = [
        { type: 'setFillStyle', style: 'blue' },
      ];

      renderer.render(commands);

      expect(mockCtx.fillStyle).toBe('blue');
    });

    it('should set fillStyle with rgb() color', () => {
      const commands: DrawCommand[] = [
        { type: 'setFillStyle', style: 'rgb(100, 150, 200)' },
      ];

      renderer.render(commands);

      expect(mockCtx.fillStyle).toBe('rgb(100, 150, 200)');
    });

    it('should set fillStyle with rgba() color', () => {
      const commands: DrawCommand[] = [
        { type: 'setFillStyle', style: 'rgba(255, 0, 0, 0.5)' },
      ];

      renderer.render(commands);

      expect(mockCtx.fillStyle).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should create and set linear gradient as fillStyle', () => {
      const mockGradient = createMockGradient();
      (mockCtx.createLinearGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient);

      const commands: DrawCommand[] = [
        {
          type: 'setFillStyle',
          style: {
            type: 'linear',
            x0: 0, y0: 0,
            x1: 100, y1: 0,
            stops: [
              { offset: 0, color: '#ff0000' },
              { offset: 1, color: '#0000ff' },
            ],
          },
        },
      ];

      renderer.render(commands);

      expect(mockCtx.createLinearGradient).toHaveBeenCalledWith(0, 0, 100, 0);
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, '#ff0000');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(1, '#0000ff');
      expect(mockCtx.fillStyle).toBe(mockGradient);
    });

    it('should create and set radial gradient as fillStyle', () => {
      const mockGradient = createMockGradient();
      (mockCtx.createRadialGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient);

      const commands: DrawCommand[] = [
        {
          type: 'setFillStyle',
          style: {
            type: 'radial',
            x0: 100, y0: 100, r0: 0,
            x1: 100, y1: 100, r1: 50,
            stops: [
              { offset: 0, color: 'white' },
              { offset: 0.5, color: 'yellow' },
              { offset: 1, color: 'red' },
            ],
          },
        },
      ];

      renderer.render(commands);

      expect(mockCtx.createRadialGradient).toHaveBeenCalledWith(100, 100, 0, 100, 100, 50);
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, 'white');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0.5, 'yellow');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(1, 'red');
      expect(mockCtx.fillStyle).toBe(mockGradient);
    });

    it('should create and set conic gradient as fillStyle', () => {
      const mockGradient = createMockGradient();
      (mockCtx.createConicGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient);

      const commands: DrawCommand[] = [
        {
          type: 'setFillStyle',
          style: {
            type: 'conic',
            startAngle: 0,
            x: 200, y: 200,
            stops: [
              { offset: 0, color: '#ff0000' },
              { offset: 0.5, color: '#00ff00' },
              { offset: 1, color: '#0000ff' },
            ],
          },
        },
      ];

      renderer.render(commands);

      expect(mockCtx.createConicGradient).toHaveBeenCalledWith(0, 200, 200);
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, '#ff0000');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0.5, '#00ff00');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(1, '#0000ff');
      expect(mockCtx.fillStyle).toBe(mockGradient);
    });

    it('should handle gradient with empty stops array', () => {
      const mockGradient = createMockGradient();
      (mockCtx.createLinearGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient);

      const commands: DrawCommand[] = [
        {
          type: 'setFillStyle',
          style: {
            type: 'linear',
            x0: 0, y0: 0,
            x1: 100, y1: 100,
            stops: [],
          },
        },
      ];

      renderer.render(commands);

      expect(mockCtx.createLinearGradient).toHaveBeenCalledWith(0, 0, 100, 100);
      expect(mockGradient.addColorStop).not.toHaveBeenCalled();
      expect(mockCtx.fillStyle).toBe(mockGradient);
    });
  });

  describe('setStrokeStyle command', () => {
    it('should set strokeStyle with a string color', () => {
      const commands: DrawCommand[] = [
        { type: 'setStrokeStyle', style: '#00ff00' },
      ];

      renderer.render(commands);

      expect(mockCtx.strokeStyle).toBe('#00ff00');
    });

    it('should set strokeStyle with named color', () => {
      const commands: DrawCommand[] = [
        { type: 'setStrokeStyle', style: 'red' },
      ];

      renderer.render(commands);

      expect(mockCtx.strokeStyle).toBe('red');
    });

    it('should create and set linear gradient as strokeStyle', () => {
      const mockGradient = createMockGradient();
      (mockCtx.createLinearGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient);

      const commands: DrawCommand[] = [
        {
          type: 'setStrokeStyle',
          style: {
            type: 'linear',
            x0: 0, y0: 0,
            x1: 200, y1: 0,
            stops: [
              { offset: 0, color: 'red' },
              { offset: 0.5, color: 'yellow' },
              { offset: 1, color: 'green' },
            ],
          },
        },
      ];

      renderer.render(commands);

      expect(mockCtx.createLinearGradient).toHaveBeenCalledWith(0, 0, 200, 0);
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, 'red');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0.5, 'yellow');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(1, 'green');
      expect(mockCtx.strokeStyle).toBe(mockGradient);
    });

    it('should create and set radial gradient as strokeStyle', () => {
      const mockGradient = createMockGradient();
      (mockCtx.createRadialGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient);

      const commands: DrawCommand[] = [
        {
          type: 'setStrokeStyle',
          style: {
            type: 'radial',
            x0: 50, y0: 50, r0: 10,
            x1: 50, y1: 50, r1: 100,
            stops: [
              { offset: 0, color: '#ffffff' },
              { offset: 1, color: '#000000' },
            ],
          },
        },
      ];

      renderer.render(commands);

      expect(mockCtx.createRadialGradient).toHaveBeenCalledWith(50, 50, 10, 50, 50, 100);
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, '#ffffff');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(1, '#000000');
      expect(mockCtx.strokeStyle).toBe(mockGradient);
    });

    it('should create and set conic gradient as strokeStyle', () => {
      const mockGradient = createMockGradient();
      (mockCtx.createConicGradient as ReturnType<typeof vi.fn>).mockReturnValue(mockGradient);

      const commands: DrawCommand[] = [
        {
          type: 'setStrokeStyle',
          style: {
            type: 'conic',
            startAngle: Math.PI / 2,
            x: 100, y: 100,
            stops: [
              { offset: 0, color: 'blue' },
              { offset: 1, color: 'red' },
            ],
          },
        },
      ];

      renderer.render(commands);

      expect(mockCtx.createConicGradient).toHaveBeenCalledWith(Math.PI / 2, 100, 100);
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(0, 'blue');
      expect(mockGradient.addColorStop).toHaveBeenCalledWith(1, 'red');
      expect(mockCtx.strokeStyle).toBe(mockGradient);
    });
  });

  // ============================================================================
  // Pattern Commands
  // ============================================================================

  describe('pattern commands with setFillStyle', () => {
    let imageCache: ImageCache;
    let rendererWithCache: CanvasRenderer;
    let mockImage: HTMLImageElement;

    beforeEach(() => {
      imageCache = new ImageCache();
      mockImage = new Image();
      mockImage.width = 32;
      mockImage.height = 32;
      imageCache.set('tiles', mockImage);
      rendererWithCache = new CanvasRenderer(canvas, imageCache);
    });

    it('should create and set pattern as fillStyle with repeat', () => {
      const mockPattern = createMockPattern();
      (mockCtx.createPattern as ReturnType<typeof vi.fn>).mockReturnValue(mockPattern);

      const commands: DrawCommand[] = [
        {
          type: 'setFillStyle',
          style: {
            type: 'pattern',
            imageName: 'tiles',
            repetition: 'repeat',
          },
        },
      ];

      rendererWithCache.render(commands);

      expect(mockCtx.createPattern).toHaveBeenCalledWith(mockImage, 'repeat');
      expect(mockCtx.fillStyle).toBe(mockPattern);
    });

    it('should create and set pattern as fillStyle with repeat-x', () => {
      const mockPattern = createMockPattern();
      (mockCtx.createPattern as ReturnType<typeof vi.fn>).mockReturnValue(mockPattern);

      const commands: DrawCommand[] = [
        {
          type: 'setFillStyle',
          style: {
            type: 'pattern',
            imageName: 'tiles',
            repetition: 'repeat-x',
          },
        },
      ];

      rendererWithCache.render(commands);

      expect(mockCtx.createPattern).toHaveBeenCalledWith(mockImage, 'repeat-x');
      expect(mockCtx.fillStyle).toBe(mockPattern);
    });

    it('should create and set pattern as fillStyle with repeat-y', () => {
      const mockPattern = createMockPattern();
      (mockCtx.createPattern as ReturnType<typeof vi.fn>).mockReturnValue(mockPattern);

      const commands: DrawCommand[] = [
        {
          type: 'setFillStyle',
          style: {
            type: 'pattern',
            imageName: 'tiles',
            repetition: 'repeat-y',
          },
        },
      ];

      rendererWithCache.render(commands);

      expect(mockCtx.createPattern).toHaveBeenCalledWith(mockImage, 'repeat-y');
      expect(mockCtx.fillStyle).toBe(mockPattern);
    });

    it('should create and set pattern as fillStyle with no-repeat', () => {
      const mockPattern = createMockPattern();
      (mockCtx.createPattern as ReturnType<typeof vi.fn>).mockReturnValue(mockPattern);

      const commands: DrawCommand[] = [
        {
          type: 'setFillStyle',
          style: {
            type: 'pattern',
            imageName: 'tiles',
            repetition: 'no-repeat',
          },
        },
      ];

      rendererWithCache.render(commands);

      expect(mockCtx.createPattern).toHaveBeenCalledWith(mockImage, 'no-repeat');
      expect(mockCtx.fillStyle).toBe(mockPattern);
    });

    it('should silently skip if pattern image not in cache', () => {
      const commands: DrawCommand[] = [
        {
          type: 'setFillStyle',
          style: {
            type: 'pattern',
            imageName: 'nonexistent',
            repetition: 'repeat',
          },
        },
      ];

      // Should not throw, just skip
      expect(() => rendererWithCache.render(commands)).not.toThrow();
      expect(mockCtx.createPattern).not.toHaveBeenCalled();
    });

    it('should handle pattern without image cache (backward compatibility)', () => {
      const commands: DrawCommand[] = [
        {
          type: 'setFillStyle',
          style: {
            type: 'pattern',
            imageName: 'tiles',
            repetition: 'repeat',
          },
        },
      ];

      // Renderer without cache
      expect(() => renderer.render(commands)).not.toThrow();
      expect(mockCtx.createPattern).not.toHaveBeenCalled();
    });
  });

  describe('pattern commands with setStrokeStyle', () => {
    let imageCache: ImageCache;
    let rendererWithCache: CanvasRenderer;
    let mockImage: HTMLImageElement;

    beforeEach(() => {
      imageCache = new ImageCache();
      mockImage = new Image();
      mockImage.width = 32;
      mockImage.height = 32;
      imageCache.set('border', mockImage);
      rendererWithCache = new CanvasRenderer(canvas, imageCache);
    });

    it('should create and set pattern as strokeStyle', () => {
      const mockPattern = createMockPattern();
      (mockCtx.createPattern as ReturnType<typeof vi.fn>).mockReturnValue(mockPattern);

      const commands: DrawCommand[] = [
        {
          type: 'setStrokeStyle',
          style: {
            type: 'pattern',
            imageName: 'border',
            repetition: 'repeat',
          },
        },
      ];

      rendererWithCache.render(commands);

      expect(mockCtx.createPattern).toHaveBeenCalledWith(mockImage, 'repeat');
      expect(mockCtx.strokeStyle).toBe(mockPattern);
    });

    it('should silently skip stroke pattern if image not in cache', () => {
      const commands: DrawCommand[] = [
        {
          type: 'setStrokeStyle',
          style: {
            type: 'pattern',
            imageName: 'missing',
            repetition: 'repeat',
          },
        },
      ];

      expect(() => rendererWithCache.render(commands)).not.toThrow();
      expect(mockCtx.createPattern).not.toHaveBeenCalled();
    });
  });

  describe('setShadowColor command', () => {
    it('should set shadow color', () => {
      const commands: DrawCommand[] = [
        { type: 'setShadowColor', color: '#00000080' },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowColor).toBe('#00000080');
    });

    it('should set shadow color to rgba value', () => {
      const commands: DrawCommand[] = [
        { type: 'setShadowColor', color: 'rgba(255, 0, 0, 0.5)' },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowColor).toBe('rgba(255, 0, 0, 0.5)');
    });
  });

  describe('setShadowBlur command', () => {
    it('should set shadow blur', () => {
      const commands: DrawCommand[] = [
        { type: 'setShadowBlur', blur: 10 },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowBlur).toBe(10);
    });

    it('should set shadow blur to zero', () => {
      const commands: DrawCommand[] = [
        { type: 'setShadowBlur', blur: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowBlur).toBe(0);
    });
  });

  describe('setShadowOffsetX command', () => {
    it('should set shadow offset X', () => {
      const commands: DrawCommand[] = [
        { type: 'setShadowOffsetX', offset: 5 },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowOffsetX).toBe(5);
    });

    it('should set negative shadow offset X', () => {
      const commands: DrawCommand[] = [
        { type: 'setShadowOffsetX', offset: -3 },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowOffsetX).toBe(-3);
    });
  });

  describe('setShadowOffsetY command', () => {
    it('should set shadow offset Y', () => {
      const commands: DrawCommand[] = [
        { type: 'setShadowOffsetY', offset: 5 },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowOffsetY).toBe(5);
    });

    it('should set negative shadow offset Y', () => {
      const commands: DrawCommand[] = [
        { type: 'setShadowOffsetY', offset: -3 },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowOffsetY).toBe(-3);
    });
  });

  describe('setShadow command', () => {
    it('should set all shadow properties at once', () => {
      const commands: DrawCommand[] = [
        { type: 'setShadow', color: '#00000080', blur: 10, offsetX: 5, offsetY: 5 },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowColor).toBe('#00000080');
      expect(mockCtx.shadowBlur).toBe(10);
      expect(mockCtx.shadowOffsetX).toBe(5);
      expect(mockCtx.shadowOffsetY).toBe(5);
    });

    it('should set shadow with glow effect (zero offsets)', () => {
      const commands: DrawCommand[] = [
        { type: 'setShadow', color: '#FFD700', blur: 20, offsetX: 0, offsetY: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowColor).toBe('#FFD700');
      expect(mockCtx.shadowBlur).toBe(20);
      expect(mockCtx.shadowOffsetX).toBe(0);
      expect(mockCtx.shadowOffsetY).toBe(0);
    });
  });

  describe('clearShadow command', () => {
    it('should clear all shadow properties', () => {
      // First set shadow
      mockCtx.shadowColor = '#00000080';
      mockCtx.shadowBlur = 10;
      mockCtx.shadowOffsetX = 5;
      mockCtx.shadowOffsetY = 5;

      const commands: DrawCommand[] = [
        { type: 'clearShadow' },
      ];

      renderer.render(commands);

      expect(mockCtx.shadowColor).toBe('transparent');
      expect(mockCtx.shadowBlur).toBe(0);
      expect(mockCtx.shadowOffsetX).toBe(0);
      expect(mockCtx.shadowOffsetY).toBe(0);
    });
  });

  describe('setGlobalAlpha command', () => {
    it('should set globalAlpha to the specified value', () => {
      const commands: DrawCommand[] = [
        { type: 'setGlobalAlpha', alpha: 0.5 },
      ];

      renderer.render(commands);

      expect(mockCtx.globalAlpha).toBe(0.5);
    });

    it('should set globalAlpha to 0 for fully transparent', () => {
      const commands: DrawCommand[] = [
        { type: 'setGlobalAlpha', alpha: 0 },
      ];

      renderer.render(commands);

      expect(mockCtx.globalAlpha).toBe(0);
    });

    it('should set globalAlpha to 1 for fully opaque', () => {
      mockCtx.globalAlpha = 0.5; // Start with different value
      const commands: DrawCommand[] = [
        { type: 'setGlobalAlpha', alpha: 1 },
      ];

      renderer.render(commands);

      expect(mockCtx.globalAlpha).toBe(1);
    });
  });

  describe('setCompositeOperation command', () => {
    it('should set globalCompositeOperation to the specified mode', () => {
      const commands: DrawCommand[] = [
        { type: 'setCompositeOperation', operation: 'multiply' },
      ];

      renderer.render(commands);

      expect(mockCtx.globalCompositeOperation).toBe('multiply');
    });

    it('should support source-over (default) mode', () => {
      mockCtx.globalCompositeOperation = 'multiply';
      const commands: DrawCommand[] = [
        { type: 'setCompositeOperation', operation: 'source-over' },
      ];

      renderer.render(commands);

      expect(mockCtx.globalCompositeOperation).toBe('source-over');
    });

    it('should support lighter mode for additive blending', () => {
      const commands: DrawCommand[] = [
        { type: 'setCompositeOperation', operation: 'lighter' },
      ];

      renderer.render(commands);

      expect(mockCtx.globalCompositeOperation).toBe('lighter');
    });

    it('should support screen mode', () => {
      const commands: DrawCommand[] = [
        { type: 'setCompositeOperation', operation: 'screen' },
      ];

      renderer.render(commands);

      expect(mockCtx.globalCompositeOperation).toBe('screen');
    });
  });

  describe('setTextAlign command', () => {
    it('should set textAlign to left', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextAlign', align: 'left' },
      ];

      renderer.render(commands);

      expect(mockCtx.textAlign).toBe('left');
    });

    it('should set textAlign to center', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextAlign', align: 'center' },
      ];

      renderer.render(commands);

      expect(mockCtx.textAlign).toBe('center');
    });

    it('should set textAlign to right', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextAlign', align: 'right' },
      ];

      renderer.render(commands);

      expect(mockCtx.textAlign).toBe('right');
    });

    it('should set textAlign to start', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextAlign', align: 'start' },
      ];

      renderer.render(commands);

      expect(mockCtx.textAlign).toBe('start');
    });

    it('should set textAlign to end', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextAlign', align: 'end' },
      ];

      renderer.render(commands);

      expect(mockCtx.textAlign).toBe('end');
    });
  });

  describe('setTextBaseline command', () => {
    it('should set textBaseline to top', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextBaseline', baseline: 'top' },
      ];

      renderer.render(commands);

      expect(mockCtx.textBaseline).toBe('top');
    });

    it('should set textBaseline to middle', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextBaseline', baseline: 'middle' },
      ];

      renderer.render(commands);

      expect(mockCtx.textBaseline).toBe('middle');
    });

    it('should set textBaseline to alphabetic', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextBaseline', baseline: 'alphabetic' },
      ];

      renderer.render(commands);

      expect(mockCtx.textBaseline).toBe('alphabetic');
    });

    it('should set textBaseline to bottom', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextBaseline', baseline: 'bottom' },
      ];

      renderer.render(commands);

      expect(mockCtx.textBaseline).toBe('bottom');
    });

    it('should set textBaseline to hanging', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextBaseline', baseline: 'hanging' },
      ];

      renderer.render(commands);

      expect(mockCtx.textBaseline).toBe('hanging');
    });

    it('should set textBaseline to ideographic', () => {
      const commands: DrawCommand[] = [
        { type: 'setTextBaseline', baseline: 'ideographic' },
      ];

      renderer.render(commands);

      expect(mockCtx.textBaseline).toBe('ideographic');
    });
  });

  // ============================================================================
  // Hit Testing Methods
  // ============================================================================

  describe('isPointInPath', () => {
    let mockPath: Path2D;

    beforeEach(() => {
      mockPath = new Path2D();
      (mockCtx as unknown as { isPointInPath: ReturnType<typeof vi.fn> }).isPointInPath = vi.fn();
    });

    it('should call ctx.isPointInPath with path, coordinates, and default fill rule', () => {
      (mockCtx.isPointInPath as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = renderer.isPointInPath(mockPath, 50, 50);

      expect(mockCtx.isPointInPath).toHaveBeenCalledWith(mockPath, 50, 50, 'nonzero');
      expect(result).toBe(true);
    });

    it('should call ctx.isPointInPath with evenodd fill rule', () => {
      (mockCtx.isPointInPath as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const result = renderer.isPointInPath(mockPath, 100, 100, 'evenodd');

      expect(mockCtx.isPointInPath).toHaveBeenCalledWith(mockPath, 100, 100, 'evenodd');
      expect(result).toBe(false);
    });

    it('should return false when point is outside path', () => {
      (mockCtx.isPointInPath as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const result = renderer.isPointInPath(mockPath, 0, 0);

      expect(result).toBe(false);
    });

    it('should return true when point is inside path', () => {
      (mockCtx.isPointInPath as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = renderer.isPointInPath(mockPath, 75, 75);

      expect(result).toBe(true);
    });
  });

  describe('isPointInStroke', () => {
    let mockPath: Path2D;

    beforeEach(() => {
      mockPath = new Path2D();
      (mockCtx as unknown as { isPointInStroke: ReturnType<typeof vi.fn> }).isPointInStroke = vi.fn();
    });

    it('should call ctx.isPointInStroke with path and coordinates', () => {
      (mockCtx.isPointInStroke as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = renderer.isPointInStroke(mockPath, 50, 50);

      expect(mockCtx.isPointInStroke).toHaveBeenCalledWith(mockPath, 50, 50);
      expect(result).toBe(true);
    });

    it('should return false when point is not on stroke', () => {
      (mockCtx.isPointInStroke as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const result = renderer.isPointInStroke(mockPath, 0, 0);

      expect(result).toBe(false);
    });

    it('should return true when point is on stroke', () => {
      (mockCtx.isPointInStroke as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = renderer.isPointInStroke(mockPath, 100, 100);

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Pixel Manipulation Methods
  // ============================================================================

  describe('getImageData', () => {
    beforeEach(() => {
      // Mock getImageData to return a valid ImageData
      const mockImageData = new ImageData(10, 10);
      (mockCtx as unknown as { getImageData: ReturnType<typeof vi.fn> }).getImageData = vi.fn(() => mockImageData);
    });

    it('should call ctx.getImageData with correct parameters', () => {
      renderer.getImageData(0, 0, 100, 100);

      expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should return ImageData from ctx.getImageData', () => {
      const mockImageData = new ImageData(50, 50);
      (mockCtx.getImageData as ReturnType<typeof vi.fn>).mockReturnValue(mockImageData);

      const result = renderer.getImageData(10, 20, 50, 50);

      expect(result).toBe(mockImageData);
    });

    it('should handle non-zero origin coordinates', () => {
      renderer.getImageData(25, 35, 100, 80);

      expect(mockCtx.getImageData).toHaveBeenCalledWith(25, 35, 100, 80);
    });
  });

  describe('putImageData', () => {
    beforeEach(() => {
      (mockCtx as unknown as { putImageData: ReturnType<typeof vi.fn> }).putImageData = vi.fn();
    });

    it('should call ctx.putImageData with imageData and destination coordinates', () => {
      const imageData = new ImageData(100, 100);

      renderer.putImageData(imageData, 50, 75);

      expect(mockCtx.putImageData).toHaveBeenCalledWith(imageData, 50, 75);
    });

    it('should handle zero destination coordinates', () => {
      const imageData = new ImageData(50, 50);

      renderer.putImageData(imageData, 0, 0);

      expect(mockCtx.putImageData).toHaveBeenCalledWith(imageData, 0, 0);
    });

    it('should handle negative destination coordinates', () => {
      const imageData = new ImageData(30, 30);

      renderer.putImageData(imageData, -10, -20);

      expect(mockCtx.putImageData).toHaveBeenCalledWith(imageData, -10, -20);
    });
  });

  describe('createImageData', () => {
    beforeEach(() => {
      const mockImageData = new ImageData(10, 10);
      (mockCtx as unknown as { createImageData: ReturnType<typeof vi.fn> }).createImageData = vi.fn(() => mockImageData);
    });

    it('should call ctx.createImageData with width and height', () => {
      renderer.createImageData(200, 150);

      expect(mockCtx.createImageData).toHaveBeenCalledWith(200, 150);
    });

    it('should return ImageData from ctx.createImageData', () => {
      const mockImageData = new ImageData(100, 100);
      (mockCtx.createImageData as ReturnType<typeof vi.fn>).mockReturnValue(mockImageData);

      const result = renderer.createImageData(100, 100);

      expect(result).toBe(mockImageData);
    });

    it('should create ImageData with small dimensions', () => {
      const mockImageData = new ImageData(1, 1);
      (mockCtx.createImageData as ReturnType<typeof vi.fn>).mockReturnValue(mockImageData);

      const result = renderer.createImageData(1, 1);

      expect(mockCtx.createImageData).toHaveBeenCalledWith(1, 1);
      expect(result).toBe(mockImageData);
    });
  });

  // ============================================================================
  // putImageData Command Tests (Issue #603 - GC Pressure Optimization)
  // ============================================================================

  describe('putImageData command', () => {
    beforeEach(() => {
      (mockCtx as unknown as { putImageData: ReturnType<typeof vi.fn> }).putImageData = vi.fn();
    });

    it('should accept number[] data and create ImageData for ctx.putImageData', () => {
      // 2x2 red pixels
      const data = [255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255];
      const commands: DrawCommand[] = [
        { type: 'putImageData', data, width: 2, height: 2, dx: 10, dy: 20 },
      ];

      renderer.render(commands);

      expect(mockCtx.putImageData).toHaveBeenCalledTimes(1);
      const call = (mockCtx.putImageData as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBeInstanceOf(ImageData);
      expect(call[0].width).toBe(2);
      expect(call[0].height).toBe(2);
      expect(call[1]).toBe(10);
      expect(call[2]).toBe(20);
    });

    it('should accept Uint8ClampedArray data and create ImageData for ctx.putImageData', () => {
      // 2x2 green pixels
      const data = new Uint8ClampedArray([0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255]);
      const commands: DrawCommand[] = [
        { type: 'putImageData', data, width: 2, height: 2, dx: 30, dy: 40 },
      ];

      renderer.render(commands);

      expect(mockCtx.putImageData).toHaveBeenCalledTimes(1);
      const call = (mockCtx.putImageData as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBeInstanceOf(ImageData);
      expect(call[0].width).toBe(2);
      expect(call[0].height).toBe(2);
      expect(call[1]).toBe(30);
      expect(call[2]).toBe(40);
    });

    it('should preserve pixel values when using Uint8ClampedArray', () => {
      // Specific pixel pattern to verify data integrity
      const data = new Uint8ClampedArray([100, 150, 200, 255, 50, 60, 70, 80]);
      const commands: DrawCommand[] = [
        { type: 'putImageData', data, width: 2, height: 1, dx: 0, dy: 0 },
      ];

      renderer.render(commands);

      const call = (mockCtx.putImageData as ReturnType<typeof vi.fn>).mock.calls[0];
      const imageData = call[0] as ImageData;
      // Verify pixel values are preserved
      expect(imageData.data[0]).toBe(100);
      expect(imageData.data[1]).toBe(150);
      expect(imageData.data[2]).toBe(200);
      expect(imageData.data[3]).toBe(255);
      expect(imageData.data[4]).toBe(50);
      expect(imageData.data[5]).toBe(60);
      expect(imageData.data[6]).toBe(70);
      expect(imageData.data[7]).toBe(80);
    });

    it('should handle dirty rect parameters with number[] data', () => {
      const data = [255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255];
      const commands: DrawCommand[] = [
        { type: 'putImageData', data, width: 2, height: 2, dx: 10, dy: 20, dirtyX: 0, dirtyY: 0, dirtyWidth: 1, dirtyHeight: 1 },
      ];

      renderer.render(commands);

      expect(mockCtx.putImageData).toHaveBeenCalledTimes(1);
      const call = (mockCtx.putImageData as ReturnType<typeof vi.fn>).mock.calls[0];
      // With dirty rect, putImageData is called with 7 arguments
      expect(call.length).toBe(7);
      expect(call[3]).toBe(0); // dirtyX
      expect(call[4]).toBe(0); // dirtyY
      expect(call[5]).toBe(1); // dirtyWidth
      expect(call[6]).toBe(1); // dirtyHeight
    });

    it('should handle dirty rect parameters with Uint8ClampedArray data', () => {
      const data = new Uint8ClampedArray([0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255]);
      const commands: DrawCommand[] = [
        { type: 'putImageData', data, width: 2, height: 2, dx: 5, dy: 10, dirtyX: 1, dirtyY: 1, dirtyWidth: 1, dirtyHeight: 1 },
      ];

      renderer.render(commands);

      expect(mockCtx.putImageData).toHaveBeenCalledTimes(1);
      const call = (mockCtx.putImageData as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call.length).toBe(7);
      expect(call[3]).toBe(1); // dirtyX
      expect(call[4]).toBe(1); // dirtyY
      expect(call[5]).toBe(1); // dirtyWidth
      expect(call[6]).toBe(1); // dirtyHeight
    });
  });
});
