/**
 * Canvas Lua code module exports.
 * Each module contains a section of the Lua code for the canvas API.
 *
 * Note: localStorage is now a separate library loaded via require('localstorage').
 * See lua/localstorage.lua and lua/localstorage.generated.ts for the implementation.
 */

export { canvasLuaCoreCode } from './core'
export { canvasLuaLifecycleCode } from './lifecycle'
export { canvasLuaPathCode } from './path'
export { canvasLuaStylingCode } from './styling'
export { canvasLuaTextCode } from './text'
export { canvasLuaInputCode } from './input'
export { canvasLuaAudioCode } from './audio'
