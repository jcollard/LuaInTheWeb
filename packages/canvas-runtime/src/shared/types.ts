/**
 * Types of draw commands that can be sent from worker to main thread.
 */
export type DrawCommandType =
  | 'clear'
  | 'setColor'
  | 'rect'
  | 'fillRect'
  | 'circle'
  | 'fillCircle'
  | 'line'
  | 'text';

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
 * Union type of all draw commands.
 */
export type DrawCommand =
  | ClearCommand
  | SetColorCommand
  | RectCommand
  | FillRectCommand
  | CircleCommand
  | FillCircleCommand
  | LineCommand
  | TextCommand;

/**
 * Mouse button identifiers.
 */
export type MouseButton = 'left' | 'middle' | 'right';

/**
 * State of keyboard and mouse input.
 */
export interface InputState {
  /** Keys currently held down (key codes) */
  keysDown: Set<string>;
  /** Keys pressed this frame (for isKeyPressed) */
  keysPressed: Set<string>;
  /** Mouse X position relative to canvas */
  mouseX: number;
  /** Mouse Y position relative to canvas */
  mouseY: number;
  /** Mouse buttons currently held down */
  mouseButtons: Set<MouseButton>;
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
    keysDown: new Set(),
    keysPressed: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseButtons: new Set(),
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
