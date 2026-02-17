/**
 * Lua wrapper code for the ANSI terminal module.
 * This string is executed in the Lua engine to create the ansi table
 * and all its functions.
 */

import { ansiLuaCoreCode, ansiLuaInputCode } from './ansiLuaCode'

/**
 * Complete Lua ANSI terminal module code.
 * Concatenates all modular Lua code sections into a single string.
 */
export const ansiLuaCode =
  ansiLuaCoreCode +
  ansiLuaInputCode
