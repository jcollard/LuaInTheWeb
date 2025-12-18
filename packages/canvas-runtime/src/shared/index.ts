export type {
  DrawCommandType,
  ClearCommand,
  SetColorCommand,
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
} from './types.js';

export { createEmptyInputState, createDefaultTimingInfo, VALID_IMAGE_EXTENSIONS } from './types.js';

export { AssetLoader } from './AssetLoader.js';
export type { LoadedAsset } from './AssetLoader.js';
