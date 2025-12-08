/**
 * Options for the useLuaEngine hook
 */
export interface UseLuaEngineOptions {
  /** Called when print() or io.write() outputs text */
  onOutput?: (text: string) => void
  /** Called when a Lua error occurs */
  onError?: (error: string) => void
  /** Called when io.read() needs input from the user */
  onReadInput?: () => Promise<string>
  /** Called when the engine is destroyed (unmount or reset) */
  onCleanup?: () => void
}

/**
 * Return value from the useLuaEngine hook
 */
export interface UseLuaEngineReturn {
  /** Whether the Lua engine is initialized and ready */
  isReady: boolean
  /** Execute Lua code */
  execute: (code: string) => Promise<void>
  /** Reset the engine to a fresh state */
  reset: () => Promise<void>
}
