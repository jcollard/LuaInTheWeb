import type { DrawCommand } from '../shared/types.js';
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
    const ctx = canvas.getContext('2d');
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
        this.drawText(command.x, command.y, command.text, command.fontSize, command.fontFamily);
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

      default:
        // Ignore unknown commands for forward compatibility
        break;
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
    fontFamily?: string
  ): void {
    // Set textBaseline to top for top-left positioning
    this.ctx.textBaseline = 'top';

    // Apply font overrides if provided
    if (fontSize !== undefined || fontFamily !== undefined) {
      const savedFont = this.ctx.font;
      const tempSize = fontSize ?? this.currentFontSize;
      const tempFamily = fontFamily ?? this.currentFontFamily;
      this.ctx.font = `${tempSize}px ${tempFamily}`;
      this.ctx.fillText(text, x, y);
      this.ctx.font = savedFont;
    } else {
      this.ctx.fillText(text, x, y);
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
}
