/**
 * Types of draw commands that can be sent from worker to main thread.
 */
export type DrawCommandType =
  | 'clear'
  | 'setColor'
  | 'setLineWidth'
  | 'setSize'
  | 'rect'
  | 'fillRect'
  | 'circle'
  | 'fillCircle'
  | 'line'
  | 'text'
  | 'drawImage';

/**
 * Base interface for all draw commands.
 */
interface DrawCommandBase {
  type: DrawCommandType;
}

/**
 * Clear the canvas.
 */
export interface ClearCommand extends DrawCommandBase {
  type: 'clear';
}

/**
 * Set the current drawing color.
 */
export interface SetColorCommand extends DrawCommandBase {
  type: 'setColor';
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * Set the line width for stroke operations.
 */
export interface SetLineWidthCommand extends DrawCommandBase {
  type: 'setLineWidth';
  width: number;
}

/**
 * Set the canvas size.
 */
export interface SetSizeCommand extends DrawCommandBase {
  type: 'setSize';
  width: number;
  height: number;
}

/**
 * Draw a rectangle outline.
 */
export interface RectCommand extends DrawCommandBase {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Draw a filled rectangle.
 */
export interface FillRectCommand extends DrawCommandBase {
  type: 'fillRect';
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Draw a circle outline.
 */
export interface CircleCommand extends DrawCommandBase {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}

/**
 * Draw a filled circle.
 */
export interface FillCircleCommand extends DrawCommandBase {
  type: 'fillCircle';
  x: number;
  y: number;
  radius: number;
}

/**
 * Draw a line.
 */
export interface LineCommand extends DrawCommandBase {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Draw text.
 */
export interface TextCommand extends DrawCommandBase {
  type: 'text';
  x: number;
  y: number;
  text: string;
}

/**
 * Draw an image from the asset cache.
 */
export interface DrawImageCommand extends DrawCommandBase {
  type: 'drawImage';
  /** Name of the asset to draw */
  name: string;
  /** X position to draw at */
  x: number;
  /** Y position to draw at */
  y: number;
  /** Optional width to scale image to */
  width?: number;
  /** Optional height to scale image to */
  height?: number;
}

/**
 * Union type of all draw commands.
 */
export type DrawCommand =
  | ClearCommand
  | SetColorCommand
  | SetLineWidthCommand
  | SetSizeCommand
  | RectCommand
  | FillRectCommand
  | CircleCommand
  | FillCircleCommand
  | LineCommand
  | TextCommand
  | DrawImageCommand;

/**
 * Mouse button identifiers.
 */
export type MouseButton = 'left' | 'middle' | 'right';

/**
 * State of keyboard and mouse input.
 * Uses arrays instead of Sets for channel serialization.
 */
export interface InputState {
  /** Keys currently held down (key codes) */
  keysDown: string[];
  /** Keys pressed this frame (for isKeyPressed) */
  keysPressed: string[];
  /** Mouse X position relative to canvas */
  mouseX: number;
  /** Mouse Y position relative to canvas */
  mouseY: number;
  /** Mouse buttons currently held down (0=left, 1=middle, 2=right) */
  mouseButtonsDown: number[];
  /** Mouse buttons pressed this frame */
  mouseButtonsPressed: number[];
}

/**
 * Timing information for the current frame.
 */
export interface TimingInfo {
  /** Time since last frame in seconds */
  deltaTime: number;
  /** Total elapsed time in seconds */
  totalTime: number;
  /** Current frame number */
  frameNumber: number;
}

/**
 * Create a default empty input state.
 */
export function createEmptyInputState(): InputState {
  return {
    keysDown: [],
    keysPressed: [],
    mouseX: 0,
    mouseY: 0,
    mouseButtonsDown: [],
    mouseButtonsPressed: [],
  };
}

/**
 * Create default timing info.
 */
export function createDefaultTimingInfo(): TimingInfo {
  return {
    deltaTime: 0,
    totalTime: 0,
    frameNumber: 0,
  };
}

/**
 * Valid image file extensions for canvas assets.
 * Used for validation in both worker and shell canvas implementations.
 */
export const VALID_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'] as const;

/**
 * Definition of an asset to be loaded.
 */
export interface AssetDefinition {
  /** Unique name to reference this asset */
  name: string;
  /** Path to the asset file (relative or absolute) */
  path: string;
  /** Type of asset */
  type: 'image';
}

/**
 * Map of asset names to their definitions.
 */
export type AssetManifest = Map<string, AssetDefinition>;
