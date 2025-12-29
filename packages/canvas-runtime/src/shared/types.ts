/**
 * Types of draw commands that can be sent from worker to main thread.
 */
export type DrawCommandType =
  | 'clear'
  | 'clearRect'
  | 'setColor'
  | 'setLineWidth'
  | 'setFontSize'
  | 'setFontFamily'
  | 'setSize'
  | 'rect'
  | 'fillRect'
  | 'circle'
  | 'fillCircle'
  | 'line'
  | 'text'
  | 'strokeText'
  | 'drawImage'
  | 'translate'
  | 'rotate'
  | 'scale'
  | 'save'
  | 'restore'
  | 'transform'
  | 'setTransform'
  | 'resetTransform'
  | 'beginPath'
  | 'closePath'
  | 'moveTo'
  | 'lineTo'
  | 'fill'
  | 'stroke'
  | 'arc'
  | 'arcTo'
  | 'quadraticCurveTo'
  | 'bezierCurveTo'
  | 'ellipse'
  | 'roundRect'
  | 'rectPath'
  | 'clip'
  | 'setLineCap'
  | 'setLineJoin'
  | 'setMiterLimit'
  | 'setLineDash'
  | 'setLineDashOffset'
  | 'setFillStyle'
  | 'setStrokeStyle'
  | 'setShadowColor'
  | 'setShadowBlur'
  | 'setShadowOffsetX'
  | 'setShadowOffsetY'
  | 'setShadow'
  | 'clearShadow'
  | 'setGlobalAlpha'
  | 'setCompositeOperation'
  | 'setTextAlign'
  | 'setTextBaseline'
  | 'setImageSmoothing'
  | 'setDirection'
  | 'setFilter'
  | 'putImageData'
  | 'fillPath'
  | 'strokePath'
  | 'clipPath'
  // Audio commands
  | 'playSound'
  | 'playMusic'
  | 'stopMusic'
  | 'pauseMusic'
  | 'resumeMusic'
  | 'setMusicVolume'
  | 'setMasterVolume'
  | 'mute'
  | 'unmute';

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
 * Clear a rectangular area of the canvas to transparent.
 */
export interface ClearRectCommand extends DrawCommandBase {
  type: 'clearRect';
  x: number;
  y: number;
  width: number;
  height: number;
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
 * Set the font size for text rendering.
 */
export interface SetFontSizeCommand extends DrawCommandBase {
  type: 'setFontSize';
  /** Font size in pixels */
  size: number;
}

/**
 * Set the font family for text rendering.
 */
export interface SetFontFamilyCommand extends DrawCommandBase {
  type: 'setFontFamily';
  /** CSS font family name (e.g., "monospace", "Arial", "MyCustomFont") */
  family: string;
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
  /** Optional font size override for this text only */
  fontSize?: number;
  /** Optional font family override for this text only */
  fontFamily?: string;
  /** Optional maximum width - text will be scaled to fit if needed */
  maxWidth?: number;
}

/**
 * Stroke text (draw text outline without filling).
 */
export interface StrokeTextCommand extends DrawCommandBase {
  type: 'strokeText';
  x: number;
  y: number;
  text: string;
  /** Optional font size override for this text only */
  fontSize?: number;
  /** Optional font family override for this text only */
  fontFamily?: string;
  /** Optional maximum width - text will be scaled to fit if needed */
  maxWidth?: number;
}


/**
 * Draw an image from the asset cache.
 * Supports both simple form (5 args) and source cropping (9 args).
 */
export interface DrawImageCommand extends DrawCommandBase {
  type: 'drawImage';
  /** Name of the asset to draw */
  name: string;
  /** X position to draw at (destination) */
  x: number;
  /** Y position to draw at (destination) */
  y: number;
  /** Optional width to scale image to (destination) */
  width?: number;
  /** Optional height to scale image to (destination) */
  height?: number;
  /** Source X - top-left corner of source rectangle (for cropping) */
  sx?: number;
  /** Source Y - top-left corner of source rectangle (for cropping) */
  sy?: number;
  /** Source width - width of source rectangle (for cropping) */
  sw?: number;
  /** Source height - height of source rectangle (for cropping) */
  sh?: number;
}

/**
 * Translate (move) the canvas origin.
 */
export interface TranslateCommand extends DrawCommandBase {
  type: 'translate';
  /** Horizontal distance to move */
  dx: number;
  /** Vertical distance to move */
  dy: number;
}

/**
 * Rotate the canvas around the current origin.
 */
export interface RotateCommand extends DrawCommandBase {
  type: 'rotate';
  /** Rotation angle in radians */
  angle: number;
}

/**
 * Scale the canvas from the current origin.
 */
export interface ScaleCommand extends DrawCommandBase {
  type: 'scale';
  /** Horizontal scale factor */
  sx: number;
  /** Vertical scale factor */
  sy: number;
}

/**
 * Save the current transformation state to the stack.
 */
export interface SaveCommand extends DrawCommandBase {
  type: 'save';
}

/**
 * Restore the most recently saved transformation state from the stack.
 */
export interface RestoreCommand extends DrawCommandBase {
  type: 'restore';
}

/**
 * Multiply the current transformation matrix by the specified matrix.
 * Matrix format: [a, b, c, d, e, f] representing:
 * | a c e |
 * | b d f |
 * | 0 0 1 |
 */
export interface TransformCommand extends DrawCommandBase {
  type: 'transform';
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * Reset to identity matrix, then apply the specified transformation matrix.
 */
export interface SetTransformCommand extends DrawCommandBase {
  type: 'setTransform';
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * Reset the transformation matrix to identity.
 */
export interface ResetTransformCommand extends DrawCommandBase {
  type: 'resetTransform';
}

// ============================================================================
// Path API Commands
// ============================================================================

/**
 * Begin a new path, clearing any existing path data.
 */
export interface BeginPathCommand extends DrawCommandBase {
  type: 'beginPath';
}

/**
 * Close the current path by drawing a line to the starting point.
 */
export interface ClosePathCommand extends DrawCommandBase {
  type: 'closePath';
}

/**
 * Move the current point to a new position without drawing.
 */
export interface MoveToCommand extends DrawCommandBase {
  type: 'moveTo';
  /** X coordinate to move to */
  x: number;
  /** Y coordinate to move to */
  y: number;
}

/**
 * Draw a line from the current point to a new position.
 */
export interface LineToCommand extends DrawCommandBase {
  type: 'lineTo';
  /** X coordinate to draw line to */
  x: number;
  /** Y coordinate to draw line to */
  y: number;
}

/**
 * Fill the current path with the current fill style.
 */
export interface FillCommand extends DrawCommandBase {
  type: 'fill';
}

/**
 * Stroke the current path with the current stroke style.
 */
export interface StrokeCommand extends DrawCommandBase {
  type: 'stroke';
}

/**
 * Draw an arc (portion of a circle) on the current path.
 */
export interface ArcCommand extends DrawCommandBase {
  type: 'arc';
  /** X coordinate of the arc's center */
  x: number;
  /** Y coordinate of the arc's center */
  y: number;
  /** Arc radius */
  radius: number;
  /** Start angle in radians */
  startAngle: number;
  /** End angle in radians */
  endAngle: number;
  /** Draw counterclockwise (default: false) */
  counterclockwise?: boolean;
}

/**
 * Draw an arc using tangent control points (for rounded corners).
 */
export interface ArcToCommand extends DrawCommandBase {
  type: 'arcTo';
  /** X coordinate of first control point */
  x1: number;
  /** Y coordinate of first control point */
  y1: number;
  /** X coordinate of second control point */
  x2: number;
  /** Y coordinate of second control point */
  y2: number;
  /** Arc radius */
  radius: number;
}

/**
 * Draw a quadratic Bézier curve from the current point to (x, y),
 * using (cpx, cpy) as the control point.
 */
export interface QuadraticCurveToCommand extends DrawCommandBase {
  type: 'quadraticCurveTo';
  /** X coordinate of the control point */
  cpx: number;
  /** Y coordinate of the control point */
  cpy: number;
  /** X coordinate of the end point */
  x: number;
  /** Y coordinate of the end point */
  y: number;
}

/**
 * Draw a cubic Bézier curve from the current point to (x, y),
 * using (cp1x, cp1y) as the first control point and (cp2x, cp2y) as the second.
 */
export interface BezierCurveToCommand extends DrawCommandBase {
  type: 'bezierCurveTo';
  /** X coordinate of the first control point */
  cp1x: number;
  /** Y coordinate of the first control point */
  cp1y: number;
  /** X coordinate of the second control point */
  cp2x: number;
  /** Y coordinate of the second control point */
  cp2y: number;
  /** X coordinate of the end point */
  x: number;
  /** Y coordinate of the end point */
  y: number;
}

/**
 * Draw an ellipse on the current path.
 */
export interface EllipseCommand extends DrawCommandBase {
  type: 'ellipse';
  /** X coordinate of the ellipse's center */
  x: number;
  /** Y coordinate of the ellipse's center */
  y: number;
  /** Horizontal radius of the ellipse */
  radiusX: number;
  /** Vertical radius of the ellipse */
  radiusY: number;
  /** Rotation of the ellipse in radians */
  rotation: number;
  /** Start angle in radians */
  startAngle: number;
  /** End angle in radians */
  endAngle: number;
  /** Draw counterclockwise (default: false) */
  counterclockwise?: boolean;
}

/**
 * Draw a rounded rectangle on the current path.
 */
export interface RoundRectCommand extends DrawCommandBase {
  type: 'roundRect';
  /** X coordinate of the rectangle's starting point */
  x: number;
  /** Y coordinate of the rectangle's starting point */
  y: number;
  /** Width of the rectangle */
  width: number;
  /** Height of the rectangle */
  height: number;
  /** Corner radii - single value or array of 1-4 values */
  radii: number | number[];
}

/**
 * Add a rectangle to the current path (does not draw, only adds to path).
 * Use fill() or stroke() after to actually draw the rectangle.
 */
export interface RectPathCommand extends DrawCommandBase {
  type: 'rectPath';
  /** X coordinate of the rectangle's starting point */
  x: number;
  /** Y coordinate of the rectangle's starting point */
  y: number;
  /** Width of the rectangle */
  width: number;
  /** Height of the rectangle */
  height: number;
}

/**
 * Clip all future drawing to the current path.
 * Use with save()/restore() to manage clipping regions.
 */
export interface ClipCommand extends DrawCommandBase {
  type: 'clip';
  /** Fill rule: "nonzero" (default) or "evenodd" */
  fillRule?: 'nonzero' | 'evenodd';
}

// ============================================================================
// Line Style Commands
// ============================================================================

/**
 * Set the line cap style for stroke endpoints.
 */
export interface SetLineCapCommand extends DrawCommandBase {
  type: 'setLineCap';
  /** Line cap style: "butt" (default), "round", or "square" */
  cap: 'butt' | 'round' | 'square';
}

/**
 * Set the line join style for stroke corners.
 */
export interface SetLineJoinCommand extends DrawCommandBase {
  type: 'setLineJoin';
  /** Line join style: "miter" (default), "round", or "bevel" */
  join: 'miter' | 'round' | 'bevel';
}

/**
 * Set the miter limit for sharp corners.
 * Only applies when lineJoin is "miter".
 */
export interface SetMiterLimitCommand extends DrawCommandBase {
  type: 'setMiterLimit';
  /** Miter limit value (default: 10) */
  limit: number;
}

/**
 * Set the line dash pattern for strokes.
 * Use an empty array to reset to solid line.
 */
export interface SetLineDashCommand extends DrawCommandBase {
  type: 'setLineDash';
  /** Array of dash and gap lengths (e.g., [10, 5] for 10px dash, 5px gap) */
  segments: number[];
}

/**
 * Set the line dash offset for animating dashed lines.
 */
export interface SetLineDashOffsetCommand extends DrawCommandBase {
  type: 'setLineDashOffset';
  /** Offset to shift the dash pattern (useful for marching ants animation) */
  offset: number;
}

// ============================================================================
// Gradient Types
// ============================================================================

/**
 * A color stop in a gradient.
 */
export interface GradientColorStop {
  /** Position along the gradient (0-1) */
  offset: number;
  /** CSS color string (hex, named, rgb, rgba) */
  color: string;
}

/**
 * Definition for a linear gradient.
 */
export interface LinearGradientDef {
  type: 'linear';
  /** Start X coordinate */
  x0: number;
  /** Start Y coordinate */
  y0: number;
  /** End X coordinate */
  x1: number;
  /** End Y coordinate */
  y1: number;
  /** Color stops */
  stops: GradientColorStop[];
}

/**
 * Definition for a radial gradient.
 */
export interface RadialGradientDef {
  type: 'radial';
  /** Start circle center X */
  x0: number;
  /** Start circle center Y */
  y0: number;
  /** Start circle radius */
  r0: number;
  /** End circle center X */
  x1: number;
  /** End circle center Y */
  y1: number;
  /** End circle radius */
  r1: number;
  /** Color stops */
  stops: GradientColorStop[];
}

/**
 * Definition for a conic (angular) gradient.
 */
export interface ConicGradientDef {
  type: 'conic';
  /** Starting angle in radians (0 = right, PI/2 = down) */
  startAngle: number;
  /** Center X coordinate */
  x: number;
  /** Center Y coordinate */
  y: number;
  /** Color stops */
  stops: GradientColorStop[];
}

/**
 * Union type for gradient definitions.
 */
export type GradientDef = LinearGradientDef | RadialGradientDef | ConicGradientDef;

/**
 * Pattern repetition modes.
 */
export type PatternRepetition = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';

/**
 * Pattern definition for image-based fills.
 */
export interface PatternDef {
  type: 'pattern';
  /** Name of registered image asset */
  imageName: string;
  /** How the pattern tiles */
  repetition: PatternRepetition;
}

/**
 * Fill or stroke style - can be a CSS color string, gradient, or pattern.
 */
export type FillStyle = string | GradientDef | PatternDef;

/**
 * Set the fill style (color or gradient).
 */
export interface SetFillStyleCommand extends DrawCommandBase {
  type: 'setFillStyle';
  /** CSS color string or gradient definition */
  style: FillStyle;
}

/**
 * Set the stroke style (color or gradient).
 */
export interface SetStrokeStyleCommand extends DrawCommandBase {
  type: 'setStrokeStyle';
  /** CSS color string or gradient definition */
  style: FillStyle;
}

/**
 * Set the shadow color.
 */
export interface SetShadowColorCommand extends DrawCommandBase {
  type: 'setShadowColor';
  /** Shadow color as CSS color string */
  color: string;
}

/**
 * Set the shadow blur radius.
 */
export interface SetShadowBlurCommand extends DrawCommandBase {
  type: 'setShadowBlur';
  /** Blur radius in pixels */
  blur: number;
}

/**
 * Set the shadow X offset.
 */
export interface SetShadowOffsetXCommand extends DrawCommandBase {
  type: 'setShadowOffsetX';
  /** Horizontal offset in pixels */
  offset: number;
}

/**
 * Set the shadow Y offset.
 */
export interface SetShadowOffsetYCommand extends DrawCommandBase {
  type: 'setShadowOffsetY';
  /** Vertical offset in pixels */
  offset: number;
}

/**
 * Set all shadow properties at once.
 */
export interface SetShadowCommand extends DrawCommandBase {
  type: 'setShadow';
  /** Shadow color as CSS color string */
  color: string;
  /** Blur radius in pixels */
  blur: number;
  /** Horizontal offset in pixels */
  offsetX: number;
  /** Vertical offset in pixels */
  offsetY: number;
}

/**
 * Clear all shadow properties.
 */
export interface ClearShadowCommand extends DrawCommandBase {
  type: 'clearShadow';
}

// ============================================================================
// Compositing Commands
// ============================================================================

/**
 * Standard Canvas 2D composite operations.
 */
export type GlobalCompositeOperation =
  | 'source-over'
  | 'source-in'
  | 'source-out'
  | 'source-atop'
  | 'destination-over'
  | 'destination-in'
  | 'destination-out'
  | 'destination-atop'
  | 'lighter'
  | 'copy'
  | 'xor'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

/**
 * Set the global alpha (transparency) for all subsequent drawing.
 */
export interface SetGlobalAlphaCommand extends DrawCommandBase {
  type: 'setGlobalAlpha';
  /** Alpha value from 0.0 (fully transparent) to 1.0 (fully opaque) */
  alpha: number;
}

/**
 * Set the composite operation (blend mode) for all subsequent drawing.
 */
export interface SetCompositeOperationCommand extends DrawCommandBase {
  type: 'setCompositeOperation';
  /** Blend mode to use */
  operation: GlobalCompositeOperation;
}

/**
 * Set image smoothing (anti-aliasing) for image rendering.
 * Disable for crisp pixel art, enable for smooth scaled images.
 */
export interface SetImageSmoothingCommand extends DrawCommandBase {
  type: 'setImageSmoothing';
  /** Whether to enable image smoothing */
  enabled: boolean;
}

// ============================================================================
// Hit Testing Types
// ============================================================================

/**
 * Fill rule for determining the inside of a path.
 * - 'nonzero': Non-zero winding rule (default)
 * - 'evenodd': Even-odd rule
 */
export type FillRule = 'nonzero' | 'evenodd';

// ============================================================================
// Text Alignment Types
// ============================================================================

/**
 * Canvas text alignment options.
 * Controls horizontal alignment relative to the x coordinate.
 */
export type CanvasTextAlign = 'left' | 'right' | 'center' | 'start' | 'end';

/**
 * Canvas text baseline options.
 * Controls vertical alignment relative to the y coordinate.
 */
export type CanvasTextBaseline =
  | 'top'
  | 'hanging'
  | 'middle'
  | 'alphabetic'
  | 'ideographic'
  | 'bottom';

/**
 * Set the text alignment for all subsequent text drawing.
 */
export interface SetTextAlignCommand extends DrawCommandBase {
  type: 'setTextAlign';
  /** Horizontal alignment relative to x coordinate */
  align: CanvasTextAlign;
}

/**
 * Set the text baseline for all subsequent text drawing.
 */
export interface SetTextBaselineCommand extends DrawCommandBase {
  type: 'setTextBaseline';
  /** Vertical alignment relative to y coordinate */
  baseline: CanvasTextBaseline;
}

/**
 * Canvas text direction options for RTL/LTR support.
 */
export type CanvasDirection = 'ltr' | 'rtl' | 'inherit';

/**
 * Set the text direction for all subsequent text drawing.
 */
export interface SetDirectionCommand extends DrawCommandBase {
  type: 'setDirection';
  /** Text direction: 'ltr' (left-to-right), 'rtl' (right-to-left), or 'inherit' */
  direction: CanvasDirection;
}

/**
 * Set the CSS filter for all subsequent drawing operations.
 */
export interface SetFilterCommand extends DrawCommandBase {
  type: 'setFilter';
  /** CSS filter string (e.g., "blur(5px)", "contrast(150%)", "none") */
  filter: string;
}

/**
 * Write pixel data to the canvas at the specified position.
 */
export interface PutImageDataCommand extends DrawCommandBase {
  type: 'putImageData';
  /** Pixel data as flat RGBA array */
  data: number[];
  /** Width of the image data */
  width: number;
  /** Height of the image data */
  height: number;
  /** Destination X coordinate */
  dx: number;
  /** Destination Y coordinate */
  dy: number;
  /** Optional dirty rect X coordinate (sub-region to draw) */
  dirtyX?: number;
  /** Optional dirty rect Y coordinate (sub-region to draw) */
  dirtyY?: number;
  /** Optional dirty rect width (sub-region to draw) */
  dirtyWidth?: number;
  /** Optional dirty rect height (sub-region to draw) */
  dirtyHeight?: number;
}

// ============================================================================
// Path2D Commands
// ============================================================================

/**
 * Fill a stored Path2D object.
 * The pathId references a path stored in the CanvasController's path registry.
 */
export interface FillPathCommand extends DrawCommandBase {
  type: 'fillPath';
  /** ID of the path in the path registry */
  pathId: number;
  /** Fill rule: "nonzero" (default) or "evenodd" */
  fillRule?: FillRule;
}

/**
 * Stroke a stored Path2D object.
 * The pathId references a path stored in the CanvasController's path registry.
 */
export interface StrokePathCommand extends DrawCommandBase {
  type: 'strokePath';
  /** ID of the path in the path registry */
  pathId: number;
}

/**
 * Clip to a stored Path2D object.
 * The pathId references a path stored in the CanvasController's path registry.
 */
export interface ClipPathCommand extends DrawCommandBase {
  type: 'clipPath';
  /** ID of the path in the path registry */
  pathId: number;
  /** Fill rule: "nonzero" (default) or "evenodd" */
  fillRule?: FillRule;
}

// ============================================================================
// Audio Commands
// ============================================================================

/**
 * Play a sound effect.
 */
export interface PlaySoundCommand extends DrawCommandBase {
  type: 'playSound';
  /** Name of the sound to play */
  name: string;
  /** Volume level from 0.0 to 1.0 */
  volume: number;
}

/**
 * Play background music.
 */
export interface PlayMusicCommand extends DrawCommandBase {
  type: 'playMusic';
  /** Name of the music track to play */
  name: string;
  /** Volume level from 0.0 to 1.0 */
  volume: number;
  /** Whether to loop the music */
  loop: boolean;
}

/**
 * Stop the currently playing music.
 */
export interface StopMusicCommand extends DrawCommandBase {
  type: 'stopMusic';
}

/**
 * Pause the currently playing music.
 */
export interface PauseMusicCommand extends DrawCommandBase {
  type: 'pauseMusic';
}

/**
 * Resume paused music.
 */
export interface ResumeMusicCommand extends DrawCommandBase {
  type: 'resumeMusic';
}

/**
 * Set the music volume.
 */
export interface SetMusicVolumeCommand extends DrawCommandBase {
  type: 'setMusicVolume';
  /** Volume level from 0.0 to 1.0 */
  volume: number;
}

/**
 * Set the master volume.
 */
export interface SetMasterVolumeCommand extends DrawCommandBase {
  type: 'setMasterVolume';
  /** Volume level from 0.0 to 1.0 */
  volume: number;
}

/**
 * Mute all audio.
 */
export interface MuteCommand extends DrawCommandBase {
  type: 'mute';
}

/**
 * Unmute all audio.
 */
export interface UnmuteCommand extends DrawCommandBase {
  type: 'unmute';
}

/**
 * Union type of all draw commands.
 */
export type DrawCommand =
  | ClearCommand
  | ClearRectCommand
  | SetColorCommand
  | SetLineWidthCommand
  | SetFontSizeCommand
  | SetFontFamilyCommand
  | SetSizeCommand
  | RectCommand
  | FillRectCommand
  | CircleCommand
  | FillCircleCommand
  | LineCommand
  | TextCommand
  | StrokeTextCommand
  | DrawImageCommand
  | TranslateCommand
  | RotateCommand
  | ScaleCommand
  | SaveCommand
  | RestoreCommand
  | TransformCommand
  | SetTransformCommand
  | ResetTransformCommand
  | BeginPathCommand
  | ClosePathCommand
  | MoveToCommand
  | LineToCommand
  | FillCommand
  | StrokeCommand
  | ArcCommand
  | ArcToCommand
  | QuadraticCurveToCommand
  | BezierCurveToCommand
  | EllipseCommand
  | RoundRectCommand
  | RectPathCommand
  | ClipCommand
  | SetLineCapCommand
  | SetLineJoinCommand
  | SetMiterLimitCommand
  | SetLineDashCommand
  | SetLineDashOffsetCommand
  | SetFillStyleCommand
  | SetStrokeStyleCommand
  | SetShadowColorCommand
  | SetShadowBlurCommand
  | SetShadowOffsetXCommand
  | SetShadowOffsetYCommand
  | SetShadowCommand
  | ClearShadowCommand
  | SetGlobalAlphaCommand
  | SetCompositeOperationCommand
  | SetTextAlignCommand
  | SetTextBaselineCommand
  | SetImageSmoothingCommand
  | SetDirectionCommand
  | SetFilterCommand
  | PutImageDataCommand
  | FillPathCommand
  | StrokePathCommand
  | ClipPathCommand
  // Audio commands
  | PlaySoundCommand
  | PlayMusicCommand
  | StopMusicCommand
  | PauseMusicCommand
  | ResumeMusicCommand
  | SetMusicVolumeCommand
  | SetMasterVolumeCommand
  | MuteCommand
  | UnmuteCommand;

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
 * State of audio system (synced from main thread to worker).
 */
export interface AudioState {
  /** Whether audio is muted */
  muted: boolean;
  /** Master volume level (0.0 to 1.0) */
  masterVolume: number;
  /** Whether music is currently playing */
  musicPlaying: boolean;
  /** Current playback time of music in seconds */
  musicTime: number;
  /** Duration of current music track in seconds */
  musicDuration: number;
  /** Name of currently playing music track (empty if none) */
  currentMusicName: string;
}

/**
 * Create a default audio state.
 */
export function createDefaultAudioState(): AudioState {
  return {
    muted: false,
    masterVolume: 1.0,
    musicPlaying: false,
    musicTime: 0,
    musicDuration: 0,
    currentMusicName: '',
  };
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
 * Valid font file extensions for canvas assets.
 * Used for validation in both worker and shell canvas implementations.
 */
export const VALID_FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'] as const;

/**
 * Valid audio file extensions for canvas assets.
 * Supports common web-compatible audio formats.
 */
export const VALID_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg'] as const;

/**
 * Definition of an asset to be loaded.
 */
export interface AssetDefinition {
  /** Unique name to reference this asset */
  name: string;
  /** Path to the asset file (relative or absolute) */
  path: string;
  /** Type of asset */
  type: 'image' | 'font' | 'audio';
}

/**
 * Map of asset names to their definitions.
 */
export type AssetManifest = Map<string, AssetDefinition>;

// ============================================================================
// Asset Path API Types
// ============================================================================

/**
 * Type of asset file based on extension.
 */
export type AssetFileType = 'image' | 'font' | 'audio' | 'unknown';

/**
 * Represents a file discovered from scanning an asset path directory.
 * Created during add_path() directory scan.
 */
export interface DiscoveredFile {
  /** Filename without path (e.g., "blue_ship.png") */
  filename: string;
  /** Full resolved path to the file */
  fullPath: string;
  /** Type of asset determined from extension */
  type: AssetFileType;
  /** The base path this file was discovered from */
  basePath: string;
  /**
   * Relative path from the base path to the file (e.g., "images/blue_ship.png").
   * Allows loading files from subdirectories within a registered asset path.
   * For files directly in the base path, this equals the filename.
   */
  relativePath: string;
}

/**
 * Handle returned by load_image() or load_font().
 * Can be used in place of string name in drawing functions.
 * This interface matches the Lua table structure.
 */
export interface AssetHandle {
  /** Type discriminator for the handle */
  _type: 'image' | 'font';
  /** The registered name for this asset */
  _name: string;
  /** The filename this handle maps to */
  _file: string;
}

/**
 * Handle returned by canvas.assets.sound() or canvas.assets.music().
 * Used to reference audio assets in playback functions.
 * This interface matches the Lua table structure.
 */
export interface AudioAssetHandle {
  /** Type discriminator for the handle: 'sound' for effects, 'music' for tracks */
  _type: 'sound' | 'music';
  /** The registered name for this asset */
  _name: string;
  /** The filename this handle maps to */
  _file: string;
}

/**
 * Check if a value is an AssetHandle (image or font).
 */
export function isAssetHandle(value: unknown): value is AssetHandle {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_type' in value &&
    '_name' in value &&
    '_file' in value &&
    (value._type === 'image' || value._type === 'font')
  );
}

/**
 * Check if a value is an AudioAssetHandle (sound or music).
 */
export function isAudioAssetHandle(value: unknown): value is AudioAssetHandle {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_type' in value &&
    '_name' in value &&
    '_file' in value &&
    (value._type === 'sound' || value._type === 'music')
  );
}

/**
 * Classify a file by its extension to determine asset type.
 */
export function classifyFileType(filename: string): AssetFileType {
  const lowerName = filename.toLowerCase();
  if (VALID_IMAGE_EXTENSIONS.some(ext => lowerName.endsWith(ext))) {
    return 'image';
  }
  if (VALID_FONT_EXTENSIONS.some(ext => lowerName.endsWith(ext))) {
    return 'font';
  }
  if (VALID_AUDIO_EXTENSIONS.some(ext => lowerName.endsWith(ext))) {
    return 'audio';
  }
  return 'unknown';
}

// ============================================================================
// Pixel Manipulation Types
// ============================================================================

/**
 * Request to get pixel data from a region of the canvas.
 * Sent from worker to main thread.
 */
export interface GetImageDataRequest {
  type: 'getImageData';
  /** Unique request ID for matching response */
  requestId: string;
  /** X coordinate of top-left corner */
  x: number;
  /** Y coordinate of top-left corner */
  y: number;
  /** Width of region to read */
  width: number;
  /** Height of region to read */
  height: number;
}

/**
 * Response containing pixel data from the canvas.
 * Sent from main thread to worker.
 */
export interface GetImageDataResponse {
  type: 'getImageDataResponse';
  /** Request ID this is responding to */
  requestId: string;
  /** Width of the image data */
  width: number;
  /** Height of the image data */
  height: number;
  /** Pixel data as flat RGBA array (0-255 values) */
  data: number[];
}

/**
 * Union type for pixel data requests.
 */
export type PixelDataRequest = GetImageDataRequest;

/**
 * Union type for pixel data responses.
 */
export type PixelDataResponse = GetImageDataResponse;
