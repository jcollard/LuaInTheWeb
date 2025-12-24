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
  TimingInfo,
  AssetDefinition,
  AssetManifest,
  // Gradient types
  GradientColorStop,
  LinearGradientDef,
  RadialGradientDef,
  GradientDef,
  FillStyle,
} from './types.js';

export {
  createEmptyInputState,
  createDefaultTimingInfo,
  VALID_IMAGE_EXTENSIONS,
  VALID_FONT_EXTENSIONS,
} from './types.js';

export { AssetLoader } from './AssetLoader.js';
export type { LoadedAsset } from './AssetLoader.js';
