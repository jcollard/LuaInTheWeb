/**
 * Lua wrapper code for the canvas module.
 * This string is executed in the Lua engine to create the canvas table
 * and all its functions.
 *
 * The code is split into modular files to keep each under line limits.
 */

import {
  canvasLuaCoreCode,
  canvasLuaLifecycleCode,
  canvasLuaPathCode,
  canvasLuaStylingCode,
  canvasLuaTextCode,
  canvasLuaInputCode,
  canvasLuaAudioCode,
} from './canvasLuaCode'

/**
 * Complete Lua canvas module code.
 * Concatenates all modular Lua code sections into a single string.
 */
export const canvasLuaCode =
  canvasLuaCoreCode +
  canvasLuaLifecycleCode +
  canvasLuaPathCode +
  canvasLuaStylingCode +
  canvasLuaTextCode +
  canvasLuaInputCode +
  canvasLuaAudioCode
