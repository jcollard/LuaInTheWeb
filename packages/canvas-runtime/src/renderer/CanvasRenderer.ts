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

  constructor(canvas: HTMLCanvasElement, imageCache?: ImageCache) {
    this.canvas = canvas;
    this.imageCache = imageCache;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D rendering context');
    }
    this.ctx = ctx;
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
        this.ctx.fillText(command.text, command.x, command.y);
        break;

      case 'drawImage':
        this.drawImage(command.name, command.x, command.y, command.width, command.height);
        break;

      default:
        // Ignore unknown commands for forward compatibility
        break;
    }
  }

  private setColor(r: number, g: number, b: number, a?: number): void {
    let color: string;
    if (a !== undefined && a !== 1) {
      color = `rgba(${r}, ${g}, ${b}, ${a})`;
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
