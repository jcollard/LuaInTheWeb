import type { DrawCommand, GradientDef, PatternDef, FillStyle, FillRule } from '../shared/types.js';
import type { ImageCache } from './ImageCache.js';

/**
 * Renders draw commands to a canvas element.
 *
 * The CanvasRenderer executes draw commands received from the worker
 * on a Canvas 2D context. It supports all standard drawing operations
 * defined in the DrawCommand type.
 */
export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly imageCache?: ImageCache;

  // Font state
  private currentFontSize: number = 16;
  private currentFontFamily: string = 'monospace';

  constructor(canvas: HTMLCanvasElement, imageCache?: ImageCache) {
    this.canvas = canvas;
    this.imageCache = imageCache;
    // Use willReadFrequently for better getImageData performance
    // This keeps canvas data in CPU memory instead of GPU, optimizing for pixel manipulation
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not get 2D rendering context');
    }
    this.ctx = ctx;

    // Set default font and text baseline
    this.updateFont();
    this.ctx.textBaseline = 'top';
  }

  /**
   * Update the canvas context font from current state.
   */
  private updateFont(): void {
    this.ctx.font = `${this.currentFontSize}px ${this.currentFontFamily}`;
  }

  /**
   * Render a batch of draw commands to the canvas.
   *
   * @param commands - Array of draw commands to execute
   */
  render(commands: DrawCommand[]): void {
    for (const command of commands) {
      this.executeCommand(command);
    }
  }

  private executeCommand(command: DrawCommand): void {
    switch (command.type) {
      case 'clear':
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        break;

      case 'setColor':
        this.setColor(command.r, command.g, command.b, command.a);
        break;

      case 'setLineWidth':
        this.ctx.lineWidth = command.width;
        break;

      case 'setFontSize':
        this.currentFontSize = command.size;
        this.updateFont();
        break;

      case 'setFontFamily':
        this.currentFontFamily = command.family;
        this.updateFont();
        break;

      case 'setSize':
        this.canvas.width = command.width;
        this.canvas.height = command.height;
        break;

      case 'rect':
        this.ctx.strokeRect(command.x, command.y, command.width, command.height);
        break;

      case 'fillRect':
        this.ctx.fillRect(command.x, command.y, command.width, command.height);
        break;

      case 'circle':
        this.drawCircle(command.x, command.y, command.radius, false);
        break;

      case 'fillCircle':
        this.drawCircle(command.x, command.y, command.radius, true);
        break;

      case 'line':
        this.drawLine(command.x1, command.y1, command.x2, command.y2);
        break;

      case 'text':
        this.drawText(command.x, command.y, command.text, command.fontSize, command.fontFamily, command.maxWidth);
        break;

      case 'strokeText':
        this.strokeText(command.x, command.y, command.text, command.fontSize, command.fontFamily, command.maxWidth);
        break;

      case 'drawImage':
        this.drawImage(command.name, command.x, command.y, command.width, command.height);
        break;

      case 'translate':
        this.ctx.translate(command.dx, command.dy);
        break;

      case 'rotate':
        this.ctx.rotate(command.angle);
        break;

      case 'scale':
        this.ctx.scale(command.sx, command.sy);
        break;

      case 'save':
        this.ctx.save();
        break;

      case 'restore':
        this.ctx.restore();
        break;

      case 'transform':
        this.ctx.transform(command.a, command.b, command.c, command.d, command.e, command.f);
        break;

      case 'setTransform':
        this.ctx.setTransform(command.a, command.b, command.c, command.d, command.e, command.f);
        break;

      case 'resetTransform':
        this.ctx.resetTransform();
        break;

      // Path API commands
      case 'beginPath':
        this.ctx.beginPath();
        break;

      case 'closePath':
        this.ctx.closePath();
        break;

      case 'moveTo':
        this.ctx.moveTo(command.x, command.y);
        break;

      case 'lineTo':
        this.ctx.lineTo(command.x, command.y);
        break;

      case 'fill':
        this.ctx.fill();
        break;

      case 'stroke':
        this.ctx.stroke();
        break;

      case 'arc':
        this.ctx.arc(command.x, command.y, command.radius, command.startAngle, command.endAngle, command.counterclockwise);
        break;

      case 'arcTo':
        this.ctx.arcTo(command.x1, command.y1, command.x2, command.y2, command.radius);
        break;

      case 'quadraticCurveTo':
        this.ctx.quadraticCurveTo(command.cpx, command.cpy, command.x, command.y);
        break;

      case 'bezierCurveTo':
        this.ctx.bezierCurveTo(command.cp1x, command.cp1y, command.cp2x, command.cp2y, command.x, command.y);
        break;

      case 'ellipse':
        this.ctx.ellipse(
          command.x, command.y,
          command.radiusX, command.radiusY,
          command.rotation, command.startAngle, command.endAngle,
          command.counterclockwise
        );
        break;

      case 'roundRect':
        this.ctx.roundRect(command.x, command.y, command.width, command.height, command.radii);
        break;

      case 'clip':
        if (command.fillRule) {
          this.ctx.clip(command.fillRule);
        } else {
          this.ctx.clip();
        }
        break;

      case 'setLineCap':
        this.ctx.lineCap = command.cap;
        break;

      case 'setLineJoin':
        this.ctx.lineJoin = command.join;
        break;

      case 'setMiterLimit':
        this.ctx.miterLimit = command.limit;
        break;

      case 'setLineDash':
        this.ctx.setLineDash(command.segments);
        break;

      case 'setLineDashOffset':
        this.ctx.lineDashOffset = command.offset;
        break;

      case 'setFillStyle':
        this.applyStyle(command.style, 'fill');
        break;

      case 'setStrokeStyle':
        this.applyStyle(command.style, 'stroke');
        break;

      case 'setShadowColor':
        this.ctx.shadowColor = command.color;
        break;

      case 'setShadowBlur':
        this.ctx.shadowBlur = command.blur;
        break;

      case 'setShadowOffsetX':
        this.ctx.shadowOffsetX = command.offset;
        break;

      case 'setShadowOffsetY':
        this.ctx.shadowOffsetY = command.offset;
        break;

      case 'setShadow':
        this.ctx.shadowColor = command.color;
        this.ctx.shadowBlur = command.blur;
        this.ctx.shadowOffsetX = command.offsetX;
        this.ctx.shadowOffsetY = command.offsetY;
        break;

      case 'clearShadow':
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        break;

      case 'setGlobalAlpha':
        this.ctx.globalAlpha = command.alpha;
        break;

      case 'setCompositeOperation':
        this.ctx.globalCompositeOperation = command.operation;
        break;

      case 'setTextAlign':
        this.ctx.textAlign = command.align;
        break;

      case 'setTextBaseline':
        this.ctx.textBaseline = command.baseline;
        break;

      case 'setDirection':
        this.ctx.direction = command.direction;
        break;

      case 'setFilter':
        this.ctx.filter = command.filter;
        break;

      case 'putImageData':
        this.putImageDataFromArray(
          command.data,
          command.width,
          command.height,
          command.dx,
          command.dy,
          command.dirtyX,
          command.dirtyY,
          command.dirtyWidth,
          command.dirtyHeight
        );
        break;

      default:
        // Ignore unknown commands for forward compatibility
        break;
    }
  }

  /**
   * Write pixel data to the canvas from a raw RGBA array.
   * Used by the putImageData DrawCommand.
   * Supports optional dirty rect parameters to draw only a sub-region.
   */
  private putImageDataFromArray(
    data: number[],
    width: number,
    height: number,
    dx: number,
    dy: number,
    dirtyX?: number,
    dirtyY?: number,
    dirtyWidth?: number,
    dirtyHeight?: number
  ): void {
    const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
    // Use dirty rect if any dirty parameter is provided
    if (dirtyX !== undefined || dirtyY !== undefined || dirtyWidth !== undefined || dirtyHeight !== undefined) {
      this.ctx.putImageData(
        imageData,
        dx,
        dy,
        dirtyX ?? 0,
        dirtyY ?? 0,
        dirtyWidth ?? width,
        dirtyHeight ?? height
      );
    } else {
      this.ctx.putImageData(imageData, dx, dy);
    }
  }

  private setColor(r: number, g: number, b: number, a?: number): void {
    let color: string;
    if (a !== undefined && a !== 255) {
      // Convert alpha from 0-255 range to 0-1 range for CSS rgba()
      const normalizedAlpha = a / 255;
      color = `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
    } else {
      color = `#${this.toHex(r)}${this.toHex(g)}${this.toHex(b)}`;
    }
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
  }

  private toHex(value: number): string {
    const hex = Math.max(0, Math.min(255, Math.round(value))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }

  private drawCircle(x: number, y: number, radius: number, fill: boolean): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  private drawText(
    x: number,
    y: number,
    text: string,
    fontSize?: number,
    fontFamily?: string,
    maxWidth?: number
  ): void {
    // Note: textBaseline is set via setTextBaseline command (default 'top' in constructor)
    // Apply font overrides if provided
    if (fontSize !== undefined || fontFamily !== undefined) {
      const savedFont = this.ctx.font;
      const tempSize = fontSize ?? this.currentFontSize;
      const tempFamily = fontFamily ?? this.currentFontFamily;
      this.ctx.font = `${tempSize}px ${tempFamily}`;
      this.ctx.fillText(text, x, y, maxWidth);
      this.ctx.font = savedFont;
    } else {
      this.ctx.fillText(text, x, y, maxWidth);
    }
  }

  private strokeText(
    x: number,
    y: number,
    text: string,
    fontSize?: number,
    fontFamily?: string,
    maxWidth?: number
  ): void {
    // Apply font overrides if provided
    if (fontSize !== undefined || fontFamily !== undefined) {
      const savedFont = this.ctx.font;
      const tempSize = fontSize ?? this.currentFontSize;
      const tempFamily = fontFamily ?? this.currentFontFamily;
      this.ctx.font = `${tempSize}px ${tempFamily}`;
      this.ctx.strokeText(text, x, y, maxWidth);
      this.ctx.font = savedFont;
    } else {
      this.ctx.strokeText(text, x, y, maxWidth);
    }
  }

  private drawImage(name: string, x: number, y: number, width?: number, height?: number): void {
    if (!this.imageCache) {
      return;
    }

    const image = this.imageCache.get(name);
    if (!image) {
      return;
    }

    if (width !== undefined && height !== undefined) {
      this.ctx.drawImage(image, x, y, width, height);
    } else {
      this.ctx.drawImage(image, x, y);
    }
  }

  /**
   * Create a CanvasGradient from a gradient definition.
   */
  private createGradient(def: GradientDef): CanvasGradient {
    let gradient: CanvasGradient;
    if (def.type === 'linear') {
      gradient = this.ctx.createLinearGradient(def.x0, def.y0, def.x1, def.y1);
    } else if (def.type === 'radial') {
      gradient = this.ctx.createRadialGradient(def.x0, def.y0, def.r0, def.x1, def.y1, def.r1);
    } else {
      // conic gradient
      gradient = this.ctx.createConicGradient(def.startAngle, def.x, def.y);
    }
    for (const stop of def.stops) {
      gradient.addColorStop(stop.offset, stop.color);
    }
    return gradient;
  }

  /**
   * Create a CanvasPattern from a pattern definition.
   */
  private createPattern(def: PatternDef): CanvasPattern | null {
    const image = this.imageCache?.get(def.imageName);
    if (!image) {
      return null;
    }
    return this.ctx.createPattern(image, def.repetition);
  }

  /**
   * Apply a fill or stroke style to the context.
   */
  private applyStyle(style: FillStyle, target: 'fill' | 'stroke'): void {
    let canvasStyle: string | CanvasGradient | CanvasPattern;

    if (typeof style === 'string') {
      canvasStyle = style;
    } else if (style.type === 'pattern') {
      const pattern = this.createPattern(style);
      if (!pattern) {
        return; // Image not found - fail silently
      }
      canvasStyle = pattern;
    } else {
      canvasStyle = this.createGradient(style);
    }

    if (target === 'fill') {
      this.ctx.fillStyle = canvasStyle;
    } else {
      this.ctx.strokeStyle = canvasStyle;
    }
  }

  // ============================================================================
  // Hit Testing Methods
  // ============================================================================

  /**
   * Check if a point is inside a path.
   * @param path - The Path2D object to test against
   * @param x - X coordinate of the point
   * @param y - Y coordinate of the point
   * @param fillRule - Fill rule: 'nonzero' (default) or 'evenodd'
   * @returns true if the point is inside the path
   */
  isPointInPath(path: Path2D, x: number, y: number, fillRule: FillRule = 'nonzero'): boolean {
    return this.ctx.isPointInPath(path, x, y, fillRule);
  }

  /**
   * Check if a point is on the stroke of a path.
   * @param path - The Path2D object to test against
   * @param x - X coordinate of the point
   * @param y - Y coordinate of the point
   * @returns true if the point is on the path's stroke
   */
  isPointInStroke(path: Path2D, x: number, y: number): boolean {
    return this.ctx.isPointInStroke(path, x, y);
  }

  // ============================================================================
  // Pixel Manipulation Methods
  // ============================================================================

  /**
   * Get pixel data from a region of the canvas.
   * @param x - X coordinate of the top-left corner
   * @param y - Y coordinate of the top-left corner
   * @param width - Width of the region to read
   * @param height - Height of the region to read
   * @returns ImageData containing pixel data
   */
  getImageData(x: number, y: number, width: number, height: number): ImageData {
    return this.ctx.getImageData(x, y, width, height);
  }

  /**
   * Write pixel data to the canvas.
   * @param imageData - ImageData containing pixel values
   * @param dx - Destination X coordinate
   * @param dy - Destination Y coordinate
   */
  putImageData(imageData: ImageData, dx: number, dy: number): void {
    this.ctx.putImageData(imageData, dx, dy);
  }

  /**
   * Create a new empty ImageData object.
   * @param width - Width in pixels
   * @param height - Height in pixels
   * @returns ImageData filled with transparent black pixels
   */
  createImageData(width: number, height: number): ImageData {
    return this.ctx.createImageData(width, height);
  }

  /**
   * Capture the canvas contents as a data URL.
   * @param type - MIME type (e.g., 'image/png', 'image/jpeg', 'image/webp')
   * @param quality - Quality for lossy formats (0-1), only used for jpeg/webp
   * @returns Data URL string (base64 encoded)
   */
  capture(type?: string, quality?: number): string {
    return this.canvas.toDataURL(type, quality);
  }
}
