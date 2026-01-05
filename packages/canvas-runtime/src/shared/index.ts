export type {
  DrawCommandType,
  ClearCommand,
  SetColorCommand,
  SetFontSizeCommand,
  SetFontFamilyCommand,
  RectCommand,
  FillRectCommand,
  CircleCommand,
  FillCircleCommand,
  LineCommand,
  TextCommand,
  DrawImageCommand,
  DrawCommand,
  MouseButton,
  InputState,
  // Gamepad types
  GamepadState,
  TimingInfo,
  AssetDefinition,
  AssetManifest,
  // Gradient types
  GradientColorStop,
  LinearGradientDef,
  RadialGradientDef,
  ConicGradientDef,
  GradientDef,
  // Pattern types
  PatternRepetition,
  PatternDef,
  // Style type
  FillStyle,
  // Compositing types
  GlobalCompositeOperation,
  // Text alignment types
  CanvasTextAlign,
  CanvasTextBaseline,
  // Text direction types
  CanvasDirection,
  // Hit testing types
  FillRule,
  // Path2D command types
  FillPathCommand,
  StrokePathCommand,
  ClipPathCommand,
  // Asset path API types
  AssetFileType,
  DiscoveredFile,
  AssetHandle,
  AudioAssetHandle,
  // Audio state
  AudioState,
} from './types.js';

export {
  createEmptyInputState,
  createDefaultTimingInfo,
  createDefaultAudioState,
  VALID_IMAGE_EXTENSIONS,
  VALID_FONT_EXTENSIONS,
  VALID_AUDIO_EXTENSIONS,
  // Gamepad constants and helpers
  MAX_GAMEPADS,
  GAMEPAD_BUTTONS,
  GAMEPAD_AXES,
  createEmptyGamepadState,
  // Asset path API utilities
  classifyFileType,
  isAssetHandle,
  isAudioAssetHandle,
} from './types.js';

export { AssetLoader } from './AssetLoader.js';
export type { LoadedAsset } from './AssetLoader.js';
