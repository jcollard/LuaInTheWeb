/**
 * LocalStorage API setup for Lua processes.
 *
 * @deprecated Bridge functions are now set up automatically in LuaEngineFactory.create().
 * This file is kept for backward compatibility but the function does nothing.
 *
 * The localStorage bridge functions (__localstorage_getItem, __localstorage_setItem, etc.)
 * are registered inside LuaEngineFactory to ensure consistent engine state and avoid
 * ordering dependencies with external setup calls.
 */

import type { LuaEngine } from 'wasmoon'

/**
 * @deprecated Bridge functions are now set up automatically in LuaEngineFactory.create().
 * This function is kept for backward compatibility but does nothing.
 *
 * @param _engine - The Lua engine (unused - setup is now in LuaEngineFactory)
 */
export function setupLocalStorageAPI(_engine: LuaEngine): void {
  // No-op - bridge functions are now set up in LuaEngineFactory.create()
}
